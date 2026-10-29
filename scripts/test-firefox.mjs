import assert from 'node:assert/strict';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { firefox } from 'playwright';
import { youtubeFixture } from '../tests/browser/youtube-fixture.mjs';

// Mozilla's temporary-addon RDP installation in a disposable synthetic profile.
// Local debugger only; no user browser, signed-install claim or platform traffic.
const project = fileURLToPath(new URL('../', import.meta.url));
const extension = path.resolve(process.env.ALIVEINTERNET_EXTENSION_DIR || path.join(project, '.output/firefox-mv3'));
const output = path.resolve(process.env.ALIVEINTERNET_FIREFOX_ARTIFACTS || path.join(project, 'artifacts/firefox', new Date().toISOString().replace(/[:.]/g, '-')));
await mkdir(output, { recursive: true });
const receipt = { startedAt: new Date().toISOString(), status: 'running', scope: 'Production Firefox MV3 temporarily installed through Mozilla RDP on localhost; synthetic intercepted pages only. Not signed-store, Android or live-site evidence.', checks: [], metrics: {}, errors: [] };
let context, socket, profile;
const checkpoint = () => writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
const check = async (name, action) => { const start = performance.now(); await action(); receipt.checks.push({ name, elapsedMs: Math.round(performance.now() - start) }); console.log('PASS ' + name); await checkpoint(); };
async function hashes(directory, prefix = '') {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) Object.assign(result, await hashes(path.join(directory, entry.name), prefix + entry.name + '/'));
    else if (entry.isFile()) result[prefix + entry.name] = createHash('sha256').update(await readFile(path.join(directory, entry.name))).digest('hex');
  }
  return result;
}
async function poll(action, timeout = 15000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) { if (await action()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error('Firefox state wait timed out');
}
const waitHidden = (page, count) => page.waitForFunction(count => document.querySelectorAll('.aliveinternet-collapsed').length === count, count, { timeout: 15000 });
try {
  const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
  receipt.buildSha256 = await hashes(extension);
  receipt.harnessSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.background.scripts.length);
  const id = manifest.browser_specific_settings.gecko.id;
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
  const reserve = net.createServer(); await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  profile = await mkdtemp(path.join(os.tmpdir(), 'aliveinternet-firefox-fixture-'));
  receipt.profile = profile;
  context = await firefox.launchPersistentContext(profile, {
    executablePath: process.env.ALIVEINTERNET_FIREFOX_PATH || undefined, headless: process.env.ALIVEINTERNET_BROWSER_HEADED !== '1',
    viewport: { width: 1100, height: 850 }, args: ['--start-debugger-server', String(port)],
    firefoxUserPrefs: { 'devtools.debugger.remote-enabled': true, 'devtools.debugger.prompt-connection': false, 'devtools.debugger.force-local': true },
  });
  context.on('page', page => page.on('pageerror', error => receipt.errors.push(String(error))));
  let buffer = Buffer.alloc(0), failure;
  const messages = [], targets = [], evaluations = new Map();
  socket = net.connect(port, '127.0.0.1');
  socket.on('error', error => { failure = error; });
  socket.on('data', bytes => {
    try {
      buffer = Buffer.concat([buffer, bytes]);
      if (buffer.length > 5_000_000) throw new Error('Debugger packet exceeded limit');
      while (true) {
        const colon = buffer.indexOf(':'); if (colon < 0) break;
        const length = Number(buffer.subarray(0, colon).toString());
        if (!Number.isSafeInteger(length) || length < 0 || length > 5_000_000) throw new Error('Invalid debugger packet');
        if (buffer.length < colon + 1 + length) break;
        const message = JSON.parse(buffer.subarray(colon + 1, colon + 1 + length).toString());
        if (message.type === 'target-available-form') targets.push(message.target);
        if (message.type === 'evaluationResult') evaluations.set(message.resultID, message);
        messages.push(message);
        buffer = buffer.subarray(colon + 1 + length);
      }
    } catch (error) { failure = error; socket.destroy(); }
  });
  const receive = async () => { await poll(() => { if (failure) throw failure; return messages.length > 0; }); return messages.shift(); };
  assert.equal((await receive()).applicationType, 'browser');
  const request = async data => {
    const bytes = Buffer.from(JSON.stringify(data)); socket.write(Buffer.concat([Buffer.from(bytes.length + ':'), bytes]));
    const deadline = performance.now() + 15000;
    while (performance.now() < deadline) { const message = await receive(); if (message.from === data.to && !message.type) { if (message.error) throw new Error('Debugger request rejected: ' + message.error); return message; } }
    throw new Error('Debugger request timed out');
  };
  await check('production MV3 package temporarily installed in Firefox', async () => {
    const root = await request({ to: 'root', type: 'getRoot' });
    assert.ok(root.addonsActor);
    const installed = await request({ to: root.addonsActor, type: 'installTemporaryAddon', addonPath: extension, openDevTools: false });
    assert.equal(installed.addon.id, id);
  });
  const installedAddons = await request({ to: 'root', type: 'listAddons' });
  receipt.metrics.installedAddon = installedAddons.addons?.find(addon => addon.id === id);
  await checkpoint();
  await context.route(url => ['http:', 'https:'].includes(url.protocol), async route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.youtube.com' && route.request().isNavigationRequest()) await route.fulfill({ status: 200, contentType: 'text/html', body: youtubeFixture(url.href) });
    else if (url.hostname === 'www.x.com' && route.request().isNavigationRequest()) await route.fulfill({ status: 200, contentType: 'text/html', body: '<article data-testid="tweet"><div data-testid="tweetText">Contact me on Telegram for guaranteed crypto profit!</div></article>' });
    else await route.abort();
  });
  const first = await context.newPage(), second = await context.newPage();
  receipt.browserVersion = await first.evaluate(() => navigator.userAgent);
  await check('two content tabs filter independently and preserve benign replies', async () => {
    await first.goto('https://www.youtube.com/watch?v=aliveinternet-synthetic-firefox-1');
    await second.goto('https://www.youtube.com/watch?v=aliveinternet-synthetic-firefox-2');
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
    assert.equal(await first.locator('[data-fixture="benign-reply"]').evaluate(el => el.style.display), '');
  });
  const watcherResponse = await request({ to: receipt.metrics.installedAddon.actor, type: 'getWatcher', isServerTargetSwitchingEnabled: true });
  receipt.metrics.popupTargetDiagnostic = watcherResponse;
  await checkpoint();
  const watcher = watcherResponse.watcher || watcherResponse;
  await request({ to: typeof watcher === 'string' ? watcher : watcher.actor, type: 'watchTargets', targetType: 'frame' });
  await poll(() => targets.some(target => target.url?.endsWith('/_generated_background_page.html') && target.consoleActor));
  const target = targets.find(target => target.url?.endsWith('/_generated_background_page.html') && target.consoleActor);
  const rawEval = async (actor, text) => {
    const response = await request({ to: actor, type: 'evaluateJSAsync', text });
    await poll(() => evaluations.has(response.resultID));
    const result = evaluations.get(response.resultID); evaluations.delete(response.resultID);
    if (result.hasException || result.exception) {
      receipt.metrics.debugFailure = { message: result.exceptionMessage, targets: targets.map(target => ({ url: target.url, consoleActor: target.consoleActor })) };
      throw new Error('Extension debug evaluation failed');
    }
    return result.result;
  };
  const remoteEval = async (actor, text) => {
    const key = '__aliveinternetFixture_' + crypto.randomUUID().replaceAll('-', '');
    await rawEval(actor, `void (async()=>{try{globalThis[${JSON.stringify(key)}]=JSON.stringify({value:await (${text})})}catch{globalThis[${JSON.stringify(key)}]=JSON.stringify({failed:true})}})()`);
    await poll(async () => (await rawEval(actor, `typeof globalThis[${JSON.stringify(key)}]==='string'`)) === true);
    const result = JSON.parse(await rawEval(actor, `globalThis[${JSON.stringify(key)}]`));
    await rawEval(actor, `delete globalThis[${JSON.stringify(key)}]`);
    if (result.failed) throw new Error('Extension debug operation failed');
    return result.value;
  };
  await remoteEval(target.consoleActor, 'await browser.tabs.create({windowId:(await browser.tabs.query({url:"https://www.youtube.com/*"}))[0].windowId,url: browser.runtime.getURL("popup.html")})');
  await poll(() => targets.some(target => target.url?.endsWith('/popup.html') && target.consoleActor));
  const popupActor = targets.find(target => target.url?.endsWith('/popup.html') && target.consoleActor).consoleActor;
  await remoteEval(target.consoleActor, 'await browser.tabs.create({windowId:(await browser.tabs.query({url:"https://www.youtube.com/*"}))[0].windowId,url: browser.runtime.getURL("options.html")})');
  await poll(() => targets.some(target => target.url?.endsWith('/options.html') && target.consoleActor));
  const optionsActor = targets.find(target => target.url?.endsWith('/options.html') && target.consoleActor).consoleActor;
  assert.equal(await remoteEval(popupActor, 'Boolean(document.querySelector("#openSettings"))'), true);
  receipt.metrics.popupControl = 'Real extension document via Mozilla console actor; driver cannot expose privileged pages. Programmatic DOM handlers, not pointer hit testing.';
  const options = {
    evaluate: async (fn, arg) => JSON.parse(await remoteEval(optionsActor, `JSON.stringify(await (${fn.toString()})(${JSON.stringify(arg) ?? 'undefined'}))`)),
    waitForFunction: async fn => poll(async () => (await remoteEval(optionsActor, `Boolean((${fn.toString()})())`)) === true),
    locator: selector => ({
      check: async () => remoteEval(optionsActor, `document.querySelector(${JSON.stringify(selector)}).checked || document.querySelector(${JSON.stringify(selector)}).click()`),
      uncheck: async () => remoteEval(optionsActor, `!document.querySelector(${JSON.stringify(selector)}).checked || document.querySelector(${JSON.stringify(selector)}).click()`),
    }),
    getByRole: (_role, { name }) => ({ click: async () => remoteEval(optionsActor, `Array.from(document.querySelectorAll('button')).find(button=>button.getAttribute('aria-label')===${JSON.stringify(name)}).click()`) }),
  };
  await options.waitForFunction(() => document.querySelectorAll('#platforms input').length === 10 && document.querySelector('#enabled')?.disabled === false);
  await check('compact Firefox toolbar reports counts and pauses only YouTube', async () => {
    await remoteEval(target.consoleActor, 'await browser.tabs.update((await browser.tabs.query({url: "https://www.youtube.com/*"}))[0].id,{active:true})');
    await remoteEval(popupActor, 'document.querySelector("#refreshPage").click(), true');
    try { await poll(async () => await remoteEval(popupActor, 'document.querySelector("#pageCount").textContent') === '2'); }
    catch (error) {
      receipt.metrics.toolbarDiagnostic = await remoteEval(popupActor, 'JSON.stringify({tabs:await browser.tabs.query({}),active:await browser.tabs.query({active:true,currentWindow:true}),state:document.querySelector("#pageState").textContent,detail:document.querySelector("#pageDetail").textContent,status:document.querySelector("#status").textContent})');
      throw error;
    }
    await remoteEval(popupActor, 'document.querySelector("#siteToggle").click(), true');
    await Promise.all([waitHidden(first, 0), waitHidden(second, 0)]);
    await poll(async () => await remoteEval(popupActor, 'document.querySelector("#pageState").textContent') === 'Paused on this site');
    assert.equal(await remoteEval(popupActor, 'document.querySelector("#pageCount").textContent'), '—');
    await poll(async () => await remoteEval(popupActor, '!document.querySelector("#siteToggle").disabled'));
    await remoteEval(popupActor, 'document.querySelector("#siteToggle").click(), true');
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
  });
  await check('settings disabling restores both tabs and enabling resumes filtering', async () => {
    await options.locator('#enabled').uncheck(); await Promise.all([waitHidden(first, 0), waitHidden(second, 0)]);
    assert.equal(await first.locator('[data-fixture="spam-parent"]').evaluate(el => el.style.display), 'flex');
    await options.waitForFunction(() => !document.querySelector('#enabled').disabled);
    await options.locator('#enabled').check(); await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
  });
  await check('temporary reveal is isolated and reload resets it', async () => {
    await first.locator('.aliveinternet-collapsed').first().getByRole('button', { name: 'Reveal hidden comment' }).click();
    await waitHidden(first, 1); await waitHidden(second, 2);
    await first.reload(); await waitHidden(first, 2);
  });
  await check('real background serializes concurrent mutations and settings unhide restores content', async () => {
    const responses = await options.evaluate(() => Promise.all(['@fixture-a', '@fixture-b'].map(accountKey => browser.runtime.sendMessage({ type: 'aliveinternet/settings-mutation', mutation: { kind: 'account', platform: 'youtube', accountKey, blocked: true } }))));
    assert.ok(responses.every(response => response.ok));
    const stored = await options.evaluate(async () => (await browser.storage.local.get('settings')).settings);
    assert.ok(stored.blockedAccounts.includes('youtube:@fixture-a') && stored.blockedAccounts.includes('youtube:@fixture-b'));
    await first.locator('[data-fixture="benign"] .aliveinternet-account-action').click();
    await Promise.all([waitHidden(first, 3), waitHidden(second, 3)]);
    await options.getByRole('button', { name: 'Unhide @benign on YouTube' }).click();
    await Promise.all([waitHidden(first, 2), waitHidden(second, 2)]);
  });
  await check('optional origin remains ungranted with no content UI', async () => {
    assert.equal(await options.evaluate(() => browser.permissions.contains({ origins: ['https://www.x.com/*'] })), false);
    const optional = await context.newPage(); await optional.goto('https://www.x.com/fixture'); await optional.waitForTimeout(500);
    assert.equal(await optional.locator('[class*="aliveinternet-"]').count(), 0); await optional.close();
  });
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'passed'; console.log(`Firefox fixtures passed (${receipt.checks.length} checks)`);
} catch (error) {
  receipt.status = 'failed'; receipt.failure = String(error); process.exitCode = 1; console.error(receipt.failure);
} finally {
  socket?.destroy(); await context?.close();
  if (profile && receipt.status === 'passed') await rm(profile, { recursive: true, force: true });
  receipt.finishedAt = new Date().toISOString(); await checkpoint(); console.log('Firefox receipt: ' + path.join(output, 'receipt.json'));
}
