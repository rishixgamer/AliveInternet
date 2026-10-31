# AliveInternet v1.0 scope and pre-registered acceptance thresholds

Status: **DRAFT, not yet signed off.** Drafted 2026-10-29 for [issue #10](https://github.com/rishixgamer/AliveInternet/issues/10). Every value marked **Proposed** is a recommendation, not a decision. This document becomes binding only when the maintainer and the dataset custodian sign the table in [Sign-off](#sign-off) and the signing commit lands.

## Pre-registration rule

The thresholds in this document must be committed **before** any test-split evaluation of the v1.0 rule source. Auditable ordering: the commit that adds signed thresholds must be an ancestor of every commit that records a test-split result. Once signed, thresholds change only by a new dated amendment committed before the affected evaluation, and a failed test result never justifies loosening a threshold afterwards. This follows the freeze-then-evaluate-once protocol in [benchmark/README.md](../benchmark/README.md).

Note: the issue refers to an "Evaluation decision" section in `benchmark/annotation/README.md`. That file does not exist in the repository yet; the closest current text is "Evaluation required before release claims" in `benchmark/README.md`. The annotation protocol is owned by the dataset custodian and its absence is a dependency for sign-off.

## Why the claim must be narrow

The only external evaluation so far (UCI YouTube Spam Collection, CC BY 4.0) collapsed 0 of 810 spam-labelled comments with 0 of 903 false positives ([release-readiness](release-readiness.md)). Those labels mean broad promotion; the rules target narrow financial scams and solicitation. Zero false positives on old videos does not establish safety, and zero recall means broad "spam" cannot be claimed. v1.0 therefore claims only what a product-specific, independently annotated, current test set can support.

## Decisions

| # | Topic | Proposed decision | Rationale / consequence |
|---|---|---|---|
| 1 | Platforms | **YouTube only** is supported. The other nine adapters (X, Instagram, Reddit, TikTok, Facebook, Threads, Bluesky, LinkedIn, Twitch) stay opt-in, off by default, and are labelled *Experimental* in the popup and store listing. | Only YouTube has live-site evidence ([live-youtube-validation](live-youtube-validation.md)). Each extra platform multiplies adapter, native-flow and performance work. |
| 2 | Surfaces | In scope: watch-page comments and replies, community posts, video cards. **Out of scope (post-1.0):** Shorts comments, live chat (scaffolded only, `src/core/live-chat.ts`). | Shorts and live chat have different DOM, rate and iframe behaviour with no verified adapter. Revisit only if tickets add fixtures and live checks. |
| 3 | Browsers | Chrome, Edge and Firefox desktop (MV3). Firefox Android is out unless separately validated. | Matches the three existing MV3 builds. Native permission prompts in Firefox/Edge still need verification before the claim ([firefox-validation](firefox-validation.md)). |
| 4 | Languages | **English only.** No claim for other locales until fluent, independent reviewers label them. Non-English content may be processed but is not covered by any accuracy claim. | Rules and annotation are English; multilingual claims need their own strata. |
| 5 | Target claim | "Collapses financial-scam and solicitation comments on YouTube, reversibly, on the user's device." **Broad "spam" and promotion are not part of the claim.** No bot, authorship or identity claim. | Matches rule design and non-negotiable rules 1-3 in `AGENTS.md`. |
| 6 | Acceptance thresholds | See [Threshold table](#proposed-acceptance-thresholds). | Pre-registered, requires sign-off. |
| 7 | Performance budgets and devices | See [Performance](#proposed-performance-budgets-and-reference-devices). | Feeds the performance ticket. |
| 8 | Feature list | See [Features](#features-shipping-in-v10). | Feeds the catalog-triage ticket. |
| 9 | npm core package | **Do not publish `@aliveinternet/core` at v1.0.** Keep the local tarball build and consumer checks; publish after v1.0 once the namespace is owned and the API is reviewed. | Namespace ownership is unconfirmed ([npm-package](npm-package.md)); a public API adds a compatibility burden not needed for the extension claim. |

## Proposed acceptance thresholds

All metrics are for the **collapse decision** of the deterministic rule engine plus the shipped default settings, on the **natural set** (a current, permissioned sample drawn without regard to rule hits) unless stated. Labels are two-annotator with adjudication, per the benchmark protocol. "Positive" means a comment labelled financial scam or solicitation under the target claim.

| Metric | Proposed threshold | Notes |
|---|---|---|
| False-positive rate, natural set | Upper 95% bound **≤ 0.5%** of legitimate items | Needs enough negatives: with zero observed FP, at least ~600 independent legitimate items (rule of three); the cluster method below usually requires more. |
| Precision on collapsed items | Lower 95% bound **≥ 95%** | Computed on the natural set. |
| Recall on target-claim positives | Lower 95% bound **≥ 40%** | Deliberately modest: the product prioritises avoiding false positives over catching everything. Requires ≥ 150 positives. |
| Per-safety-stratum FP rate | Upper 95% bound **≤ 2%** in each stratum | Strata: finance educators, quoted scam warnings, creator giveaways, benign links, reused display names, repeated legitimate opinions, short generic agreement, non-English content. Each needs ≥ 150 items; a stratum below that is reported as **insufficient** and blocks any claim covering it. |
| Sample sufficiency | ≥ 1,000 legitimate items from ≥ 300 independent clusters (account/thread/campaign groups); ≥ 150 positives from ≥ 50 clusters; sampled within 6 months of the test run, across ≥ 25 channels | Under-sized sets fail the release gate rather than pass by default. |
| Uncertainty method | **Cluster-aware**: bootstrap resampling of clusters (10,000 resamples, percentile intervals) as the primary method; exact binomial (Clopper-Pearson) on cluster-level counts as a cross-check. The stricter bound decides. | Item-level binomial intervals understate uncertainty because comments from one account or thread are correlated. |
| Test discipline | Rule source frozen and hashed before the run; test split evaluated **once**; failed items are not moved to dev | From `benchmark/README.md`. |
| Stability | Same dataset hash and source hash reproduce the report | Reproducible-evaluation requirement of the v1.0 roadmap line. |

If any threshold is not met, the corresponding claim is dropped or v1.0 is delayed; thresholds are not relaxed after seeing results.

## Proposed performance budgets and reference devices

Budgets apply to the YouTube adapter measured with `npm run benchmark:device` (three warm-up plus ten measured paired runs, extension off versus on). Final values must be confirmed by the performance ticket; these are starting proposals.

| Budget | Proposed |
|---|---|
| Added median scan time for a 350-candidate batch | ≤ 50 ms on the mid-tier device, ≤ 150 ms on the low-end device |
| p95 batch scan time | ≤ 2× the median budget |
| Idle (no new comments) | No feed mutations caused by the extension; renderer task time < 300 ms per 1.2 s idle interval (existing gate) |
| Added extension-attributable memory | ≤ 50 MB RSS on a long (≥ 5,000 comment) thread |
| Long tasks introduced | None over 100 ms during scrolling on the mid-tier device |

Reference devices (to be named by the maintainer; at least one low-end): (a) a current Apple-silicon laptop with Chrome and Edge; (b) a mid-range Windows or Linux laptop with Firefox; (c) **low-end:** an older dual-core, 4 GB RAM laptop or equivalent. GPU cost stays unmeasured without an instrumented sampler and must be reported as unmeasured, not zero.

## Features shipping in v1.0

Proposed rule: ship only features that are `implemented` in `src/core/features.ts`, have tests, are covered by the evaluation or are user-initiated and reversible, and are default-off unless validated. Everything `scaffolded` or `in-progress` stays inert and unwired (per `AGENTS.md`), and is post-1.0 unless the catalog-triage ticket promotes it with evidence.

| Ship in v1.0 (proposed) | Defer or exclude |
|---|---|
| Deterministic rule engine, manual account hide, reversible hiding, visible-page evidence | All `scaffolded` features: community rule lists subscriptions, creator mode, live-chat filtering, local classifier, i18n wiring, toolbar badge, stats card |
| Settings export/import, trusted-content exemptions, mute words and allowlist | All `in-progress` detectors until wired and benchmarked: reply-chain, impersonation, copied-comment, profile-bait, generic-filler, look-alike domains, fake badges, giveaway streams, check-this-comment, per-channel strictness |
| Hidden-items review list, redacted report drafts (user-reviewed, opened only by click; ticket 13), link destination reveal, obfuscation normalization (only after it is inside the evaluated rule source) | Manual OSINT pack import stays advisory and opt-in; it is not part of the accuracy claim |
| Opt-in long-comment near-duplicate collapse (default off, outside the accuracy claim unless evaluated) | AutoMod export and npm core package: non-claim extras, not release gates |

The catalog-triage ticket makes the final per-entry call.

## Roadmap alignment

- The v1.0 line in [roadmap.md](roadmap.md) links to this document.
- Milestones M3 (v0.6, embeddings and threat feeds) and M4 (v0.7+, graph UI, signed lists, multimodal) are outside this scope and are marked post-1.0.

## Sign-off

| Role | Name | Date | Signature (commit or comment link) |
|---|---|---|---|
| Maintainer | _pending_ | _pending_ | _pending_ |
| Dataset custodian | _pending_ | _pending_ | _pending_ |

Open items before sign-off: confirm each Proposed value; name the dataset custodian; create `benchmark/annotation/README.md`; name the reference devices.
