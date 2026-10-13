# Offline rule evaluation

`npm run benchmark` evaluates the bundled hand-authored synthetic safety fixture. To evaluate a permissioned local dataset and save an aggregate report:

```sh
npm run benchmark -- path/to/dataset.json path/to/new-report.json
```

The report includes collapse precision, recall and false-positive rate, with TP/TN/FP/FN denominators, for conservative/balanced/aggressive modes and platform × category × locale groups. `flag` counts as visible. Empty denominators are `null`. Reports contain dataset SHA-256, hashes of core/research source files, runtime version and one-pass batch latency; they contain no input text, links, IDs or free-text provenance. Output files must be new and are never overwritten.

Inputs must use the strict envelope illustrated in [the synthetic fixture](datasets/synthetic.json): a provenance-bearing `manifest` and `items`. The parser requires source (`synthetic`, `permissioned`, `de-identified`), licence, provenance, fixed split, version and exact count. The CLI accepts at most 5 MB, 10,000 items, 10,000 characters per text and 20 HTTP(S) links per item. Unknown fields, duplicate IDs, credentials in links and invalid relationship references are rejected. IDs/account/thread groups must be opaque tokens. Schema validation cannot prove permission, de-identification, label correctness or licence ownership; the dataset custodian must review those before a run.

Rule evaluation isolates platforms and preserves input order within batches of at most 350. An absent account group uses a unique artificial author per row; supply opaque `accountGroup` tokens for repeated-author scenarios. This runner evaluates the deterministic rule engine only; it excludes the browser controller, duplicate collapsing, trust/user preferences and optional analyzers. Do not describe its output as end-to-end extension accuracy. Batch timing is a single warm-process sample on the invoking device, not browser CPU/GPU/memory cost.

## Evaluation required before release claims

Obtain independent, permissioned annotations for scams/spam and legitimate speech. Include finance educators, quoted scam warnings, creator giveaways, benign links, reused display names, repeated legitimate opinions, short agreement, non-English content and changing layouts. Use two independent annotators and adjudicate disagreements. Keep the source/permission record locally, with no account identity in the evaluation artifact.

Freeze train/dev/test assignments by source/account/campaign/time group before tuning. Deduplicate across splits using opaque grouping and normalized content; do not move a failed test example into dev after inspection. Tune rules on dev only. Run a versioned test set once after freezing the rule source, then report counts and uncertainty per platform/category/locale alongside missing strata. Small samples and zero observed false positives do not establish a zero false-positive rate. A representative corpus and agreed acceptance thresholds are still required; the synthetic fixture is only a runner regression.

Keep a separate browser performance experiment: extension off/on, identical authorized fixture, three warm-up runs plus ten measured runs, median/p95 scan time, renderer task/script time, browser/extension process RSS, long tasks, and idle mutations. Record OS/device/browser/build hashes, power state and measurement definitions. GPU cost requires a dedicated instrumented measurement; renderer task duration is not GPU usage.

The executable experiment is now `npm run benchmark:device -- path/to/new-output-directory`. Use `ALIVEINTERNET_BROWSER_CHANNEL=chrome ALIVEINTERNET_BROWSER_HEADED=1` for installed Chrome; `msedge` and an explicit `ALIVEINTERNET_BROWSER_PATH` support an isolated extracted official Edge app. It records three warm-up and ten measured pairs with alternating order, foreground pages, equal settling/idle intervals, renderer and aggregate process CPU counters, summed RSS snapshots, long tasks, power/load state, build/harness/fixture hashes and paired deltas. The baseline browser has no extension. Successful execution verifies scenario completion and sample integrity, not a pre-approved performance budget. GPU utilization/energy remain null without a hardware sampler; renderer RSS includes workers without separate extension-only attribution.

[October 13 evidence](../docs/release-readiness.md) records a CC BY 4.0 historical UCI corpus and Mac/Chrome/Edge measurements. UCI results have zero collapse recall and cannot replace representative, current, independently annotated test data. Raw external corpora are ignored and never packaged with the extension or public source draft.
