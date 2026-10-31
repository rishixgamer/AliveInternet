import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Verification of owner-gate closure evidence. A gate flag set to true in release/publisher.json must be
// backed by hashed evidence under docs/validation/. verifyClosure is pure (I/O injected); verifyClosureFromDisk loads files.
export const EVIDENCE_PATH = 'docs/validation/owner-gates/closure-evidence.json';
export const GATES = ['mailbox', 'chrome', 'edge', 'firefox', 'signedXpi'];

const HEX64 = /^[0-9a-f]{64}$/;
const TOKEN = /^ALIVE-PRIVACY-\d{8}-[0-9A-F]{8}$/;
const MAILBOX_METHODS = ['umass-gmail-inbox', 'umass-it-trace', 'replacement-address-test'];
// Field names that must never appear. `testToken` is the public delivery-test marker, not a credential.
const CREDENTIAL_KEY = /(password|passwd|passphrase|secret|api[-_]?key|cookie|credential|authorization|bearer|private[-_]?key|session[-_]?id|access[-_]?token|refresh[-_]?token|^token$)/i;
const CREDENTIAL_VALUE = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]{20,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}|\b(?:sk|ghp|gho|github_pat|xox[bp])[-_][A-Za-z0-9_-]{20,})/;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(value) && !Number.isNaN(Date.parse(value));

export function verifyClosure({ publisher, evidence, firefoxManifest, readFile: readRaw, requireClosed = false }) {
  const errors = [];
  const fail = (gate, message) => errors.push(`${gate}: ${message}`);
  const cache = new Map();
  const readFile = p => { if (!cache.has(p)) cache.set(p, readRaw(p)); return cache.get(p); };
  const stores = publisher.stores ?? {};
  const flags = {
    mailbox: publisher.privacy?.mailboxDeliveryVerified === true,
    chrome: stores.chrome?.publisherAccountVerified === true,
    edge: stores.edge?.publisherAccountVerified === true,
    firefox: stores.firefox?.publisherAccountVerified === true,
    signedXpi: stores.firefox?.signedXpiVerified === true,
  };
  const open = GATES.filter(g => !flags[g]);
  if (requireClosed) for (const g of open) fail(g, 'gate is still open');

  const requireTrue = (gate, section, fields, prefix = '') => { for (const f of fields) if (section?.[f] !== true) fail(gate, `${prefix}${f} must be true`); };
  const checkEvidence = (gate, section) => {
    if (!validDate(section.inspectedAt)) fail(gate, 'inspectedAt must be a valid ISO date');
    if (!Array.isArray(section.evidence) || section.evidence.length === 0) return fail(gate, 'evidence list is empty');
    for (const item of section.evidence) {
      const p = item?.path;
      if (typeof p !== 'string' || !p.startsWith('docs/validation/') || p.split('/').includes('..')) { fail(gate, `evidence path must be inside docs/validation/: ${p}`); continue; }
      const bytes = readFile(p);
      if (!bytes) { fail(gate, `evidence file missing: ${p}`); continue; }
      if (!HEX64.test(item.sha256 ?? '') || sha256(bytes) !== item.sha256) fail(gate, `evidence hash mismatch: ${p}`);
    }
  };
  const scanCredentials = (value, trail) => {
    if (typeof value === 'string') { if (CREDENTIAL_VALUE.test(value)) fail('evidence', `credential-like value must not be stored at ${trail}`); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (CREDENTIAL_KEY.test(key)) fail('evidence', `credential-like field must not be stored: ${trail}${key}`);
      scanCredentials(child, `${trail}${key}.`);
    }
  };

  const validators = {
    mailbox(m) {
      if (m.contact !== publisher.privacy.contact) fail('mailbox', 'evidence contact differs from release/publisher.json contact');
      if (!MAILBOX_METHODS.includes(m.receiptMethod)) fail('mailbox', 'unknown receiptMethod');
      // A replacement address has its own test message, so it must name its own sent-test receipt.
      if (m.receiptMethod === 'replacement-address-test' && typeof m.testReceipt !== 'string') fail('mailbox', 'replacement-address-test requires testReceipt');
      const receiptPath = m.testReceipt ?? publisher.privacy.mailboxTestReceipt;
      let receipt;
      try { receipt = JSON.parse(receiptPath?.startsWith('docs/validation/') ? readFile(receiptPath) : undefined); } catch { receipt = undefined; }
      if (!receipt) fail('mailbox', 'sent-test receipt missing, unreadable or outside docs/validation/');
      else {
        if (receipt.recipient !== m.contact) fail('mailbox', 'sent-test receipt recipient differs from the verified contact');
        if (!TOKEN.test(m.testToken ?? '') || sha256(m.testToken) !== receipt.testTokenSha256) fail('mailbox', 'testToken does not match the sent-test receipt hash');
      }
      for (const file of ['site/privacy/index.html', 'docs/privacy-policy.md']) {
        if (!readFile(file)?.toString('utf8').includes(publisher.privacy.contact)) fail('mailbox', `${file} does not publish the verified contact`);
      }
      const site = readFile('site/privacy/index.html');
      if (site && sha256(site) !== publisher.privacy.policySha256) fail('mailbox', 'publisher.json policySha256 does not match site/privacy/index.html');
    },
    chrome(c) {
      requireTrue('chrome', c, ['agreementAccepted']);
      if (c.dashboardState !== 'registered') fail('chrome', 'dashboardState must be registered');
    },
    edge(e) {
      if (e.accountType !== 'personal-msa') fail('edge', 'accountType must be personal-msa (personal Microsoft account)');
      if (e.verificationState !== 'verified') fail('edge', 'verificationState must be verified; pending, action-required and enrolled do not count');
    },
    firefox(f) { requireTrue('firefox', f, ['emailConfirmed', 'agreementReviewed']); },
    signedXpi(x) {
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
        requireTrue('signedXpi', i, ['freshProfile', 'signatureEnforcement', 'restarted', 'enabledAfterRestart'], 'install.');
      }
      if (!x.smoke) fail('signedXpi', 'smoke section missing');
      else requireTrue('signedXpi', x.smoke, ['popupOffOn', 'reversibleRestore', 'localAccountHideUnhide', 'optionalSitesUngranted'], 'smoke.');
    },
  };
  const sectionOf = gate => (gate === 'chrome' || gate === 'edge' || gate === 'firefox' ? evidence?.stores?.[gate] : evidence?.[gate]);

  const closed = GATES.filter(g => flags[g]);
  if (closed.length) {
    if (!evidence || typeof evidence !== 'object') for (const g of closed) fail(g, `verified flag requires evidence at ${EVIDENCE_PATH}`);
    else {
      scanCredentials(evidence, '');
      for (const gate of closed) {
        const section = sectionOf(gate);
        if (!section) { fail(gate, 'evidence section missing'); continue; }
        checkEvidence(gate, section);
        validators[gate](section);
      }
    }
  }
  return { errors, open, flags };
}

// Loads release/publisher.json, the closure evidence and the built Firefox manifest from `root`, then verifies.
// Missing evidence is "no evidence"; unreadable evidence JSON is an error that names the file.
export function verifyClosureFromDisk(root, options = {}) {
  const readFile = file => { try { return readFileSync(path.join(root, file)); } catch { return undefined; } };
  const parse = file => JSON.parse(readFile(file));
  const publisher = parse('release/publisher.json');
  const firefoxManifest = parse('.output/firefox-mv3/manifest.json');
  let evidence;
  const raw = readFile(EVIDENCE_PATH);
  if (raw) {
    try { evidence = JSON.parse(raw); } catch { return { errors: [`evidence: ${EVIDENCE_PATH} is not valid JSON`], open: GATES.slice(), flags: {} }; }
  }
  return verifyClosure({ publisher, evidence, firefoxManifest, readFile, requireClosed: options.requireClosed });
}
