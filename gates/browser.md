# Gates: browser
- [x] B1: Production unpacked extension runs in isolated Chromium synthetic fixtures.
  CHECK: npm run test:browser
  EXPECT: /browser fixtures passed/
  EVIDENCE: docs/validation/2026-10-12-alpha/chromium-receipt.json; passed 13 groups with final production SHA-256 hashes and no page errors.
- [x] B2: Browser output includes measured fixture timing and evidence scope.
  EVIDENCE: docs/completion-report.md and chromium-receipt.json; 1,401 items/636ms, idle renderer 0.376ms/1.2s, zero UI mutations. Explicit synthetic/live/browser limits; aggregate live smoke 2/2 passed separately.
