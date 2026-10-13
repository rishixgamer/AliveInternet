# AliveInternet engineering architecture (v0.3 alpha)

## Product boundary

- **Browser extension** (Chrome MV3, WXT, TypeScript): local comment, post, user-selected account filtering. Small adapters per site, shared bounded scan and explainable UI. Ten experimental platform configurations (Twitch added 2026-10-12); only YouTube on by default.
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

## Live processing budget

The controller lazily extracts up to 350 root candidates per task and yields for
25 ms before continuing through later comments and posts. Earlier UI remains
managed until a complete pass confirms an item is gone or no longer recognized.
Mutations during a pass request another pass without resetting its cursor;
settings changes, navigation and disposal invalidate pending work. Saved
settings must load before processing begins.

Repetition, optional duplicate collapsing and account evidence/campaign gating
are batch-scoped, with up to 350 items as context. They can miss groups split
across batches. Inspectors and collapse explanations expose this scope; they do
not claim a complete page history. UI fingerprints retain validated profile
identity, and moved/recycled items keep a reversible reveal control.

Selector discovery and cleanup still scale with page size, and passes traverse
unchanged candidates. This is a task-size limit, not a measured CPU/memory or
wall-time guarantee. See [development report](development-status.md) for synthetic
controller coverage and outstanding real-browser measurements.

## Security and consent boundaries

### Local settings mutations

`entrypoints/background.ts` registers a single settings writer synchronously on
startup. Content-script account hides, popup unhides and preference changes send
validated mutation messages. The popup sends only the changed boolean, mode or
site flag, never a form snapshot or replacement blocklist. The writer serializes
read/modify/write operations and acknowledges only after local storage succeeds.
Each operation rereads saved settings; failures do not poison later requests.
Same-field conflicts follow processing order, with the last processed intent
winning. The existing 500-account cap rejects additional hides rather than
silently claiming to save them.

The popup listens for settings changes from other contexts, protects pending
control changes and ignores stale reads when a newer storage event arrives.
Messages require the extension's sender ID and strictly validated fields.
Unrelated scaffolded messages remain inactive. No client writes settings directly
or falls back to a competing writer if the background is unavailable.

This prevents races among extension callers in a running background context;
it is not a browser storage transaction or a durable operation queue. Worker
termination, extension reload and real multi-tab delivery still need browser
verification. No raw content enters the background, and no permission, network
call or persistent key is added. Chrome/Edge builds now declare a service worker;
Firefox declares a background script. Badge/statistics features remain inert.

### Data boundaries

No session tokens, cookies, platform private messages, account deanonymization, auto moderation, or bulk scraping. No remote executable browser code. Content comes from pages actively accessed and explicitly enabled by user; only user blocklist, preferences, and deliberately imported indicator pack are stored locally. Imported packs are length/field validated and cannot execute HTML/JS. Third-party enrichment is not called by the extension. Account evidence is page-local and ephemeral. Cached model weights would require opt-in, hash verification, licensing review, and device-based performance testing.

## Suggested independent agent ownership

- **Claude Code:** analyzer API design, optional on-device ML experiments, OSINT provider research and security reviews.
- **Codex:** real-browser Chrome fixtures, WXT typecheck/build fixes, adapter stability, accessibility and performance.
- **Local Qwen:** targeted pure-function tests, fixture generation, type-safe code cleanup and documentation.

Only assign distinct paths/worktrees to agents in parallel. Do not mark any experimental site or model working without a real smoke test. Use `AGENTS.md` as source-of-truth development policy.
