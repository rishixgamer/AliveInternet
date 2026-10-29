import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { DEFAULT_SETTINGS } from '../src/core/preferences.ts';
import { SITE_ORIGINS, OPTIONAL_SITE_ORIGINS, SITE_ACCESS_CHECK, SITE_ACCESS_SYNC,
  SITE_ACCESS_CHANGED, siteScriptId } from '../src/extension/site-access.ts';

// Browser transport is simulated; production consent clients, worker, settings
// serialization, popup, content guard and controller run unchanged.
function event() {
  const listeners = new Set();
  return { listeners, addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); },
    emit(...args) { for (const fn of [...listeners]) fn(...args); } };
}
const workerMessages = event();
const contentMessages = event();
const storageChanged = event();
const added = event();
const removed = event();
let saved, granted, scripts, requests, registrationCalls, queryCalls, requestGranted, failWrite, senderUrl;
let beforeRead, beforeRegister;
const id = 'aliveinternet-test';
function dispatch(message, sender = { id, url: senderUrl }) {
  return new Promise((resolve, reject) => {
    let responded = false, asynchronous = false;
    for (const fn of workerMessages.listeners) {
      const result = fn(message, sender, response => { responded = true; resolve(response); });
      asynchronous ||= result === true;
    }
    if (!responded && !asynchronous) reject(new Error('No receiving end'));
  });
}
let currentMessages = workerMessages;
globalThis.chrome = {
  runtime: { id,
    onMessage: { addListener(fn) { currentMessages.addListener(fn); }, removeListener(fn) {
      workerMessages.removeListener(fn); contentMessages.removeListener(fn);
    } },
    sendMessage: dispatch },
  storage: {
    local: {
      async get() { const result = structuredClone(saved); if (beforeRead) await beforeRead(); return { settings: result }; },
      async set({ settings }) {
        if (failWrite) throw new Error('Storage failure');
        const oldValue = saved; saved = structuredClone(settings);
        storageChanged.emit({ settings: { newValue: saved, oldValue } }, 'local');
      },
    },
    onChanged: storageChanged,
  },
  permissions: {
    async contains({ origins }) { return origins.every(origin => granted.has(origin)); },
    async request({ origins }) {
      requests.push([...origins]);
      if (!requestGranted) return false;
      for (const origin of origins) granted.add(origin);
      added.emit({ origins }); return true;
    },
    async remove({ origins }) {
      for (const origin of origins) granted.delete(origin);
      removed.emit({ origins }); return true;
    },
    onAdded: added, onRemoved: removed,
  },
  scripting: {
    async getRegisteredContentScripts() { return [...scripts.values()]; },
    async registerContentScripts(entries) {
      if (beforeRegister) await beforeRegister();
      for (const entry of entries) {
        assert.equal(scripts.has(entry.id), false, 'no duplicate IDs');
        assert.ok(entry.matches.every(origin => granted.has(origin)), 'no registration without host permission');
        scripts.set(entry.id, structuredClone(entry)); registrationCalls.push(entry.id);
      }
    },
    async updateContentScripts(entries) {
      if (beforeRegister) await beforeRegister();
      for (const entry of entries) {
        assert.ok(scripts.has(entry.id));
        scripts.set(entry.id, structuredClone(entry));
      }
    },
    async unregisterContentScripts({ ids }) { for (const id of ids) scripts.delete(id); },
  },
  tabs: {
    async query(query) { assert.deepEqual(query, {}); queryCalls++; return [{ id: 1 }, {}]; },
    async sendMessage(tabId, message) {
      assert.equal(tabId, 1);
      contentMessages.emit(message, { id });
    },
  },
};
const { registerSiteAccess } = await import('../src/extension/site-access-background.ts');
const { setSiteAccess } = await import('../src/extension/site-access-popup.ts');
const { startWithSiteAccess } = await import('../src/extension/site-access-content.ts');
const { registerSettingsWriter } = await import('../src/extension/settings-background.ts');
const { updateSettings } = await import('../src/extension/settings.ts');
const { initializeSettingsPopup } = await import('../src/extension/popup-settings.ts');
const { startPlatformController } = await import('../src/extension/controller.ts');

async function settle() { for (let i = 0; i < 200; i++) await Promise.resolve(); }
async function sync() { assert.deepEqual(await dispatch({ type: SITE_ACCESS_SYNC }), { ok: true }); await settle(); }
function reset(settings = DEFAULT_SETTINGS) {
  for (const bus of [workerMessages, contentMessages, storageChanged, added, removed]) assert.equal(bus.listeners.size, 0);
  saved = structuredClone(settings); granted = new Set(SITE_ORIGINS.youtube); scripts = new Map();
  requests = []; registrationCalls = []; queryCalls = 0; requestGranted = true; failWrite = false;
  beforeRead = undefined; beforeRegister = undefined; senderUrl = 'https://x.com/home'; currentMessages = workerMessages;
}
async function withWorker(run, settings, seed) {
  reset(settings); if (seed) seed();
  const stopWriter = registerSettingsWriter();
  let stopAccess = registerSiteAccess();
  try {
    await sync();
    await run({ restart: async () => { stopAccess(); stopAccess = registerSiteAccess(); await sync(); } });
  } finally { await settle(); stopAccess(); stopWriter(); }
}
function guard(platform, start) {
  currentMessages = contentMessages;
  const stop = startWithSiteAccess(platform, start);
  currentMessages = workerMessages;
  return stop;
}
function enabled(platform) { return { ...DEFAULT_SETTINGS, platforms: { ...DEFAULT_SETTINGS.platforms, [platform]: true } }; }

test('startup keeps optional registrations absent and never requests access', async () => {
  await withWorker(async () => {
    assert.equal(scripts.size, 0); assert.equal(requests.length, 0);
    assert.equal((await dispatch({ type: SITE_ACCESS_CHECK, platform: 'youtube' }, { id, url: 'https://www.youtube.com/watch?v=fixture' })).allowed, true);
    assert.equal((await dispatch({ type: SITE_ACCESS_CHECK, platform: 'x' })).allowed, false);
    const count = queryCalls; await settle(); assert.equal(queryCalls, count, 'no idle polling');
  });
});

test('withholding required YouTube access in browser settings stops the static controller', async () => {
  await withWorker(async () => {
    senderUrl = 'https://www.youtube.com/watch?v=fixture';
    let active = false;
    const stop = guard('youtube', () => { active = true; return () => { active = false; }; });
    try {
      await settle(); assert.equal(active, true);
      // Browser UI can withhold a required host even though permissions.remove
      // cannot remove required origins through the extension API.
      granted.delete(SITE_ORIGINS.youtube[0]); removed.emit({ origins: [SITE_ORIGINS.youtube[0]] });
      await sync(); assert.equal(active, false); assert.equal(requests.length, 0);
    } finally { stop(); }
  });
});

test('imported enabled preferences alone cannot register or start an unconsented site', async () => {
  await withWorker(async () => {
    assert.equal(scripts.size, 0);
    let starts = 0;
    const stop = guard('x', () => { starts++; return () => {}; });
    try { await settle(); assert.equal(starts, 0); assert.equal(requests.length, 0); }
    finally { stop(); }
  }, enabled('x'));
});

test('permission grant occurs immediately before any async settings work and registers exact origins', async () => {
  await withWorker(async () => {
    const result = setSiteAccess('x', true);
    assert.deepEqual(requests, [SITE_ORIGINS.x], 'request called synchronously under user activation');
    await result;
    assert.equal(saved.platforms.x, true);
    assert.equal(scripts.size, 1);
    assert.deepEqual(scripts.get(siteScriptId('x')), {
      id: siteScriptId('x'), matches: SITE_ORIGINS.x, js: ['content-scripts/social.js'],
      css: ['content-scripts/social.css'], runAt: 'document_idle', persistAcrossSessions: true,
    });
  });
});

test('denied consent leaves durable settings disabled and grants no registration', async () => {
  await withWorker(async () => {
    requestGranted = false;
    await assert.rejects(setSiteAccess('reddit', true), /not granted/);
    assert.equal(saved.platforms.reddit, false); assert.equal(scripts.size, 0);
    assert.equal(SITE_ORIGINS.reddit.some(origin => granted.has(origin)), false);
  });
});

test('a failed preference write removes newly granted access but preserves earlier consent', async () => {
  await withWorker(async () => {
    failWrite = true;
    await assert.rejects(setSiteAccess('x', true), /save settings/);
    await sync();
    assert.equal(SITE_ORIGINS.x.some(origin => granted.has(origin)), false);
    assert.equal(saved.platforms.x, false); assert.equal(scripts.size, 0);
    for (const origin of SITE_ORIGINS.x) granted.add(origin);
    await assert.rejects(setSiteAccess('x', true), /save settings/);
    assert.ok(SITE_ORIGINS.x.every(origin => granted.has(origin)));
  });
});

test('a failed prior-permission snapshot is handled while the user prompt remains pending', async () => {
  await withWorker(async () => {
    const contains = chrome.permissions.contains;
    const request = chrome.permissions.request;
    let first = true, finish;
    chrome.permissions.contains = input => {
      if (first && input.origins[0] === SITE_ORIGINS.x[0]) {
        first = false; return Promise.reject(new Error('Snapshot unavailable'));
      }
      return contains(input);
    };
    chrome.permissions.request = input => new Promise(resolve => { finish = () => request(input).then(resolve); });
    try {
      const enable = setSiteAccess('x', true);
      await settle(); // Rejection must already be consumed while prompt is unresolved.
      finish(); await enable; await sync();
      assert.ok(scripts.has(siteScriptId('x')));
    } finally { chrome.permissions.contains = contains; chrome.permissions.request = request; }
  });
});

test('permission without an enabled preference never registers optional sites', async () => {
  await withWorker(async () => {
    assert.equal(scripts.size, 0); assert.equal((await dispatch({ type: SITE_ACCESS_CHECK, platform: 'x' })).allowed, false);
  }, DEFAULT_SETTINGS, () => { for (const origin of SITE_ORIGINS.x) granted.add(origin); });
});

test('worker restart reconciles stale persisted registrations and repairs script metadata', async () => {
  await withWorker(async ({ restart }) => {
    const stale = siteScriptId('reddit');
    scripts.set(stale, { id: stale });
    scripts.set(siteScriptId('x'), { id: siteScriptId('x'), js: ['obsolete.js'] });
    await restart();
    assert.equal(scripts.size, 1); assert.equal(scripts.has(stale), false);
    assert.deepEqual(scripts.get(siteScriptId('x')).js, ['content-scripts/social.js']);
    assert.equal(requests.length, 0); assert.equal(registrationCalls.length, 1);
    await updateSettings({ enabled: false }); await sync(); assert.equal(scripts.size, 0);
    await updateSettings({ enabled: true }); await sync(); assert.equal(scripts.size, 1);
  }, enabled('x'), () => { for (const origin of SITE_ORIGINS.x) granted.add(origin); });
});

test('queued registration racing revocation settles without surviving access removal', async () => {
  await withWorker(async () => {
    let release, entered;
    const started = new Promise(resolve => { entered = resolve; });
    const hold = new Promise(resolve => { release = resolve; });
    beforeRegister = async () => { entered(); await hold; };
    const enable = setSiteAccess('x', true);
    await started;
    await chrome.permissions.remove({ origins: SITE_ORIGINS.x });
    beforeRegister = undefined; release();
    await assert.rejects(enable, /Could not update site access/);
    await sync();
    assert.equal(scripts.size, 0);
    assert.equal((await dispatch({ type: SITE_ACCESS_CHECK, platform: 'x' })).allowed, false);
  });
});

test('queued permission remove then add restores only the final consented registration', async () => {
  await withWorker(async () => {
    let release, entered;
    const started = new Promise(resolve => { entered = resolve; });
    const hold = new Promise(resolve => { release = resolve; });
    beforeRegister = async () => { entered(); await hold; };
    const enable = setSiteAccess('x', true);
    await started;
    await chrome.permissions.remove({ origins: SITE_ORIGINS.x });
    await chrome.permissions.request({ origins: SITE_ORIGINS.x });
    beforeRegister = undefined; release();
    await enable; await sync();
    assert.equal(saved.platforms.x, true); assert.ok(scripts.has(siteScriptId('x')));
    assert.ok(SITE_ORIGINS.x.every(origin => granted.has(origin)));
    await setSiteAccess('x', false); await sync(); assert.equal(scripts.size, 0);
  });
});

test('partial host revocation removes registration and stops injected controllers', async () => {
  await withWorker(async () => {
    let active = false, stops = 0;
    const stop = guard('x', () => { active = true; return () => { active = false; stops++; }; });
    try {
      await settle(); assert.equal(active, true);
      await chrome.permissions.remove({ origins: [SITE_ORIGINS.x[0]] }); await sync();
      assert.equal(active, false); assert.equal(stops, 1); assert.equal(scripts.size, 0);
      assert.equal(saved.platforms.x, true, 'preference can remain, permission gate is authoritative');
    } finally { stop(); }
  }, enabled('x'), () => { for (const origin of SITE_ORIGINS.x) granted.add(origin); });
});

test('disable restores a real DOM hide and controller observers cannot re-hide after revocation', async t => {
  await withWorker(async () => {
    const dom = new JSDOM('<article data-testid="tweet" style="display: flex"><div data-testid="tweetText">' +
      'GUARANTEED 100% PROFIT crypto investment! Contact me on WhatsApp now!</div>' +
      '<div data-testid="User-Name"><a href="/fixtureuser">Fixture</a></div></article>', { url: senderUrl });
    const backup = new Map();
    for (const key of ['window', 'document', 'location', 'HTMLElement', 'Element', 'MutationObserver']) {
      backup.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
    }
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const stop = guard('x', () => startPlatformController('x'));
    const advance = async () => { await settle(); t.mock.timers.tick(450); await settle(); };
    try {
      await advance();
      const article = dom.window.document.querySelector('article');
      assert.equal(article.style.display, 'none');
      await setSiteAccess('x', false); await settle();
      assert.equal(article.style.display, 'flex');
      assert.equal(dom.window.document.querySelector('.aliveinternet-collapsed'), null);
      dom.window.document.body.append(dom.window.document.createElement('span'));
      await advance();
      assert.equal(article.style.display, 'flex'); assert.equal(scripts.size, 0);
      assert.equal(SITE_ORIGINS.x.some(origin => granted.has(origin)), false);
    } finally {
      stop(); t.mock.timers.reset(); dom.window.close();
      for (const [key, descriptor] of backup) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    }
  }, enabled('x'), () => { for (const origin of SITE_ORIGINS.x) granted.add(origin); });
});

test('content guard rejects stale pending checks and restores on missing background', async () => {
  await withWorker(async () => {
    let resolveRead; beforeRead = () => new Promise(resolve => { resolveRead = resolve; });
    let starts = 0;
    const stop = guard('x', () => { starts++; return () => {}; });
    await settle(); stop(); beforeRead = undefined; resolveRead(); await settle();
    assert.equal(starts, 0);
  }, enabled('x'), () => { for (const origin of SITE_ORIGINS.x) granted.add(origin); });
  reset();
  let starts = 0; const stop = guard('x', () => { starts++; return () => {}; });
  await settle(); stop(); assert.equal(starts, 0);
});

test('access messages reject foreign senders, wrong host, arbitrary platform and surplus fields', async () => {
  await withWorker(async () => {
    for (const sender of [{}, { id: 'foreign', url: senderUrl }, { id, url: 'https://x.com.attacker.invalid' },
      { id, url: 'http://x.com/home' }, { id, url: 'https://www.youtube.com' }]) {
      assert.deepEqual(await dispatch({ type: SITE_ACCESS_CHECK, platform: 'x' }, sender), { ok: false });
    }
    for (const message of [{ type: SITE_ACCESS_CHECK, platform: 'unknown' },
      { type: SITE_ACCESS_CHECK, platform: 'x', extra: true }]) assert.deepEqual(await dispatch(message), { ok: false });
    await assert.rejects(setSiteAccess('unknown', true), /Invalid site access/);
    assert.equal(requests.length, 0);
  });
});

test('popup shows imported nonconsented sites off and only a change requests access', async () => {
  await withWorker(async () => {
    const html = await readFile(new URL('../entrypoints/options/index.html', import.meta.url), 'utf8');
    const dom = new JSDOM(html);
    const stop = initializeSettingsPopup(dom.window.document);
    try {
      await settle();
      const input = dom.window.document.querySelector('input[data-platform="x"]');
      assert.equal(input.checked, false); assert.match(input.parentElement.textContent, /enable to grant site access/);
      assert.equal(requests.length, 0);
      input.checked = true; input.dispatchEvent(new dom.window.Event('change'));
      assert.equal(requests.length, 1); await sync(); await settle();
      assert.equal(input.checked, true); assert.equal(input.disabled, false);
      await chrome.permissions.remove({ origins: SITE_ORIGINS.x }); await sync(); await settle();
      assert.equal(input.checked, false); assert.equal(requests.length, 1);
    } finally { stop(); dom.window.close(); }
  }, enabled('x'));
});

test('popup reads actual required YouTube grants and requests withheld hosts only on user action', async () => {
  await withWorker(async () => {
    granted.delete(SITE_ORIGINS.youtube[0]);
    const html = await readFile(new URL('../entrypoints/options/index.html', import.meta.url), 'utf8');
    const dom = new JSDOM(html);
    const stop = initializeSettingsPopup(dom.window.document);
    try {
      await settle();
      const input = dom.window.document.querySelector('input[data-platform="youtube"]');
      assert.equal(input.checked, false); assert.equal(input.disabled, false);
      assert.match(input.parentElement.textContent, /initial adapter; enable to grant site access/);
      assert.equal(requests.length, 0, 'rendering never restores withheld access automatically');
      input.checked = true; input.dispatchEvent(new dom.window.Event('change'));
      assert.deepEqual(requests, [SITE_ORIGINS.youtube], 'direct user action immediately requests exact required hosts');
      await settle(); await sync();
      assert.equal(input.checked, true); assert.equal(saved.platforms.youtube, true);
      assert.equal(scripts.size, 0, 'YouTube keeps its static registration');
      assert.match(dom.window.document.querySelector('#status').textContent, /reload open site tabs/);
    } finally { stop(); dom.window.close(); }
  });
});

test('YouTube preference disable retains required access; denied regrant does not claim filtering is enabled', async () => {
  await withWorker(async () => {
    await setSiteAccess('youtube', false);
    assert.equal(saved.platforms.youtube, false);
    assert.ok(SITE_ORIGINS.youtube.every(origin => granted.has(origin)));
    assert.equal(requests.length, 0);
    granted.delete(SITE_ORIGINS.youtube[0]); requestGranted = false;
    await assert.rejects(setSiteAccess('youtube', true), /not granted/);
    assert.equal(saved.platforms.youtube, false); assert.equal(scripts.size, 0);
    requestGranted = true; await setSiteAccess('youtube', true); await sync();
    assert.equal(saved.platforms.youtube, true); assert.equal(scripts.size, 0);
  });
});

test('an older popup permission snapshot cannot overwrite a later revocation event', async () => {
  await withWorker(async () => {
    const contains = chrome.permissions.contains;
    let first = true, release;
    const hold = new Promise(resolve => { release = resolve; });
    chrome.permissions.contains = async input => {
      const snapshot = await contains(input);
      if (first && input.origins[0] === SITE_ORIGINS.x[0]) { first = false; await hold; }
      return snapshot;
    };
    const html = await readFile(new URL('../entrypoints/options/index.html', import.meta.url), 'utf8');
    const dom = new JSDOM(html);
    const stop = initializeSettingsPopup(dom.window.document);
    try {
      await settle();
      await chrome.permissions.remove({ origins: SITE_ORIGINS.x }); await sync(); await settle();
      const input = dom.window.document.querySelector('input[data-platform="x"]');
      assert.equal(input.checked, false); assert.equal(input.disabled, false);
      release(); await settle();
      assert.equal(input.checked, false); assert.match(input.parentElement.textContent, /enable to grant site access/);
    } finally { release(); stop(); dom.window.close(); chrome.permissions.contains = contains; }
  }, enabled('x'), () => { for (const origin of SITE_ORIGINS.x) granted.add(origin); });
});

test('built production manifests limit required hosts to YouTube and preserve exact optional origins', {
  skip: process.env.ALIVE_CHECK_MANIFESTS !== '1',
}, async () => {
  for (const target of ['chrome-mv3', 'firefox-mv3', 'edge-mv3']) {
    const manifest = JSON.parse(await readFile(new URL(`../.output/${target}/manifest.json`, import.meta.url), 'utf8'));
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.minimum_chrome_version, '102');
    assert.deepEqual([...manifest.host_permissions].sort(), [...SITE_ORIGINS.youtube].sort());
    assert.deepEqual([...manifest.optional_host_permissions].sort(), [...OPTIONAL_SITE_ORIGINS].sort());
    assert.deepEqual(manifest.permissions, ['storage', 'scripting']);
    for (const entry of manifest.content_scripts) {
      assert.deepEqual([...entry.matches].sort(), [...SITE_ORIGINS.youtube].sort());
    }
    for (const file of ['content-scripts/social.js', 'content-scripts/social.css']) {
      assert.ok((await readFile(new URL(`../.output/${target}/${file}`, import.meta.url))).length > 0);
    }
    if (target === 'firefox-mv3') {
      assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions, { required: ['none'] });
      assert.equal(manifest.browser_specific_settings.gecko.id, '{c0c9c54d-10b7-4ac9-833c-e0cca4c1e407}', 'stable generated project identity');
    }
  }
});
