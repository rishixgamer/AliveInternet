# AliveInternet — shared instructions for Codex, Claude Code, and local models

## Mission

Build a privacy-first open-source browser extension that **locally** reduces spam, manipulative promotion and unwanted artificial engagement across major social media platforms. Provide trustworthy evidence and reversible user decisions. A language model, repeated text, public country tag or geographic proximity to documented campaigns does **not** prove bot identity.

## Current product status

- **v0.3 alpha source**: WXT/TypeScript/Chrome MV3. Ten experimental platform adapters (YouTube, X, Instagram, Reddit, TikTok, Facebook, Threads, Bluesky, LinkedIn, Twitch), only YouTube enabled by default; real Chrome smoke testing still required.
- Live rule path: `src/core/filter.ts` deterministic spam indicators, `src/core/dedupe.ts` optional long-comment near-duplicate collapse, `src/core/behavior.ts` ephemeral account evidence, `src/core/policy.ts` manually chosen account hides.
- Imported intelligence: `src/intel/indicators.ts` exact-domain/profile matching for manually imported JSON packs. **Advisory only** and explicitly opt-in; no automatic server fetch or account block.
- Offline research: `src/network/campaigns.ts` shared-domain hypothesis graphs; `scripts/analyze-fixture.mjs` sample local analysis; `tools/network-viewer.html` local visualization; `scripts/rdap-domain.mjs` opt-in CLI.
- ML: EmbeddingGemma 2 **Node proof of concept only**; browser integration remains research. See `docs/architecture-v0.3.md` and `docs/roadmap.md`.
- Browser WXT compilation and live website selectors have NOT been verified in the generation environment.

- **Scaffolded features** (v0.4 planning): 32 catalog features (11 ship, 21 deferred for v1.0; two stubs removed) are listed in `src/core/features.ts` and `docs/feature-groundwork.md`; deferred ones are groundwork only. Stubs must stay inert and default-off until implemented with tests; never wire a stub into the controller.

## Non-negotiable product and security rules

1. **Do not delete platform data** or perform on-platform bans, moderation API calls, or hidden user actions. Every browser hide is reversible.
2. Never convert heuristic scores or embedding distances into bot probabilities without independent calibration/validation. Consider false positives a severe product failure.
3. No nationality, race, ethnicity, language group, religion, neighborhood, inferred political viewpoint, IP-to-person, or “Global South proximity” as bot-risk features. Publish research-level campaign attributions only when documented and cited; do not infer individual locations.
4. No bulk scraping, unsolicited profile enrichment, private messages, cookie/session interception, credential storage, hidden tracking or unauthorized platform APIs.
5. No default backend, telemetry, comment upload, cross-site browsing-history database, or remote executable JS/WASM. Imported feeds and model weights require explicit consent, provenance/security review, and independent evaluation.
6. Indicator packs are **untrusted** user imports; strict data/schema/size validation, exact matches, advisory only; do not label accounts malicious solely from a match.
7. Graph edges represent observed links or interactions only; do not assert common ownership, geography, identity, organization, or bot network status from shared content alone.
8. Keep host adapters isolated in `src/adapters/platforms/`; do not put site selector logic, network requests, or DOM APIs in reusable core modules.
9. For tests use synthetic or authorized/de-identified datasets. Test short generic agreement, legitimate repeated opinions, benign links, reused usernames across platforms, misleading domain names, and malicious input.
10. Always update the support matrix when claiming a new browser-tested platform. Document UI and CPU/GPU overhead. Default new/high-impact features off until validated.

## Toolchain

```sh
npm install
npm test
npm run typecheck:core
npm run typecheck
npm run build
npm run investigate:fixture
```

The last two WXT commands require installed dependencies. Never report successful extension build based on core TypeScript checks alone.

## Agent parallelism

- **Codex:** WXT compile, MV3 extension E2E browser fixtures, platform adapters, popup accessibility, observer performance, atomic storage.
- **Claude Code:** research of local quantized embedding inference, consent-gated model assets, threat-intelligence provider security review, classifier evaluation protocol.
- **Local Qwen model:** isolated tests, deterministic parser utilities, documentation updates, source code maintenance and fixtures.

Use separate Git worktrees and keep module ownership disjoint. No agent may bypass required tests or claim that external OSINT claims are verified merely because the format is valid.
