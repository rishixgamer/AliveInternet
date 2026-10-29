# Gates: portability

Scope: Complete local settings download, validation and preview, serialized confirmed imports and race/failure recovery.

- [x] P1: Preview, rejection, merge races, replace confirmation, download cleanup and failure recovery regressions pass.
  CHECK: node --experimental-strip-types --test --test-reporter=tap tests/portability-ui.test.mjs
  EXPECT: /# fail 0/
  EVIDENCE: Final run: # tests 15 | # pass 15 | # fail 0; inherited current portability regressions 5 passed, 0 failed

- [x] P2: Core TypeScript check passes.
  CHECK: npm run typecheck:core
  EXPECT: /tsc -p tsconfig.core.json/
  EVIDENCE: > aliveinternet@0.3.0 typecheck:core | > tsc -p tsconfig.core.json

- [x] P3: WXT prepares metadata and the full extension TypeScript check passes.
  CHECK: npm run typecheck
  EXPECT: /Finished/
  EVIDENCE: ℹ Generating types... | ✔ Finished in 121 ms
