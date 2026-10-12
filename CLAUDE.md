# Claude Code entrypoint

Read [AGENTS.md](AGENTS.md), [docs/architecture.md](docs/architecture.md), and [docs/roadmap.md](docs/roadmap.md) before edits. These are normative architectural and safety constraints.

Working directories:
- Browser scripts: `entrypoints/social.content.ts` and `entrypoints/popup/`
- Site DOM adapters: `src/adapters/social.ts`, `src/adapters/platforms/*.ts`, `src/adapters/youtube.ts`
- Rules, profile IDs, actor evidence: `src/core/`
- Runtime UI and preferences: `src/extension/`
- Pure Node tests: `tests/`
- EmbeddingGemma 2 research ONLY: `scripts/embedding-poc.mjs`

Keep platform-specific selectors in `src/adapters/platforms/<platform>.ts` independent, and treat missing reliable author profile links as **no account identity** rather than guessing. Make platform-specific feature capabilities explicit; do not imply nine sites are production supported merely because match patterns exist.

Before proposing a PR, run `npm test`, `npm run typecheck`, `npm run build` and report which steps actually completed. Add DOM fixture + real-browser regression tests for each platform changed. Do not introduce model dependencies into the content script without separately reviewed licensing, downloaded weights opt-in, on-device latency benchmarks, and MV3 compliance.
