# AliveInternet engineering architecture (v0.3 alpha)

## Product boundary

- **Browser extension** (Chrome MV3, WXT, TypeScript): local comment, post, user-selected account filtering. Small adapters per site, shared bounded scan and explainable UI. Nine experimental platform configurations; only YouTube on by default.
- **Local evidence layer**: `src/core/behavior.ts` summarizes observed content (not account history); `src/core/dedupe.ts` groups long lexical near-duplicates (opt-in, not bot evidence); existing `filter.ts` spam heuristics remain conservative.
- **OSINT / threat intelligence**: `src/intel/indicators.ts` validates a manually imported, provenance-attributed JSON indicator list; it matches only exact visible profile identifiers and exact hostnames. Advisory UI only, opt-in, no automatic blocking. `src/intel/ports.ts` defines a consented network enrichment boundary. `scripts/rdap-domain.mjs` is a **manual** domain-record lookup.
- **Network analysis**: `src/network/campaigns.ts` generates **candidates** from shared linked domains, with explicit uncertainty. `scripts/analyze-fixture.mjs` analyzes a local JSON fixture and emits bounded graph JSON. No background graph scraping or cross-platform identity claims.
- **Research**: `src/research/metrics.ts` provides confusion-matrix metrics. Use permissioned data; synthetic fixtures are not meaningful performance estimates.
- **Future ML**: `src/core/analyzer-ports.ts` and `src/core/embeddings.ts` define analyzer and embedding interfaces; EmbeddingGemma 2 remains an isolated Node research experiment. No browser runtime/model weights yet.

## Evidence hierarchy

1. **User choice:** Explicit hide/allow preference (user-controlled, reversible).
2. **Observed content:** Text, actual displayed links, matching profile URLs, and local repetition. Do not infer unobserved history.
3. **Reviewed external indicator:** Requires publisher, source URL, underlying evidence, update/revocation policy, verified provenance. User-provided packs are **not** deemed reviewed by default.
4. **Campaign hypothesis:** Shared domain, post patterns, temporal burst, graph structure. Hypotheses never imply common ownership or verified automated behavior without independent evidence.
5. **Individual location:** Never inferred from language, claimed region, account metadata, ISP, or proximity to reported bot operations. Country-of-origin is a campaign-level research attribution only when documented and cited, not a classifier input.

## Security and consent boundaries

No session tokens, cookies, platform private messages, account deanonymization, auto moderation, or bulk scraping. No remote executable browser code. Content comes from pages actively accessed and explicitly enabled by user; only user blocklist, preferences, and deliberately imported indicator pack are stored locally. Imported packs are length/field validated and cannot execute HTML/JS. Third-party enrichment is not called by the extension. Account evidence is page-local and ephemeral. Cached model weights would require opt-in, hash verification, licensing review, and device-based performance testing.

## Suggested independent agent ownership

- **Claude Code:** analyzer API design, optional on-device ML experiments, OSINT provider research and security reviews.
- **Codex:** real-browser Chrome fixtures, WXT typecheck/build fixes, adapter stability, accessibility and performance.
- **Local Qwen:** targeted pure-function tests, fixture generation, type-safe code cleanup and documentation.

Only assign distinct paths/worktrees to agents in parallel. Do not mark any experimental site or model working without a real smoke test. Use `AGENTS.md` as source-of-truth development policy.
