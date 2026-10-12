# Roadmap (v0.2)

## Implemented scaffold (not production-ready)

- Shared content primitives: posts, comments, local account keys, platform namespacing, per-surface toggles.
- Nine DOM adapter specs, YouTube comment extractor, shared MutationObserver controller, reversible hide UI.
- User-selected local account blocklist with popup unhide, site toggles, filtering strength and warnings.
- Optional *page-only* account campaign heuristic (off by default; not proof of bot activity).
- Core tests, TypeScript core checks, WXT / Chrome MV3 configuration, agent instructions, Node-only EmbeddingGemma 2 POC.

## M1 — Live browser functionality (next)

1. Install WXT dependencies and complete `npm run typecheck && npm run build` in an internet-enabled environment.
2. End-to-end Chrome tests for each selector (YouTube first, then X, Reddit, Instagram, TikTok, Facebook, Threads, Bluesky, LinkedIn). Build fixture and Playwright smoke tests.
3. Test comment replies, infinite scroll, navigation, dark mode, accessible DOM, localization, channel cards, and content overlays.
4. Replace provisional selectors with stable, minimal candidates confirmed on each platform; fail open if uncertain.
5. Replace read-modify-write blocklist storage with atomic/conflict-tolerant updates and build opt-in host-permission controls.

## M2 — Evaluation and robustness

- Obtain permissioned, de-identified, representative human labels (including multilingual posts and discussion contexts).
- Establish precision, false-positive-rate, latency, and memory budgets vs keyword-only and duplicate baselines.
- Assess account-level campaigns without profiling protected characteristics or political content.
- Performance profiling and durable undo UX on SPA refreshes.

## M3 — Model integration (conditional)

- Benchmark text-only quantized EmbeddingGemma 2 in browser (bundled inference runtime / consented weight download).
- Test embeddings for semantic clustering against rules and duplication on held-out examples. No embedding-based automatic bot claims.
- Introduce a separate calibrated classifier only if label quality and measurement show meaningful improvement.

## M4 — Community ecosystem

- Versioned reviewed filter lists with provenance and opt-in subscriptions.
- Explainable metrics reported locally, user-authored per-platform account lists, reproducible false-positive evaluation.
- Publication after legal/policy/extension-store review and audited dependencies.
