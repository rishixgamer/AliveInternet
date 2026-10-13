# AliveInternet alpha completion evidence — 2026-10-12

Latest prerequisite continuation: [dependency resolution](dependency-resolution.md) records 216 source tests, generated release media, the runnable offline evaluation tool, expanded live reply attribution and headed Chromium optional-site lifecycle evidence. The earlier checkpoint below remains historical.

The usable v0.3 alpha workflows and local release packages are complete. This is an alpha, not a validated bot detector or a finished v1.0 research roadmap. Inherited changes were preserved; no commit, push, npm publication or store submission was performed.

## Completed behavior

- **Progressive site access:** only the three exact HTTPS YouTube origins are required. Nine other platform adapters use 25 exact optional origins and the packaged content bundle, registered only after explicit browser consent and enabled settings. Imports never request permission. Revocation stops filtering/restores UI; disabling an optional site removes grants. Tabs opened before first consent require reload, as the popup explains.
- **Backup and restore:** bounded local download, strict UTF-8 validation, readable preview, cancel, default account-list merge and explicitly confirmed full replacement. Imports use the serialized background writer; merges reread current state and full replacement rejects stale previews. Backups carry preferences/account lists, never host grants, raw comments or advisory packs.
- **Hidden-item review:** explicit current-tab refresh, 50-item pages, 160-character excerpts and temporary reveal. Only the popup document may request these records. Document-specific UUIDs, content fingerprints and request epochs reject stale tabs, reloaded documents and recycled nodes. The list has its own bounded scrolling area; page content remains ephemeral.
- **Advisory packs:** bounded local import/remove with failure recovery and storage synchronization, strict fields, credential-free HTTPS provenance and a 100,000-byte UTF-8 encoded cap. Imported text is escaped; publishers remain unverified. Import does not enable advisories, fetch sources or hide matching content. Stale initial reads cannot restore a removed pack.
- **Offline domain boundaries:** bundled ICANN/private Public Suffix List parsing separates multipart suffixes and private tenants. Unsupported IDN/IP/unknown/ambiguous hosts fail open. Redirect decoding is exact and offline; shorteners are never expanded. Lookalike helpers remain unwired and their default brand list remains empty.
- **Distribution:** standalone offline ESM core tarball with declarations and third-party notices; actual tarball consumer checks; Chrome/Firefox/Edge MV3 builds and ZIPs, native-authored icons, stable Firefox project UUID and no-data declaration. Runtime artifacts and secret-file patterns are excluded from the WXT source ZIP. CI now includes manifest, package and isolated Chromium checks; the updated remote CI has not been run here.

## Measured validation

| Check | Result |
|---|---|
| `ALIVE_CHECK_MANIFESTS=1 npm test` | 207 passed, 0 failed, 0 skipped |
| Core and full WXT TypeScript | Pass |
| Chrome, Firefox, Edge MV3 builds | All pass |
| Offline synthetic investigation | Pass |
| Actual core npm tarball consumer | Pass; 60 entries, exported ESM and declarations verified without DOM/network or runtime dependencies |
| Production Chromium fixture | 13/13 groups pass; no page errors |
| Anonymous live YouTube smoke | 2/2 groups pass; 20 modern comments and 20 extension controls |
| Manifest/icon/license and exact-byte browser archive checks | Pass |
| Final diff whitespace | Pass |

Local runtime: Node 26.8.2, npm 11.19.1, WXT 0.21.4, TypeScript 7.0.2; browser user agent HeadlessChrome/156.0.0.0. Receipts retain UTC timestamps (the final runs crossed into October 13 UTC, still October 12 locally) and SHA-256 hashes of every production file. [Test output](validation/2026-10-12-alpha/tests.txt), [build output](validation/2026-10-12-alpha/builds.txt), [Chromium receipt](validation/2026-10-12-alpha/chromium-receipt.json), [live receipt](validation/2026-10-12-alpha/live-youtube-receipt.json).

The Chromium fixture uses locally fulfilled synthetic pages and an isolated temporary profile. It exercises actual popup/content/worker messaging, multiple tabs, concurrent mutations, worker stop/restart, SPA/reload, benign/parent/reply isolation, review pagination/stale rows, export/import, advisory-only behavior, keyboard controls and negative optional-site injection. The popup is opened as an extension document tab; browser-toolbar affordance and positive native permission prompts are not covered.

The final large-feed fixture processed 1,401 items with 1,400 deterministic hides in **636 ms**, including navigation/scheduling. Its 1.2-second idle interval measured **0.376 ms renderer task time**, zero script duration and zero extension UI mutations. These are single-run synthetic regression measurements, not GPU, memory, real-device or real-feed performance benchmarks. Repetition/account evidence remains scoped to batches of at most 350 candidates.

The live smoke visited one public watch page anonymously, with bounded ordinary scrolling. It counted modern rendered comments/controls and verified site disable/restore. A newly constructed synthetic legacy comment then exercised the real hide/reveal handler programmatically with real-content rules disabled. It validates selector/control matching and that narrow reversible action; it does not measure real-comment classification precision, pointer hit-testing of the artificial node, actual expanded replies, old/new layouts, localization, signed-in behavior or full YouTube support. No live text/identities, screenshots or website cache were retained; temporary live profiles were deleted. [Live harness scope](live-youtube-validation.md).

Failed custom-element clone attempts and a fixture keyboard-focus assumption failure remain recorded. YouTube hydration reset cloned content, so the final harness constructs only synthetic nodes. The keyboard harness now re-focuses its target after asynchronous saves temporarily disable the checkbox. Failed receipts are evidence of failed attempts and do not establish a pass.

## Local artifacts and use

Load `.output/chrome-mv3` through Chrome's **Load unpacked** control. ZIP packages are `.output/aliveinternet-0.3.0-chrome.zip`, `-firefox.zip` and `-edge.zip`; the core tarball is `.output/aliveinternet-core-0.3.0.tgz`. Archive SHA-256 values are recorded in [archive evidence](validation/2026-10-12-alpha/archives.txt). Regenerate with `npm run zip:extension`, `zip:firefox`, `zip:edge` and `pack:core`.

Run `npm run test:browser` for the offline extension fixture or explicitly `npm run test:live` for the narrow anonymous live smoke. Neither attaches to a user's browser/profile or performs platform account actions. Gates live in `GATES.md` and `gates/`. Final checker result: **24/24 met** — completion 11/11, site access 3/3, portability 3/3, domains 3/3, indicator popup 2/2, browser 2/2. [Final gate ledger](validation/2026-10-12-alpha/gates.txt). Both passing browser/live receipts were also checked against every final production file hash.

## Remaining dependencies

1. Broader live YouTube layouts and attribution beyond the ten-reply anonymous smoke; X/Reddit and every other opt-in adapter; Firefox/Edge execution and native permission grant/withholding/revocation UX.
2. Representative permissioned labels, false-positive evaluation, real-device CPU/GPU/memory and repeatable performance budgets. No synthetic pass calibrates a heuristic score or proves bot identity.
3. Store policy review, screenshots/promo/demo assets and maintainer submission; npm namespace ownership, provenance and publication. Nothing has been published or installed in the user's browser automatically.
4. Inactive research features: evaluated extra detectors, verified creator/thread fields, community subscriptions/signatures/expiry, browser ML/consented weights, report/creator workflows, live chat, stats/i18n and other catalog groundwork. Unimplemented scaffolds remain inert and default-off rather than becoming live filtering paths.
