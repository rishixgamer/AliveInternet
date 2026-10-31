import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/core/preferences.ts';
import { exportSettings, importSettings, parseSettingsImport, MAX_SETTINGS_IMPORT_BYTES } from '../src/core/portability.ts';
import { createSettingsWriter } from '../src/extension/settings-writer.ts';
import { parseSettingsMutation } from '../src/extension/settings-protocol.ts';

let saved, writes, messages, writer, beforeRead, beforeWrite;
const storageListeners = new Set();
globalThis.chrome = {
  runtime: {
    id: 'portability-fixture',
    async sendMessage(message) {
      messages.push(structuredClone(message));
      try { return { ok: true, settings: await writer(message.mutation) }; }
      catch { return { ok: false, error: 'Could not save settings; retry the action' }; }
    },
  },
  storage: {
    local: { async get() {
      const snapshot = structuredClone(saved);
      if (beforeRead) await beforeRead();
      return { settings: snapshot };
    } },
    onChanged: {
      addListener(listener) { storageListeners.add(listener); },
      removeListener(listener) { storageListeners.delete(listener); },
    },
  },
  permissions: { request() { throw new Error('Imports must never request host access'); } },
};
const { initializePortabilityPopup } = await import('../src/extension/popup-portability.ts');
const { setBlockedAccount, updateSettings } = await import('../src/extension/settings.ts');
const html = `<button id="exportSettings">Export</button><input id="importSettings" type="file">
  <select id="importMode"><option value="merge-blocklist">Merge</option><option value="replace-all">Replace</option></select>
  <pre id="importPreview"></pre><button id="confirmImport">Confirm</button><button id="cancelImport">Cancel</button><p id="status"></p>`;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function settle() { for (let i = 0; i < 70; i++) await Promise.resolve(); }
function emit(settings) {
  saved = structuredClone(settings);
  for (const listener of storageListeners) listener({ settings: { newValue: saved } }, 'local');
}
async function withPopup(run, settings = DEFAULT_SETTINGS) {
  assert.equal(storageListeners.size, 0);
  saved = structuredClone(settings); writes = 0; messages = []; beforeRead = undefined; beforeWrite = undefined;
  writer = createSettingsWriter({
    async read() { return structuredClone(saved); },
    async write(next) { if (beforeWrite) await beforeWrite(); writes++; emit(next); },
  });
  const dom = new JSDOM(html, { url: 'https://fixture.invalid' });
  const document = dom.window.document;
  const stop = initializePortabilityPopup(document);
  const select = (raw, { size, read } = {}) => {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const file = { size: size ?? new TextEncoder().encode(text).length, text: read ?? (async () => text) };
    Object.defineProperty(document.querySelector('#importSettings'), 'files', { configurable: true, value: [file] });
    document.querySelector('#importSettings').dispatchEvent(new dom.window.Event('change'));
  };
  const changeMode = value => {
    document.querySelector('#importMode').value = value;
    document.querySelector('#importMode').dispatchEvent(new dom.window.Event('change'));
  };
  try { await settle(); await run({ dom, document, select, changeMode, stop }); }
  finally { stop(); dom.window.close(); assert.equal(storageListeners.size, 0); }
}

test('validated preview shows exact list changes, stays text-only and requires confirmation', async () => {
  await withPopup(async ({ document, select }) => {
    select({ settings: { blockedAccounts: ['youtube:@theirs'], mutedWords: ['<script>alert(1)</script>'] } });
    await settle();
    assert.equal(writes, 0); assert.equal(messages.length, 0);
    assert.match(document.querySelector('#importPreview').textContent, /blockedAccounts: 1 → 2 \(\+1, −0\)/);
    assert.match(document.querySelector('#importPreview').textContent, /<script>alert\(1\)<\/script>/);
    assert.equal(document.querySelector('#importPreview script'), null);
    document.querySelector('#confirmImport').click(); await settle();
    assert.deepEqual(saved.blockedAccounts, ['youtube:@mine', 'youtube:@theirs']);
    assert.equal(saved.enabled, false);
    assert.equal(messages[0].mutation.kind, 'import');
    assert.equal(document.querySelector('#importPreview').textContent, '');
    assert.equal(document.querySelector('#confirmImport').disabled, true);
  }, { ...DEFAULT_SETTINGS, enabled: false, blockedAccounts: ['youtube:@mine'] });
});

test('file size, encoded size, invalid JSON, unknown fields and schema failures never mutate storage', async () => {
  await withPopup(async ({ document, select }) => {
    const bad = [
      ['{}', { size: MAX_SETTINGS_IMPORT_BYTES + 1 }],
      [' '.repeat(MAX_SETTINGS_IMPORT_BYTES + 1), { size: 1 }],
      ['{bad json'], [{ enabled: 'yes' }], [{ settings: { fake: true } }],
      [{ settings: { blockedAccounts: ['@unscoped'] } }],
      [{ format: 'aliveinternet-settings', version: 3, settings: DEFAULT_SETTINGS }],
      [{ settings: DEFAULT_SETTINGS, unexpected: true }],
      [{ settings: { mutedWords: ['x'] } }],
      [{ settings: { platforms: { youtube: 1 } } }],
    ];
    for (const [raw, options] of bad) {
      select(raw, options); await settle();
      assert.equal(document.querySelector('#confirmImport').disabled, true);
      document.querySelector('#confirmImport').click();
      assert.equal(document.querySelector('#importPreview').textContent, '');
    }
    assert.equal(writes, 0); assert.equal(messages.length, 0);
  });
});

test('replace-all previews removals and requires a complete backup and explicit confirmation', async () => {
  await withPopup(async ({ document, select, changeMode }) => {
    select({ settings: { blockedAccounts: ['x:@partial'] } }); await settle();
    changeMode('replace-all');
    assert.equal(document.querySelector('#confirmImport').disabled, true);
    assert.match(document.querySelector('#status').textContent, /complete settings backup/);
    select(exportSettings({ ...DEFAULT_SETTINGS, enabled: false, platforms: { ...DEFAULT_SETTINGS.platforms, x: true } })); await settle();
    assert.equal(writes, 0);
    assert.match(document.querySelector('#importPreview').textContent, /− youtube:@mine/);
    assert.match(document.querySelector('#importPreview').textContent, /enabled: true → false/);
    assert.equal(document.querySelector('#confirmImport').textContent, 'Confirm replace all');
    document.querySelector('#confirmImport').click(); await settle();
    assert.deepEqual(saved.blockedAccounts, []); assert.equal(saved.enabled, false);
    assert.equal(saved.platforms.x, true);
    assert.deepEqual(messages[0].mutation.expectedSettings.blockedAccounts, ['youtube:@mine']);
  }, { ...DEFAULT_SETTINGS, blockedAccounts: ['youtube:@mine'] });
});

test('storage events update preview while a stale asynchronous settings read is ignored', async () => {
  await withPopup(async ({ document, select }) => {
    const hold = deferred(); beforeRead = () => hold.promise;
    select({ blockedAccounts: ['youtube:@imported'] }); await settle();
    await setBlockedAccount('x', '@concurrent', true);
    hold.resolve(); beforeRead = undefined; await settle();
    assert.match(document.querySelector('#importPreview').textContent, /blockedAccounts: 1 → 2/);
    document.querySelector('#confirmImport').click(); await settle();
    assert.deepEqual(saved.blockedAccounts, ['x:@concurrent', 'youtube:@imported']);
  });
});

test('merge is recalculated after a queued concurrent hide and preference change', async () => {
  await withPopup(async ({ document, select }) => {
    select({ settings: { blockedAccounts: ['x:@imported'], mutedWords: ['new word'], enabled: true } }); await settle();
    const hold = deferred(); const started = deferred();
    beforeWrite = async () => { started.resolve(); await hold.promise; };
    const hide = setBlockedAccount('youtube', '@racing', true); await started.promise;
    const preference = updateSettings({ enabled: false });
    document.querySelector('#confirmImport').click(); await settle();
    assert.equal(document.querySelector('#importSettings').disabled, true);
    hold.resolve(); await Promise.all([hide, preference]); await settle();
    assert.deepEqual(saved.blockedAccounts, ['youtube:@racing', 'x:@imported']);
    assert.equal(saved.enabled, false); assert.deepEqual(saved.mutedWords, ['new word']);
    assert.equal(messages.filter(message => message.mutation.kind === 'import').length, 1);
  });
});

test('a replacement queued behind another write rejects stale confirmation then previews for retry', async () => {
  await withPopup(async ({ document, select, changeMode }) => {
    changeMode('replace-all'); select(exportSettings(DEFAULT_SETTINGS)); await settle();
    const hold = deferred(); const started = deferred();
    beforeWrite = async () => { started.resolve(); await hold.promise; };
    const hide = setBlockedAccount('youtube', '@keep', true); await started.promise;
    document.querySelector('#confirmImport').click(); await settle();
    hold.resolve(); await hide; beforeWrite = undefined; await settle();
    assert.deepEqual(saved.blockedAccounts, ['youtube:@keep']);
    assert.equal(writes, 1);
    assert.match(document.querySelector('#importPreview').textContent, /− youtube:@keep/);
    assert.match(document.querySelector('#status').textContent, /not saved/);
    assert.equal(document.querySelector('#confirmImport').disabled, false);
    document.querySelector('#confirmImport').click(); await settle();
    assert.deepEqual(saved.blockedAccounts, []); assert.equal(writes, 2);
  });
});

test('failed writes retain a valid preview and can be explicitly retried', async () => {
  await withPopup(async ({ document, select }) => {
    select({ blockedAccounts: ['x:@imported'] }); await settle();
    beforeWrite = async () => { throw new Error('storage unavailable'); };
    document.querySelector('#confirmImport').click(); await settle();
    assert.equal(writes, 0); assert.equal(document.querySelector('#confirmImport').disabled, false);
    assert.match(document.querySelector('#importPreview').textContent, /x:@imported/);
    assert.match(document.querySelector('#status').textContent, /not saved/);
    beforeWrite = undefined; document.querySelector('#confirmImport').click(); await settle();
    assert.deepEqual(saved.blockedAccounts, ['x:@imported']);
  });
});

test('overflow rejects rather than truncates imported hides and clears confirmation eligibility', async () => {
  await withPopup(async ({ document, select }) => {
    select({ blockedAccounts: ['x:@overflow'] }); await settle();
    assert.equal(document.querySelector('#confirmImport').disabled, true);
    assert.match(document.querySelector('#status').textContent, /maximum 500/);
    assert.equal(writes, 0);
  }, { ...DEFAULT_SETTINGS, blockedAccounts: Array.from({ length: 500 }, (_, i) => `x:@user${i}`) });
});

test('late file reads cannot replace a newer preview and cancel prevents late import', async () => {
  await withPopup(async ({ document, select }) => {
    const old = deferred();
    select({ blockedAccounts: ['x:@old'] }, { read: () => old.promise });
    select({ blockedAccounts: ['x:@new'] }); await settle();
    old.resolve(JSON.stringify({ blockedAccounts: ['x:@old'] })); await settle();
    assert.match(document.querySelector('#importPreview').textContent, /x:@new/);
    assert.doesNotMatch(document.querySelector('#importPreview').textContent, /x:@old/);
    const late = deferred(); select({}, { read: () => late.promise });
    document.querySelector('#cancelImport').click();
    late.resolve(JSON.stringify(DEFAULT_SETTINGS)); await settle();
    assert.equal(document.querySelector('#confirmImport').disabled, true);
    assert.equal(document.querySelector('#importPreview').textContent, '');
    assert.equal(document.querySelector('#status').textContent, 'Import cancelled');
    assert.equal(writes, 0);
  });
});

test('read failures permit selecting the same file again and disposal detaches listeners', async () => {
  await withPopup(async ({ document, select, stop }) => {
    select({}, { read: async () => { throw new Error('File unavailable'); } }); await settle();
    assert.match(document.querySelector('#status').textContent, /File unavailable/);
    select({ blockedAccounts: ['x:@new'] }); await settle();
    const status = document.querySelector('#status').textContent;
    stop();
    document.querySelector('#confirmImport').click();
    emit({ ...DEFAULT_SETTINGS, enabled: false }); await settle();
    assert.equal(messages.length, 0);
    assert.equal(document.querySelector('#status').textContent, status);
    assert.equal(storageListeners.size, 0);
  });
});

test('download uses validated current backup, removes anchor and revokes object URL on disposal', async () => {
  await withPopup(async ({ dom, document, stop }) => {
    const created = [], revoked = [], clicked = [];
    dom.window.URL.createObjectURL = blob => { created.push(blob); return 'blob:fixture'; };
    dom.window.URL.revokeObjectURL = url => { revoked.push(url); };
    dom.window.HTMLAnchorElement.prototype.click = function () { clicked.push({ href: this.href, download: this.download }); };
    document.querySelector('#exportSettings').click(); await settle();
    assert.equal(created.length, 1); assert.equal(created[0].type, 'application/json');
    assert.equal(document.querySelector('a'), null);
    assert.match(clicked[0].download, /^aliveinternet-settings-\d{4}-\d{2}-\d{2}\.json$/);
    const reader = new dom.window.FileReader();
    const text = new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; });
    reader.readAsText(created[0]);
    assert.deepEqual(JSON.parse(await text).settings.blockedAccounts, ['youtube:@saved']);
    stop(); assert.deepEqual(revoked, ['blob:fixture']);
    assert.equal(messages.length, 0); assert.equal(writes, 0);
  }, { ...DEFAULT_SETTINGS, blockedAccounts: ['youtube:@saved'] });
});

test('disposal while a read or write is pending prevents later UI updates', async () => {
  await withPopup(async ({ document, select, stop }) => {
    const hold = deferred(); select({}, { read: () => hold.promise });
    stop(); const status = document.querySelector('#status').textContent;
    hold.resolve(JSON.stringify(DEFAULT_SETTINGS)); await settle();
    assert.equal(document.querySelector('#status').textContent, status); assert.equal(writes, 0);
  });
  await withPopup(async ({ document, select, stop }) => {
    select({ blockedAccounts: ['x:@accepted'] }); await settle();
    const hold = deferred(); beforeWrite = () => hold.promise;
    document.querySelector('#confirmImport').click(); await settle();
    stop(); const status = document.querySelector('#status').textContent;
    hold.resolve(); await settle();
    assert.deepEqual(saved.blockedAccounts, ['x:@accepted']);
    assert.equal(document.querySelector('#status').textContent, status);
  });
});

test('queued import snapshots defensively copy arrays and replacement baseline', async () => {
  const gate = deferred(); let durable = structuredClone(DEFAULT_SETTINGS);
  const write = createSettingsWriter({ async read() { await gate.promise; return durable; }, async write(next) { durable = next; } });
  const incoming = { ...structuredClone(DEFAULT_SETTINGS), blockedAccounts: ['x:@copied'] };
  const baseline = structuredClone(DEFAULT_SETTINGS);
  const pending = write({ kind: 'import', payload: incoming, mode: 'replace-all', expectedSettings: baseline });
  incoming.blockedAccounts[0] = 'x:@changed'; baseline.enabled = false;
  gate.resolve(); await pending;
  assert.deepEqual(durable.blockedAccounts, ['x:@copied']);
});

test('import protocol rejects invalid mode, missing replacement baseline and unexpected fields', () => {
  for (const mutation of [
    { kind: 'import', payload: DEFAULT_SETTINGS, mode: 'invalid' },
    { kind: 'import', payload: DEFAULT_SETTINGS, mode: 'replace-all' },
    { kind: 'import', payload: DEFAULT_SETTINGS, mode: 'merge-blocklist', expectedSettings: DEFAULT_SETTINGS },
    { kind: 'import', payload: DEFAULT_SETTINGS, mode: 'merge-blocklist', extra: true },
  ]) assert.throws(() => parseSettingsMutation(mutation));
  assert.throws(() => parseSettingsImport({ ...DEFAULT_SETTINGS, platforms: { youtube: true } }, 'replace-all'), /complete platform/);
  assert.throws(() => importSettings(DEFAULT_SETTINGS, JSON.parse('{"__proto__":{"enabled":false}}')));
});

test('export never produces a backup that its import byte limit rejects', () => {
  const key = i => `@${i}`.padEnd(140, 'a');
  const large = { ...DEFAULT_SETTINGS,
    blockedAccounts: Array.from({ length: 500 }, (_, i) => `youtube:${key(i)}`),
    allowedAccounts: Array.from({ length: 500 }, (_, i) => `youtube:${key(i + 500)}`),
    mutedWords: Array.from({ length: 200 }, (_, i) => `word${i}`.padEnd(80, 'a')),
  };
  // With per-channel overrides removed, even maximal lists fit within the import limit.
  const backup = exportSettings(large);
  assert.ok(new TextEncoder().encode(JSON.stringify(backup)).length <= MAX_SETTINGS_IMPORT_BYTES);
  assert.deepEqual(parseSettingsImport(JSON.stringify(backup), 'replace-all'), backup.settings);
});

test('settings protocol and storage sanitizer no longer carry per-channel overrides', () => {
  assert.throws(() => parseSettingsMutation({ kind: 'preferences', patch: { scopeOverrides: [] } }));
  assert.ok(!('scopeOverrides' in sanitizeSettings({ scopeOverrides: [{ scopeId: 'youtube:@owner', mode: 'off' }] })));
  assert.ok(!('scopeOverrides' in DEFAULT_SETTINGS));
});

test('backups from earlier builds that carry the removed scopeOverrides key still import', () => {
  const { scopeOverrides: _, ...modern } = { ...structuredClone(DEFAULT_SETTINGS), blockedAccounts: ['youtube:@kept'] };
  for (const legacy of [[], [{ scopeId: 'youtube:@owner', mode: 'off' }]]) {
    const old = { format: 'aliveinternet-settings', version: 1, exportedAt: '2026-10-20T00:00:00.000Z', settings: { ...modern, scopeOverrides: legacy } };
    for (const mode of ['merge-blocklist', 'replace-all']) {
      const parsed = parseSettingsImport(JSON.stringify(old), mode);
      assert.deepEqual(parsed.blockedAccounts, ['youtube:@kept']);
      assert.ok(!('scopeOverrides' in parsed));
    }
  }
  assert.throws(() => parseSettingsImport({ settings: { notASetting: true } }), /unknown/);
});

test('backups exported before showReportControls existed still restore with the default', () => {
  const { showReportControls: _, ...older } = { ...structuredClone(DEFAULT_SETTINGS), enabled: false, blockedAccounts: ['youtube:@kept'] };
  const backup = { format: 'aliveinternet-settings', version: 1, exportedAt: '2026-10-20T00:00:00.000Z', settings: older };
  for (const mode of ['merge-blocklist', 'replace-all']) {
    const parsed = parseSettingsImport(JSON.stringify(backup), mode);
    assert.equal(parsed.showReportControls, false);
    assert.equal(parsed.enabled, false);
    assert.deepEqual(parsed.blockedAccounts, ['youtube:@kept']);
  }
  // Other omissions still make a replace-all backup incomplete.
  const { enabled: __, ...broken } = older;
  assert.throws(() => parseSettingsImport({ settings: broken }, 'replace-all'), /complete/);
});
