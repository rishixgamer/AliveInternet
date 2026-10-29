import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { accountAction, collapseContent } from '../src/extension/ui.ts';
async function settle() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
async function fixture(run) {
 const dom = new JSDOM('<article style="display:flex"><a href="#profile">Synthetic author</a>Original synthetic content</article>');
 const previous = globalThis.document; globalThis.document = dom.window.document;
 try { await run(dom.window.document); } finally { globalThis.document = previous; dom.window.close(); }
}
test('local account save failures are visible, remain keyboard reachable and can be retried', async () => {
 await fixture(async doc => {
  let fail = true, calls = 0;
  const el = doc.querySelector('article');
  const ui = accountAction(el, '@synthetic', async () => { calls++; if (fail) throw new Error('Unavailable'); });
  const button = el.querySelector('button'); button.click(); await settle();
  assert.match(el.querySelector('[role=status]').textContent, /Could not save/);
  assert.equal(button.disabled, false); assert.equal(calls, 1);
  fail = false; button.click(); await settle(); assert.equal(calls, 2);
  assert.equal(el.querySelector('[role=status]'), null); ui.teardown();
 });
});
test('temporary reveal preserves display, restores keyboard focus and does not unhide an account', async () => {
 await fixture(async doc => {
  let reveals = 0, unhide = 0;
  const el = doc.querySelector('article');
  const ui = collapseContent(el, { id: 'synthetic', reason: 'Personal preference', decision: 'collapse', score: 0, signals: [] }, 'comment', () => { reveals++; }, undefined, undefined, undefined, () => { unhide++; });
  assert.equal(el.style.display, 'none');
  const button = doc.querySelector('button[aria-label="Reveal hidden comment"]'); button.focus(); button.click();
  assert.equal(el.style.display, 'flex'); assert.equal(reveals, 1); assert.equal(unhide, 0);
  assert.equal(doc.activeElement, el.querySelector('a')); ui.teardown(); assert.equal(el.style.display, 'flex');
 });
});

test('unhide teardown returns keyboard focus to the restored item', async () => {
 await fixture(async doc => {
  const el = doc.querySelector('article');
  const ui = collapseContent(el, { id: 'synthetic', reason: 'Account on your local blocklist', decision: 'collapse', score: 0, signals: [] }, 'comment', () => {}, undefined, undefined, undefined, () => {});
  const unhide = [...doc.querySelectorAll('button')].find(button => button.textContent.includes('Unhide account'));
  unhide.focus(); ui.teardown();
  assert.equal(doc.activeElement, el.querySelector('a')); assert.equal(el.style.display, 'flex');
 });
});
