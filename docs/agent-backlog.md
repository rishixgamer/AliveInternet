# Agent backlog — AliveInternet

Agent coding tasks should be self-contained branches, with tests, reproducible measurements, and explicit verified/unverified status.

## P0: build and user reliability (Codex)

- **Bug:** YouTube replies are never assessed: `collectYouTubeComments` skips every `ytd-comment-view-model` inside a thread. Most YouTube scams are replies. Also fill `threadId`/`parentId` (needed by reply-chain detection).
- **Bug:** items past the first 350 in page order are never filtered (`collectPlatformItems` cap). Process only unseen elements instead of capping by position.
- Verified 2026-10-12: `npm install`, `typecheck:core`, `typecheck`, `build` all pass with WXT 0.21.4 / TypeScript 7.0.2. Commit a `package-lock.json`.

- Install pinned dependencies, get `npm run typecheck && npm run build` green, then test Chrome MV3 install.
- Browser fixture tests for popup imported-pack flow, reversible reveals, account inspector, long-comment deduplication, and changing settings across SPA transitions.
- Stabilize YouTube DOM selectors first, then X, Reddit; keep other sites opt-in until verified. No full-text unrelated element capture.
- Fix concurrent storage race for user account blocklist; validate browser permissions and progressive optional host access.
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
