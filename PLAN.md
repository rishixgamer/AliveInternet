# AliveInternet completion plan — 2026-10-12

## Outcome and boundaries
Finish the locally usable alpha extension and its release engineering paths: progressive site consent, settings backup/restore with preview and serialized imports, hidden-item review/reveal, and executable Chrome extension fixture verification. Preserve all inherited changes. Do not activate research detectors, fetch models/feeds, publish, commit, or claim live-platform support without evidence. External permissioned evaluation, store submission and maintainer account metadata remain explicit release dependencies.

## Contracts and ownership
- Site-access leaf: `wxt.config.ts`, `entrypoints/social.content.ts`, new site-access/background registration modules, `src/extension/popup-settings.ts`, site-access tests. Expose `registerSiteAccess()` and `setSiteAccess(platform, enabled)`; parent integrates background entrypoint. Keep YouTube startup compatibility, request all other origins only on user click; revocation disables filtering and registration. No changes to popup HTML/main or settings protocol.
- Portability leaf: `src/core/portability.ts`, `src/extension/settings-protocol.ts`, `settings.ts`, new `popup-portability.ts`, tests. Expose `initializePortabilityPopup(document)`; parent supplies HTML controls named in leaf brief. Imports serialized at current storage state, default list merge, explicit replace preview. Never request host access during import.
- Browser leaf: new `scripts/test-browser.mjs`, `tests/browser/**`, browser test docs. Use built unpacked production extension in isolated temporary Chromium profile with synthetic authorized fixtures; no user's browser/profile. Parent adds script/dependency once requested; test current root after integration.
- Parent integration: popup HTML/main/CSS, controller/review messaging and UI, background integration, documentation/support matrix, root gates. Separate worktrees; copy only owned final files to preserve dirty root. Run leaf and integration gates again.

## Leaves
1. Site-access consent and registration — gates/site-access.md
2. Settings portability workflow — gates/portability.md
3. Real browser fixture harness — gates/browser.md
4. Hidden-review integration and final validation — GATES.md

## Status log
- Dependency continuation: resolve local evaluation tooling, optional-site browser lifecycle coverage, synthetic release media and source-backed release review. Attempt bounded live expanded replies/profile attribution. External representative labels, unavailable branded browsers/native prompts and maintainer credentials must remain explicit dependencies if unavailable; do not replace them with synthetic proof. Gates: `gates/dependencies.md`.
- Baseline inspected: inherited dirty files retained; prior documentation reports 132 synthetic passing tests, browser validation outstanding.
- Added parent release-path gate G9: emit/pack the existing DOM-free public core entrypoint and run an isolated tarball-consumer check; no publication or name-availability claim.
- Added domain correctness leaf in the existing site-access worktree: only core/domains.ts, core/links.ts, intel/lookalike-domains.ts and domain-boundaries tests. Replace known multipart suffix approximation with bundled offline PSL; parent owns dependency/build/license metadata. Keep advisories unwired and brand list empty.
- Added indicator popup reliability leaf in the portability worktree: new popup-intel.ts and popup-intel.test.mjs; parent supplies strict bounded indicator parser and integrates main. No settings edits, subscriptions or network path.

- Integrated all source leaves; added strict advisory popup and stale-read protection, UUID document review IDs and recycled-node checks. Independent review repaired stale popup reveal callbacks. Final synthetic suite: 207 pass, no skips; browser fixture: 13 groups pass.
- Final local release prerequisite review added bundled third-party notices, source ZIP exclusions for runtime artifacts/secrets, exact-byte archive checks and CI browser/core-package jobs. Optional live smoke uses aggregate-only evidence and synthetic reversible actions; failed harness attempts are retained.

- Parent final validation: bounded hidden-review scrolling visually checked, keyboard harness focus restored explicitly after asynchronous checkbox saves, and 13 production fixture groups pass. Anonymous live smoke 2/2 passes with 20 modern controls and only synthetic handler actions; receipts retain failed attempts and final hashes. Remaining research, broad live coverage and publication dependencies are in docs/completion-report.md.

- Dependency continuation completed local gates: offline aggregate benchmark, explicit warning false-positive repair, 216 source tests, Chromium 15-group headless/headed runs, 10 live replies with zero attribution mismatches, Firefox 6-group temporary execution, synthetic store media, zero-known-advisory audit/SBOM and source-backed privacy/release review. All receipts must match final production hashes. External labels/performance/native/signed/browser/publication identities remain documented in docs/dependency-resolution.md; no publication performed.
