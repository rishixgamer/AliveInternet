import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { BENIGN, comment, youtubeFixture } from '../tests/browser/youtube-fixture.mjs';

// Running this script explicitly opts into an isolated browser fixture session.
// No actual platform HTML is retrieved; all HTTP(S) requests are fulfilled or aborted.
const project = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const extensionDir = path.resolve(process.env.ALIVEINTERNET_EXTENSION_DIR || path.join(project, '.output/chrome-mv3'));
const output = path.resolve(process.env.ALIVEINTERNET_BROWSER_ARTIFACTS || path.join(project, 'artifacts/browser', new Date().toISOString().replace(/[:.]/g, '-')));
await mkdir(output, { recursive: true });
const receipt = {
  startedAt: new Date().toISOString(), status: 'running', scope: 'Synthetic YouTube-shaped pages; real unpacked MV3 production build. Not live-platform selector validation.',
  extensionDir, checks: [], metrics: {}, console: [], errors: [], network: [],
};
let context;
let profile;
const checkpoint = async () => writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
const check = async (name, run) => {
  const start = performance.now();
  await run();
  receipt.checks.push({ name, status: 'passed', elapsedMs: Math.round(performance.now() - start) });
  console.log(`PASS ${name}`);
  await checkpoint();
};
const fixtureURL = suffix => `https://www.youtube.com/watch?v=aliveinternet-synthetic-${suffix}`;
const hiddenCount = page => page.locator('.aliveinternet-collapsed').count();
const waitHidden = (page, count) => page.waitForFunction(expected => document.querySelectorAll('.aliveinternet-collapsed').length === expected, count, { timeout: 20_000, polling: 100 });
const send = (worker, mutation) => worker.evaluate(async mutation => chrome.runtime.sendMessage({ type: 'aliveinternet/settings-mutation', mutation }), mutation);
const settings = worker => worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
const tabId = (worker, url) => worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url)?.id, url);
const tabMessage = (worker, id, message) => worker.evaluate(async ({ id, message }) => chrome.tabs.sendMessage(id, message), { id, message });
const poll = async (predicate, timeout = 15_000) => {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Browser API state did not reach expected value');
};
async function buildHashes(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(result, await buildHashes(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) result[relative] = createHash('sha256').update(await readFile(path.join(directory, entry.name))).digest('hex');
  }
  return result;
}
try {
  const { chromium } = process.env.ALIVEINTERNET_PLAYWRIGHT_MODULE
    ? await import(process.env.ALIVEINTERNET_PLAYWRIGHT_MODULE) : await import('playwright');
  const manifest = JSON.parse(await readFile(path.join(extensionDir, 'manifest.json'), 'utf8'));
  receipt.buildSha256 = await buildHashes(extensionDir);
  receipt.harnessSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  await check('MV3 permissions and production package boundaries', async () => {
    assert.equal(manifest.manifest_version, 3);
    assert.ok(manifest.background?.service_worker);
    assert.deepEqual([...manifest.permissions].sort(), ['scripting', 'storage']);
    assert.deepEqual([...manifest.host_permissions].sort(), ['https://m.youtube.com/*', 'https://www.youtube.com/*', 'https://youtube.com/*']);
    for (const script of manifest.content_scripts || []) assert.ok(script.matches.every(host => /https:\/\/(?:m\.|www\.)?youtube\.com\/\*/.test(host)), 'Only YouTube is injected by default');
    const optionalOrigins = [
      'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'instagram.com', 'www.instagram.com',
      'reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com', 'tiktok.com', 'www.tiktok.com',
      'facebook.com', 'www.facebook.com', 'm.facebook.com', 'threads.net', 'www.threads.net',
      'threads.com', 'www.threads.com', 'bsky.app', 'linkedin.com', 'www.linkedin.com',
      'twitch.tv', 'www.twitch.tv', 'm.twitch.tv',
    ].map(host => `https://${host}/*`);
    assert.deepEqual([...manifest.optional_host_permissions].sort(), optionalOrigins.sort());
    assert.ok(!manifest.externally_connectable && !manifest.web_accessible_resources);
    assert.ok(!Object.keys(receipt.buildSha256).some(file => file.endsWith('.map')), 'Do not ship sourcemaps');
  });
  profile = await mkdtemp(path.join(os.tmpdir(), 'aliveinternet-browser-'));
  receipt.profile = profile;
  const channel = process.env.ALIVEINTERNET_BROWSER_CHANNEL;
  if (channel && !['chrome', 'msedge'].includes(channel)) throw new Error('Unsupported branded browser channel');
  context = await chromium.launchPersistentContext(profile, {
    channel: process.env.ALIVEINTERNET_BROWSER_PATH ? undefined : channel || 'chromium',
    executablePath: process.env.ALIVEINTERNET_BROWSER_PATH || undefined,
    ignoreDefaultArgs: channel ? ['--disable-extensions'] : undefined,
    headless: process.env.ALIVEINTERNET_BROWSER_HEADED !== '1', viewport: { width: 1100, height: 850 },
    args: channel ? ['--enable-unsafe-extension-debugging'] : [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });
  if (channel) {
    const session = await context.browser().newBrowserCDPSession();
    receipt.brandedBrowser = { channel, ...(await session.send('Browser.getVersion')) };
    receipt.installation = { method: 'CDP Extensions.loadUnpacked', ...(await session.send('Extensions.loadUnpacked', { path: extensionDir })) };
    await session.detach();
  } else receipt.installation = { method: 'unpacked command-line flags', signed: false };
  receipt.browserVersion = context.browser()?.version() || 'persistent context';
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.protocol === 'chrome-extension:') {
      receipt.network.push({ url: request.url(), resourceType: request.resourceType(), action: 'local-extension-resource' });
      await route.continue();
      return;
    }
    receipt.network.push({ url: request.url(), resourceType: request.resourceType(), action: ['www.youtube.com', 'www.x.com'].includes(url.hostname) && request.isNavigationRequest() ? 'synthetic-fulfill' : 'abort' });
    if (url.hostname === 'www.youtube.com' && request.isNavigationRequest()) await route.fulfill({ status: 200, contentType: 'text/html', body: youtubeFixture(request.url()) });
    else if (url.hostname === 'www.x.com' && request.isNavigationRequest()) await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><main><article data-testid="tweet"><a href="/fixtureauthor">Synthetic author</a><div data-testid="tweetText">Contact me on Telegram to double your investment. Guaranteed profit!</div></article></main>' });
    else await route.abort('blockedbyclient');
  });
  context.on('page', page => {
    page.on('pageerror', error => receipt.errors.push({ url: page.url(), message: String(error) }));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) receipt.console.push({ type: message.type(), text: message.text(), url: page.url() }); });
  });
  let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15_000 });
  const extensionId = new URL(worker.url()).hostname;
  receipt.extensionId = extensionId;
  receipt.browserVersion = await worker.evaluate(() => navigator.userAgent);
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/${manifest.action.default_popup}`);
  await popup.waitForFunction(() => document.querySelectorAll('#platforms input').length === 10 && document.querySelector('#enabled')?.disabled === false);
  const first = await context.newPage();
  const second = await context.newPage();
  await check('real extension worker, popup and default YouTube controller', async () => {
    await first.goto(fixtureURL('first'));
    await second.goto(fixtureURL('second'));
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
    assert.equal(await first.locator('[data-fixture="benign"]').evaluate(el => el.style.display), '');
    assert.equal(await first.locator('[data-fixture="benign-reply"]').evaluate(el => el.style.display), '');
    assert.equal(await first.locator('[data-fixture="warning"]').evaluate(el => el.style.display), '');
    assert.equal(await first.locator('[data-fixture="spam-parent"]').evaluate(el => el.style.display), 'none');
  });
  await check('local reveal restores original display and SPA/reload reset reveal', async () => {
    await first.locator('.aliveinternet-collapsed').first().getByRole('button', { name: 'Reveal hidden comment' }).click();
    assert.equal(await first.locator('[data-fixture="spam-parent"]').evaluate(el => el.style.display), 'flex');
    await waitHidden(first, 1);
    await first.evaluate(() => { history.pushState({}, '', '/watch?v=aliveinternet-synthetic-spa'); window.dispatchEvent(new Event('yt-navigate-finish')); });
    await waitHidden(first, 2);
    await first.reload();
    await waitHidden(first, 2);
  });
  await check('popup settings propagate to multiple content tabs and restore', async () => {
    await popup.locator('#enabled').uncheck();
    await Promise.all([waitHidden(first, 0), waitHidden(second, 0)]);
    assert.equal(await first.locator('[data-fixture="spam-parent"]').evaluate(el => el.style.display), 'flex');
    await popup.locator('#enabled').check();
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
    const response = await send(popup, { kind: 'preferences', patch: { unsupported: true } });
    assert.equal(response.ok, false);
    assert.equal((await settings(worker)).enabled, true);
  });
  await check('local account hide and popup unhide are serialized and reversible', async () => {
    await first.locator('[data-fixture="benign"] .aliveinternet-account-action').click();
    await Promise.all([waitHidden(first, 3), waitHidden(second, 3)]);
    await popup.locator('#blockedAccounts').getByRole('button', { name: 'Unhide @benign on YouTube' }).click();
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
    const mutations = ['@concurrent-a', '@concurrent-b'].map(accountKey => send(popup, { kind: 'account', platform: 'youtube', accountKey, blocked: true }));
    await Promise.all(mutations);
    assert.ok((await settings(worker)).blockedAccounts.includes('youtube:@concurrent-a'));
    assert.ok((await settings(worker)).blockedAccounts.includes('youtube:@concurrent-b'));
  });
  await check('hidden-item messages and popup review reveal current page only', async () => {
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
    const id = await tabId(worker, first.url());
    const result = await tabMessage(popup, id, { type: 'aliveinternet/hidden-items' });
    assert.equal(result.total, 2);
    assert.equal(result.truncated, false);
    assert.equal(result.items.length, 2);
    assert.ok(result.items.every(item => typeof item.pageItemId === 'string'));
    const denied = await tabMessage(worker, id, { type: 'aliveinternet/hidden-items' }).catch(() => undefined);
    assert.equal(denied, undefined, 'Worker sender cannot retrieve excerpts');
    const stored = await worker.evaluate(() => chrome.storage.local.get(null));
    assert.equal(JSON.stringify(stored).includes('Guaranteed profit'), false, 'Review excerpts are not persisted');
    const invalid = await tabMessage(popup, id, { type: 'aliveinternet/reveal-item', pageItemId: '00000000-0000-0000-0000-000000000000:999999' });
    assert.equal(invalid.ok, false);
    await first.bringToFront();
    await popup.locator('#refreshHidden').click();
    await popup.waitForFunction(() => document.querySelectorAll('#hiddenItems .review-row').length === 2);
    await popup.locator('#hiddenItems button').first().click();
    await waitHidden(first, 1);
    assert.equal(await hiddenCount(second), 2);
    await first.reload();
    await waitHidden(first, 2);
    const staleResponse = await tabMessage(popup, id, { type: 'aliveinternet/reveal-item', pageItemId: result.items[0].pageItemId });
    assert.equal(staleResponse.ok, false, 'A previous document session ID cannot reveal newly loaded content');
    await popup.locator('#hiddenItems button').first().click();
    await popup.waitForFunction(() => document.querySelector('#hiddenSummary')?.textContent.includes('no longer hidden'));
    assert.equal(await hiddenCount(first), 2, 'Stale popup row must leave the new document hidden');
    const fresh = await tabMessage(popup, id, { type: 'aliveinternet/hidden-items' });
    assert.ok(fresh.items.every(item => !result.items.some(previous => previous.pageItemId === item.pageItemId)));
  });
  await check('report flow: preview, edit, explicit open; cancel and staging send nothing', async () => {
    const github = () => receipt.network.filter(entry => new URL(entry.url).hostname === 'github.com');
    await first.bringToFront();
    await popup.locator('#refreshHidden').click();
    await popup.waitForFunction(() => document.querySelectorAll('#hiddenItems .review-row').length === 2);
    const reportRow = () => popup.locator('#hiddenItems').getByRole('button', { name: /Prepare a report that this comment was wrongly hidden/ }).first();
    // Preview shows redacted text only; building it contacts nothing.
    await reportRow().click();
    await popup.locator('#reportSection').waitFor({ state: 'visible' });
    const previewText = await popup.locator('#reportText').inputValue();
    assert.match(previewText, /Telegram/);
    assert.ok(!/Synthetic author|spam-parent|spam-other|@/.test(previewText), previewText);
    assert.equal(github().length, 0);
    // Cancel discards without any request.
    await popup.locator('#cancelReport').click();
    await popup.locator('#reportSection').waitFor({ state: 'hidden' });
    await popup.waitForTimeout(500);
    assert.equal(github().length, 0, 'cancelling must send nothing');
    // Edit, then the explicit click opens the prefilled URL in a new tab.
    await reportRow().click();
    await popup.locator('#reportSection').waitFor({ state: 'visible' });
    await popup.locator('#reportText').fill('edited text, see https://example.org/private/path?token=SECRET and @someone');
    assert.equal(github().length, 0, 'editing must send nothing');
    // A tab opened by chrome.tabs.create can start navigating before Playwright's routing attaches, which
    // would reach the real github.com. Capture the production call instead so the fixture stays offline.
    await popup.evaluate(() => { window.__openedTabs = []; chrome.tabs.create = async options => { window.__openedTabs.push(options); return { id: 0 }; }; });
    await popup.locator('#openReport').click();
    await popup.waitForFunction(() => window.__openedTabs.length === 1);
    const [openedTab] = await popup.evaluate(() => window.__openedTabs);
    const target = new URL(openedTab.url);
    assert.equal(target.origin + target.pathname, 'https://github.com/rishixgamer/AliveInternet/issues/new');
    assert.equal(target.searchParams.get('template'), 'false-positive.yml');
    assert.equal(target.searchParams.get('text'), 'edited text, see [link: example.org] and [handle]');
    assert.equal(github().length, 0, 'the fixture never reaches github.com');
    assert.ok(openedTab.url.length <= 6000);
    await popup.locator('#reportSection').waitFor({ state: 'hidden' });
    // Opt-in miss button stages a draft in page memory only; the popup collects it on open.
    assert.equal(await first.locator('.aliveinternet-report-action', { hasText: 'Report a miss' }).count(), 0, 'off by default');
    assert.equal((await send(popup, { kind: 'preferences', patch: { showReportControls: true } })).ok, true);
    const miss = first.locator('[data-fixture="benign"] .aliveinternet-report-action');
    await miss.waitFor({ timeout: 15_000 });
    await miss.click();
    assert.equal(github().length, 0, 'staging a draft must send nothing');
    await popup.reload();
    await popup.locator('#reportSection').waitFor({ state: 'visible' });
    assert.equal(await popup.locator('#reportText').inputValue(), BENIGN);
    await popup.locator('#cancelReport').click();
    await popup.waitForTimeout(300);
    assert.equal(github().length, 0, 'cancel after staging must send nothing');
    assert.equal((await send(popup, { kind: 'preferences', patch: { showReportControls: false } })).ok, true);
    await poll(async () => (await first.locator('.aliveinternet-report-action', { hasText: 'Report a miss' }).count()) === 0);
    const stored = await worker.evaluate(() => chrome.storage.local.get(null));
    assert.equal(JSON.stringify(stored).includes('Telegram'), false, 'drafts are not persisted');
  });
  await check('content edits and appended replies trigger isolated rescans', async () => {
    await first.locator('[data-fixture="spam-other"] #content-text').evaluate((el, text) => { el.textContent = text; }, BENIGN);
    await waitHidden(first, 1);
    await first.locator('ytd-comment-replies-renderer').evaluate((el, html) => { el.insertAdjacentHTML('beforeend', html); }, comment('appended-reply'));
    await waitHidden(first, 2);
    assert.equal(await first.locator('[data-fixture="benign-reply"]').evaluate(el => el.style.display), '');
  });
  await check('settings export, preview, cancellation and explicit merge import', async () => {
    const downloadEvent = popup.waitForEvent('download');
    await popup.locator('#exportSettings').click();
    const download = await downloadEvent;
    const exportPath = path.join(output, 'settings-export.json');
    await download.saveAs(exportPath);
    const exported = JSON.parse(await readFile(exportPath, 'utf8'));
    assert.equal(exported.format, 'aliveinternet-settings');
    assert.equal(exported.version, 1);
    assert.ok(exported.settings.blockedAccounts.includes('youtube:@concurrent-a'));
    const incoming = JSON.stringify({ format: 'aliveinternet-settings', version: 1, settings: { blockedAccounts: ['youtube:@imported'], enabled: false } });
    await popup.locator('#importSettings').setInputFiles({ name: 'fixture-settings.json', mimeType: 'application/json', buffer: Buffer.from(incoming) });
    await popup.waitForFunction(() => document.querySelector('#confirmImport')?.disabled === false);
    assert.equal((await settings(worker)).blockedAccounts.includes('youtube:@imported'), false);
    await popup.locator('#cancelImport').click();
    assert.equal((await settings(worker)).blockedAccounts.includes('youtube:@imported'), false);
    await popup.locator('#importSettings').setInputFiles({ name: 'fixture-settings.json', mimeType: 'application/json', buffer: Buffer.from(incoming) });
    await popup.locator('#confirmImport').click();
    await poll(() => popup.evaluate(async () => (await chrome.storage.local.get('settings')).settings.blockedAccounts.includes('youtube:@imported')));
    const current = await settings(worker);
    assert.equal(current.enabled, true, 'Default import merges personal lists without replacing preferences');
    assert.ok(current.blockedAccounts.includes('youtube:@concurrent-a'));
    // A backup may enable an optional adapter, but importing must never grant origins.
    const optionalImport = JSON.stringify({ format: 'aliveinternet-settings', version: 1, settings: { ...current, platforms: { ...current.platforms, x: true } } });
    await popup.locator('#importMode').selectOption('replace-all');
    await popup.locator('#importSettings').setInputFiles({ name: 'optional-site.json', mimeType: 'application/json', buffer: Buffer.from(optionalImport) });
    await popup.waitForFunction(() => document.querySelector('#confirmImport')?.disabled === false);
    await popup.locator('#confirmImport').click();
    await popup.waitForFunction(() => document.querySelector('#confirmImport')?.disabled === true);
    assert.equal(await worker.evaluate(() => chrome.permissions.contains({ origins: ['https://www.x.com/*'] })), false);
    assert.deepEqual(await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts()), []);
    assert.equal((await send(popup, { kind: 'preferences', patch: { platforms: { x: false } } })).ok, true);
  });
  await check('local advisory pack import is strict, escaped, opt-in and never hides benign content', async () => {
    const unsafeTitle = '<img src=x onerror=alert(1)> Synthetic untrusted advisory';
    const pack = {
      schemaVersion: 1, title: unsafeTitle, publisher: 'Synthetic fixture publisher', sourceUrl: 'https://evidence.example.invalid/fixture-pack',
      indicators: [
        { kind: 'account', platform: 'youtube', value: '@benign', evidenceUrl: 'https://evidence.example.invalid/benign', note: 'Synthetic advisory only; no attribution.' },
        { kind: 'account', platform: 'youtube', value: '@spam-parent', evidenceUrl: 'https://evidence.example.invalid/spam-parent', note: 'Synthetic advisory only.' },
      ],
    };
    await popup.locator('#importPack').setInputFiles({ name: 'fixture-pack.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pack)) });
    await popup.waitForFunction(title => document.querySelector('#packStatus')?.textContent.includes(title), unsafeTitle);
    await waitHidden(first, 2);
    assert.equal(await first.locator('[data-fixture="benign"] .aliveinternet-flag').count(), 0);
    await popup.locator('#intelAdvisories').check();
    await first.waitForFunction(() => document.querySelector('[data-fixture="benign"] .aliveinternet-flag')?.textContent.includes('User-imported advisory'));
    assert.equal(await first.locator('[data-fixture="benign"]').evaluate(el => el.style.display), '');
    assert.equal(await hiddenCount(first), 2);
    assert.equal(await first.locator('[data-fixture="benign"] img').count(), 0);
    assert.equal(await popup.locator('#packStatus img').count(), 0);
    assert.ok((await first.locator('[data-fixture="benign"] .aliveinternet-flag').textContent()).includes(unsafeTitle));
    for (const invalid of [{ ...pack, hiddenCode: 'untrusted' }, { ...pack, sourceUrl: 'https://user:password@evidence.example.invalid/pack' }]) {
      await popup.locator('#status').evaluate(element => { element.textContent = ''; });
      await popup.locator('#importPack').setInputFiles({ name: 'invalid-pack.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
      await popup.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Import rejected'));
      assert.equal((await worker.evaluate(async () => (await chrome.storage.local.get('indicatorPack')).indicatorPack)).title, unsafeTitle);
    }
    await popup.locator('#importPack').setInputFiles({ name: 'oversize-pack.json', mimeType: 'application/json', buffer: Buffer.alloc(100_001, ' ') });
    await popup.waitForFunction(() => document.querySelector('#status')?.textContent.includes('100'));
    await popup.locator('#intelAdvisories').uncheck();
    await first.waitForFunction(() => document.querySelector('[data-fixture="benign"] .aliveinternet-flag') === null);
    await popup.locator('#intelAdvisories').check();
    await first.waitForFunction(() => document.querySelector('[data-fixture="benign"] .aliveinternet-flag') !== null);
    await popup.locator('#removePack').click();
    await first.waitForFunction(() => document.querySelector('[data-fixture="benign"] .aliveinternet-flag') === null);
    assert.equal(await first.locator('[data-fixture="benign"]').evaluate(el => el.style.display), '');
    assert.equal(receipt.network.some(request => request.url.includes('evidence.example.invalid') || /(?:https?:\/\/[^/]+)?\/x$/.test(request.url)), false, 'Untrusted provenance/title cannot cause fetches');
    await popup.locator('#intelAdvisories').uncheck();
  });
  await check('MV3 worker restart retains authoritative settings and resumes writes', async () => {
    await worker.evaluate(() => { globalThis.__aliveinternetFixtureRestartMarker = 'before-stop'; });
    const targetSession = await context.newCDPSession(popup);
    const versions = new Map();
    const subscribers = new Set();
    targetSession.on('ServiceWorker.workerVersionUpdated', event => {
      for (const version of event.versions) versions.set(version.versionId, version);
      for (const notify of subscribers) notify();
    });
    const waitVersion = predicate => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { subscribers.delete(notify); reject(new Error('Timed out waiting for extension worker status')); }, 10_000);
      const notify = () => {
        const match = [...versions.values()].find(version => version.scriptURL === worker.url() && predicate(version));
        if (match) { clearTimeout(timer); subscribers.delete(notify); resolve(match); }
      };
      subscribers.add(notify); notify();
    });
    await targetSession.send('ServiceWorker.enable');
    const previous = await waitVersion(version => version.runningStatus === 'running');
    await targetSession.send('ServiceWorker.stopWorker', { versionId: previous.versionId });
    await waitVersion(version => version.runningStatus === 'stopped');
    const response = await send(popup, { kind: 'preferences', patch: { mode: 'conservative' } });
    assert.equal(response.ok, true);
    const running = await waitVersion(version => version.runningStatus === 'running');
    receipt.metrics.workerRestart = { stoppedObserved: true, previous, running };
    worker = context.serviceWorkers().find(candidate => candidate.url() === previous.scriptURL);
    assert.ok(worker);
    assert.equal(await worker.evaluate(() => globalThis.__aliveinternetFixtureRestartMarker), undefined, 'Restarted execution context must not retain volatile globals');
    const current = await settings(worker);
    assert.equal(current.mode, 'conservative');
    assert.ok(current.blockedAccounts.includes('youtube:@imported'));
    assert.equal((await send(popup, { kind: 'preferences', patch: { mode: 'balanced' } })).ok, true);
    await targetSession.detach();
  });
  await check('popup controls have labels and enable toggle supports keyboard use', async () => {
    const unlabeled = await popup.evaluate(() => [...document.querySelectorAll('input:not([type=file]),select,textarea,button')].filter(el => {
      if (el.getAttribute('aria-label') || el.labels?.length || (el.tagName === 'BUTTON' && el.textContent.trim())) return false;
      return true;
    }).map(el => el.id));
    assert.deepEqual(unlabeled, []);
    await popup.locator('#enabled').focus();
    await popup.keyboard.press('Space');
    await waitHidden(second, 0);
    await popup.waitForFunction(() => document.querySelectorAll('#platforms input').length === 10 && document.querySelector('#enabled')?.disabled === false);
    // Saving temporarily disables the checkbox; browsers may move focus away.
    // Re-focus the intended control before the second keyboard interaction.
    await popup.locator('#enabled').focus();
    await popup.keyboard.press('Space');
    await waitHidden(second, 2);
    await popup.screenshot({ path: path.join(output, 'popup-keyboard.png'), fullPage: true });
  });
  await check('unconsented optional site has no injected controller', async () => {
    const optional = await context.newPage();
    const optionalSession = await context.newCDPSession(optional);
    const injectedScripts = [];
    optionalSession.on('Debugger.scriptParsed', event => { if (event.url.startsWith(`chrome-extension://${extensionId}/`)) injectedScripts.push(event.url); });
    await optionalSession.send('Debugger.enable');
    await optional.goto('https://www.x.com/aliveinternet-authorized-synthetic');
    await optional.waitForTimeout(1000);
    assert.equal(await optional.locator('[class*="aliveinternet-"]').count(), 0);
    assert.equal(await worker.evaluate(() => chrome.permissions.contains({ origins: ['https://www.x.com/*'] })), false);
    const registrations = await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts());
    assert.equal(registrations.length, 0);
    assert.deepEqual(injectedScripts, [], 'Unconsented origin must not execute an extension script');
    await optional.close();
  });
  await check('1400-item feed completes in batches and stays quiet while idle', async () => {
    const large = await context.newPage();
    const session = await context.newCDPSession(large);
    await session.send('Performance.enable');
    const start = performance.now();
    await large.goto(fixtureURL('large') + '&large=1');
    await waitHidden(large, 1400);
    receipt.metrics.largeFeed = { itemCount: 1401, hiddenCount: 1400, readyMs: Math.round(performance.now() - start), ...(await large.evaluate(() => window.fixtureMetrics)) };
    await large.waitForTimeout(650); // Finish the last partial batch and observer delivery before idle measurement.
    const before = await session.send('Performance.getMetrics');
    const mutationsBefore = await large.evaluate(() => window.fixtureMetrics.mutations);
    await large.waitForTimeout(1200);
    const after = await session.send('Performance.getMetrics');
    const value = (metrics, name) => metrics.metrics.find(metric => metric.name === name)?.value || 0;
    receipt.metrics.idle = { intervalMs: 1200, rendererTaskSeconds: value(after, 'TaskDuration') - value(before, 'TaskDuration'), rendererScriptSeconds: value(after, 'ScriptDuration') - value(before, 'ScriptDuration'), uiMutations: (await large.evaluate(() => window.fixtureMetrics.mutations)) - mutationsBefore };
    assert.equal(receipt.metrics.idle.uiMutations, 0, 'Extension should not mutate static feed repeatedly');
    assert.ok(receipt.metrics.idle.rendererTaskSeconds < 0.3, 'Static fixture idle renderer task time exceeded 300ms in 1.2s');
    assert.ok(receipt.metrics.largeFeed.readyMs < 20_000, 'Large synthetic feed exceeded harness budget');
    const largeTab = await tabId(worker, large.url());
    const reviewFirst = await tabMessage(popup, largeTab, { type: 'aliveinternet/hidden-items', offset: 0 });
    const reviewSecond = await tabMessage(popup, largeTab, { type: 'aliveinternet/hidden-items', offset: 50 });
    assert.equal(reviewFirst.total, 1400);
    assert.equal(reviewFirst.items.length, 50);
    assert.equal(reviewFirst.truncated, true);
    assert.equal(reviewSecond.items.length, 50);
    assert.ok(reviewSecond.items.every(item => !reviewFirst.items.some(previous => previous.pageItemId === item.pageItemId)));
    await large.bringToFront();
    await popup.locator('#refreshHidden').click();
    await popup.waitForFunction(() => document.querySelector('#hiddenSummary')?.textContent.includes('of 1400'));
    await popup.locator('#nextHidden').click();
    await popup.waitForFunction(() => document.querySelector('#hiddenSummary')?.textContent.includes('51–100'));
    await popup.locator('#previousHidden').click();
    await popup.waitForFunction(() => document.querySelector('#hiddenSummary')?.textContent.includes('1–50'));
    await large.screenshot({ path: path.join(output, 'large-feed.png') });
    await large.close();
  });
  await check('synthetic release screenshots and reversible demo use production UI', async () => {
    const media = path.join(output, 'media');
    await mkdir(media);
    const demo = await context.newPage();
    await demo.setViewportSize({ width: 1280, height: 800 });
    await demo.goto(fixtureURL('media'));
    await waitHidden(demo, 2);
    await demo.addStyleTag({ content: 'body{margin:0;padding:48px 80px;background:#f4f7fb;color:#182b46;font:18px/1.5 system-ui}h1{font-size:30px;margin:0 0 24px}main{background:white;border:1px solid #dae2ee;border-radius:16px;padding:28px}ytd-comment-view-model{padding:12px;margin:12px 0;border-bottom:1px solid #e5ebf3}a{color:#245080;text-decoration:none}' });
    await demo.locator('h1').evaluate(el => { el.textContent = 'AliveInternet · synthetic demonstration'; });
    await popup.locator('#enabled').uncheck(); await waitHidden(demo, 0);
    await demo.screenshot({ path: path.join(media, 'before.png') });
    await popup.locator('#enabled').check(); await waitHidden(demo, 2);
    await demo.screenshot({ path: path.join(media, 'after.png') });
    await demo.locator('.aliveinternet-collapsed').first().getByRole('button', { name: 'Reveal hidden comment' }).click();
    await waitHidden(demo, 1);
    await demo.screenshot({ path: path.join(media, 'reveal.png') });
    await demo.bringToFront();
    await popup.locator('#refreshHidden').click();
    await popup.waitForFunction(() => document.querySelector('#hiddenSummary')?.textContent.includes('of 1'));
    await popup.setViewportSize({ width: 350, height: 740 });
    await popup.evaluate(() => window.scrollTo(0, 0));
    const popupImage = await popup.screenshot();
    const layout = await context.newPage(); await layout.setViewportSize({ width: 1280, height: 800 });
    await layout.setContent(`<style>body{margin:0;background:#f4f7fb;color:#182b46;font:24px/1.5 system-ui;display:flex;gap:64px;padding:30px 100px}img{width:350px;height:740px;box-shadow:0 8px 28px #182b4620;border-radius:12px}section{padding-top:120px;max-width:530px}h1{font-size:40px}small{font-size:17px}</style><img src="data:image/png;base64,${popupImage.toString('base64')}"><section><h1>Your filtering choices,<br>in your browser.</h1><p>Review hidden comments.<br>Show them temporarily.<br>Change filtering preferences.</p><small>AliveInternet 0.3 alpha<br>Production popup · synthetic demonstration<br>Additional controls are available by scrolling.</small></section>`);
    await layout.screenshot({ path: path.join(media, 'popup.png') });
    await layout.close();
    const promo = await context.newPage(); await promo.setViewportSize({ width: 440, height: 280 });
    const icon = await readFile(path.join(extensionDir, 'icons/128.png'));
    await promo.setContent(`<style>body{margin:0;padding:28px;background:#10213e;color:#fff;font:17px/1.45 system-ui}img{width:56px;float:right}h1{font-size:30px;margin:0 0 14px}p{margin:10px 0}small{color:#b9cbed}</style><img src="data:image/png;base64,${icon.toString('base64')}"><h1>AliveInternet</h1><p>Explainable spam filtering.<br>Local and reversible.</p><small>Experimental alpha · YouTube first<br>Open source · No telemetry</small>`);
    await promo.screenshot({ path: path.join(media, 'promo-440x280.png') });
    const frames = ['before', 'before', 'after', 'after', 'after', 'reveal', 'reveal', 'after', 'after', 'before'];
    for (let i = 0; i < frames.length; i++) await writeFile(path.join(media, `frame-${i}.png`), await readFile(path.join(media, frames[i] + '.png')));
    execFileSync(process.env.ALIVEINTERNET_FFMPEG || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', path.join(media, 'frame-%d.png'), '-vf', 'split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', path.join(media, 'before-after.gif')]);
    receipt.metrics.media = { synthetic: true, screenshots: [1280, 800], promo: [440, 280], demoSeconds: 10, demoBytes: (await readFile(path.join(media, 'before-after.gif'))).length };
    assert.ok(receipt.metrics.media.demoBytes < 8_000_000);
    await promo.close(); await demo.close();
  });
  await check('optional-site pending consent; headed grant and revocation path', async () => {
    const toggle = popup.locator('#platforms input[data-platform="x"]');
    await toggle.check();
    if (process.env.ALIVEINTERNET_BROWSER_HEADED !== '1' || process.env.ALIVEINTERNET_BROWSER_PENDING_CONSENT_ONLY === '1') {
      await popup.waitForTimeout(500);
      assert.equal(await popup.evaluate(() => chrome.permissions.contains({ origins: ['https://www.x.com/*'] })), false);
      assert.equal((await settings(worker)).platforms.x, false);
      assert.deepEqual(await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts()), []);
      receipt.metrics.optionalAccess = { pendingPromptUnresolved: true, headlessPromptUnresolved: process.env.ALIVEINTERNET_BROWSER_HEADED !== '1', noPreferenceEnable: true, noRegistration: true, nativePromptManuallyVerified: false };
      await popup.reload();
      return;
    }
    console.log('Waiting for native X site-access approval in the isolated fixture browser');
    await poll(() => popup.evaluate(async () => (await chrome.permissions.contains({ origins: ['https://www.x.com/*'] })) && (await chrome.scripting.getRegisteredContentScripts()).some(script => script.id === 'aliveinternet-site-x')), 60_000);
    receipt.metrics.optionalBeforeNavigation = { registrations: await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts()), grants: await worker.evaluate(() => chrome.permissions.getAll()), settings: await settings(worker) };
    const optional = await context.newPage();
    await optional.goto('https://www.x.com/aliveinternet-authorized-synthetic');
    await waitHidden(optional, 1);
    assert.equal(await popup.evaluate(() => chrome.permissions.remove({ origins: ['https://x.com/*', 'https://www.x.com/*', 'https://twitter.com/*', 'https://www.twitter.com/*'] })), true);
    await waitHidden(optional, 0);
    await poll(() => popup.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length === 0));
    await optional.reload();
    await optional.waitForTimeout(500);
    assert.equal(await optional.locator('[class*="aliveinternet-"]').count(), 0);
    await toggle.uncheck();
    await optional.close();
    receipt.metrics.optionalAccess = { grantedThroughPopup: true, dynamicInjection: true, revokedThroughBrowserAPI: true, restoredExistingTab: true, reloadWithheld: true, nativePromptManuallyVerified: false };
  });
  await popup.screenshot({ path: path.join(output, 'popup.png'), fullPage: true });
  assert.equal(receipt.errors.length, 0, JSON.stringify(receipt.errors));
  receipt.status = 'passed';
  console.log(`browser fixtures passed (${receipt.checks.length} checks); evidence: ${output}`);
} catch (error) {
  receipt.status = 'failed';
  receipt.failure = error?.stack || String(error);
  console.error(receipt.failure);
  process.exitCode = 1;
  await checkpoint(); // Preserve failure even if screenshot capture stalls.
  if (context) for (const [index, page] of context.pages().entries()) await page.screenshot({ path: path.join(output, `failure-page-${index}.png`), fullPage: true, timeout: 5000 }).catch(() => {});
} finally {
  receipt.finishedAt = new Date().toISOString();
  await checkpoint();
  await context?.close().catch(error => { console.error(`Browser cleanup failed: ${error}`); });
  // Only remove the exact fresh temporary profile, never the user's browser data.
  if (profile && receipt.status === 'passed' && process.env.ALIVEINTERNET_KEEP_PROFILE !== '1') await rm(profile, { recursive: true, force: true });
  console.log(`Browser receipt: ${path.join(output, 'receipt.json')}`);
}
