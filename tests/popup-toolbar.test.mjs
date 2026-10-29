import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { DEFAULT_SETTINGS } from '../src/core/preferences.ts';
import { createSettingsWriter } from '../src/extension/settings-writer.ts';
import { toolbarState, platformForUrl, parsePageStatus } from '../src/extension/page-status.ts';
const changed = new Set(), permissions = new Set();
let saved, active, response, granted, readFails, writeFails, requests, queryHook;
const emit = (key, value) => { for (const fn of changed) fn({ [key]: { newValue: value } }, 'local'); };
const writer = createSettingsWriter({ read: async () => saved, write: async value => {
  if (writeFails) throw new Error('Disk unavailable'); saved = value; emit('settings', value);
} });
globalThis.chrome = {
  runtime: { id: 'toolbar-test', async openOptionsPage() {}, async sendMessage(message) {
    try { return { ok: true, settings: await writer(message.mutation) }; } catch { return { ok: false }; }
  } },
  storage: { local: { async get(key) {
    if (readFails) throw new Error('Storage unavailable');
    return { [key]: key === 'settings' ? structuredClone(saved) : true };
  } }, onChanged: { addListener: fn => changed.add(fn), removeListener: fn => changed.delete(fn) } },
  tabs: { async query() { if (queryHook) return queryHook(); return [active]; }, async sendMessage(id, message) {
    requests.push({ id, message }); if (response instanceof Error) throw response;
    return typeof response === 'function' ? response(id, message) : response;
  } },
  permissions: { async contains() { return granted; }, async request() { throw new Error('Unexpected consent request'); },
    onAdded: { addListener: fn => permissions.add(fn), removeListener: fn => permissions.delete(fn) },
    onRemoved: { addListener: fn => permissions.add(fn), removeListener: fn => permissions.delete(fn) } },
};
const { initializeToolbarPopup } = await import('../src/extension/popup-toolbar.ts');
const html = await readFile(new URL('../entrypoints/popup/index.html', import.meta.url), 'utf8');
const page = { platform: 'youtube', ready: true, enabled: true, total: 2 };
async function settle() { for (let i = 0; i < 100; i++) await Promise.resolve(); }
async function fixture(run) {
  saved = structuredClone(DEFAULT_SETTINGS); active = { id: 1, url: 'https://www.youtube.com/watch?v=synthetic' };
  response = page; granted = true; readFails = false; writeFails = false; requests = []; queryHook = undefined;
  const dom = new JSDOM(html); const doc = dom.window.document;
  const stop = initializeToolbarPopup(doc);
  try { await settle(); await run(doc, stop); } finally { stop(); dom.window.close(); }
  assert.equal(changed.size, 0); assert.equal(permissions.size, 0);
}
test('toolbar distinguishes access, unsupported, disabled, paused, loading, absent script and verified zero', () => {
  const settings = structuredClone(DEFAULT_SETTINGS), url = 'https://www.youtube.com/watch?v=fixture';
  assert.equal(toolbarState(settings, url, true, { ...page, total: 0 }).count, 0);
  for (const [kind, value, consent, state] of [
    ['permission', undefined, false], ['unsupported', 'https://example.invalid', true],
    ['permission', url, false], ['unavailable', url, true], ['loading', url, true, { ...page, ready: false }],
  ]) { const result = toolbarState(settings, value, consent, state); assert.equal(result.kind, kind); assert.equal(result.count, undefined); }
  settings.platforms.youtube = false; assert.equal(toolbarState(settings, url, true).kind, 'paused');
  settings.enabled = false; assert.match(toolbarState(settings, url, true).action, /all websites/);
  assert.equal(platformForUrl('https://www.youtube.com.attacker.invalid'), undefined);
  assert.equal(platformForUrl('http://www.youtube.com'), undefined);
  assert.equal(platformForUrl('https://www.youtube.com:444/watch'), undefined);
  for (const value of [null, { ...page, ok: false }, { ...page, total: -1 }, { ...page, total: .5 }, { ...page, platform: 'x' }]) assert.throws(() => parsePageStatus(value, 'youtube'));
});
test('opening toolbar requests a count without excerpts and never a host grant', async () => {
  await fixture(async doc => {
    assert.equal(doc.querySelector('#pageCount').textContent, '2');
    assert.equal(doc.querySelector('#pageState').textContent, 'Filtering is active');
    assert.deepEqual(requests.map(r => r.message.type), ['aliveinternet/page-status']);
    assert.equal(doc.querySelector('#reviewPanel').hidden, true);
    assert.equal(doc.querySelector('#enabled'), null, 'global preference belongs in settings');
  });
});
test('site pause changes only this website preference and failed writes can be retried', async () => {
  await fixture(async doc => {
    writeFails = true; doc.querySelector('#siteToggle').click(); await settle();
    assert.equal(saved.platforms.youtube, true); assert.match(doc.querySelector('#status').textContent, /Could not save/);
    writeFails = false; doc.querySelector('#siteToggle').click(); await settle();
    assert.equal(saved.platforms.youtube, false); assert.equal(saved.enabled, true); assert.equal(saved.platforms.x, false);
    assert.equal(doc.querySelector('#pageCount').textContent, '—');
    assert.match(doc.querySelector('#siteToggle').textContent, /Resume on YouTube/);
    doc.querySelector('#siteToggle').click(); await settle(); assert.equal(saved.platforms.youtube, true);
  });
});
test('settings-read failure is distinct and Refresh recovers without changing preferences', async () => {
  await fixture(async doc => {
    readFails = true; doc.querySelector('#refreshPage').click(); await settle();
    assert.match(doc.querySelector('#pageState').textContent, /Could not load settings/);
    assert.equal(doc.querySelector('#pageCount').textContent, '—');
    readFails = false; response = { ...page, total: 0 }; doc.querySelector('#refreshPage').click(); await settle();
    assert.equal(doc.querySelector('#pageCount').textContent, '0'); assert.equal(saved.enabled, true);
  });
});
test('missing content scripts never become a verified zero and Refresh recovers', async () => {
  await fixture(async doc => {
    response = new Error('No receiving end'); doc.querySelector('#refreshPage').click(); await settle();
    assert.equal(doc.querySelector('#pageCount').textContent, '—'); assert.equal(doc.querySelector('#reviewHidden').disabled, true);
    assert.match(doc.querySelector('#pageState').textContent, /not connected/);
    response = page; doc.querySelector('#refreshPage').click(); await settle(); assert.equal(doc.querySelector('#pageCount').textContent, '2');
  });
});
test('review stays scoped to the displayed tab; closing clears excerpts and rejects late replies', async () => {
  await fixture(async doc => {
    const row = { pageItemId: '12345678-1234-1234-1234-123456789abc:1', platform: 'youtube', kind: 'comment', excerpt: 'Synthetic excerpt', reason: 'Personal mute preference' };
    active = { id: 2, url: 'https://www.youtube.com/watch?v=other' };
    let complete;
    response = (id, message) => message.type === 'aliveinternet/hidden-items' ? new Promise(resolve => { complete = resolve; }) : page;
    doc.querySelector('#reviewHidden').click(); await settle();
    assert.equal(requests.at(-1).id, 1);
    doc.querySelector('#closeReview').click();
    complete({ items: [row], total: 1, truncated: false }); await settle();
    assert.equal(doc.querySelectorAll('.review-row').length, 0); assert.equal(doc.querySelector('#reviewPanel').hidden, true);
  });
});
test('out-of-order status replies and disposal cannot replace newer page state', async () => {
  await fixture(async (doc, stop) => {
    let complete;
    queryHook = () => new Promise(resolve => { complete = resolve; });
    // Permission events may overlap an earlier read; latest request must win.
    for (const fn of permissions) fn();
    doc.querySelector('#refreshPage').click(); await settle();
    stop(); complete([{ id: 9, url: 'https://www.youtube.com/watch?v=late' }]); await settle();
    assert.equal(doc.querySelector('#pageCount').textContent, '—');
  });
});

test('routine status refresh does not swallow a click on an already known site action', async () => {
  await fixture(async doc => {
    let complete;
    response = () => new Promise(resolve => { complete = resolve; });
    doc.querySelector('#refreshPage').click(); await settle();
    assert.equal(doc.querySelector('#siteToggle').disabled, false);
    assert.equal(doc.querySelector('#pageCount').textContent, '—');
    assert.equal(doc.querySelector('#reviewHidden').disabled, true);
    complete(page); await settle();
    assert.equal(doc.querySelector('#pageCount').textContent, '2');
  });
});
