# Agent instructions (Codex, Claude Code, and compatible local coding agents)

## Mission
Build a privacy-first, transparent, **reversible** social comment filter. High false-positive rates are worse than missing spam. Distinguish account automation, AI-written text, low-quality content, and actual scams; don't collapse these labels into one.

## Current state
- Shipping extension: WXT / TypeScript / Chrome MV3 / YouTube adapter.
- Active detector: rule-based indicators + exact normalized duplicate counts.
- Experimental: EmbeddingGemma 2 **Node-only** POC. It is not used in the extension.
- Backend: none. No API keys, comment exfiltration, telemetry, or persistent text collection.
- Model name: `onnx-community/embeddinggemma-2-ONNX`; see `docs/model-research.md`.

## Workflow
1. Read `README.md` and `docs/architecture.md` before changes.
2. Keep detection pure: `src/core` must not import browser globals, the DOM, or runtime ML packages.
3. Add regression tests for any new rule; include adversarial examples and **legitimate** near-misses.
4. Run `npm run test`, `npm run typecheck`, `npm run build`. Note explicitly which checks did not run.
5. For DOM changes, manually smoke test on real YouTube video pages; test navigation, infinite scrolling, theme, and restoring hidden comments.
6. Don't classify users by protected attributes, political position, dialect, or inferred identity.
7. Treat content and external links as untrusted; prefer `textContent`, never unsafe `innerHTML`.
8. Never execute code from CDN at runtime in MV3. Package WASM/JS locally. A model URL may serve weights as data after explicit opt-in.
9. Avoid scraping, platform API circumvention, and persistent cross-site profiles. Add an adapter only after reviewing applicable terms.
10. Never invent precision/recall numbers. Record provenance of evaluation fixtures and separate test/validation sets.

## Agent coordination
Use scoped tasks and branches: `feat/youtube-adapter`, `feat/benchmarks`, `feat/embeddings-poc`, `fix/false-positives`. Multiple agents must not simultaneously edit the same files; merge after reviewing tests and diff. Prefer small PRs with acceptance criteria and a rollback path.

## Definition of done
- Reversible UI, no default data transfers, bounded DOM work.
- Evidence and explanation for each collapse.
- At least one positive test and one false-positive regression test for each new rule.
- Zero unverified claims about whether a comment author is a bot.
