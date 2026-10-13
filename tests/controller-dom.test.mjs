import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { DEFAULT_SETTINGS } from '../src/core/preferences.ts';

// Only extension storage is simulated; selectors, controller, policy, observer
// and reversible UI are the production modules. This is not a Chrome E2E test.
const listeners = new Set();
const messageListeners = new Set();
let storedSettings;
globalThis.chrome = {
  runtime: {
    id: 'fixture', getURL: path => `chrome-extension://fixture/${path.replace(/^\//, '')}`,
    onMessage: { addListener: listener => messageListeners.add(listener), removeListener: listener => messageListeners.delete(listener) },
  },
  storage: {
    local: {
      async get(key) { return key === 'settings' ? { settings: storedSettings } : {}; },
      async set(values) { storedSettings = values.settings; },
    },
    onChanged: {
      addListener(listener) { listeners.add(listener); },
      removeListener(listener) { listeners.delete(listener); },
    },
  },
};
const { startPlatformController } = await import('../src/extension/controller.ts');

const scam = 'Contact me on Telegram to double your investment. Guaranteed profit!';
const benign = 'This is such an important point. I completely agree.';

function comment(key, text = scam) {
  return `<ytd-comment-view-model data-fixture="${key}">
    <a id="author-text" href="/@${key}">Same display name</a>
    <div id="content-text">${text}</div>
  </ytd-comment-view-model>`;
}

async function withController(t, html, run, options = {}, start = startPlatformController) {
  storedSettings = { ...structuredClone(DEFAULT_SETTINGS), ...options };
  const dom = new JSDOM(html, { url: 'https://www.youtube.com/watch?v=synthetic' });
  const keys = ['document', 'window', 'location', 'Element', 'MutationObserver'];
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const stop = start('youtube');
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  const advance = async (milliseconds = 450) => {
    await settle();
    t.mock.timers.tick(milliseconds);
    await settle();
  };
  const change = settings => {
    storedSettings = settings;
    for (const listener of listeners) listener({ settings: { newValue: settings } }, 'local');
  };
  try {
    await settle();
    await run({ document: dom.window.document, window: dom.window, advance, change, stop });
  } finally {
    stop();
    t.mock.timers.reset();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    assert.equal(listeners.size, 0);
  }
}

test('controller eventually filters item 351 without restoring the first batch', async t => {
  await withController(t, Array.from({ length: 351 }, (_, i) => comment(`user${i}`)).join(''),
    async ({ document, advance }) => {
      await advance();
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 350);
      await advance();
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 351);
      assert.equal(document.querySelector('[data-fixture="user0"]').style.display, 'none');
    });
});

test('successive batches reach later comments and video cards without UI duplicates', async t => {
  const html = Array.from({ length: 701 }, (_, i) => comment(`user${i}`)).join('') +
    `<ytd-video-renderer data-fixture="video"><a id="video-title">${scam}</a></ytd-video-renderer>`;
  await withController(t, html, async ({ document, advance }) => {
    await advance();
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 350);
    await advance(25);
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 700);
    await advance(25);
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 702);
    assert.equal(document.querySelector('[data-fixture="video"]').style.display, 'none');
    await advance();
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 702);
  });
});

test('invalid candidates consume the batch budget without starving later valid items', async t => {
  await withController(t, '<ytd-comment-view-model></ytd-comment-view-model>'.repeat(350) + comment('later'),
    async ({ document, advance }) => {
      await advance();
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 0);
      await advance(25);
      assert.equal(document.querySelector('[data-fixture="later"]').style.display, 'none');
    });
});

test('mutation bursts during a pass do not restart the cursor before later items', async t => {
  await withController(t, Array.from({ length: 701 }, (_, i) => comment(`user${i}`)).join(''),
    async ({ document, advance }) => {
      await advance();
      document.body.append(document.createElement('span'));
      await advance(25);
      assert.equal(document.querySelector('[data-fixture="user699"]').style.display, 'none');
      document.body.append(document.createElement('span'));
      await advance(25);
      assert.equal(document.querySelector('[data-fixture="user700"]').style.display, 'none');
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 701);
    });
});

test('additions and removals after a full pass preserve earlier reversible UI', async t => {
  await withController(t, comment('original') + comment('benign', benign),
    async ({ document, advance }) => {
      const original = document.querySelector('[data-fixture="original"]');
      original.style.display = 'flex';
      await advance();
      const holder = document.querySelector('.aliveinternet-collapsed');
      document.body.insertAdjacentHTML('beforeend', comment('later'));
      await advance();
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 2);
      assert.equal(document.querySelector('.aliveinternet-collapsed'), holder);
      original.remove();
      await advance();
      assert.equal(original.style.display, 'flex');
      assert.equal(holder.isConnected, false);
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 1);
    });
});

test('recycled text nodes and profile links are reassessed', async t => {
  await withController(t, comment('recycled'), async ({ document, advance, change }) => {
    await advance();
    const element = document.querySelector('[data-fixture="recycled"]');
    // characterData, without replacing the text node or its parent element.
    element.querySelector('#content-text').firstChild.data = benign;
    await advance();
    assert.equal(element.style.display, '');
    assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
    change({ ...storedSettings, blockedAccounts: ['youtube:@blocked'] });
    await advance();
    assert.equal(element.style.display, '');
    element.querySelector('#author-text').setAttribute('href', '/@blocked');
    await advance();
    assert.equal(element.style.display, 'none');
    assert.match(document.querySelector('.aliveinternet-collapsed').textContent, /local blocklist/);
    element.querySelector('#author-text').setAttribute('href', '/@unblocked');
    await advance();
    assert.equal(element.style.display, '');
  });
});

test('unrecognized recycled markup releases previously managed UI after the pass', async t => {
  await withController(t, comment('recycled'), async ({ document, advance }) => {
    await advance();
    const element = document.querySelector('[data-fixture="recycled"]');
    element.querySelector('#content-text').remove();
    await advance();
    assert.equal(element.style.display, '');
    assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
    assert.equal(document.querySelector('.aliveinternet-controls'), null);
  });
});

test('moved comments and site-removed placeholders keep a working reveal control', async t => {
  await withController(t, `<section id="first">${comment('moved')}</section><section id="second"></section>`,
    async ({ document, advance }) => {
      const element = document.querySelector('[data-fixture="moved"]');
      element.style.display = 'flex';
      await advance();
      document.querySelector('#second').append(element);
      await advance();
      assert.equal(document.querySelector('#first .aliveinternet-collapsed'), null);
      assert.equal(element.previousSibling.className, 'aliveinternet-collapsed');
      element.previousSibling.remove();
      await advance();
      assert.equal(element.previousSibling.className, 'aliveinternet-collapsed');
      element.previousSibling.querySelector('button').click();
      assert.equal(element.style.display, 'flex');
      assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
    });
});

test('reveals survive later batches and do not transfer across same-named profiles', async t => {
  await withController(t, Array.from({ length: 351 }, (_, i) => comment(`user${i}`)).join(''),
    async ({ document, advance, window }) => {
      await advance();
      document.querySelector('.aliveinternet-collapsed button').click();
      await advance(25);
      assert.equal(document.querySelector('[data-fixture="user0"]').style.display, '');
      assert.equal(document.querySelector('[data-fixture="user350"]').style.display, 'none');
      document.body.append(document.createElement('span'));
      await advance();
      await advance(25);
      assert.equal(document.querySelector('[data-fixture="user0"]').style.display, '');
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 350);
      window.history.pushState({}, '', '/watch?v=new-synthetic');
      window.dispatchEvent(new window.PopStateEvent('popstate'));
      await advance();
      await advance(25);
      assert.equal(document.querySelector('[data-fixture="user0"]').style.display, 'none');
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 351);
    });
});

test('disabling a platform cancels pending batches and restores original display', async t => {
  await withController(t, Array.from({ length: 351 }, (_, i) => comment(`user${i}`)).join(''),
    async ({ document, advance, change }) => {
      document.querySelector('[data-fixture="user0"]').style.display = 'grid';
      await advance();
      change({ ...storedSettings, platforms: { ...storedSettings.platforms, youtube: false } });
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 0);
      assert.equal(document.querySelector('[data-fixture="user0"]').style.display, 'grid');
      await advance();
      assert.equal(document.querySelector('[data-fixture="user350"]').style.display, '');
      assert.equal(document.querySelector('.aliveinternet-controls'), null);
      change({ ...storedSettings, platforms: { ...storedSettings.platforms, youtube: true } });
      await advance();
      await advance(25);
      assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 351);
    });
});

test('dispose restores earlier batches and prevents pending work from reapplying UI', async t => {
  await withController(t, Array.from({ length: 351 }, (_, i) => comment(`user${i}`)).join(''),
    async ({ document, advance, stop }) => {
      await advance();
      stop();
      await advance();
      assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
      assert.equal(document.querySelector('.aliveinternet-controls'), null);
      assert.ok([...document.querySelectorAll('ytd-comment-view-model')].every(el => el.style.display === ''));
    });
});

test('later batches preserve deduplication context and keep their first copy visible', async t => {
  const long = 'A long legitimate explanation repeated by independent accounts for readability testing. ' +
    'This text does not contain a scam solicitation and repetition is not evidence of bot identity.';
  const firstBatch = Array.from({ length: 350 }, (_, i) => comment(`user${i}`, benign)).join('');
  const copies = Array.from({ length: 4 }, (_, i) => comment(`copy${i}`, long)).join('');
  await withController(t, firstBatch + copies, async ({ document, advance }) => {
    await advance();
    assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
    await advance(25);
    assert.equal(document.querySelector('[data-fixture="copy0"]').style.display, '');
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 3);
    assert.match(document.querySelector('.aliveinternet-collapsed').textContent, /this processing batch/);
    document.querySelector('[data-fixture="copy0"] .aliveinternet-controls button:last-child').click();
    assert.match(document.querySelector('.aliveinternet-evidence').textContent, /Current processing batch only/);
  }, { dedupeComments: true });
});

test('later batches retain opt-in account campaign context without persisting blocks', async t => {
  const firstBatch = Array.from({ length: 350 }, (_, i) => comment(`user${i}`, benign)).join('');
  const accountItems = [scam + ' One.', scam + ' Two.', scam + ' Three.', benign]
    .map(text => comment('campaign', text)).join('');
  await withController(t, firstBatch + accountItems, async ({ document, advance }) => {
    await advance();
    await advance(25);
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 4);
    assert.deepEqual(storedSettings.blockedAccounts, []);
    assert.match(document.querySelector('.aliveinternet-collapsed').textContent, /current processing batch/);
  }, { autoCampaignAccounts: true });
});

test('extension-owned DOM mutations do not cause an endless scan loop', async t => {
  await withController(t, comment('original'), async ({ document, advance }) => {
    const original = document.querySelectorAll.bind(document);
    let collections = 0;
    document.querySelectorAll = selector => { collections++; return original(selector); };
    await advance();
    assert.ok(collections > 0);
    const afterPass = collections;
    await advance(2000);
    assert.equal(collections, afterPass);
  });
});

test('pending settings load fails open and a newer disabled setting wins', async t => {
  const originalGet = globalThis.chrome.storage.local.get;
  let resolveSettings;
  globalThis.chrome.storage.local.get = key => key === 'settings'
    ? new Promise(resolve => { resolveSettings = resolve; }) : originalGet(key);
  try {
    await withController(t, comment('original'), async ({ document, advance, change }) => {
      await advance();
      assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
      change({ ...storedSettings, enabled: false });
      resolveSettings({ settings: structuredClone(DEFAULT_SETTINGS) });
      await advance();
      assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
      assert.equal(document.querySelector('.aliveinternet-controls'), null);
    });
  } finally { globalThis.chrome.storage.local.get = originalGet; }
});

test('allowlisted duplicate comments stay visible while other copies collapse', async t => {
  const long = 'A long legitimate explanation repeated by independent accounts for readability testing. ' +
    'Repetition does not establish copying or bot identity and the trusted account must stay visible.';
  const copies = Array.from({ length: 4 }, (_, i) => comment(`copy${i}`, long)).join('');
  await withController(t, copies, async ({ document, advance }) => {
    await advance();
    assert.equal(document.querySelector('[data-fixture="copy1"]').style.display, '');
    assert.equal(document.querySelectorAll('.aliveinternet-collapsed').length, 2);
  }, { dedupeComments: true, allowedAccounts: ['youtube:@copy1'] });
});

test('mute preferences propagate and an explicit block still wins over allowlisting', async t => {
  await withController(t, comment('trusted', 'This cooking recipe is wonderful.'), async ({ document, advance, change }) => {
    await advance();
    const element = document.querySelector('[data-fixture="trusted"]');
    assert.equal(element.style.display, 'none');
    assert.match(document.querySelector('.aliveinternet-collapsed').textContent, /your preference/);
    change({ ...storedSettings, allowedAccounts: ['youtube:@trusted'] });
    await advance(); assert.equal(element.style.display, '');
    change({ ...storedSettings, blockedAccounts: ['youtube:@trusted'] });
    await advance(); assert.equal(element.style.display, 'none');
    assert.match(document.querySelector('.aliveinternet-collapsed').textContent, /local blocklist/);
  }, { mutedWords: ['cooking'] });
});

function requestReview(message, sender = { id: 'fixture', url: 'chrome-extension://fixture/popup.html' }) {
  let response;
  for (const listener of messageListeners) listener(message, sender, value => { response = value; });
  return response;
}

test('hidden review is ephemeral, paginated and reveals through the production control', async t => {
  await withController(t, Array.from({ length: 55 }, (_, i) => comment(`review${i}`)).join(''), async ({ document, advance }) => {
    await advance();
    const first = requestReview({ type: 'aliveinternet/hidden-items' });
    assert.equal(first.total, 55); assert.equal(first.items.length, 50); assert.equal(first.truncated, true);
    assert.match(first.items[0].reason, /Contact|financial|solicitation|investment/i);
    const second = requestReview({ type: 'aliveinternet/hidden-items', offset: 50 });
    assert.equal(second.items.length, 5); assert.equal(second.truncated, false);
    const id = first.items[0].pageItemId;
    assert.deepEqual(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: id }), { ok: true });
    assert.equal(document.querySelector('[data-fixture="review0"]').style.display, '');
    assert.equal(requestReview({ type: 'aliveinternet/hidden-items' }).total, 54);
    assert.deepEqual(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: id }), { ok: false });
    await advance();
    assert.equal(document.querySelector('[data-fixture="review0"]').style.display, '');
  });
  assert.equal(messageListeners.size, 0);
});

test('review rejects foreign contexts, malformed requests, recycled nodes and old navigation IDs', async t => {
  await withController(t, comment('review'), async ({ document, window, advance }) => {
    await advance();
    const id = requestReview({ type: 'aliveinternet/hidden-items' }).items[0].pageItemId;
    for (const sender of [{ id: 'foreign', url: 'chrome-extension://fixture/popup.html' },
      { id: 'fixture', url: 'https://www.youtube.com/watch?v=synthetic' }, {}]) {
      assert.equal(requestReview({ type: 'aliveinternet/hidden-items' }, sender), undefined);
    }
    for (const offset of [-1, 0.1, '1']) assert.equal(requestReview({ type: 'aliveinternet/hidden-items', offset }), undefined);
    assert.equal(requestReview({ type: 'aliveinternet/hidden-items', unwanted: true }), undefined);
    const element = document.querySelector('[data-fixture="review"]');
    element.querySelector('#content-text').textContent = benign;
    assert.deepEqual(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: id }), { ok: false });
    await advance(); assert.equal(requestReview({ type: 'aliveinternet/hidden-items' }).total, 0);
    element.querySelector('#content-text').textContent = scam;
    await advance();
    const newId = requestReview({ type: 'aliveinternet/hidden-items' }).items[0].pageItemId;
    assert.notEqual(newId, id);
    window.history.pushState({}, '', '/watch?v=next');
    assert.equal(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: newId }).ok, false);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await advance();
    assert.deepEqual(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: newId }), { ok: false });
  });
});

test('fresh document sessions reject stale popup IDs after full navigation', async t => {
  const oldController = (await import('../src/extension/controller.ts?old-document')).startPlatformController;
  const newController = (await import('../src/extension/controller.ts?new-document')).startPlatformController;
  let staleId;
  await withController(t, comment('old-document'), async ({ advance }) => {
    await advance(); staleId = requestReview({ type: 'aliveinternet/hidden-items' }).items[0].pageItemId;
  }, {}, oldController);
  await withController(t, comment('new-document'), async ({ document, advance }) => {
    await advance();
    const newId = requestReview({ type: 'aliveinternet/hidden-items' }).items[0].pageItemId;
    assert.notEqual(newId, staleId);
    assert.deepEqual(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: staleId }), { ok: false });
    assert.equal(document.querySelector('[data-fixture="new-document"]').style.display, 'none');
    assert.deepEqual(requestReview({ type: 'aliveinternet/reveal-item', pageItemId: newId }), { ok: true });
  }, {}, newController);
});

test('removing an advisory pack wins over a stale initial content-storage read', async t => {
  const pack = { schemaVersion: 1, title: 'Synthetic', publisher: 'Test', sourceUrl: 'https://example.org/source',
    indicators: [{ kind: 'account', value: '@pack', platform: 'youtube', note: 'Synthetic account', evidenceUrl: 'https://example.org/evidence' }] };
  const originalGet = globalThis.chrome.storage.local.get;
  let resolvePack;
  globalThis.chrome.storage.local.get = key => key === 'indicatorPack'
    ? new Promise(resolve => { resolvePack = resolve; }) : originalGet(key);
  try {
    await withController(t, comment('pack', benign), async ({ document, advance }) => {
      for (const listener of listeners) listener({ indicatorPack: { newValue: pack } }, 'local');
      await advance(); assert.match(document.querySelector('.aliveinternet-flag').textContent, /User-imported advisory/);
      for (const listener of listeners) listener({ indicatorPack: {} }, 'local');
      resolvePack({ indicatorPack: pack });
      await advance();
      assert.equal(document.querySelector('.aliveinternet-flag'), null);
      assert.equal(document.querySelector('[data-fixture="pack"]').style.display, '');
    }, { intelAdvisories: true });
  } finally { globalThis.chrome.storage.local.get = originalGet; }
});
