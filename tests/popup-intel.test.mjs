import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { MAX_INDICATOR_PACK_BYTES } from '../src/intel/indicators.ts';

const pack = {
  schemaVersion: 1, title: 'Synthetic advisory', publisher: 'Fixture publisher', sourceUrl: 'https://example.org/report',
  indicators: [{ kind: 'domain', value: 'example.test', note: 'Fixture only', evidenceUrl: 'https://example.org/evidence' }],
};
let stored, writes, removals, reads, beforeRead, beforeWrite, beforeRemove;
const listeners = new Set();
const writesLog = [];
globalThis.chrome = {
  runtime: { id: 'intel-ui-fixture' },
  storage: {
    local: {
      async get(key) {
        assert.equal(key, 'indicatorPack'); reads++;
        const snapshot = structuredClone(stored.indicatorPack);
        if (beforeRead) await beforeRead();
        return { indicatorPack: snapshot };
      },
      async set(values) {
        assert.deepEqual(Object.keys(values), ['indicatorPack']);
        if (beforeWrite) await beforeWrite();
        writes++; writesLog.push(structuredClone(values)); emit(values.indicatorPack);
      },
      async remove(key) {
        assert.equal(key, 'indicatorPack');
        if (beforeRemove) await beforeRemove();
        removals++; emit(undefined);
      },
    },
    onChanged: { addListener(listener) { listeners.add(listener); }, removeListener(listener) { listeners.delete(listener); } },
  },
  permissions: { request() { throw new Error('No permission requests on pack import'); } },
};
const { initializeIndicatorPopup } = await import('../src/extension/popup-intel.ts');
const html = `<input id="importPack" type="file"><button id="removePack">Remove</button><p id="packStatus"></p><p id="status"></p><button id="other">Other control</button>`;
function emit(value) {
  stored.indicatorPack = structuredClone(value);
  for (const listener of listeners) listener({ indicatorPack: { newValue: value } }, 'local');
}
const deferred = () => { let resolve; let reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
async function settle() { for (let i = 0; i < 50; i++) await Promise.resolve(); }
async function popup(run, initial, holdInitial = false) {
  assert.equal(listeners.size, 0);
  stored = { indicatorPack: structuredClone(initial), settings: { intelAdvisories: false, enabled: false, blockedAccounts: ['x:@retained'] } };
  writes = 0; removals = 0; reads = 0; writesLog.length = 0;
  beforeRead = undefined; beforeWrite = undefined; beforeRemove = undefined;
  const hold = holdInitial ? deferred() : undefined;
  if (hold) beforeRead = () => hold.promise;
  const dom = new JSDOM(html, { url: 'https://fixture.invalid/popup' });
  const document = dom.window.document;
  const stop = initializeIndicatorPopup(document);
  const select = (raw, { size, read } = {}) => {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const file = { size: size ?? new TextEncoder().encode(text).length, text: read ?? (async () => text) };
    Object.defineProperty(document.querySelector('#importPack'), 'files', { configurable: true, value: [file] });
    document.querySelector('#importPack').dispatchEvent(new dom.window.Event('change'));
  };
  try { if (!hold) await settle(); await run({ dom, document, select, stop, hold }); }
  finally { stop(); dom.window.close(); assert.equal(listeners.size, 0); }
}

test('explicit local import persists one advisory key, displays unverified provenance and preserves settings', async () => {
  await popup(async ({ document, select }) => {
    const originalSettings = structuredClone(stored.settings);
    assert.equal(writes, 0);
    select(pack); await settle();
    assert.equal(writes, 1); assert.equal(removals, 0);
    assert.deepEqual(writesLog[0], { indicatorPack: pack });
    assert.deepEqual(stored.settings, originalSettings);
    assert.match(document.querySelector('#packStatus').textContent, /Fixture publisher/);
    assert.match(document.querySelector('#packStatus').textContent, /https:\/\/example.org\/report/);
    assert.match(document.querySelector('#packStatus').textContent, /Self-declared provenance, unverified/);
    assert.match(document.querySelector('#status').textContent, /not automatically trusted/);
    assert.equal(document.querySelector('#importPack').value, '');
  });
});

test('malicious text is rendered as text and evidence URLs are never fetched', async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = () => { requests++; throw new Error('Must not fetch'); };
  try {
    await popup(async ({ document, select }) => {
      select({ ...pack, title: '<img src=x onerror=alert(1)>', publisher: '<script>bad()</script>' }); await settle();
      assert.equal(document.querySelector('#packStatus img'), null);
      assert.equal(document.querySelector('#packStatus script'), null);
      assert.match(document.querySelector('#packStatus').textContent, /<img/);
      assert.equal(requests, 0);
    });
  } finally { globalThis.fetch = previousFetch; }
});

test('file metadata, encoded UTF-8 bytes, schema, JSON and unknown fields are validated before persistence', async () => {
  await popup(async ({ document, select }) => {
    for (const [raw, options] of [
      [pack, { size: MAX_INDICATOR_PACK_BYTES + 1 }],
      [' '.repeat(MAX_INDICATOR_PACK_BYTES + 1), { size: 1 }],
      [JSON.stringify({ ...pack, title: 'a' }) + 'é'.repeat(60_000), { size: 1 }],
      ['not json'], [null], [{ ...pack, unknown: 'field' }],
      [{ ...pack, sourceUrl: 'javascript:alert(1)' }],
      [{ ...pack, indicators: [{ ...pack.indicators[0], extra: true }] }],
      [{ ...pack, indicators: Array.from({ length: 251 }, () => pack.indicators[0]) }],
      [JSON.parse('{"__proto__":{},"schemaVersion":1,"title":"x","publisher":"y","sourceUrl":"https://example.org","indicators":[]}')],
    ]) {
      select(raw, options); await settle();
      assert.match(document.querySelector('#status').textContent, /Import rejected/);
      assert.equal(document.querySelector('#importPack').disabled, false);
    }
    assert.equal(writes, 0); assert.equal(removals, 0);
  }, pack);
});

test('failed file reads and failed saves preserve durable pack and allow same-file retries', async () => {
  await popup(async ({ document, select }) => {
    select(pack, { read: async () => { throw new Error('Unreadable file'); } }); await settle();
    assert.equal(writes, 0); assert.match(document.querySelector('#status').textContent, /Unreadable file/);
    beforeWrite = async () => { throw new Error('Storage unavailable'); };
    select({ ...pack, title: 'Replacement' }); await settle();
    assert.equal(stored.indicatorPack.title, 'Original');
    assert.match(document.querySelector('#packStatus').textContent, /Original/);
    assert.match(document.querySelector('#status').textContent, /Import rejected/);
    assert.equal(document.querySelector('#removePack').disabled, false);
    beforeWrite = undefined;
    select({ ...pack, title: 'Replacement' }); await settle();
    assert.equal(writes, 1); assert.equal(stored.indicatorPack.title, 'Replacement');
  }, { ...pack, title: 'Original' });
});

test('removal failures are caught, durable pack stays visible and retry succeeds', async () => {
  await popup(async ({ document }) => {
    beforeRemove = async () => { throw new Error('Storage unavailable'); };
    document.querySelector('#removePack').click(); await settle();
    assert.equal(removals, 0); assert.equal(stored.indicatorPack.title, pack.title);
    assert.match(document.querySelector('#status').textContent, /Could not clear/);
    assert.equal(document.querySelector('#removePack').disabled, false);
    beforeRemove = undefined; document.querySelector('#removePack').click(); await settle();
    assert.equal(removals, 1); assert.equal(stored.indicatorPack, undefined);
    assert.equal(document.querySelector('#packStatus').textContent, 'No valid pack loaded');
    assert.equal(document.querySelector('#status').textContent, 'Indicator pack cleared');
    assert.equal(stored.settings.intelAdvisories, false);
  }, pack);
});

test('pending file reads, writes and removals disable only pack controls and prevent duplicate intents', async () => {
  for (const phase of ['read', 'write', 'remove']) {
    await popup(async ({ document, select }) => {
      const hold = deferred();
      if (phase === 'write') beforeWrite = () => hold.promise;
      if (phase === 'remove') beforeRemove = () => hold.promise;
      if (phase === 'remove') document.querySelector('#removePack').click();
      else select(pack, phase === 'read' ? { read: () => hold.promise } : undefined);
      await settle();
      assert.equal(document.querySelector('#importPack').disabled, true);
      assert.equal(document.querySelector('#removePack').disabled, true);
      assert.equal(document.querySelector('#other').disabled, false);
      select({ ...pack, title: 'Ignored while pending' }); document.querySelector('#removePack').click();
      hold.resolve(phase === 'read' ? JSON.stringify(pack) : undefined); await settle();
      assert.equal(writes + removals, 1);
      assert.equal(document.querySelector('#importPack').disabled, false);
      assert.equal(document.querySelector('#removePack').disabled, false);
    });
  }
});

test('new storage events win over stale initial reads and stale failures', async () => {
  for (const fails of [false, true]) {
    await popup(async ({ document, hold }) => {
      emit({ ...pack, title: 'New authoritative pack' });
      if (fails) hold.reject(new Error('Old read failed')); else hold.resolve();
      beforeRead = undefined; await settle();
      assert.match(document.querySelector('#packStatus').textContent, /New authoritative pack/);
      assert.doesNotMatch(document.querySelector('#packStatus').textContent, /Could not access/);
    }, { ...pack, title: 'Old snapshot' }, true);
  }
});

test('import invalidates older reads and post-save refresh failures report saved state truthfully', async () => {
  await popup(async ({ document, select, hold }) => {
    beforeRead = undefined;
    select({ ...pack, title: 'New pack' }); await settle();
    hold.resolve(); await settle();
    assert.match(document.querySelector('#packStatus').textContent, /New pack/);
    beforeRead = async () => { throw new Error('Refresh failed'); };
    select({ ...pack, title: 'Saved despite read failure' }); await settle();
    assert.equal(stored.indicatorPack.title, 'Saved despite read failure');
    assert.match(document.querySelector('#status').textContent, /imported.*could not refresh/);
    assert.doesNotMatch(document.querySelector('#status').textContent, /rejected/);
    assert.equal(document.querySelector('#removePack').disabled, false);
  }, { ...pack, title: 'Initial' }, true);
});

test('clear during startup invalidates stale snapshots and failed clear rereads durable state', async () => {
  for (const fails of [false, true]) {
    await popup(async ({ document, hold }) => {
      beforeRead = undefined;
      if (fails) beforeRemove = async () => { throw new Error('Storage unavailable'); };
      document.querySelector('#removePack').click(); await settle();
      hold.resolve(); await settle();
      if (fails) {
        assert.match(document.querySelector('#packStatus').textContent, /Synthetic advisory/);
        assert.match(document.querySelector('#status').textContent, /Could not clear/);
        assert.equal(removals, 0);
      } else {
        assert.equal(document.querySelector('#packStatus').textContent, 'No valid pack loaded');
        assert.equal(removals, 1);
      }
      assert.equal(document.querySelector('#removePack').disabled, false);
    }, pack, true);
  }
});

test('only local indicator-key events synchronize pack state and malformed storage is rejected', async () => {
  await popup(async ({ document }) => {
    for (const listener of listeners) {
      listener({ indicatorPack: { newValue: { ...pack, title: 'Wrong area' } } }, 'sync');
      listener({ settings: { newValue: {} } }, 'local');
    }
    assert.match(document.querySelector('#packStatus').textContent, /Synthetic advisory/);
    emit({ schemaVersion: 3 });
    assert.equal(document.querySelector('#packStatus').textContent, 'No valid pack loaded');
    emit({ ...pack, title: 'Other popup' });
    assert.match(document.querySelector('#packStatus').textContent, /Other popup/);
  }, pack);
});

test('disposal cancels in-flight file reading and detaches all popup listeners', async () => {
  await popup(async ({ document, select, stop }) => {
    const hold = deferred(); select(pack, { read: () => hold.promise });
    stop(); const status = document.querySelector('#status').textContent;
    hold.resolve(JSON.stringify(pack)); await settle();
    document.querySelector('#removePack').click(); select(pack); await settle();
    assert.equal(writes, 0); assert.equal(removals, 0); assert.equal(listeners.size, 0);
    assert.equal(document.querySelector('#status').textContent, status);
  });
});

test('disposal prevents UI writes from already dispatched storage actions and pending startup reads', async () => {
  await popup(async ({ document, select, stop }) => {
    const hold = deferred(); beforeWrite = () => hold.promise;
    select(pack); await settle(); stop();
    const status = document.querySelector('#status').textContent;
    hold.resolve(); await settle();
    assert.equal(writes, 1); assert.equal(document.querySelector('#status').textContent, status);
  });
  await popup(async ({ document, stop, hold }) => {
    stop(); const text = document.querySelector('#packStatus').textContent;
    hold.resolve(); await settle();
    assert.equal(document.querySelector('#packStatus').textContent, text);
  }, pack, true);
});
