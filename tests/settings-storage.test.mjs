import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { DEFAULT_SETTINGS } from '../src/core/preferences.ts';
import { createSettingsWriter } from '../src/extension/settings-writer.ts';
import { SETTINGS_MUTATION_MESSAGE, parseSettingsMutation } from '../src/extension/settings-protocol.ts';

// Simulated extension transport/storage only. Production mutation validation,
// background listener, clients and popup controls run unchanged (not Chrome E2E).
const messageListeners = new Set();
const storageListeners = new Set();
let saved;
let messages;
let reads;
let writes;
let beforeRead;
let beforeWrite;
const extensionId = 'aliveinternet-fixture';
globalThis.chrome = {
  runtime: {
    id: extensionId,
    onMessage: {
      addListener(listener) { messageListeners.add(listener); },
      removeListener(listener) { messageListeners.delete(listener); },
    },
    sendMessage(message) { return dispatch(message); },
  },
  storage: {
    local: {
      async get() {
        reads++;
        const snapshot = structuredClone(saved);
        if (beforeRead) await beforeRead();
        return { settings: snapshot };
      },
      async set({ settings }) {
        writes++;
        if (beforeWrite) await beforeWrite();
        saved = structuredClone(settings);
        emitSettings(saved);
      },
    },
    onChanged: {
      addListener(listener) { storageListeners.add(listener); },
      removeListener(listener) { storageListeners.delete(listener); },
    },
  },
};
const { registerSettingsWriter } = await import('../src/extension/settings-background.ts');
const { setBlockedAccount, updateSettings } = await import('../src/extension/settings.ts');
const { initializeSettingsPopup } = await import('../src/extension/popup-settings.ts');
const { startPlatformController } = await import('../src/extension/controller.ts');
const popupHtml = await readFile(new URL('../entrypoints/popup/index.html', import.meta.url), 'utf8');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function emitSettings(settings) {
  for (const listener of storageListeners) listener({ settings: { newValue: structuredClone(settings) } }, 'local');
}
function dispatch(message, sender = { id: extensionId }) {
  messages.push(structuredClone(message));
  return new Promise((resolve, reject) => {
    let responded = false;
    let asynchronous = false;
    for (const listener of messageListeners) {
      const result = listener(structuredClone(message), sender, response => { responded = true; resolve(response); });
      asynchronous ||= result === true;
    }
    if (!responded && !asynchronous) reject(new Error('No receiving end'));
  });
}
function reset(settings = DEFAULT_SETTINGS) {
  assert.equal(messageListeners.size, 0);
  assert.equal(storageListeners.size, 0);
  saved = structuredClone(settings); messages = []; reads = 0; writes = 0;
  beforeRead = undefined; beforeWrite = undefined;
}
async function settle() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
async function withBackground(run, settings) {
  reset(settings);
  const stop = registerSettingsWriter();
  try { await run(); } finally { stop(); }
}
async function withPopup(run, settings) {
  await withBackground(async () => {
    const dom = new JSDOM(popupHtml, { url: `https://fixture.invalid/popup` });
    const document = dom.window.document;
    const stop = initializeSettingsPopup(document);
    const change = (selector, value) => {
      const control = document.querySelector(selector);
      assert.equal(control.disabled, false, selector);
      if (control.type === 'checkbox') control.checked = value;
      else control.value = value;
      control.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    };
    try { await settle(); await run({ document, change }); }
    finally { stop(); dom.window.close(); assert.equal(storageListeners.size, 0); }
  }, settings);
}

test('background serializes overlapping tab hides, popup unhide and preference edits', async () => {
  await withBackground(async () => {
    const gate = deferred(); const started = deferred();
    beforeWrite = async () => { started.resolve(); await gate.promise; };
    const first = setBlockedAccount('youtube', '@Alice', true);
    await started.promise;
    const rest = [
      setBlockedAccount('youtube', '@bob', true),
      setBlockedAccount('x', '@old', false),
      updateSettings({ enabled: false }),
      updateSettings({ platforms: { reddit: true } }),
      updateSettings({ mode: 'conservative' }),
    ];
    assert.equal(reads, 1, 'later mutations must not read until the first write completes');
    assert.equal(writes, 1);
    gate.resolve();
    const results = await Promise.all([first, ...rest]);
    assert.deepEqual(saved.blockedAccounts, ['youtube:@alice', 'youtube:@bob']);
    assert.equal(saved.enabled, false);
    assert.equal(saved.mode, 'conservative');
    assert.equal(saved.platforms.reddit, true);
    assert.equal(saved.platforms.youtube, true);
    assert.equal(saved.platforms.x, true);
    assert.equal(saved.dedupeComments, false);
    assert.equal(reads, 6);
    assert.equal(writes, 6);
    assert.deepEqual(results.at(-1), saved);
  }, { ...DEFAULT_SETTINGS, blockedAccounts: ['x:@old'], platforms: { ...DEFAULT_SETTINGS.platforms, x: true } });
});

test('same-account intents are idempotent, platform scoped and ordered', async () => {
  await withBackground(async () => {
    await Promise.all([
      setBlockedAccount('x', '@same', true), setBlockedAccount('x', '@same', true),
      setBlockedAccount('youtube', '@same', true), setBlockedAccount('x', '@same', false),
      setBlockedAccount('x', '@same', true),
    ]);
    assert.deepEqual(saved.blockedAccounts, ['youtube:@same', 'x:@same']);
  });
});

test('failed storage reads and writes reject the caller without poisoning queued requests', async () => {
  for (const phase of ['read', 'write']) {
    await withBackground(async () => {
      let failed = false;
      const failOnce = async () => {
        if (!failed) { failed = true; throw new Error('sensitive storage diagnostic'); }
      };
      if (phase === 'read') beforeRead = failOnce;
      else beforeWrite = failOnce;
      const failedRequest = setBlockedAccount('x', '@failed', true);
      const nextRequest = setBlockedAccount('x', '@saved', true);
      await assert.rejects(failedRequest, /^Error: Could not save settings; retry the action$/);
      await nextRequest;
      assert.deepEqual(saved.blockedAccounts, ['x:@saved']);
    });
  }
});

test('a new background instance rereads durable settings rather than resetting them', async () => {
  reset();
  const stop = registerSettingsWriter();
  await setBlockedAccount('youtube', '@retained', true);
  stop();
  const stopRestarted = registerSettingsWriter();
  try {
    await updateSettings({ inspectAccounts: false });
    assert.deepEqual(saved.blockedAccounts, ['youtube:@retained']);
    assert.equal(saved.inspectAccounts, false);
  } finally { stopRestarted(); }
});

test('missing background never falls back to an unsafe direct settings write', async () => {
  reset();
  await assert.rejects(setBlockedAccount('x', '@foo', true), /No receiving end/);
  await assert.rejects(updateSettings({ enabled: false }), /No receiving end/);
  assert.equal(writes, 0);
  assert.deepEqual(saved, DEFAULT_SETTINGS);
});

test('background rejects foreign senders and unrelated messages do not take a response channel', async () => {
  await withBackground(async () => {
    const message = { type: SETTINGS_MUTATION_MESSAGE, mutation: { kind: 'preferences', patch: { enabled: false } } };
    for (const sender of [{}, { id: 'other-extension' }]) {
      assert.deepEqual(await dispatch(message, sender), { ok: false, error: 'Settings request rejected' });
    }
    await assert.rejects(dispatch({ type: 'aliveinternet/page-stats' }), /No receiving end/);
    assert.equal(reads, 0); assert.equal(writes, 0);
  });
});

test('malformed settings intents are rejected without reading or mutating storage', async () => {
  const bad = [
    null, [], { kind: 'unknown' },
    { kind: 'preferences', patch: {} }, { kind: 'preferences', patch: { platforms: {} } },
    { kind: 'preferences', patch: { enabled: 'false' } },
    { kind: 'preferences', patch: { mode: 'invalid' } },
    { kind: 'preferences', patch: { blockedAccounts: [] } },
    { kind: 'preferences', patch: { platforms: { fake: true } } },
    { kind: 'preferences', patch: { platforms: { youtube: 1 } } },
    { kind: 'preferences', patch: JSON.parse('{"__proto__":{"enabled":false}}') },
    { kind: 'account', platform: 'fake', accountKey: '@foo', blocked: true },
    { kind: 'account', platform: 'x', accountKey: '<script>', blocked: true },
    { kind: 'account', platform: 'x', accountKey: '@foo', blocked: 'yes' },
    { kind: 'account', platform: 'x', accountKey: 'a'.repeat(141), blocked: true },
    { kind: 'account', platform: 'x', accountKey: '@foo', blocked: true, extra: true },
  ];
  await withBackground(async () => {
    for (const mutation of bad) {
      assert.throws(() => parseSettingsMutation(mutation));
      assert.equal((await dispatch({ type: SETTINGS_MUTATION_MESSAGE, mutation })).ok, false);
    }
    assert.equal((await dispatch({ type: SETTINGS_MUTATION_MESSAGE, mutation: bad[0], extra: true })).ok, false);
    assert.equal(reads, 0); assert.equal(writes, 0);
  });
});

test('queued patches capture intent and preserve untouched settings', async () => {
  let settings = structuredClone(DEFAULT_SETTINGS);
  const gate = deferred(); const started = deferred();
  const writer = createSettingsWriter({
    async read() { started.resolve(); await gate.promise; return settings; },
    async write(next) { settings = structuredClone(next); },
  });
  const first = writer({ kind: 'preferences', patch: { mode: 'aggressive' } });
  await started.promise;
  const input = { kind: 'preferences', patch: { platforms: { x: true }, enabled: false } };
  const second = writer(input);
  input.patch.enabled = true; input.patch.platforms.x = false;
  gate.resolve(); await Promise.all([first, second]);
  assert.equal(settings.mode, 'aggressive'); assert.equal(settings.enabled, false);
  assert.equal(settings.platforms.x, true); assert.equal(settings.platforms.youtube, true);
});

test('a full account list rejects a new hide and still allows unhide followed by hide', async () => {
  await withBackground(async () => {
    const original = structuredClone(saved);
    await assert.rejects(setBlockedAccount('x', '@overflow', true), /limit reached.*unhide an account first/);
    assert.deepEqual(saved, original);
    await setBlockedAccount('x', '@user0', false);
    await setBlockedAccount('x', '@overflow', true);
    assert.equal(saved.blockedAccounts.length, 500);
    assert.equal(saved.blockedAccounts.includes('x:@overflow'), true);
    assert.equal(saved.blockedAccounts.includes('x:@user0'), false);
  }, { ...DEFAULT_SETTINGS, blockedAccounts: Array.from({ length: 500 }, (_, i) => `x:@user${i}`) });
});

test('popup sends individual captured changes while a tab hide is awaiting storage', async () => {
  await withPopup(async ({ document, change }) => {
    const gate = deferred(); const started = deferred();
    beforeWrite = async () => { started.resolve(); await gate.promise; };
    const tabHide = setBlockedAccount('youtube', '@newhide', true);
    await started.promise;
    change('#enabled', false);
    change('#mode', 'conservative');
    change('input[data-platform="reddit"]', true);
    assert.equal(document.querySelector('#enabled').disabled, true);
    gate.resolve(); await tabHide; await settle();
    assert.deepEqual(messages.slice(1).map(message => message.mutation.patch), [
      { enabled: false }, { mode: 'conservative' }, { platforms: { reddit: true } },
    ]);
    assert.deepEqual(saved.blockedAccounts, ['youtube:@newhide']);
    assert.equal(saved.enabled, false); assert.equal(saved.mode, 'conservative');
    assert.equal(saved.platforms.reddit, true);
    assert.equal(document.querySelector('#enabled').checked, false);
    assert.equal(document.querySelector('#enabled').disabled, false);
    assert.equal(document.querySelector('#mode').value, 'conservative');
    assert.equal(document.querySelector('#blockCount').textContent, '1');
    assert.equal(document.querySelector('#status').textContent, 'Settings saved');
  });
});

test('popup synchronizes external changes and unhide does not erase a concurrent new hide', async () => {
  await withPopup(async ({ document, change }) => {
    const unhide = document.querySelector('#blockedAccounts button');
    unhide.focus();
    await updateSettings({ platforms: { x: true }, dedupeComments: true }); await settle();
    assert.equal(document.querySelector('#blockedAccounts button'), unhide);
    assert.equal(document.activeElement, unhide);
    assert.equal(document.querySelector('input[data-platform="x"]').checked, true);
    assert.equal(document.querySelector('#dedupeComments').checked, true);
    const gate = deferred(); const started = deferred();
    beforeWrite = async () => { started.resolve(); await gate.promise; };
    document.querySelector('#blockedAccounts button').click();
    await started.promise;
    const tabHide = setBlockedAccount('youtube', '@new', true);
    change('#inspectAccounts', false);
    gate.resolve(); await tabHide; await settle();
    assert.deepEqual(saved.blockedAccounts, ['youtube:@new']);
    assert.equal(saved.inspectAccounts, false); assert.equal(saved.dedupeComments, true);
    assert.match(document.querySelector('#blockedAccounts').textContent, /@new/);
    assert.doesNotMatch(document.querySelector('#blockedAccounts').textContent, /@old/);
  }, { ...DEFAULT_SETTINGS, blockedAccounts: ['youtube:@old'] });
});

test('failed popup save restores the persisted control and reports failure', async () => {
  await withPopup(async ({ document, change }) => {
    beforeWrite = async () => { throw new Error('storage unavailable'); };
    change('#enabled', false); await settle();
    assert.equal(saved.enabled, true);
    assert.equal(document.querySelector('#enabled').checked, true);
    assert.equal(document.querySelector('#enabled').disabled, false);
    assert.match(document.querySelector('#status').textContent, /Could not save/);
    beforeWrite = undefined;
    change('#enabled', false); await settle();
    assert.equal(saved.enabled, false);
    assert.equal(document.querySelector('#enabled').checked, false);
  });
});

test('popup storage events win over a stale initial read', async () => {
  await withBackground(async () => {
    const gate = deferred(); const started = deferred();
    beforeRead = async () => { started.resolve(); await gate.promise; };
    const dom = new JSDOM(popupHtml);
    const stop = initializeSettingsPopup(dom.window.document);
    try {
      assert.equal(dom.window.document.querySelector('#enabled').disabled, true);
      await started.promise;
      saved.enabled = false; emitSettings(saved);
      gate.resolve(); await settle();
      assert.equal(dom.window.document.querySelector('#enabled').checked, false);
      assert.equal(dom.window.document.querySelector('#enabled').disabled, false);
    } finally { stop(); dom.window.close(); }
  });
});

test('content hide and popup unhide propagate through the background and restore the item', async t => {
  await withPopup(async ({ document, change }) => {
    const content = new JSDOM(`<ytd-comment-view-model>
      <a id="author-text" href="/@author">Synthetic author</a>
      <div id="content-text">Thanks for explaining this example.</div>
    </ytd-comment-view-model>`, { url: 'https://www.youtube.com/watch?v=fixture' });
    const globals = ['document', 'window', 'location', 'Element', 'MutationObserver'];
    const previous = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, value: content.window[key] });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const stop = startPlatformController('youtube');
    try {
      await settle(); t.mock.timers.tick(450); await settle();
      const item = content.window.document.querySelector('ytd-comment-view-model');
      item.style.display = 'flex';
      content.window.document.querySelector('.aliveinternet-controls button').click();
      await settle(); t.mock.timers.tick(450); await settle();
      assert.deepEqual(saved.blockedAccounts, ['youtube:@author']);
      assert.equal(item.style.display, 'none');
      assert.match(content.window.document.querySelector('.aliveinternet-collapsed').textContent, /local blocklist/);
      assert.equal(document.querySelector('#blockCount').textContent, '1');
      document.querySelector('#blockedAccounts button').click();
      change('#mode', 'conservative');
      await settle(); t.mock.timers.tick(450); await settle();
      assert.deepEqual(saved.blockedAccounts, []);
      assert.equal(saved.mode, 'conservative');
      assert.equal(item.style.display, 'flex');
      assert.equal(content.window.document.querySelector('.aliveinternet-collapsed'), null);
      assert.equal(document.querySelector('#blockCount').textContent, '0');
      assert.deepEqual(messages.map(message => message.mutation.kind), ['account', 'account', 'preferences']);
    } finally {
      stop(); t.mock.timers.reset(); content.window.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
});
