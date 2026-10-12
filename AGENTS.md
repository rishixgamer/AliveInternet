# ThreadSieve — agent instructions (Codex, Claude Code, local models)

## Product mission

Build a privacy-first, explainable, reversible, cross-platform social spam filter. It acts on **three separate surfaces**: posts/feed content, comments/replies, and explicitly chosen accounts. Bot status cannot be established merely from embeddings, AI-writing detectors, usernames, or repetitive text. Never claim that a heuristic proves account automation.

## Current repository state

- `v0.2 alpha`: WXT / TypeScript / Chrome MV3, 9 experimental DOM adapter specs. Only YouTube enabled by default.
- Active inference: deterministic rule signals + exact normalized duplication; `src/core/accounts.ts` provides optional page-local repeat-spam account suppression without permanent auto-blocking.
- Account blocks: user-directed `platform:profileKey` list in extension-local storage. Not site/API-level moderation.
- EmbeddingGemma 2: **Node POC only** in `scripts/embedding-poc.mjs`, not live browser model inference.
- Web extension, selectors, performance, and content scripts have **not been smoke-tested in a real browser** in the generation environment.

## Working agreement

1. Preserve user consent, reversible UI, and fail-open behavior. Do not delete comments, ban accounts, or press site moderation buttons.
2. Support sites using small platform adapters under `src/adapters/platforms/` and shared extraction in `src/adapters/social.ts`. Never place site DOM extraction or network calls in `src/core/`.
3. Use only explicit same-platform profile URLs for account block keys. Never infer durable identity from a display name or link in post text.
4. Distinguish post vs comment surface, rule score vs calibrated likelihood, and suspicious behavior vs automated identity. No viewpoint or demographic proxies.
5. Write tests first; test false positives, navigation, mixed media, DOM changes, and unfamiliar layouts. Use synthetic fixtures or ethically permissioned labeled data.
6. Respect site policies; no bulk scraping, request interception, credential access, hidden browser automation, raw-content telemetry, or nonconsensual model uploads.
7. No remote executable code in MV3. Inference libraries/WASM must be packaged, with user-consented weights caching and performance safeguards.
8. Never assume a new model version, license, API, or platform selector works. Verify with upstream source and direct benchmark.
9. When editing selectors, update the matrix in README and `docs/roadmap.md` to reflect actual live-tested status.

## Useful commands

```bash
npm install
npm test
npm run typecheck:core
npm run typecheck
npm run build
npm run dev
```

The last three require WXT installation. Never label full compilation or browser functionality verified merely because core tests pass.

## Quality priorities

1. True-positive safe collapsing + immediate reveal/unhide.
2. Stable, correctly scoped account identity and blocklist behavior.
3. DOM selector coverage with real-browser fixture tests.
4. Resource usage and robustness during infinite scroll and SPA navigations.
5. Optional local semantic clustering only after rule baseline metrics exist.
