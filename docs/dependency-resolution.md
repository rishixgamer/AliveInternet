# Alpha dependency resolution — October 12, 2026

The remaining local prerequisites now include executable evaluation, release media, supply-chain receipts and broader browser evidence. This continuation preserved inherited changes and performed no commit, push, publication or store submission.

## Resolved

- Fixed an explicit cautionary statement that the new synthetic dev fixture showed was wrongly collapsed in balanced/aggressive modes. Four targeted regressions preserve warnings while checking separate solicitations still collapse. Before/after synthetic reports are retained; zero observed false positives in the 42 artificial examples does not establish real-world accuracy.
- Implemented the offline benchmark command and strict provenance-bearing dataset parser. It emits aggregate metrics for three rule modes, per-platform/category/locale counts, dataset/source/lock hashes and batch latency. Five new tests cover validation, unsafe input, missing denominators, platform/batch boundaries and report privacy. The default 42-item dataset is explicitly synthetic. Representative labels remain external.
- Extended the anonymous YouTube smoke to expand one real reply group and compare controls with each reply's own profile link in memory. The passing receipt checked **10 replies**, with **zero mismatches** and **zero unknowns**; 20 initial comments/controls were observed. No raw live text, identity, screenshot or profile cache was retained. Relationship fields and extra analyzers remain inactive.
- Recorded actual optional X permission grant, packaged dynamic injection, filtering, browser-API revocation, restoration of an existing tab and no reinjection after reload in headed Chromium. Headless mode verifies that an unresolved prompt enables neither the site nor its registration. Native visual wording/refusal and toolbar UX remain unverified.
- Generated four 1280×800 screenshots, a 440×280 promotional tile and a ten-second 1280×800 GIF from production UI on clearly labelled synthetic content. Visually reviewed the popup and after/reason frames; assets have exact hashes and build provenance in `docs/media/provenance.json`. The GIF is 202,002 bytes. No platform user's content appears in these media.
- Reviewed official Chrome/Mozilla/Edge/npm policies, corrected local-processing disclosures, added a user-facing privacy policy and completed draft listing copy. The maintainer must still host the policy and provide project/contact identity before submission.
- Saved a CycloneDX SBOM and official npm audit (**zero known vulnerabilities**). The public package lookup returned E404 for `@aliveinternet/core`; no scope ownership was inferred. Installed the matching official Firefox test runtime inside ignored project artifacts and completed six temporary-install groups, including actual popup DOM handlers via Mozilla debugging, concurrent background mutations and reversible multi-tab filtering.

## Verification

| Check | Result / evidence |
|---|---|
| Source tests | 216 pass, zero failures/skips; `validation/2026-10-12-dependencies/tests-final.txt` |
| Core and WXT types | Pass; core-types-final.txt / types-final.txt |
| Chrome/Firefox/Edge MV3 builds | Pass; builds-final.txt |
| Production Chromium fixture | 15 groups pass; chromium-receipt.json |
| Headed Chromium permission lifecycle | 15 groups pass; chromium-headed-receipt.json |
| Firefox temporary desktop fixture | Six groups pass; firefox-receipt.json |
| Expanded live YouTube smoke | Three groups pass; live-youtube-receipt.json |
| Packed core consumer | Pass, 60 entries; core-package-final.txt |
| Offline investigation / benchmark | Pass; offline-analysis.txt / synthetic-benchmark-final.json |
| Manifest, licenses, icons and browser ZIP byte checks | Pass; release-check-final.txt / archive-check-final.txt |
| Exact production/media/benchmark provenance | `node scripts/check-dependencies.mjs`; evidence-check.txt |

All timestamps in machine receipts are UTC; these runs occurred October 12 in America/New_York. The anonymous smoke is still one public English-page visit. Synthetic throughput/idle samples are regression measurements on this machine, not representative precision, GPU cost or real-feed memory budgets. The core metrics treat `flag` as visible and evaluate rules alone, excluding user policy and optional analyzers.

## Remaining release dependencies

Representative permissioned labels, agreed evaluation thresholds and repeatable CPU/GPU/RSS measurements cannot be substituted with synthetic examples. Branded Edge, signed Firefox/Android installation, broader live layouts/locales/accounts and native refusal/withholding/toolbar UX require their own runs. A public repository, npm scope ownership/trusted publishing, working maintainer contact, hosted privacy-policy URL, store accounts and explicit publication remain maintainer inputs/actions. Inactive research features are outside this alpha release scope.

[Release policy/ownership review](release-review.md) · [evaluation protocol](../benchmark/README.md) · [media provenance](media/README.md) · [continuation gates](../gates/dependencies.md).

Final ledger: **6/6 continuation gates met**, **30/30 repository gates met**. The external release conditions above remain dependencies; this ledger verifies the defined local work rather than declaring store readiness. [Gate receipt](validation/2026-10-12-dependencies/gates.txt).

Failed consent, selector and Firefox installation/navigation attempts are retained under `artifacts/` and selected failure receipts in `validation/2026-10-12-dependencies/`. They are not successful validation evidence.
