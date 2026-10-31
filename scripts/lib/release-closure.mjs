import { createHash } from 'node:crypto';

// Pure verification of owner-gate closure evidence. All I/O is injected so the rules are testable.
// A gate flag set to true in release/publisher.json must be backed by hashed evidence under docs/validation/.
export const EVIDENCE_PATH = 'docs/validation/owner-gates/closure-evidence.json';
export const GATES = ['mailbox', 'chrome', 'edge', 'firefox', 'signedXpi'];

const HEX64 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}/;
const TOKEN = /^ALIVE-PRIVACY-\d{8}-[0-9A-F]{8}$/;
const CREDENTIAL_KEY = /(password|passwd|secret|api[-_]?key|cookie|credential|authorization|bearer|private[-_]?key)/i;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function verifyClosure({ publisher, evidence, firefoxManifest, readFile, requireClosed = false }) {
  const errors = [];
  const fail = (gate, message) => errors.push(`${gate}: ${message}`);
  const flags = {
    mailbox: publisher.privacy?.mailboxDeliveryVerified === true,
    chrome: publisher.stores?.chrome?.publisherAccountVerified === true,
    edge: publisher.stores?.edge?.publisherAccountVerified === true,
    firefox: publisher.stores?.firefox?.publisherAccountVerified === true,
    signedXpi: publisher.stores?.firefox?.signedXpiVerified === true,
  };
  const open = GATES.filter(g => !flags[g]);
  if (requireClosed) for (const g of open) fail(g, 'gate is still open');

  const requireTrue = (gate, section, fields) => { for (const f of fields) if (section?.[f] !== true) fail(gate, `${f} must be true`); };
  const checkEvidence = (gate, section) => {
    if (!section || !Array.isArray(section.evidence) || section.evidence.length === 0) return fail(gate, 'evidence list is empty');
    if (!DATE.test(section.inspectedAt ?? '') && gate !== 'signedXpi') fail(gate, 'inspectedAt date missing');
    for (const item of section.evidence) {
      const p = item?.path;
      if (typeof p !== 'string' || !p.startsWith('docs/validation/') || p.split('/').includes('..')) { fail(gate, `evidence path must be inside docs/validation/: ${p}`); continue; }
      const bytes = readFile(p);
      if (!bytes) { fail(gate, `evidence file missing: ${p}`); continue; }
      if (!HEX64.test(item.sha256 ?? '') || sha256(bytes) !== item.sha256) fail(gate, `evidence hash mismatch: ${p}`);
    }
  };
  const scanCredentials = (value, trail) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (CREDENTIAL_KEY.test(key)) fail('evidence', `credential-like field must not be stored: ${trail}${key}`);
      scanCredentials(child, `${trail}${key}.`);
    }
  };

  if (open.length < GATES.length) {
    if (!evidence || typeof evidence !== 'object') for (const g of GATES.filter(g => flags[g])) fail(g, `verified flag requires evidence at ${EVIDENCE_PATH}`);
    else scanCredentials(evidence, '');
  }

  if (flags.mailbox && evidence) {
    const m = evidence.mailbox;
    if (!m) fail('mailbox', 'evidence section missing');
    else {
      checkEvidence('mailbox', m);
      if (m.contact !== publisher.privacy.contact) fail('mailbox', 'evidence contact differs from release/publisher.json contact');
      if (!['umass-gmail-inbox', 'umass-it-trace', 'replacement-address-test'].includes(m.receiptMethod)) fail('mailbox', 'unknown receiptMethod');
      const receipt = publisher.privacy.mailboxTestReceipt && readFile(publisher.privacy.mailboxTestReceipt);
      let expected;
      try { expected = JSON.parse(receipt).testTokenSha256; } catch { expected = undefined; }
      if (!TOKEN.test(m.testToken ?? '') || sha256(m.testToken) !== expected) fail('mailbox', 'testToken does not match the sent-test receipt hash');
      for (const file of ['site/privacy/index.html', 'docs/privacy-policy.md']) {
        const bytes = readFile(file);
        if (!bytes || !bytes.toString('utf8').includes(publisher.privacy.contact)) fail('mailbox', `${file} does not publish the verified contact`);
      }
      const site = readFile('site/privacy/index.html');
      if (site && sha256(site) !== publisher.privacy.policySha256) fail('mailbox', 'publisher.json policySha256 does not match site/privacy/index.html');
    }
  }

  const stores = evidence?.stores ?? {};
  if (flags.chrome && evidence) {
    const c = stores.chrome; checkEvidence('chrome', c);
    if (c) { requireTrue('chrome', c, ['agreementAccepted']); if (c.dashboardState !== 'registered') fail('chrome', 'dashboardState must be registered'); }
  }
  if (flags.edge && evidence) {
    const e = stores.edge; checkEvidence('edge', e);
    if (e) {
      if (e.accountType !== 'personal-msa') fail('edge', 'accountType must be personal-msa (personal Microsoft account)');
      if (e.verificationState !== 'verified') fail('edge', 'verificationState must be verified; pending, action-required and enrolled do not count');
    }
  }
  if (flags.firefox && evidence) {
    const f = stores.firefox; checkEvidence('firefox', f);
    if (f) requireTrue('firefox', f, ['emailConfirmed', 'agreementReviewed']);
  }
  if (flags.signedXpi && evidence) {
    const x = evidence.signedXpi;
    if (!x) fail('signedXpi', 'evidence section missing');
    else {
      checkEvidence('signedXpi', x);
      for (const f of ['candidateSha256', 'signedXpiSha256']) if (!HEX64.test(x[f] ?? '')) fail('signedXpi', `${f} must be a SHA-256 hex digest`);
      if (x.candidateSha256 === x.signedXpiSha256) fail('signedXpi', 'signed XPI hash must differ from the unsigned candidate (signature files were added)');
      if (x.addonId !== firefoxManifest?.browser_specific_settings?.gecko?.id) fail('signedXpi', 'addonId does not match the Firefox manifest');
      if (x.version !== firefoxManifest?.version) fail('signedXpi', 'version does not match the Firefox manifest');
      if (x.unsignedEntriesIdentical !== true) fail('signedXpi', 'unsignedEntriesIdentical must be true (byte-for-byte comparison)');
      if (!Array.isArray(x.differingEntries) || !x.differingEntries.every(n => typeof n === 'string' && n.startsWith('META-INF/'))) fail('signedXpi', 'only META-INF/ Mozilla signature entries may differ');
      const i = x.install;
      if (!i) fail('signedXpi', 'install section missing');
      else {
        if (i.channel !== 'release') fail('signedXpi', 'install channel must be release');
        if (!i.browser || !i.browserVersion) fail('signedXpi', 'install browser/browserVersion missing');
        for (const f of ['freshProfile', 'signatureEnforcement', 'restarted', 'enabledAfterRestart']) if (i[f] !== true) fail('signedXpi', `install.${f} must be true`);
      }
      if (!x.smoke) fail('signedXpi', 'smoke section missing');
      else for (const f of ['popupOffOn', 'reversibleRestore', 'localAccountHideUnhide', 'optionalSitesUngranted']) if (x.smoke[f] !== true) fail('signedXpi', `smoke.${f} must be true`);
    }
  }
  return { errors, open, flags };
}
