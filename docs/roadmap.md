# AliveInternet roadmap (v0.3 alpha)

Legend: **Implemented** = source logic with tests, not necessarily verified on live platforms; **Scaffolded** = API/design foundation; **Future** = no operational implementation.

Per-feature v1.0 ship/defer/remove decisions are in [feature-groundwork](feature-groundwork.md#v10-disposition-catalog-triage-ticket-11); deferred entries below are post-1.0.

| Feature | Status | Next validation |
|---|---|---|
| Manual account blocking + per-surface filtering | Implemented; serialized settings mutations have synthetic tests | Chromium production fixtures pass; broader live/browser coverage pending |
| Rule-based scam / comment detection | Implemented | Licensed labeled benchmark, false-positive targets |
| Long-comment lexical near-duplicate collapsing | Implemented; opt-in | Regression/performance on real threads |
| Visible-page account evidence | Implemented | Browser UI and accessibility tests |
| Large-page incremental processing | Implemented; synthetic controller tests | Synthetic Chromium timing and idle measurements recorded; real-device overhead, dirty indexing and batch-boundary misses remain |
| Cross-platform adapters (10) | Experimental; YouTube has synthetic DOM regressions | Per-site DOM/SPA real browser fixtures |
| Manual OSINT indicator pack import + exact-match advisories | Implemented; opt-in | Pack provenance/expiration/signature validation |
| Manual RDAP domain lookup tool | Implemented CLI | Test rate-limit/errors; never infer individual geo |
| Shared-domain campaign candidates / exportable graph JSON | Implemented offline | Permissioned datasets, temporal corroboration |
| Coordinated amplification / temporal graphs | Scaffolded via network DTO | Timestamp provenance, scalable authorized data |
| Network graph visualization | Implemented offline viewer | Permissioned graph fixtures and browser UI validation |
| Cross-platform identity links | Future; high-risk | Explicit public linkage only; consent and review |
| Verified community subscription feeds | Future; manual JSON only | Signed updates, auditing, expiration, opt-in |
| Multilingual semantic clustering (EmbeddingGemma 2) | Research-only | Quantized browser packaging, benchmarking, evaluation |
| Synthetic/AI media preference filters | Future | Modality-aware local analysis, independently tested |
| Security URL reputation providers (URLhaus etc.) | Provider interface only | Terms, user consent, API limits, privacy boundaries |
| Chrome / Firefox / Edge store listings + builds | Three MV3 builds, progressive permissions, stable Firefox ID and icons implemented; unpublished | Firefox/Edge execution, listing assets and store review |
| Toolbar badge count + shareable monthly stats card | Counts-only helpers implemented, background/popup wiring pending | Stats handling in settings-only background; counts-only storage review |
| Community rule lists + language rule packs | Parser/matcher implemented, import UI pending (`src/rules/`, `rules/`, spec) | Local import UI; signed subscriptions later |
| Report a miss / wrongly hidden | Removed for v1.0 (stub deleted; issue templates remain, manual) | New design and privacy review if revived |
| Public scam-comment benchmark | Scaffolded (`benchmark/`, `src/research/dataset.ts`) | Permissioned labelled data |
| Reply-chain, impersonation, copied-comment, profile-bait, generic-filler analyzers | Logic + tests done, unwired (`src/detectors/`, in-progress) | Adapter thread/owner data; benchmark; wire via policy |
| Obfuscation normalization (look-alikes, spaced letters, handles) | Implemented (`src/core/obfuscation.ts`, fed into filter.ts) | Browser false-positive spot-checks |
| Trusted-content exemptions and mute words | Policy + storage + validated popup editors; dedup respects platform-scoped allowlists | Verified creator flags; browser E2E |
| Settings export/import | Local download, bounded preview/cancel, merge and confirmed replacement implemented | Broader browser usability |
| Creator mode | Removed for v1.0 (stub deleted) | New adapter surface needed if revived |
| Link destination reveal, look-alike domains, fake verification badges, fake giveaway streams | Links implemented; lookalike/badge/giveaway logic done unwired | Offline only; verified brand list; benchmark before wiring |
| YouTube live chat + Twitch chat | Scaffolded (`src/core/live-chat.ts`) | live_chat iframe adapter, Twitch adapter, rate budget |
| AutoModerator / Discord AutoMod export | Copy-paste exporter implemented; UI unwired | Official platform-limit verification before use |
| npm core package | Local standalone ESM tarball, declarations and consumer checks implemented | Namespace ownership and maintainer publication |
| Hidden-items review | Current-tab popup, pagination and temporary reveal implemented | Broader live usability |
| Right-click check, per-channel strictness | Helpers implemented, UI wiring pending | contextMenus permission review; verified page-owner data |
| UI translation, supply-chain hardening, scam-pattern changelog | Scaffolded (`locales/`, `docs/supply-chain.md`, `docs/scam-patterns/`) | i18n wiring; lockfile + Scorecard |
| Individual geolocation or 'Global South bot risk' | Explicitly excluded | Not a reliable or defensible detection signal |

Groundwork details: [feature-groundwork.md](feature-groundwork.md).

Current verification and prioritized development work: [development report](development-status.md).

## Release milestones

- **M0 / v0.3**: Rename project; ship local architecture, opt-in deduplication, explainable page evidence, safe manual indicator pack and offline graph analytics. DONE in source, not browser validated.
- **M1 / v0.4**: WXT build/typecheck and serialized settings mutations now pass source checks. Chromium fixtures now verify SPA/reload, multi-tab settings, worker restart and permission-scoped activation. Expand live YouTube, X and Reddit checks across dark mode, localization, infinite-scroll and old/new layouts; verify native permission prompts in each browser.
- **M2 / v0.5**: Real measured precision/false-positive rate/latency/memory benchmarks. Add tested account activity observations where a platform actually exposes credible timestamps; no private history.
- **M3 / v0.6** *(post-1.0, see [v1 scope](v1-scope.md))*: Optional local, quantized embeddings after user consent and verification; add evaluated multilingual semantic deduplication without bot labels. Introduce safe, optional threat feeds with pinned publisher keys and provenance.
- **M4 / v0.7+** *(post-1.0, see [v1 scope](v1-scope.md))*: Explainable graph UI on permissioned data, opt-in campaign research, feedback workflow and appeal/correction infrastructure. Consider signed community lists, Bluesky label interoperability and multimodal preferences.
- **v1.0**: Stable browser adapter coverage, audit, repeatable performance budgets, browser permissions and store policy verification, reproducible evaluations. Scope, claim and pre-registered thresholds: [v1-scope.md](v1-scope.md) (draft pending maintainer and custodian sign-off).
