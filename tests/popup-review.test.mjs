import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const requests = [];
let activeTab = 1;
let send;
globalThis.chrome = { runtime: { id: 'fixture' }, tabs: {
  async query() { return [{ id: activeTab }]; },
  async sendMessage(id, message) { requests.push({ id, message }); return send(id, message); },
} };
const { initializeReviewPopup } = await import('../src/extension/popup-review.ts');
const html = await readFile(new URL('../entrypoints/popup/index.html', import.meta.url), 'utf8');
const row = n => ({ pageItemId: `12345678-1234-1234-1234-123456789abc:${n}`, platform: 'youtube', kind: 'comment', excerpt: '<img src=x onerror=alert(1)>', reason: 'Your local hide', category: 'user-block' });
async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
async function popup(run) {
  requests.length = 0; activeTab = 1;
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const stop = initializeReviewPopup(doc);
  try { await run(doc, stop); } finally { stop(); dom.window.close(); }
}
test('review waits for explicit request, paginates and renders excerpts safely', async () => {
  await popup(async doc => {
    send = (_, msg) => ({ items: Array.from({ length: msg.offset ? 5 : 50 }, (_, n) => row(n + 1)), total: 55, truncated: !msg.offset });
    assert.equal(requests.length, 0);
    doc.querySelector('#refreshHidden').click(); await settle();
    assert.equal(doc.querySelectorAll('.review-row').length, 50);
    assert.equal(doc.querySelector('#hiddenItems img'), null);
    assert.match(doc.querySelector('#hiddenItems').textContent, /<img/);
    doc.querySelector('#nextHidden').click(); await settle();
    assert.equal(requests.at(-1).message.offset, 50);
    assert.equal(doc.querySelectorAll('.review-row').length, 5);
    doc.querySelector('#previousHidden').click(); await settle();
    assert.equal(requests.at(-1).message.offset, 0);
  });
});
test('review reveals only in its source tab, retains failures for retry and handles unavailable pages', async () => {
  await popup(async doc => {
    let revealOk = false;
    send = (_, msg) => msg.type === 'aliveinternet/reveal-item' ? { ok: revealOk } : { items: [row(1)], total: 1, truncated: false };
    doc.querySelector('#refreshHidden').click(); await settle();
    activeTab = 2;
    doc.querySelector('.review-row button').click(); await settle();
    assert.equal(requests.at(-1).id, 1);
    assert.equal(doc.querySelector('.review-row button').disabled, false);
    assert.match(doc.querySelector('#hiddenSummary').textContent, /changed/);
    revealOk = true; doc.querySelector('.review-row button').click(); await settle();
    assert.equal(doc.querySelector('.review-row'), null);
    send = () => { throw new Error('No receiver'); };
    doc.querySelector('#refreshHidden').click(); await settle();
    assert.match(doc.querySelector('#hiddenSummary').textContent, /unavailable/);
    assert.equal(doc.querySelector('#refreshHidden').disabled, false);
  });
});
test('review disposal ignores pending responses and rejects oversized or malformed records', async () => {
  await popup(async (doc, stop) => {
    for (const response of [{ items: Array.from({ length: 51 }, () => row(1)), total: 51, truncated: false },
      { items: [{ ...row(1), excerpt: 'x'.repeat(161) }], total: 1, truncated: false },
      { items: [row(1)], total: -1, truncated: false }]) {
      send = () => response; doc.querySelector('#refreshHidden').click(); await settle();
      assert.equal(doc.querySelector('.review-row'), null);
      assert.match(doc.querySelector('#hiddenSummary').textContent, /unavailable/);
    }
    let resolve; send = () => new Promise(done => { resolve = done; });
    doc.querySelector('#refreshHidden').click(); await settle(); stop();
    resolve({ items: [row(1)], total: 1, truncated: false }); await settle();
    assert.equal(doc.querySelector('.review-row'), null);
  });
});

test('a late reveal result cannot overwrite a refreshed different-tab list', async () => {
  for (const fail of [false, true]) {
    await popup(async doc => {
      let complete;
      send = (_, message) => {
        if (message.type === 'aliveinternet/reveal-item') return new Promise((resolve, reject) => { complete = fail ? () => reject(new Error('old tab failed')) : () => resolve({ ok: true }); });
        return activeTab === 1 ? { items: [row(1)], total: 1, truncated: false }
          : { items: Array.from({ length: 50 }, (_, n) => row(n + 2)), total: 51, truncated: true };
      };
      doc.querySelector('#refreshHidden').click(); await settle();
      doc.querySelector('.review-row button').click(); await settle();
      activeTab = 2; doc.querySelector('#refreshHidden').click(); await settle();
      assert.equal(doc.querySelector('#nextHidden').disabled, false);
      const summary = doc.querySelector('#hiddenSummary').textContent;
      complete(); await settle();
      assert.equal(doc.querySelector('#nextHidden').disabled, false);
      assert.equal(doc.querySelector('#hiddenSummary').textContent, summary);
      assert.equal(doc.querySelectorAll('.review-row').length, 50);
    });
  }
});

test('navigation rejection is unavailable, never a verified empty review', async () => {
  await popup(async doc => {
    send = () => ({ ok: false, items: [], total: 0, truncated: false });
    doc.querySelector('#refreshHidden').click(); await settle();
    assert.match(doc.querySelector('#hiddenSummary').textContent, /unavailable/);
  });
});

test('keyboard reveal moves focus to the next action, then to the result summary', async () => {
  await popup(async doc => {
    send = (_, message) => message.type === 'aliveinternet/reveal-item' ? { ok: true } : { items: [row(1), row(2)], total: 2, truncated: false };
    doc.querySelector('#reviewPanel').hidden = false;
    doc.querySelector('#refreshHidden').click(); await settle();
    doc.querySelector('.review-row button').focus(); doc.activeElement.click(); await settle();
    assert.equal(doc.activeElement, doc.querySelector('.review-row button'));
    doc.activeElement.click(); await settle();
    assert.equal(doc.activeElement, doc.querySelector('#hiddenSummary'));
  });
});
