# Agent backlog — AliveInternet

Agent coding tasks should be self-contained branches, with tests, reproducible measurements, and explicit verified/unverified status.

## Current continuation — 2026-10-12

The alpha release paths are implemented: optional-site consent and dynamic registration, bounded settings backup/preview/import, current-tab hidden review, reliable advisory import/remove, standalone core packaging, icons and Firefox MV3 metadata. Production Chromium fixtures verify multi-tab settings, worker restart, navigation/reload, permission denial, advisory-only annotations and large feeds. See [completion evidence](completion-report.md) for exact results and live-test limits.

Remaining work: live selector/layout coverage (especially X, Reddit and other opt-in sites), positive native permission prompts/revocation in Firefox/Edge, real-device CPU/GPU/memory, representative permissioned false-positive evaluation, verified relationship/creator fields, store assets and maintainer submission. Research classifiers/subscriptions remain inactive. The historical P0 entries below retain their original evidence and are superseded where the completion report records a later check.

## P0: build and user reliability (Codex)

- **Continuation, 2026-10-12:** reviewed Muse's latest helpers, fixed platform-scoped trust/dedupe, list mutation snapshots, import defaults and advisory evidence/export validation; added mute-word and allowlist popup editors. 132 synthetic tests pass. See [continuation review](continuation-review.md) for remaining browser gates and unwired helper limitations.

- **Fixed in source, 2026-10-12:** YouTube parent comments and expanded replies are extracted independently, without collapsing the enclosing thread. Nine synthetic DOM regressions cover modern/legacy markup, reply discovery, attribution, safe link extraction and reversible hiding. Live Chrome verification and `threadId`/`parentId` remain outstanding; see [development report](development-status.md).
- **Fixed in source, 2026-10-12:** large-page processing reaches later comments and posts in successive batches of at most 350 candidates. Earlier reversible UI survives; recycled nodes, navigation, disabled sites and observer loops have 15 synthetic controller regressions. Repetition/account evidence is batch-scoped; DOM discovery, dirty-item indexing and real-browser overhead remain validation work. See [development report](development-status.md).
- **Fixed in source, 2026-10-12:** account hides, unhides and individual popup preference changes share one serialized background writer. Fourteen synthetic regressions cover overlapping actions, storage failures, validation, popup synchronization and content hide/unhide propagation. Real multi-tab messaging and MV3 worker lifecycle verification remain outstanding; see [development report](development-status.md).
- Verified 2026-10-12: `npm install`, `typecheck:core`, `typecheck`, `build` pass with WXT 0.21.4 / TypeScript 7.0.2. A `package-lock.json` is now included in the working tree; CI uses `npm ci --ignore-scripts`.

- Typecheck/build are green; next test Chrome MV3 installation and enabled-page behavior.
- Browser fixture tests for popup imported-pack flow, reversible reveals, account inspector, long-comment deduplication, and changing settings across SPA transitions.
- Stabilize YouTube DOM selectors first, then X, Reddit; keep other sites opt-in until verified. No full-text unrelated element capture.
- Verify serialized settings mutations in real tabs across MV3 worker suspension/restart; validate browser permissions and progressive optional host access.
- Benchmark MutationObserver and dedup scan CPU on large feeds; cap work and skip when disabled.

## P1: evidence and anti-false-positive quality (Claude + Codex)

- Design representative, permissioned labeled datasets and measure per-site precision, false-positive rate, latency and memory usage. Check protected characteristics without using them as scoring inputs.
- Improve rules for scam links, impersonation, coordination while ensuring false positives remain low.
- Add a user-controlled allowlist and local-only “wrongly hidden” feedback, without sending comments to backend.
- Improve provenance in account inspector; restrict summaries to observed page items and known public URLs.

## P2: optional intelligence (Claude)

- Threat provider ports for manual, consented lookups: RDAP, URLhaus and externally documented campaigns, each with policy/rate-limit review.
- Provenance, versioning, expiration/revocation, publisher key verification and opt-in subscription packages. Never auto-block based solely on community claims.
- Bluesky moderation-label interoperability where public protocol supports it.
- Local graph viewer upgrade for observed timestamp edges, semantic clusters and evidence-linked edges. Graph candidates remain **hypotheses**.

## P3: local ML + multimodal (Claude; Qwen test generation)

- Compare baseline vs multilingual embedding models on independently labeled samples; prevent train/test leakage.
- Implement opt-in quantized EmbeddingGemma 2 browser inference with packaged runtime, integrity-checked user-consented weights, device budget and graceful fallback.
- Experiment with optional image/text/video features for preferences against manipulative/repetitive content, not unsupported AI authorship claims.
- Document calibration and failure modes; do not permit model alone to auto-ban accounts.

## Scaffolded feature groundwork (v0.4 planning)

All listed in `src/core/features.ts` and [feature-groundwork.md](feature-groundwork.md). Codex: badge/background entrypoint, Firefox/Edge smoke tests, settings export-import, adapter fields (`threadId`, `parentId`, `observedOrder`, `isCreator`, `isPinned`, `isCreatorHearted`, `PageContext`). Claude: detectors, rule lists, report flow, benchmark, trust/mute, creator mode, local classifier. Qwen: language rule-pack fixtures and benign counterexample tests.

Batch 2: Codex — live chat iframe + verify the provisional Twitch adapter (chat + stream cards) in a real browser, hidden-items popup list, npm package build, UI i18n wiring. Claude — link reveal, look-alike domains, fake badges, giveaway streams, AutoMod export, check-this-comment, per-channel strictness. Maintainer — lockfile/Scorecard/releases, scam-pattern changelog.

## Exclusions

- “Bot farms near a region” individual scoring; inferred physical location, private IP harvesting, de-anonymization, ethnicity, language or political-viewpoint targeting; automated server-side account bans; shadow moderation; covert mass scraping.
