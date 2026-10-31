import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyClosure } from '../scripts/lib/release-closure.mjs';

const sha = text => createHash('sha256').update(text).digest('hex');
const TOKEN = 'ALIVE-PRIVACY-20261013-7C6285A6';
const HEX64 = 'a'.repeat(64);

// Synthetic repository: path -> text. Hashes are computed from these bodies.
function repo(extra = {}) {
  return {
    'site/privacy/index.html': '<p>Contact owner@example.test</p>',
    'docs/privacy-policy.md': 'Contact owner@example.test',
    'docs/validation/owner-gates/mailbox.txt': 'received',
    'docs/validation/owner-gates/chrome.png': 'png',
    'docs/validation/owner-gates/edge.png': 'png2',
    'docs/validation/owner-gates/amo.png': 'png3',
    'docs/validation/owner-gates/xpi.txt': 'xpi receipt',
    'docs/validation/mailbox-test.json': JSON.stringify({ testTokenSha256: sha(TOKEN) }),
    ...extra,
  };
}
const ref = (files, p) => ({ path: p, sha256: sha(files[p]) });
function open() {
  const files = repo();
  return {
    files,
    publisher: {
      privacy: { contact: 'owner@example.test', mailboxDeliveryVerified: false, policySha256: sha(files['site/privacy/index.html']), mailboxTestReceipt: 'docs/validation/mailbox-test.json' },
      stores: { chrome: { publisherAccountVerified: false }, edge: { publisherAccountVerified: false }, firefox: { publisherAccountVerified: false, signedXpiVerified: false } },
    },
    evidence: undefined,
    firefoxManifest: { version: '1.0.0', browser_specific_settings: { gecko: { id: '{id}' } } },
  };
}
function closed() {
  const s = open();
  s.publisher.privacy.mailboxDeliveryVerified = true;
  for (const k of ['chrome', 'edge', 'firefox']) s.publisher.stores[k].publisherAccountVerified = true;
  s.publisher.stores.firefox.signedXpiVerified = true;
  const f = s.files;
  s.evidence = {
    schemaVersion: 1,
    mailbox: { inspectedAt: '2026-11-01', contact: 'owner@example.test', testToken: TOKEN, receiptMethod: 'umass-gmail-inbox', evidence: [ref(f, 'docs/validation/owner-gates/mailbox.txt')] },
    stores: {
      chrome: { inspectedAt: '2026-11-01', dashboardState: 'registered', agreementAccepted: true, evidence: [ref(f, 'docs/validation/owner-gates/chrome.png')] },
      edge: { inspectedAt: '2026-11-01', accountType: 'personal-msa', verificationState: 'verified', evidence: [ref(f, 'docs/validation/owner-gates/edge.png')] },
      firefox: { inspectedAt: '2026-11-01', emailConfirmed: true, agreementReviewed: true, evidence: [ref(f, 'docs/validation/owner-gates/amo.png')] },
    },
    signedXpi: {
      candidateSha256: sha('candidate'), signedXpiSha256: sha('signed'), addonId: '{id}', version: '1.0.0',
      unsignedEntriesIdentical: true, differingEntries: ['META-INF/mozilla.rsa', 'META-INF/mozilla.sf'],
      install: { browser: 'Firefox', browserVersion: '150.0', channel: 'release', freshProfile: true, signatureEnforcement: true, restarted: true, enabledAfterRestart: true },
      smoke: { popupOffOn: true, reversibleRestore: true, localAccountHideUnhide: true, optionalSitesUngranted: true },
      evidence: [ref(f, 'docs/validation/owner-gates/xpi.txt')],
    },
  };
  return s;
}
const run = (s, options = {}) => verifyClosure({
  publisher: s.publisher, evidence: s.evidence, firefoxManifest: s.firefoxManifest, requireClosed: options.requireClosed,
  readFile: p => (p in s.files ? Buffer.from(s.files[p]) : undefined),
});

test('open gates need no evidence and pass the integrity check', () => {
  const r = run(open());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.open, ['mailbox', 'chrome', 'edge', 'firefox', 'signedXpi']);
});

test('--require-closed fails while any gate is open', () => {
  assert.equal(run(open(), { requireClosed: true }).errors.length, 5);
});

test('a fully evidenced closure passes, including strict mode', () => {
  const r = run(closed(), { requireClosed: true });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.open, []);
});

test('a verified flag without evidence is rejected', () => {
  const s = closed(); s.evidence = undefined;
  assert.equal(run(s).errors.length, 5);
  const t = closed(); delete t.evidence.stores.edge;
  assert.match(run(t).errors.join('\n'), /edge/);
});

test('evidence files must exist under docs/validation and match their hash', () => {
  const s = closed(); s.files['docs/validation/owner-gates/chrome.png'] = 'tampered';
  assert.match(run(s).errors.join('\n'), /chrome.*hash/i);
  const m = closed(); m.evidence.stores.chrome.evidence = [{ path: 'docs/validation/owner-gates/missing.png', sha256: HEX64 }];
  assert.match(run(m).errors.join('\n'), /missing/);
  const o = closed(); o.evidence.stores.chrome.evidence = [{ path: 'README.md', sha256: HEX64 }];
  assert.match(run(o).errors.join('\n'), /docs\/validation/);
  const t = closed(); t.evidence.stores.chrome.evidence = [{ path: 'docs/validation/../../secret', sha256: HEX64 }];
  assert.match(run(t).errors.join('\n'), /docs\/validation/);
  const e = closed(); e.evidence.stores.chrome.evidence = [];
  assert.match(run(e).errors.join('\n'), /chrome/);
});

test('mailbox evidence must match the contact, the sent token and the hosted policy', () => {
  const a = closed(); a.evidence.mailbox.contact = 'other@example.test';
  assert.match(run(a).errors.join('\n'), /contact/);
  const b = closed(); b.evidence.mailbox.testToken = 'ALIVE-PRIVACY-20261013-DEADBEEF';
  assert.match(run(b).errors.join('\n'), /token/i);
  const c = closed(); c.files['site/privacy/index.html'] = '<p>Contact someone@else.test</p>';
  const cr = run(c).errors.join('\n');
  assert.match(cr, /site\/privacy\/index.html/);
  const d = closed(); d.files['docs/privacy-policy.md'] = 'no contact here';
  assert.match(run(d).errors.join('\n'), /docs\/privacy-policy.md/);
  const e = closed(); e.files['site/privacy/index.html'] = '<p>Contact owner@example.test, edited</p>';
  assert.match(run(e).errors.join('\n'), /policySha256/);
});

test('Edge must be verified, not merely enrolled; accounts need agreements and confirmed email', () => {
  for (const state of ['pending', 'action-required', 'enrolled']) {
    const s = closed(); s.evidence.stores.edge.verificationState = state;
    assert.match(run(s).errors.join('\n'), /edge/);
  }
  const w = closed(); w.evidence.stores.edge.accountType = 'work-or-school';
  assert.match(run(w).errors.join('\n'), /personal/);
  const c = closed(); c.evidence.stores.chrome.agreementAccepted = false;
  assert.match(run(c).errors.join('\n'), /chrome/);
  const f = closed(); f.evidence.stores.firefox.emailConfirmed = false;
  assert.match(run(f).errors.join('\n'), /firefox/);
});

test('signed XPI evidence must prove identity, byte equality and a normal install', () => {
  const mutate = (fn, pattern) => { const s = closed(); fn(s.evidence.signedXpi); assert.match(run(s).errors.join('\n'), pattern); };
  mutate(x => { x.differingEntries.push('manifest.json'); }, /META-INF/);
  mutate(x => { x.unsignedEntriesIdentical = false; }, /unsignedEntriesIdentical/);
  mutate(x => { x.signedXpiSha256 = x.candidateSha256; }, /differ/i);
  mutate(x => { x.candidateSha256 = 'xyz'; }, /candidateSha256/);
  mutate(x => { x.addonId = '{other}'; }, /addonId/);
  mutate(x => { x.version = '0.0.1'; }, /version/);
  mutate(x => { x.install.signatureEnforcement = false; }, /signatureEnforcement/);
  mutate(x => { x.install.freshProfile = false; }, /freshProfile/);
  mutate(x => { x.install.restarted = false; }, /restarted/);
  mutate(x => { x.install.enabledAfterRestart = false; }, /enabledAfterRestart/);
  mutate(x => { x.install.channel = 'nightly'; }, /channel/);
  mutate(x => { x.smoke.optionalSitesUngranted = false; }, /optionalSitesUngranted/);
  mutate(x => { delete x.smoke; }, /smoke/);
});

test('evidence must not carry credentials', () => {
  const s = closed(); s.evidence.stores.chrome.apiKey = 'x';
  assert.match(run(s).errors.join('\n'), /credential/i);
  const t = closed(); t.evidence.signedXpi.install.sessionCookie = 'x';
  assert.match(run(t).errors.join('\n'), /credential/i);
});
