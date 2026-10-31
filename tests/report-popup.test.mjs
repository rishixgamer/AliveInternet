import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const created = [];
let activeTab = 1;
let respond = () => { throw new Error('No receiver'); };
const requests = [];
globalThis.chrome = { runtime: { id: 'fixture' }, tabs: {
  async query() { return [{ id: activeTab }]; },
  async sendMessage(id, message) { requests.push({ id, message }); return respond(id, message); },
  async create(options) { created.push(options); return { id: 99 }; },
} };
const { initializeReportPopup, parseDraft } = await import('../src/extension/popup-report.ts');
const { initializeReviewPopup } = await import('../src/extension/popup-review.ts');
const html = await readFile(new URL('../entrypoints/popup/index.html', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const draft = (over = {}) => ({ kind: 'wrongly-hidden', platform: 'youtube', text: 'a legitimate comment', reason: 'Off-platform contact solicitation', mode: 'balanced', version: '0.3.0', ...over });

async function popup(run) {
  created.length = 0; requests.length = 0; activeTab = 1;
  respond = () => { throw new Error('No receiver'); };
  const dom = new JSDOM(html); const doc = dom.window.document;
  const report = initializeReportPopup(doc);
  try { await run(doc, report); } finally { report.dispose(); dom.window.close(); }
}

test('the preview is hidden and nothing is opened until the explicit click', async () => {
  await popup(async (doc, report) => {
    await settle();
    assert.equal(doc.querySelector('#reportSection').hidden, true);
    report.show(draft());
    await settle();
    assert.equal(doc.querySelector('#reportSection').hidden, false);
    assert.equal(doc.querySelector('#reportText').value, 'a legitimate comment');
    assert.deepEqual(created, [], 'showing a preview must not open anything');
  });
});

test('edited text is re-redacted and opened exactly once on click', async () => {
  await popup(async (doc, report) => {
    report.show(draft());
    doc.querySelector('#reportText').value = 'edited, see https://x.com/someone/status/12345?s=1 @someone';
    doc.querySelector('#openReport').click(); doc.querySelector('#openReport').click();
    await settle();
    assert.equal(created.length, 1);
    const url = new URL(created[0].url);
    assert.equal(url.origin + url.pathname, 'https://github.com/rishixgamer/AliveInternet/issues/new');
    assert.equal(url.searchParams.get('text'), 'edited, see [link: x.com] [handle]');
    assert.equal(doc.querySelector('#reportSection').hidden, true, 'draft cleared after opening');
    assert.equal(doc.querySelector('#reportText').value, '');
    doc.querySelector('#openReport').click(); await settle();
    assert.equal(created.length, 1, 'no second open without a new draft');
  });
});

test('deleting the text is honored', async () => {
  await popup(async (doc, report) => {
    report.show(draft());
    doc.querySelector('#clearReportText').click();
    assert.equal(doc.querySelector('#reportText').value, '');
    doc.querySelector('#openReport').click(); await settle();
    assert.equal(new URL(created[0].url).searchParams.get('text'), '');
  });
});

test('cancelling discards the draft and sends nothing', async () => {
  await popup(async (doc, report) => {
    report.show(draft());
    doc.querySelector('#cancelReport').click(); await settle();
    assert.equal(doc.querySelector('#reportSection').hidden, true);
    assert.equal(doc.querySelector('#reportText').value, '');
    doc.querySelector('#openReport').click(); await settle();
    assert.deepEqual(created, []);
  });
});

test('a failed open keeps the draft for retry and reports it', async () => {
  await popup(async (doc, report) => {
    const create = chrome.tabs.create;
    chrome.tabs.create = async () => { throw new Error('blocked'); };
    try {
      report.show(draft());
      doc.querySelector('#openReport').click(); await settle();
      assert.equal(doc.querySelector('#reportSection').hidden, false);
      assert.equal(doc.querySelector('#openReport').disabled, false);
      assert.match(doc.querySelector('#reportSummary').textContent, /Nothing was sent/);
    } finally { chrome.tabs.create = create; }
  });
});

test('a draft staged by a page button is picked up on popup open without opening anything', async () => {
  created.length = 0;
  respond = () => ({ ok: true, draft: draft({ text: 'staged' }) });
  const dom = new JSDOM(html); const doc = dom.window.document;
  const report = initializeReportPopup(doc);
  await settle();
  assert.equal(doc.querySelector('#reportText').value, 'staged');
  assert.deepEqual(created, []);
  report.dispose(); dom.window.close();
});

test('drafts from the page context are untrusted: malformed ones are rejected, identifiers re-redacted', () => {
  assert.equal(parseDraft(null), undefined);
  assert.equal(parseDraft(draft({ kind: 'other' })), undefined);
  assert.equal(parseDraft(draft({ platform: 'myspace' })), undefined);
  assert.equal(parseDraft(draft({ text: 5 })), undefined);
  const parsed = parseDraft({ ...draft({ text: 'hi @leaky https://a.example/path?q=1', reason: 'saw @leaky', version: 'evil<script>' }), accountKey: '@leaky', extra: 1 });
  assert.deepEqual(Object.keys(parsed).sort(), ['kind', 'mode', 'platform', 'reason', 'text', 'version']);
  assert.equal(parsed.text, 'hi [handle] [link: a.example]');
  assert.equal(parsed.reason, 'saw [handle]');
  assert.equal(parsed.version, '');
});

test('review rows can prepare a wrongly hidden report; only the callback receives it', async () => {
  created.length = 0; requests.length = 0;
  const row = { pageItemId: '12345678-1234-1234-1234-123456789abc:1', platform: 'youtube', kind: 'comment', excerpt: 'x', reason: 'r', category: 'content-rule' };
  respond = (_, msg) => msg.type === 'aliveinternet/report-draft' ? { ok: true, draft: draft() } : { items: [row], total: 1, truncated: false };
  const dom = new JSDOM(html); const doc = dom.window.document;
  const got = [];
  const stop = initializeReviewPopup(doc, d => got.push(d));
  doc.querySelector('#refreshHidden').click(); await settle();
  assert.deepEqual(got, []);
  const button = [...doc.querySelectorAll('.review-row button')].find(b => /Report wrongly hidden/.test(b.textContent));
  button.click(); await settle();
  assert.equal(got.length, 1); assert.equal(got[0].kind, 'wrongly-hidden');
  assert.equal(requests.at(-1).message.pageItemId, row.pageItemId);
  assert.deepEqual(created, []);
  stop(); dom.window.close();
});
