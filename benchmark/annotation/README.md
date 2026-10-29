# Current YouTube collection and annotation package

This package prepares an evaluation. No current comments or independent labels have been supplied, so representative accuracy remains unverified. The historical UCI result (0/810 spam comments collapsed) remains failed broad-spam evidence. Do not tune on that inspected test set and then present its rerun as a new independent test.

## Collection plan

Start with the default YouTube comment surface. Use comments supplied by consenting participants/creators or another documented, authorized source. Public visibility alone does not establish collection permission. No scraping, profile enrichment, private messages, credentials or live extension uploads are part of this workflow. Keep permission records and raw data locally under ignored `artifacts/release-readiness/`; publish only aggregate results after privacy review.

Before collection, the custodian records the intended population, source permissions/licence, date range, selection method, video/context types, comment ordering, language coverage, sample/group allocation, and exclusions. Use consecutive comments from predefined windows; record every eligible comment, including apparent misses, rather than selecting comments the rules already hide. Include main comments and authorized reply context. Replace profile/video/account references with opaque tokens; remove personal information and retain only necessary domain links. Review the resulting text manually: automated replacement does not prove de-identification. Label the exact minimized text the engine will receive. Describe any resulting task change.

As a proposed starting workload, collect 1,000 natural comments from at least 25 source/time windows over multiple days. Allocate entire source/account/campaign/time groups before annotation or rule inspection: approximately 20% train, 20% dev and 60% test. These counts are a collection target, not statistical proof of representativeness. Freeze the plan before viewing decisions. Treat English-only evidence as English-only; use fluent independent reviewers before adding other locales. Locale is content metadata, never an identity or risk feature.

Collect separate, authorized safety examples for quoted scam warnings, financial education, legitimate creator giveaways, benign links, repeated legitimate opinions, short agreement and obfuscated solicitations. Aim initially for 50 per safety stratum. Keep these enriched sets separate from natural samples; their prevalence is artificial. Missing strata remain explicit gaps. Finance-related discussion, repeated wording, generic praise, nationality, viewpoint or apparent AI style is not sufficient for a scam/spam label.

## Labels and independence

Give two people only `items.json`, the rubric below, and their own blank annotation sheet. They must work independently without extension decisions, each other's labels or sampling strata. Opaque annotator IDs are distinct; a third person adjudicates disagreements and any uncertain label after both sheets are locked. Distinct strings and a checked attestation cannot prove that three independent people participated; the custodian must retain that evidence locally. An LLM can help format data, but does not replace independent human ground truth.

| Label | Evidence required |
|---|---|
| `scam` | The supplied comment/context contains a deceptive solicitation or fraudulent offer. Explain the evidence in the text; do not infer account identity or accuse the person. |
| `spam` | Unwanted unsolicited promotion or repeated disruptive material in documented context. A benign link or repeated opinion alone is insufficient. |
| `legitimate` | Ordinary discussion, criticism, short agreement, benign links, educational material or warnings quoting scams without endorsing them. |
| `uncertain` | Missing context or ambiguity prevents a defensible decision. Record the reason; do not force a binary label. |

Write a brief reason for every label. Adjudicate all disagreements and uncertain cases. If context cannot resolve an item, obtain authorized context or revise the collection as a new documented revision; do not silently drop uncertain cases to improve results. The CLI refuses unresolved labels.

## Input and execution

The local JSON input has `manifest`, `collection` and `items`. The manifest uses the existing benchmark fields (`name`, `version`, `license`, `provenance`, `items`, `source`), with `split: "mixed"`. Use `permissioned` only for documented permission/licensed reuse, or `de-identified` after actual review. `synthetic` remains available for workflow testing and is never promoted to real evidence.

[`input.example.json`](input.example.json) is a complete artificial input showing the format. You can run `init` on it to inspect the blank sheets; do not relabel its provenance as permissioned or count those three rows as current-data evidence. Replace the input with an actually authorized collection and its real permission record for the evaluation.

`collection` requires `permissionReviewed: true`, an opaque `permissionRecord` token pointing to the custodian's local record, a written `samplingPlan`, and ISO dates `collectedFrom` / `collectedThrough`. These are attestations, not automatic licence verification.

Each item uses the existing dataset fields with **no label**, plus `split` (`train`, `dev`, `test`), opaque `sampleGroup`, and `stratum`. Supported strata: `natural`, `scam-warning`, `financial-education`, `creator-giveaway`, `benign-link`, `repeated-opinion`, `short-agreement`, `obfuscation`. Only YouTube comments are accepted in this first protocol. Account/thread IDs must be opaque. Parent and child must share split and stratum.

The tool rejects source/account/thread groups and normalized text of at least 40 characters crossing splits. Short generic repetitions remain legitimate natural samples. Near-duplicate and shared-domain/campaign leakage require a separate human review; the tool cannot establish independence from those signals.

```sh
# Supply an authorized local collection; output directories must not exist.
node --experimental-strip-types scripts/prepare-annotation.mjs init \
  artifacts/release-readiness/collection.json artifacts/release-readiness/annotation-v1

# Two independent people complete annotator-a.json and annotator-b.json.
# A third completes adjudication.json with independentReviewConfirmed: true.
node --experimental-strip-types scripts/prepare-annotation.mjs finalize \
  artifacts/release-readiness/annotation-v1 artifacts/release-readiness/labelled-v1

# Freeze rule source and pre-register thresholds before the untouched test run.
npm run benchmark -- artifacts/release-readiness/labelled-v1/test-natural.json \
  artifacts/release-readiness/natural-test-v1.json
```

Directories/files are created exclusively with private permissions; existing or partial outputs are preserved. Annotation reasons and raw rows never appear in the terminal. The package holds minimized text in `collection.json` / `items.json`; share only with authorized annotators through an approved private channel. No sharing is performed by this tool.

Finalization emits separate split/stratum benchmark datasets and an aggregate hash-bound annotation audit. It does not run the test set or pass an accuracy gate. No data is bundled into the extension. The regression tests exercise the full prepare/finalize path with artificial input; they are not human-label evidence.

## Evaluation decision

Before evaluating the frozen test set, the maintainer and dataset custodian must agree on the target claim, supported language/context, mode, acceptable false-positive bound, minimum precision/recall, sample sufficiency, cluster-aware uncertainty method and treatment of missing strata. No acceptance thresholds have been approved. Any proposed numbers need explicit acceptance before test outcomes are inspected.

The existing runner reports combined `scam`/`spam` collapse metrics. Report these honestly; they are not calibrated scam probability or product-specific scam recall. Preserve separate label counts and assess the narrower scam target separately if that becomes the accepted claim. Report TP/TN/FP/FN, precision, recall and false-positive denominators for natural and each safety set, plus disagreements, exclusions, sample dates, grouping and gaps. Zero observed false positives is not zero population risk. Confidence intervals must account for source clusters; do not treat correlated comments as independent trials.

Tune only on dev; freeze a new rule revision and an untouched test set before evaluating again. Passing rule-only tests does not establish adapter extraction or end-to-end behavior. A separate authorized, blinded browser assessment must compare visible comments and actual reversible hides, including trust/user settings and reply boundaries. Broader platforms and languages remain outside this YouTube protocol.
