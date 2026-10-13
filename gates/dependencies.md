# Remaining alpha dependencies — 2026-10-12

Scope: close locally actionable release prerequisites; preserve inactive research and record external evidence requirements honestly.

- [x] D1: Offline labeled evaluation accepts bounded, provenance-bearing data and emits aggregate per-mode/platform/category/locale metrics, dataset/build hashes and measured latency without raw text or identities.
  CHECK: node --experimental-strip-types --test tests/benchmark.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: tests/benchmark.test.mjs: 5 pass; synthetic-benchmark-final.json has data/source/lock hashes and aggregate metrics; before-warning-fix report retained.
- [x] D2: Current production Chromium fixture exercises positive optional-site registration and revocation and produces reproducible synthetic store screenshots/demo.
  CHECK: npm run test:browser
  EXPECT: /browser fixtures passed/
  EVIDENCE: chromium-receipt.json and chromium-headed-receipt.json: 15 groups each, actual headed grant/injection/revocation/restore; media/provenance.json verified.
- [x] D3: Expanded live replies and profile attribution receive a bounded aggregate-only smoke attempt; unsupported environments retain explicit blocked evidence.
  EVIDENCE: live-youtube-receipt.json: 3 groups pass, 10 expanded replies checked, 0 mismatched and 0 unknown; aggregate only.
- [x] D4: Policy/ownership/prerequisite review and release assets document exact scope and external blockers; no publication without an explicit release request.
  EVIDENCE: docs/release-review.md, docs/privacy-policy.md, docs/store-listing.md, docs/media/README.md; npm E404 recorded without ownership inference; public identity and publication remain external.
- [x] D5: Final tests, types, builds, core consumer and archives pass; new receipts match production bytes.
  EVIDENCE: 216 source tests; types/builds/core consumer/release/archive checks pass. npm audit 0 known vulnerabilities; SBOM saved; scripts/check-dependencies.mjs verifies exact current production/media/benchmark hashes.
- [x] D6: Firefox production MV3 temporary installation, content filtering, popup/settings/reveal and optional-site isolation pass in the matching runtime.
  CHECK: PLAYWRIGHT_BROWSERS_PATH="$PWD/artifacts/browser-runtime" npm run test:firefox
  EXPECT: /Firefox fixtures passed/
  EVIDENCE: firefox-receipt.json: 6 groups pass on Firefox/157.0 matching test runtime; real popup handlers via Mozilla console actor, no native pointer/signed/Android claim.
