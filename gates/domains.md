# Gates: offline domain boundaries
- [x] D1: Multipart/private suffixes, valid destinations and misleading inputs have safe advisory results.
  CHECK: node --experimental-strip-types --test --test-reporter=tap tests/domain-boundaries.test.mjs
  EXPECT: /# fail 0/
  EVIDENCE: 19 tests passed; # fail 0; exit 0 (domain-boundaries.test.mjs).
- [x] D2: No automatic network path, brand list remains empty and browser advisory UI remains unwired.
  EVIDENCE: Manual source inspection verified BRAND_DOMAINS remains an empty array in src/intel/lookalike-domains.ts; no revealLink/lookalikeOf/domainBoundary references occur in root entrypoints or src/extension; no fetch/XMLHttpRequest/WebSocket/node:http/net/dns APIs occur in the three owned modules. The offline-source regression also passes.
- [x] D3: Core and extension TypeScript validate the new offline dependency API.
  CHECK: npm run typecheck:core && npm run typecheck
  EVIDENCE: npm run typecheck:core and npm run typecheck each exited 0 against tldts 7.4.18.

## Scope and evidence
- tldts parse uses its packaged Public Suffix List with allowPrivateDomains true; no DNS/reputation requests. Parent pins dependency and bundles source into core distribution.
- Strict ASCII host input rejects IDN/punycode/IP, malformed labels, trailing dots, unknown suffixes, ambiguous URL normalization and credentials. No IDN confusable verdict is emitted.
- Official-domain exemptions run globally before spelling comparisons, including all known official lists regardless of order.
- Keyword comparisons use the reviewed official registrable label plus exact bounded tokens, not arbitrary brand-title substrings. A lexical result remains advisory and cannot establish ownership, identity or maliciousness.

## Bundle review
- Read-only review of the parent scripts/bundle-core.mjs found no actionable defect. Neutral ESM output resolves module before main; the build closes in finally, and bundled tldts/tldts-core license notices are included.
- Imported the actual root packages/core/dist/lib.js and verified no ESM imports or CommonJS require calls remain. Production smoke assertions passed for private tenants, multipart suffixes, same registrable domains, unresolved shorteners, unknown suffixes, unsafe redirect targets, global official-domain exemptions and unsupported IDNs.
- This leaf records source/type/build-artifact evidence only. It does not activate browser link or lookalike advisories or establish live-site compatibility.
