# Development report — 2026-10-12

Current continuation: [October 13 release evidence](release-readiness.md) records licensed historical labels, the zero-collapse-recall result, signed branded Chrome/Edge integration, repeated Mac measurements and the verified private default GitHub repository. Earlier sections below retain their historical scope.

Latest release prerequisites: [dependency resolution](dependency-resolution.md), including 216 tests, offline evaluation, synthetic release media and expanded live reply attribution.

Latest continuation: see [completion evidence](completion-report.md) for the current 207-test suite, three MV3 builds, Chromium integration fixtures, progressive permissions, backups and hidden review. Earlier counts and warnings below describe historical checkpoints; they are preserved as development history. [Muse review and continuation](continuation-review.md) records the inherited safety fixes.

## Repository assessment

The v0.3 architecture separates DOM adapters, pure filtering/policy, local
storage and reversible UI. The deterministic core has regression coverage;
34 planned features remain inert and default-off. EmbeddingGemma and external
intelligence providers are research boundaries, not browser filtering features.

The main release risks are browser behavior and attribution, rather than a lack
of planned detectors. Development should address those before enabling more
automatic filtering.

## First implementation

`src/adapters/youtube.ts` now selects individual `ytd-comment-view-model` and
legacy `ytd-comment-renderer` nodes. Previously it selected a thread container
and skipped every nested view-model, missing replies and hiding all replies
when the parent was collapsed. Nested legacy/view-model wrappers are extracted
once at the innermost comment boundary. Unknown thread-only layouts fail open.

`tests/youtube-dom.test.mjs` adds nine synthetic DOM regressions using jsdom:
modern and legacy parents/replies, nested wrappers, separate account attribution,
late reply expansion, missing parent content, unfamiliar markup, safe content
links, parent/reply isolation and reversible display restoration. These exercise
the real adapter, rule/policy functions and UI helpers, but do not run the
extension controller or Chrome. No live-site support claim follows from them.

Dependency versions are recorded in `package-lock.json`. CI now installs from
that lockfile with `npm ci --ignore-scripts` and checks core types explicitly.
jsdom is a development dependency only, selected for compatibility with the
declared Node 22.16 minimum. No new permissions, storage or network path is
added to the extension. The reply-chain detector remains inert, and relationship
fields remain unset pending live-browser verification.

## Verification

On Node 26.8.2 / npm 11.19.1, with WXT 0.21.4 / TypeScript 7.0.2:

| Command | Result |
|---|---|
| `npm test` | 92 tests pass (54 original, 9 adapter DOM, 15 controller DOM, 14 settings/storage regressions) |
| `npm run typecheck:core` | Pass |
| `npm run typecheck` | Pass using real WXT-generated types |
| `npm run build` | Pass; Chrome MV3 artifact in `.output/chrome-mv3` |
| `npm run build:all` | Pass; Chrome MV3, Firefox MV2 and Edge MV3 artifacts |
| `npm run investigate:fixture` | Pass on bundled synthetic data |

The Firefox build emits WXT warnings for missing add-on ID and
`data_collection_permissions`. Those release items remain unresolved; warnings
were not suppressed. Build success does not confirm installation or store readiness.

Browser CPU/GPU, memory, observer overhead, live selectors, Chrome installation
and popup/controller E2E behavior have not been measured or verified. This report
supersedes older build-unverified statements for this checkout; historical
release notes still describe their original verification environment.

## Next development priorities

1. **Settings browser verification:** mutation races have been addressed in
   source through a single writer (see third implementation below). Test real
   multi-tab delivery, background suspension/restart, unavailable messaging and
   extension reload before claiming browser reliability.
2. **Chrome fixtures and live smoke tests:** cover settings changes, disabled
   surfaces, reveals, imported advisory packs, SPA navigation and infinite scroll.
   Confirm parent/reply boundaries on actual YouTube markup before populating
   `threadId`/`parentId` or recording the demo. Then verify X and Reddit.
3. **Host consent and release readiness:** site toggles currently control
   filtering, while the manifest declares all supported host matches. Implement
   progressive site access, resolve the Firefox manifest warnings, then complete
   accessibility and overhead measurements.
4. **Evaluated detection:** obtain permissioned labels and measure false
   positives before shipping additional detectors or local model inference.

## Second implementation: large-page processing

The controller now consumes lazy adapter iterators in successive tasks, rather
than repeatedly filtering only the first 350 items. Each task inspects at most
350 matched root candidates (including invalid wrappers), with a 25 ms timer
between batches. Mutation bursts request a follow-up pass without continually
resetting the current cursor. New passes still traverse all candidates; this
does not implement an indexed dirty-item cache.

Earlier batches keep their reversible UI. Detached nodes are released, and
previously managed items that stop matching are restored after a complete pass.
Recycled text and profile `href` changes trigger reassessment. If a site moves
an item or removes its placeholder, the controller recreates its reveal control.
Navigation, settings changes and disposal cancel pending batch work. Filtering
waits for saved settings; a newer storage event wins over a late initial read.
YouTube reveal fingerprints now include the validated profile key, so accounts
sharing a display name do not share a reveal decision.

**Evidence scope:** repetition, opt-in deduplication, account campaign gating and
the inspector use only the current batch of up to 350 items. Groups spanning
batch boundaries may be missed; there is no whole-page aggregation claim. The
inspector and collapse explanations state this limit. Each duplicate group in
a batch retains its first copy. Explicit local account hides and independent
content rules apply in every batch, including later comments and video cards.

`tests/controller-dom.test.mjs` contains 15 deterministic synthetic regressions
using the production controller, adapters, policy, MutationObserver and UI, with
simulated extension storage and timers. The original 351-item regression failed
with `350 !== 351` before the fix. Coverage includes 701 comments plus a video
card, invalid candidates, mutation bursts, additions/removals, recycled nodes,
moved items and removed placeholders, reveal isolation and SPA navigation,
disable/re-enable, disposal, later-batch deduplication/account context, observer-loop
avoidance and delayed settings. These are **not Chrome extension E2E tests**.

Extraction/evaluation/render work is bounded by candidate count, not elapsed
time. `querySelectorAll` discovery and complete-pass cleanup still scale with
page size; managed UI and candidate references use page-local memory. Browser
CPU/GPU, memory and latency must still be measured on real pages before setting
a performance budget or asserting support. No runtime dependency, host
permission, persistent data or network path was added.

No commit, push, publication or live-platform action was performed.

## Third implementation: serialized settings actions

The remaining read/replace race was present in both `setBlockedAccount` and
popup saves: two contexts could read the same old settings and replace each
other's account hides or preferences. All settings writes now go through one
background writer in `entrypoints/background.ts`, with validation and queueing
in `src/extension/settings-protocol.ts` and `settings-writer.ts`.

Account actions send hide/unhide intent; popup changes send only the changed
preference or site flag. Each queued action reads current storage and applies
only that intent. Responses acknowledge successful writes, and rejected reads
or writes leave the queue available for later actions. Last processed intent
wins for the same field/account. A full 500-account list rejects an additional
hide explicitly. There is no competing direct-write fallback.

The popup settings controls now live in `src/extension/popup-settings.ts` so the
production UI can be tested separately from CSS and indicator imports. Controls
wait for saved settings, disable only the pending control, synchronize external
storage changes and preserve pending user choices. Newer storage events win over
stale initial or refresh reads. Failed saves restore the persisted control and
show an error. Unhide is an account mutation and cannot replace another tab's
new hide.

`tests/settings-storage.test.mjs` adds 14 synthetic regressions using production
validation, background handler, settings clients, popup controls and (in one
case) the content controller. Transport, sender metadata and storage are
simulated; delayed writes force overlapping operations. Coverage includes:
multiple hides plus unhide/preference/site edits, same-account ordering, platform
isolation, failed reads/writes, background-instance recreation, no fallback,
malformed/foreign messages, queued-intent copying, the list cap, popup
synchronization, stale reads and reversible content hide/unhide propagation.
These tests are not Chrome extension E2E or actual service-worker restart tests.

After this implementation, `npm test` (92 tests), `typecheck:core`, full WXT
`typecheck`, `build:all` and `investigate:fixture` pass. Generated manifests were
inspected: Chrome/Edge MV3 now use `background.js` as a service worker; Firefox
MV2 uses it as a background script. Permissions remain `storage`, host matches
are unchanged, and there is no external-message declaration. Firefox's missing
add-on ID and data-collection manifest warnings remain unresolved.

The writer has no durable operation queue and offers no crash-proof storage
transaction. Pending work can be interrupted by termination/reload; callers
receive errors where messaging reports failure and may retry explicitly. Real
browser messaging, worker lifetime, installation and overhead remain unverified.
No dependency, persistent key, network request, raw-content transfer, enabled
detector, commit or push was added by this implementation.

API references used for the background wiring: [Chrome message responses](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#responses),
[extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
and [WXT background entrypoints](https://wxt.dev/guide/essentials/entrypoints.html).
