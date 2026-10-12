# AliveInternet roadmap (v0.3 alpha)

Legend: **Implemented** = committed logic with tests, not necessarily verified in Chrome; **Scaffolded** = API/design foundation; **Future** = no operational implementation.

| Feature | Status | Next validation |
|---|---|---|
| Manual account blocking + per-surface filtering | Implemented | Chrome E2E + multi-tab storage races |
| Rule-based scam / comment detection | Implemented | Licensed labeled benchmark, false-positive targets |
| Long-comment lexical near-duplicate collapsing | Implemented; opt-in | Regression/performance on real threads |
| Visible-page account evidence | Implemented | Browser UI and accessibility tests |
| Cross-platform adapters (9) | Experimental prototype | Per-site DOM/SPA real browser fixtures |
| Manual OSINT indicator pack import + exact-match advisories | Implemented; opt-in | Pack provenance/expiration/signature validation |
| Manual RDAP domain lookup tool | Implemented CLI | Test rate-limit/errors; never infer individual geo |
| Shared-domain campaign candidates / exportable graph JSON | Implemented offline | Permissioned datasets, temporal corroboration |
| Coordinated amplification / temporal graphs | Scaffolded via network DTO | Timestamp provenance, scalable authorized data |
| Network graph visualization | Future | Local-only UI viewer, evidence-labelled edges |
| Cross-platform identity links | Future; high-risk | Explicit public linkage only; consent and review |
| Verified community subscription feeds | Future; manual JSON only | Signed updates, auditing, expiration, opt-in |
| Multilingual semantic clustering (EmbeddingGemma 2) | Research-only | Quantized browser packaging, benchmarking, evaluation |
| Synthetic/AI media preference filters | Future | Modality-aware local analysis, independently tested |
| Security URL reputation providers (URLhaus etc.) | Provider interface only | Terms, user consent, API limits, privacy boundaries |
| Individual geolocation or 'Global South bot risk' | Explicitly excluded | Not a reliable or defensible detection signal |

## Release milestones

- **M0 / v0.3**: Rename project; ship local architecture, opt-in deduplication, explainable page evidence, safe manual indicator pack and offline graph analytics. DONE in source, not browser validated.
- **M1 / v0.4**: `npm install`, complete WXT build/typecheck; test YouTube, X, Reddit in Chrome across SPA navigation, dark mode, localization, infinite-scroll, old/new layouts. Fix account-block storage races; permission-scoped host activation.
- **M2 / v0.5**: Real measured precision/false-positive rate/latency/memory benchmarks. Add tested account activity observations where a platform actually exposes credible timestamps; no private history.
- **M3 / v0.6**: Optional local, quantized embeddings after user consent and verification; add evaluated multilingual semantic deduplication without bot labels. Introduce safe, optional threat feeds with pinned publisher keys and provenance.
- **M4 / v0.7+**: Explainable graph UI on permissioned data, opt-in campaign research, feedback workflow and appeal/correction infrastructure. Consider signed community lists, Bluesky label interoperability and multimodal preferences.
- **v1.0**: Stable browser adapter coverage, audit, repeatable performance budgets, browser permissions and store policy verification, reproducible evaluations.
