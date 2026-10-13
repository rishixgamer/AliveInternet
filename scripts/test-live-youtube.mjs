import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit opt-in anonymous live page smoke. Never import this from product code.
// Observe one normally rendered public page; no direct APIs, scraping loops,
// sign-in, posting, moderation, screenshots, DOM dumps, or persisted identities/text.
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const extensionDir = path.resolve(process.env.ALIVEINTERNET_EXTENSION_DIR || path.join(root, '.output/chrome-mv3'));
const output = path.resolve(process.env.ALIVEINTERNET_LIVE_ARTIFACTS || path.join(root, 'artifacts/live-youtube', new Date().toISOString().replace(/[:.]/g, '-')));
const url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
await mkdir(output, { recursive: true });
const receipt = { startedAt: new Date().toISOString(), status: 'running', scope: 'One anonymous public YouTube watch page, locally rendered DOM only; aggregate evidence, no content or identities saved.', page: url, checks: [], metrics: {} };
let context;
let profile;
let popup;
let liveContentAvailable = false;
let livePage;
const checkpoint = () => writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
const check = async (name, action) => { const start = performance.now(); await action(); receipt.checks.push({ name, elapsedMs: Math.round(performance.now() - start) }); await checkpoint(); };
async function hashes(directory, prefix = '') {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) Object.assign(result, await hashes(path.join(directory, entry.name), prefix + entry.name + '/'));
    else if (entry.isFile()) result[prefix + entry.name] = createHash('sha256').update(await readFile(path.join(directory, entry.name))).digest('hex');
  }
  return result;
}
const send = mutation => popup.evaluate(mutation => chrome.runtime.sendMessage({ type: 'aliveinternet/settings-mutation', mutation }), mutation);
try {
  receipt.phase = 'browser-prerequisites';
  const { chromium } = process.env.ALIVEINTERNET_PLAYWRIGHT_MODULE ? await import(process.env.ALIVEINTERNET_PLAYWRIGHT_MODULE) : await import('playwright');
  const manifest = JSON.parse(await readFile(path.join(extensionDir, 'manifest.json'), 'utf8'));
  receipt.buildSha256 = await hashes(extensionDir);
  profile = await mkdtemp(path.join(os.tmpdir(), 'aliveinternet-live-youtube-'));
  context = await chromium.launchPersistentContext(profile, {
    channel: process.env.ALIVEINTERNET_BROWSER_PATH ? undefined : 'chromium', executablePath: process.env.ALIVEINTERNET_BROWSER_PATH || undefined,
    headless: process.env.ALIVEINTERNET_BROWSER_HEADED !== '1', viewport: { width: 1100, height: 850 }, locale: 'en-US',
    args: [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15_000 });
  receipt.browserVersion = await worker.evaluate(() => navigator.userAgent);
  popup = await context.newPage();
  await popup.goto(`chrome-extension://${new URL(worker.url()).hostname}/${manifest.action.default_popup}`);
  await popup.waitForFunction(() => document.querySelectorAll('#platforms input').length === 10 && document.querySelector('#enabled')?.disabled === false);
  // Disable heuristic filtering and visible-page inspectors before loading the site.
  assert.equal((await send({ kind: 'preferences', patch: { filterComments: false, filterPosts: false, filterAccounts: false, inspectAccounts: false, showBlockControls: false } })).ok, true);
  const page = await context.newPage();
  livePage = page;
  const start = performance.now();
  receipt.phase = 'public-page-navigation';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  // Only bounded ordinary scrolling. No navigation/profile visits/API harvesting.
  let commentsFound = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.evaluate(() => window.scrollBy(0, 700));
    await page.waitForTimeout(1000);
    commentsFound = await page.locator('ytd-comment-view-model #content-text, ytd-comment-renderer #content-text').count() > 0;
    if (commentsFound) break;
  }
  receipt.metrics.loadAndScrollMs = Math.round(performance.now() - start);
  receipt.metrics.selectors = await page.evaluate(() => Object.fromEntries([
    'ytd-comment-view-model', 'ytd-comment-renderer', 'ytd-comment-thread-renderer', 'ytd-comment-replies-renderer',
    'ytd-comment-view-model #content-text', 'ytd-comment-renderer #content-text',
  ].map(selector => [selector, document.querySelectorAll(selector).length])));
  liveContentAvailable = commentsFound;
  receipt.phase = 'rendered-comment-controls';
  if (!commentsFound) {
    receipt.status = 'blocked';
    receipt.reason = 'Public watch page did not render recognizable comment content after eight bounded scrolls. Consent, access restrictions, changed markup, or unavailable comments require separate manual investigation.';
    process.exitCode = 2;
  } else {
    await check('modern live comment selectors and reversible local controls', async () => {
      assert.equal((await send({ kind: 'preferences', patch: { showBlockControls: true, filterAccounts: true } })).ok, true);
      await page.waitForFunction(() => document.querySelectorAll('ytd-comment-view-model .aliveinternet-account-action, ytd-comment-renderer .aliveinternet-account-action').length > 0, undefined, { timeout: 15_000 });
      receipt.metrics.commentControls = await page.locator('ytd-comment-view-model .aliveinternet-account-action, ytd-comment-renderer .aliveinternet-account-action').count();
      assert.equal(await page.locator('.aliveinternet-collapsed').count(), 0);
      await popup.locator('#platforms input[data-platform="youtube"]').uncheck();
      await page.waitForFunction(() => document.querySelectorAll('[class^="aliveinternet-"], [class*=" aliveinternet-"]').length === 0, undefined, { timeout: 15_000 });
      await popup.locator('#platforms input[data-platform="youtube"]').check();
      await page.waitForFunction(() => document.querySelectorAll('.aliveinternet-account-action').length > 0, undefined, { timeout: 15_000 });
    });
    receipt.phase = 'expanded-live-replies';
    await check('bounded live reply expansion and own-profile control attribution', async () => {
      const before = await page.locator('ytd-comment-replies-renderer ytd-comment-view-model, ytd-comment-replies-renderer ytd-comment-renderer').count();
      // Click one ordinary replies expander; no author visits, content collection or API access.
      const expanders = page.locator('ytd-comment-replies-renderer').getByRole('button', { name: /repl(?:y|ies)/i });
      const expander = expanders.first();
      receipt.metrics.replyExpandersVisible = await expanders.count();
      if (!await expander.count()) throw Object.assign(new Error('Reply expansion unavailable'), { name: 'LiveScopeUnavailable' });
      await expander.click();
      await page.waitForFunction(before => document.querySelectorAll('ytd-comment-replies-renderer ytd-comment-view-model, ytd-comment-replies-renderer ytd-comment-renderer').length > before, before, { timeout: 15_000 });
      await page.waitForFunction(() => [...document.querySelectorAll('ytd-comment-replies-renderer ytd-comment-view-model, ytd-comment-replies-renderer ytd-comment-renderer')].some(root => root.querySelector('.aliveinternet-account-action')), undefined, { timeout: 15_000 });
      receipt.metrics.replies = await page.evaluate(() => {
        const replies = [...document.querySelectorAll('ytd-comment-replies-renderer ytd-comment-view-model, ytd-comment-replies-renderer ytd-comment-renderer')].filter(root => !root.querySelector('ytd-comment-view-model, ytd-comment-renderer'));
        let checked = 0, mismatched = 0, unknown = 0;
        for (const root of replies) {
          const anchor = root.querySelector('#author-text[href], a#author-text[href], #author-text a[href]');
          const button = root.querySelector('.aliveinternet-account-action');
          if (!anchor || !button) { unknown++; continue; }
          const url = new URL(anchor.href, location.href);
          // Compare only in memory. Neither key nor visible author is returned.
          const key = url.pathname.slice(1).toLowerCase();
          if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname) || url.protocol !== 'https:' || !/^(?:@[a-z\d._-]{2,40}|(?:channel|user|c)\/[a-z\d._-]{2,40})$/i.test(key)) { unknown++; continue; }
          checked++;
          if (button.textContent !== `Hide ${key} locally` || !root.contains(button)) mismatched++;
        }
        return { rendered: replies.length, checked, mismatched, unknown };
      });
      assert.ok(receipt.metrics.replies.checked > 0);
      assert.equal(receipt.metrics.replies.mismatched, 0);
      assert.equal(await page.locator('.aliveinternet-collapsed').count(), 0);
    });
    receipt.phase = 'reversible-synthetic-account-hide';
    await check('synthetic node account hidden, revealed and removed with live rule filtering off', async () => {
      const phrase = 'AliveInternet synthetic local smoke preference';
      const syntheticProfile = `@aliveinternet-smoke-${crypto.randomUUID().slice(0, 12)}`;
      const available = await page.evaluate(async ({ phrase, syntheticProfile }) => {
        const host = document.createElement('div');
        host.dataset.aliveinternetLiveFixture = 'synthetic';
        const synthetic = document.createElement('ytd-comment-renderer');
        synthetic.dataset.aliveinternetLiveTarget = 'synthetic';
        synthetic.style.display = 'block';
        host.append(synthetic); document.body.append(host);
        // Let any site custom-element connection work finish, then install only
        // the minimal synthetic author/text nodes; copy no live markup or data.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const author = document.createElement('a'); author.id = 'author-text';
        author.href = `/${syntheticProfile}`; author.textContent = 'AliveInternet synthetic smoke author';
        const content = document.createElement('div'); content.id = 'content-text'; content.textContent = phrase;
        synthetic.replaceChildren(author, content);
        return synthetic.isConnected;
      }, { phrase, syntheticProfile });
      assert.equal(available, true, 'A removable synthetic legacy fixture is connected to the live page');
      receipt.phase = 'synthetic-node-control';
      assert.equal((await send({ kind: 'preferences', patch: { mutedWords: [phrase] } })).ok, true);
      await page.waitForFunction(() => document.querySelector('[data-aliveinternet-live-target=\"synthetic\"] .aliveinternet-account-action') !== null, undefined, { timeout: 15_000 });
      receipt.phase = 'synthetic-node-hide';
      await page.locator('[data-aliveinternet-live-target=\"synthetic\"] .aliveinternet-account-action').evaluate(button => button.click());
      await page.waitForFunction(() => document.querySelector('[data-aliveinternet-live-target="synthetic"]')?.style.display === 'none', undefined, { timeout: 15_000 });
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('.aliveinternet-collapsed')].every(holder => holder.nextElementSibling?.matches('[data-aliveinternet-live-target=\"synthetic\"]'))), true, 'Only the synthetic node may be hidden');
      receipt.phase = 'synthetic-node-reveal';
      const revealed = await page.evaluate(() => {
        const target = document.querySelector('[data-aliveinternet-live-target="synthetic"]');
        const holder = target?.previousElementSibling;
        const reveal = holder?.querySelector('button[aria-label="Reveal hidden comment"]');
        if (!reveal) return false;
        reveal.click(); return target.style.display !== 'none';
      });
      assert.equal(revealed, true);
      assert.equal((await send({ kind: 'preferences', patch: { enabled: false, filterComments: false, filterPosts: false, mutedWords: [] } })).ok, true);
      await page.waitForFunction(() => document.querySelectorAll('[class^="aliveinternet-"], [class*=" aliveinternet-"]').length === 0, undefined, { timeout: 15_000 });
      await page.evaluate(() => document.querySelector('[data-aliveinternet-live-target="synthetic"]')?.remove());
    });
    receipt.status = 'passed';
    console.log('live YouTube smoke passed (one page; aggregate evidence only)');
  }
} catch (error) {
  receipt.status = liveContentAvailable && error?.name !== 'LiveScopeUnavailable' ? 'failed' : 'blocked';
  receipt.reason = receipt.status === 'blocked' ? 'Anonymous live page, reply-expansion scope or browser prerequisite unavailable; no full live validation claim.' : 'A reversible integration assertion failed on rendered live content.';
  receipt.errorType = error?.name || 'Error';
  if (livePage && liveContentAvailable) receipt.metrics.syntheticDiagnostic = await livePage.evaluate(() => {
    const clone = document.querySelector('[data-aliveinternet-live-target="synthetic"]');
    const author = clone?.querySelector('#author-text[href], a#author-text[href], #author-text a[href]');
    return {
      exists: Boolean(clone), connected: Boolean(clone?.isConnected),
      nestedCommentRoots: clone?.querySelectorAll('ytd-comment-view-model, ytd-comment-renderer').length || 0,
      syntheticTextIntact: clone?.querySelector('#content-text')?.textContent === 'AliveInternet synthetic local smoke preference',
      authorIsAnchor: author?.localName === 'a',
      syntheticProfileIntact: Boolean(author?.href?.includes('/@aliveinternet-smoke-')),
      controls: clone?.querySelectorAll('.aliveinternet-account-action').length || 0,
    };
  }).catch(() => ({ unavailable: true }));
  // No stack, page text, DOM, URLs from browser logs or profile identities in receipts.
  process.exitCode = receipt.status === 'blocked' ? 2 : 1;
} finally {
  // Always remove the synthetic node and clear synthetic preferences before closing.
  if (context) for (const page of context.pages()) await page.evaluate(() => document.querySelector('[data-aliveinternet-live-fixture=\"synthetic\"]')?.remove()).catch(() => {});
  if (popup) await popup.evaluate(async () => { await chrome.storage.local.clear(); }).catch(() => {});
  await context?.close().catch(() => {});
  // Live profiles are never retained: they may contain ordinary website cache/text.
  if (profile) await rm(profile, { recursive: true, force: true });
  receipt.finishedAt = new Date().toISOString();
  await checkpoint();
  console.log(`${receipt.status}: ${path.join(output, 'receipt.json')}`);
}
