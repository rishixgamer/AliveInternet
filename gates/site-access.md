# Gates: site access
- [x] S1: Consent and revocation regressions pass; non-default sites have no required access.
  CHECK: node --experimental-strip-types --test --test-reporter=tap tests/site-access.test.mjs
  EXPECT: /# fail 0/
  EVIDENCE: 19 consent/controller/popup regressions passed, # fail 0; build-dependent manifest check runs under S2.
- [x] S2: Built manifests contain only default YouTube required host access and explicit optional origins.
  CHECK: npm run build:all && ALIVE_CHECK_MANIFESTS=1 node --experimental-strip-types --test --test-reporter=tap --test-name-pattern='built production manifests' tests/site-access.test.mjs
  EXPECT: /# fail 0/
  EVIDENCE: Chrome, Firefox and Edge production MV3 builds exited 0; targeted manifest test # pass 1, # fail 0. Final root metadata adds stable project UUID and no-data declaration; final three MV3 builds pass without those warnings.
- [x] S3: Full extension TypeScript validates the consent API and Firefox MV3 build.
  CHECK: npm run typecheck
  EVIDENCE: npm run typecheck exited 0 (WXT prepare and TypeScript noEmit).

## Compatibility evidence
- Chromium minimum 102 matches optional_host_permissions introduction; verified against https://raw.githubusercontent.com/mdn/browser-compat-data/main/webextensions/manifest/optional_host_permissions.json.
- Exact optional hosts use Firefox MV3 minimum 128.0, matching Mozilla's compatibility data at https://raw.githubusercontent.com/mdn/browser-compat-data/main/webextensions/manifest/optional_host_permissions.json; scripting.registerContentScripts is supported from Firefox 102.
- Firefox no-transmission declaration required ["none"] follows https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/; local-only processing stays inside browser.
- Parent integration supplies stable project UUID {c0c9c54d-10b7-4ac9-833c-e0cca4c1e407}; it makes no claim to a maintainer email/domain. Root check-release verifies it and the no-data declaration.
- Required YouTube compatibility uses its static content bundle; optional registration uses the same production social.js/social.css after browser consent plus enabled settings.
- New site consent takes effect on reload for tabs opened before consent; popup explicitly says to reload. No automatic navigation or script injection into open tabs.

Final full run: ALIVE_CHECK_MANIFESTS=1 node --experimental-strip-types --test --test-reporter=tap tests/site-access.test.mjs -> tests 20, pass 20, fail 0, skipped 0.
Adversarial pass repaired permission snapshot rejection handling, popup permission snapshot ordering, revoked-request success reporting, Chromium minimum version, and required YouTube access withholding.
Required YouTube withholding popup regression: actual host grants render its checkbox; explicit click requests exact YouTube origins, denied regrant remains off, preference disable retains required access and static registration.
