# Gates: usable AliveInternet alpha
Scope: locally usable release paths and honest validation, preserving research safety boundaries.

- [x] G1: Production tests pass including site consent, atomic import and hidden-review regressions.
  CHECK: ALIVE_CHECK_MANIFESTS=1 npm test && echo G1_OK
  EXPECT: /G1_OK/
  EVIDENCE: ℹ duration_ms 1817.082333 | G1_OK
- [x] G2: Pure core types pass.
  CHECK: npm run typecheck:core && echo G2_OK
  EXPECT: /G2_OK/
  EVIDENCE: > tsc -p tsconfig.core.json | G2_OK
- [x] G3: Full WXT types pass.
  CHECK: npm run typecheck && echo G3_OK
  EXPECT: /G3_OK/
  EVIDENCE: ✔ Finished in 83 ms | G3_OK
- [x] G4: Chrome, Firefox and Edge compile successfully.
  CHECK: npm run build:all && echo G4_OK
  EXPECT: /G4_OK/
  EVIDENCE: ✔ Finished in 227 ms | G4_OK
- [x] G5: Offline fixture analysis passes.
  CHECK: npm run investigate:fixture && echo G5_OK
  EXPECT: /G5_OK/
  EVIDENCE: } | G5_OK
- [x] G6: Isolated real Chromium production-extension fixture verifies messaging, popup settings, permission boundaries, hides/reveals, SPA and reload.
  CHECK: npm run test:browser && echo G6_OK
  EXPECT: /G6_OK/
  EVIDENCE: docs/validation/2026-10-12-alpha/chromium-receipt.json; status passed, 13 groups; final production hashes match.
- [x] G7: Documentation records measured browser evidence, permissions, limits, remaining research/store/live-platform dependencies.
  EVIDENCE: docs/completion-report.md; final aggregate live/Chromium receipts, permissions, measured overhead, support matrix and remaining dependencies recorded.
- [x] G8: No whitespace errors in final diff.
  CHECK: git diff --check && echo G8_OK
  EXPECT: /G8_OK/
  EVIDENCE: G8_OK
- [x] G9: Core ESM package compiles and an isolated consumer verifies the actual npm tarball contains working JavaScript and type declarations only.
  CHECK: npm run test:package && echo G9_OK
  EXPECT: /G9_OK/
  EVIDENCE: core package consumer passed (60 tarball entries, JavaScript and declarations verified) | G9_OK
- [x] G10: Browser manifests and four icon sizes satisfy the final consent/distribution contract, including stable Firefox project ID and no-data declaration.
  CHECK: node scripts/check-release.mjs && echo G10_OK
  EXPECT: /G10_OK/
  EVIDENCE: release packages verified | G10_OK
- [ ] G11: Browser ZIP archives contain the exact unpacked production bytes, versions agree, and access is YouTube-only (check requires `npm run build:all && npm run zip:all` first).
  CHECK: node scripts/check-release-build.mjs && echo G11_OK
  EXPECT: /G11_OK/
  EVIDENCE: pending: rerun in CI for the v0.4.0 build
