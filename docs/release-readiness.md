# Release evidence and remaining conditions — October 13, 2026

This continuation completed licensed-data evaluation, repeated measurements on the available Mac, signed-app verification and branded Chrome/Edge integration checks. It also created the maintainer's default **private** GitHub repository and prepared publisher/contact and privacy-hosting drafts. It did not upload source, publish a policy, submit to a store, sign an extension, commit or push the working tree.

The release remains an experimental alpha. The historical corpus found **zero collapse recall**, so broad spam-detection and stable-release claims remain blocked. Synthetic integration success does not override that finding.

## Licensed external labels

[T.C. Alberto and J.V. Lochter's UCI YouTube Spam Collection](https://archive.ics.uci.edu/dataset/380/youtube+spam+collection), DOI **10.24432/C58885**, is licensed **CC BY 4.0**. Its pinned ZIP SHA-256 is `bd6182891adb3cfc8334b82c062176dfbebc563bf0ba07e31c2645f916865a0a`. The independent published labels supplement the earlier 42 artificial examples.

`scripts/import-uci-youtube.py` is offline and rejects any other ZIP revision. It reads CSV entries without extraction, drops source authors/comment IDs/dates, uses ordinal opaque row IDs, removes explicit email/handle identifiers and URL paths/query strings, retains only HTTP(S) domain links, strips markup, and deduplicates normalized text before and after minimization. Original/transformed text remains under ignored local artifacts, outside both the source package and extension. Free text may still contain personal information; this is contact minimization, not proof of anonymity or direct participant consent. The manifest uses `permissioned` for licensed reuse rather than claiming complete de-identification.

| Data check | Result |
|---|---|
| Original rows / source videos | 1,956 / five old popular music videos |
| Retained unique transformed rows | 1,713 |
| Duplicate rows excluded | 243 |
| Rows excluded for conflicting source labels | Zero; transformed label-conflict groups also zero |
| Retained source spam / legitimate labels | 810 / 903 |
| Explicit contact/URL minimization operations | 211 |
| Source dates present | July 12, 2013–June 5, 2015; 245 missing dates |
| Locale | `und`; no inferred language, nationality or personal location |

The fixed retrospective test split was evaluated without rule changes or tuning. All modes produced **TP 0, TN 903, FP 0, FN 810**: observed collapse recall **0%**, false-positive rate **0/903**, and precision **undefined** because nothing was collapsed. The source's broad promotion/spam labels differ from the extension's narrow financial-scam/solicitation rules. Text minimization also changes the task. Neither the zero false positives nor these old videos establish safety or accuracy on today's feeds. Labels were not independently re-annotated/adjudicated for this product; no accepted release thresholds were supplied. Current authorized sampling, diverse contexts/locales and independent product-specific annotations remain required.

[Import audit](validation/2026-10-13-release-readiness/uci-audit.json) · [Rule results and exact source/lock hashes](validation/2026-10-13-release-readiness/uci-rules.json).

Reproduction, after explicitly downloading the official licensed ZIP locally:

```sh
python3 scripts/import-uci-youtube.py path/to/uci-youtube.zip path/to/new-test.json path/to/new-audit.json
npm run benchmark -- path/to/new-test.json path/to/new-rule-report.json
```

## Device measurements

`npm run benchmark:device -- path/to/new-output-directory` launches two disposable browser processes: an extension-absent baseline and the exact production build. Both contexts remain open; the inactive pages are blank. Each sample brings its measured page to the foreground. It uses the same intercepted 1,401-item fixture, three warm-up pairs and ten measured pairs, alternating order. The enabled condition must finish exactly 1,400 reversible collapses and preserve the benign row; static feeds must have zero idle mutations. Source/build/fixture/lock hashes, all samples, OS/model, power state and load averages are retained.

Available device: **Apple M5 Pro, 48 GiB, Mac17,9, macOS 27.0, AC power, normal AC power mode**. The final headed Chrome 154.0.8037.99 run measured:

| Measure | Extension absent median / sample p95 | Extension on median / sample p95 |
|---|---|---|
| Navigation-to-ready wall time | 46.70 / 49.66 ms | 672.88 / 678.55 ms |
| Renderer task time through completion + equal settle | 26.85 / 35.84 ms | 139.67 / 161.03 ms |
| Aggregate browser-process CPU time, same interval | 118.90 / 139.45 ms | 290.21 / 343.01 ms |
| Summed resident-set snapshots | 1,065.61 / 1,070.20 MiB | 1,331.13 / 1,369.83 MiB |
| Renderer task time during 1.2 s idle | 10.91 / 14.47 ms | 0.83 / 1.05 ms |

Paired on-minus-off medians: **625.08 ms** ready time, **113.97 ms** renderer task time, **292.38 MiB** summed RSS. There were no observed long tasks or idle feed mutations in the final samples. This cost needs consideration before defining a device budget; no performance acceptance threshold is silently invented.

At ten measured samples, nearest-rank sample p95 is the largest sample, not a robust population-tail estimate. RSS sums can double-count shared pages; they are settled snapshots, not peak or unique physical memory. Renderer/process CPU deltas are not CPU percentages or energy. Renderer processes include extension execution without uniquely isolating worker RSS. GPU-process CPU is **host CPU**, not GPU utilization. macOS `powermetrics` rejected hardware GPU sampling without superuser privileges, so hardware GPU utilization/energy remain **unmeasured**, explicitly `null`. No privilege change was attempted. Interactive background applications and browser automation affect measurements; these are controlled synthetic comparisons on this Mac, not real-feed or low-end-device budgets. Other devices remain pending as the maintainer requested.

[Chrome device receipt](validation/2026-10-13-release-readiness/chrome-device.json). The earlier exploratory receipt is retained locally and is superseded by the final foreground-controlled run.

The separate final headed **Edge 155.0.4283.45** experiment completed the same 26 samples. Absent/on ready-time medians were **110.10 / 744.54 ms** (sample p95 **170.71 / 852.72 ms**); renderer task medians **31.48 / 148.02 ms**; process CPU medians **195.23 / 461.82 ms**; summed RSS medians **1,018.20 / 1,284.12 MiB**. Paired overhead medians were **623.00 ms** ready time, **117.68 ms** renderer task time and **267.51 MiB** summed RSS. No long tasks or idle mutations were observed. These are separate within-browser comparisons, not a randomized Chrome-versus-Edge ranking. [Edge device receipt](validation/2026-10-13-release-readiness/edge-device.json).

## Signed applications and branded browsers

Installed Google Chrome's deep/strict code signature passes when macOS trust services are available. The initial sandbox-only signature failure was an environmental false result and is retained separately. Chrome 154.0.8037.99 runs all **15** production integration groups in a disposable profile using `Extensions.loadUnpacked`; Playwright's default extension-disabling flag is removed for this explicit test. This is an unpacked developer install into a signed browser app, not a signed-store extension.

Microsoft's official release API supplied **Edge 155.0.4283.45**. Its downloaded macOS universal package matches the published SHA-256 and byte count; `pkgutil` verifies Microsoft's trusted installer certificate and Apple notarization, and deep/strict app verification passes. The package was extracted into ignored artifacts without running its installer or install scripts. No system-wide Edge installation or default-browser change was made.

Edge runs the same **15** integration groups in its signed branded app, headed, with the production Edge build. Initial headless/headed checks stalled because animation-frame DOM polling does not reliably progress in Edge's background tabs. Switching the harness to bounded 100 ms DOM polling completed the same checks; production filtering code was not changed. Failed attempts remain local evidence. The final Edge optional-site check leaves the prompt pending and proves no preference enable or registration. It does **not** verify grant/refusal wording, a native toolbar click, or store installation. An unused native first-run screen was not accepted.

[Chrome integration](validation/2026-10-13-release-readiness/chrome-fixture.json) · [Edge integration](validation/2026-10-13-release-readiness/edge-fixture.json) · [Chrome signature](validation/2026-10-13-release-readiness/chrome-signature-unsandboxed.txt) · [Edge installer signature](validation/2026-10-13-release-readiness/edge-package-signature.txt) · [Edge app signature](validation/2026-10-13-release-readiness/edge-app-signature.txt).

Signed Firefox extension installation still requires an AMO-returned XPI and a normal Firefox install with signing enforcement enabled. The existing temporary Firefox fixture is not that evidence. Store accounts, native installation/refusal/withholding/toolbar flows and Android remain separate. [Mozilla's signing distinction](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Repository, privacy contact and publisher

The default **https://github.com/rishixgamer/AliveInternet** now exists privately; the API verifies administrator permission. **Rishi Haldar / rishixgamer** is verified as the authenticated GitHub identity. This does not verify legal/store publisher identity. Default contact and proposed hosting are prepared in `release/publisher.json`, [the local policy](privacy-policy.md), `site/privacy/index.html` and [publisher details](publisher-details.md).

Mailbox delivery, public source upload, unauthenticated policy reachability, store publisher accounts and a signed XPI remain unverified. Publishing source/contact is a separate final approval because it makes the code and selected email public. No credentials were requested or stored. [Repository verification](validation/2026-10-13-release-readiness/github-repository.json).

## Verification and remaining scope

- **216** source tests pass, zero failures/skips; core and WXT types pass.
- Chrome, Firefox and Edge MV3 builds, release checks, inherited dependency-provenance checks and the packed core consumer pass.
- Licensed-corpus conversion verified count reconciliation, normalization, explicit contact minimization, unreviewed checksum rejection and overwrite refusal. Offline dataset/schema evaluation succeeds; its classification outcome is the failure described above.
- Final Chrome/Edge fixtures each pass 15 groups. Branded apps are signature-verified. Focused-page device receipts retain all repeated off/on samples.
- `npm run check:release-evidence` verifies the exact production/source/harness hashes, licensed-corpus reconciliation, 26 samples per browser and private repository receipt. A passing integrity check explicitly retains the unresolved release conditions.
- The policy/source publication draft is ready to review. Public publication, verified mailbox delivery, signed Firefox and actual store ownership remain external conditions.

Receipts are under `docs/validation/2026-10-13-release-readiness/`; raw licensed content, downloaded runtimes, temporary browser profiles and exploratory/failed runs stay out of public source packages. The historical gates retain their original local scope; they do not turn these external conditions into passes.
