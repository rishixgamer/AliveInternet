# Gates: indicator popup

Scope: Complete bounded local advisory import/remove, storage synchronization, failure recovery and teardown without enabling advisories or fetching sources.

- [x] I1: Indicator popup regression tests pass.
  CHECK: node --experimental-strip-types --test --test-reporter=tap tests/popup-intel.test.mjs
  EXPECT: /# fail 0/
  EVIDENCE: Final popup run: 12 tests passed, 0 failed; combined popup and indicator schema run: 16 passed, 0 failed.

- [x] I2: Full extension TypeScript check passes.
  CHECK: npm run typecheck
  EXPECT: /Finished/
  EVIDENCE: ℹ Generating types... | ✔ Finished in 127 ms
