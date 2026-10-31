# Feature groundwork (v0.4 planning)

This catalog includes inert groundwork, implemented pure helpers and partial UI features. The machine-readable status is `src/core/features.ts`; registry flags remain default-off and tests check referenced files. Obfuscation/link decoding already feed the live filter; trust and mute preferences feed policy. The popup now edits empty-by-default mute words and platform-scoped allowlists. Every entry has a v1.0 disposition in the [v1.0 disposition](#v10-disposition-catalog-triage-ticket-11) section. The extension now uses `storage` and `scripting`, required YouTube access and exact optional origins for nine other sites. Optional access is requested only on explicit activation.

**Inert means:** not-yet-implemented analyzers return no evidence and are not called anywhere. No stub throws; unwanted stubs were removed in the v1.0 triage below.
Implemented helpers (`obfuscation.ts`, `trust.ts`, `mute.ts`, `links.ts`,
`scopes.ts`, `explain.ts`, `portability.ts`, `stats.ts`, `review-list.ts`,
`rules/schema.ts`, `rules/export-automod.ts`, `intel/lookalike-domains.ts` and the
seven detectors in `src/detectors/`) have true-positive *and* benign tests in
`tests/features-implemented.test.mjs`. Detectors stay unwired from the controller
until each has a benchmark result. Consent, backup/restore and hidden-review UI are implemented; see [completion evidence](completion-report.md).

**To implement one:** replace the stub, add true-positive *and* benign tests, wire it through `policy.ts` (never hide directly), update `docs/privacy.md` if it stores data, follow CLAUDE.md if it makes a network call, then set its status in `features.ts` and this file.

## v1.0 disposition (catalog triage, ticket 11)

Based on the proposed rules in [v1-scope.md](v1-scope.md), which is still a draft until the maintainer and dataset custodian sign it. If sign-off changes the feature list, update the `v1` field in `src/core/features.ts` and this section together; `tests/features-implemented.test.mjs` checks they agree.

The original catalog had 34 entries. Result: **11 ship, 21 defer, 2 remove**.

### Ship

| Feature (`id`) | Status | Remaining wiring, tests and evaluation |
|---|---|---|
| Chrome Web Store, Firefox Add-ons and Edge listings (`store-publishing`) | scaffolded | Official contact and hosted policy links; native/signed browser checks; maintainer submission (release-readiness tickets). |
| Firefox and Edge build targets (`cross-browser-builds`) | implemented | Verify signed Firefox install and branded Edge execution (browser-validation ticket). Firefox Android stays out of scope. |
| Before/after demo GIF for the README (`demo-media`) | implemented | Maintainer reviews synthetic assets before store submission. |
| Public scam-comment benchmark and leaderboard (`scam-benchmark`) | in-progress | Representative permissioned labels, frozen splits and the v1-scope thresholds. This is evaluation tooling, not an extension feature. |
| Look-alike characters, spaced letters, contact handles (`obfuscation-normalization`) | implemented | Include in the frozen evaluated rule source; browser false-positive spot-checks. |
| Never hide creator, pinned, hearted or allowlisted content (`trusted-content-exemptions`) | implemented | Adapter flags for verified creator/pinned/hearted on YouTube; browser E2E. |
| Personal mute words across all sites (`cross-site-mute-words`) | implemented | Browser E2E and accessibility checks. |
| Export / import settings and blocklists (`settings-portability`) | implemented | Broader browser usability check. |
| Show where a link really goes (offline redirect decoding) (`link-destination-reveal`) | implemented | Offline decoding already feeds the filter. Either wire the destination UI with tests or narrow the claim to filter-only; decide before the audit ticket. |
| "Hidden on this page" review list in the popup (`hidden-items-review`) | implemented | Broader live usability check on YouTube. |
| Lockfile, Dependabot, Scorecard, signed releases (`supply-chain-hardening`) | scaffolded | Scorecard workflow and release attestations (maintainer). |

### Defer

Each stays inert and default-off. `tests/deferred-features.test.mjs` builds the production extension and asserts that no module listed under `files` for these entries is bundled, that their former message types, storage keys and extension APIs are absent, and that the manifest requests only `storage` and `scripting`.

| Feature (`id`) | Status | Reason |
|---|---|---|
| Hidden-item count on the toolbar icon (`toolbar-badge-count`) | in-progress | Needs a new message, background handler and badge API; not in v1 scope. |
| Local monthly stats and shareable card (`shareable-stats-card`) | in-progress | Needs new storage and popup UI; not in v1 scope. |
| Contributor onboarding and issue templates (`hacktoberfest-onboarding`) | scaffolded | Repository process, not product surface. |
| Declarative, subscribable community rule lists (`community-rule-lists`) | in-progress | Import UI, expiry enforcement and benchmark missing; outside the accuracy claim. |
| Per-language rule packs (`language-rule-packs`) | scaffolded | English-only claim (v1-scope decision 4). |
| Scam testimonial reply chains (`reply-chain-detection`) | in-progress | Unwired until adapter fields are live-verified and benchmarked. |
| Creator impersonation in comments (`creator-impersonation`) | in-progress | Unwired until adapters supply owner keys and a benchmark exists. |
| Stolen / copied comments (`copied-comment-detection`) | in-progress | Unwired until benchmarked. |
| "Check my profile" bait (`profile-bait-detection`) | in-progress | Unwired until benchmarked. |
| Opt-in "generic filler comment" preference filter (`generic-filler-preference`) | in-progress | Unwired preference filter; needs popup toggle and labelling review. |
| Small on-device classifier / embedding clustering (`local-classifier`) | scaffolded | Blocked on benchmark data; weights need consent, pinning and licence review (M3, post-1.0). |
| Look-alike brand domains (`lookalike-domains`) | in-progress | Brand list is empty until verified entry by entry. |
| Fake verification badges in display names (`fake-verification-badges`) | in-progress | Needs verified genuine-badge data from adapters and a benchmark. |
| YouTube live chat and Twitch chat (`live-chat-filtering`) | scaffolded | Out of v1 surface scope (v1-scope decision 2). |
| Fake crypto-giveaway livestreams in feeds (`fake-giveaway-streams`) | in-progress | Unwired until benchmarked. |
| Export rules to Reddit AutoModerator / Discord AutoMod (`automod-export`) | implemented | Non-claim extra (v1-scope); exporter unwired. |
| Reusable detection core npm package (`npm-core-package`) | implemented | v1-scope decision 9: do not publish at 1.0; local tarball checks stay. |
| Right-click "Check this comment" (`check-this-comment`) | in-progress | Needs contextMenus permission review and a new message; not in v1 scope. |
| Per-channel / per-community filtering strength (`per-channel-strictness`) | in-progress | Needs verified page-owner data. The scopeOverrides setting was removed so no storage key exists. |
| Translated extension interface (`ui-localization`) | scaffolded | English-only claim; i18n wiring would change the manifest. |
| "Scam pattern of the week" public changelog (`scam-pattern-changelog`) | scaffolded | Content process tied to rule-list releases, not product surface. |

### Remove

| Feature (`id`) | What was removed | Reason |
|---|---|---|
| "Report a miss / wrongly hidden" drafts (`report-feedback`) | `src/feedback/report.ts` (throwing stubs with a placeholder repository) and its tests | No plan before M4. The GitHub issue templates stay and are used manually; any future flow starts from a fresh design with a privacy review. |
| Creator mode (`creator-mode`) | `src/creator/review.ts` (types and a throwing stub) | No plan in v1 scope; it would need a new adapter surface. |

Also removed: the inactive `PageStatsMessage` and `CheckItemRequest` message types in `src/extension/messages.ts`, the `scopeOverrides` setting (storage, settings protocol and backup preview), and the `NotImplementedError` marker class, since no stub throws it any more. Backups exported by earlier builds are unaffected unless they contain `scopeOverrides`, which no UI could set; such a file is now rejected as having unknown fields.

## Distribution

| Feature | Groundwork | Next step | Owner |
|---|---|---|---|
| Store listings (Chrome, Firefox, Edge) | `docs/store-listing.md` | Stable ID, progressive permissions and icons implemented; screenshots, policy review and submission pending | maintainer |
| Firefox and Edge builds | `build:firefox`, `build:edge`, `zip:*`, `dev:firefox` scripts; CI builds all three | Smoke-test Firefox desktop/Android and Edge | Codex |
| Before/after demo GIF | `docs/media/README.md`, README placeholder | Record after the YouTube replies fix | maintainer |
| Toolbar badge count | `src/core/stats.ts` (`PageTally`) | Post-1.0: re-add a page-stats message, background handler and `action.setBadgeText` | Codex |
| Shareable stats card | `src/core/stats.ts` (`MonthlyStats`, `ShareCardData`) | Persist counts only, reset control, render card | Codex |
| Hacktoberfest onboarding | `.github/ISSUE_TEMPLATE/*`, `PULL_REQUEST_TEMPLATE.md`, `docs/good-first-issues.md` | Push to GitHub, add topic, open issues | maintainer |

## Community

| Feature | Groundwork | Next step | Owner |
|---|---|---|---|
| Community rule lists | Strict parser/matcher with example self-tests in `src/rules/schema.ts` | Local import UI, expiration enforcement before use, benchmark | Claude |
| Public scam benchmark | `src/research/dataset.ts`, `src/research/benchmark.ts`, `benchmark/`, offline `npm run benchmark` | Runner implemented; representative permissioned labels and independent evaluation remain | Claude |
| Language rule packs | `rules/<locale>/` convention, `Rule.locale` | Native-speaker packs with benign examples | Qwen + contributors |

## Detection (optional analyzers stay unwired; normalization helpers feed existing rules)

| Feature | Groundwork | Prerequisite | Owner |
|---|---|---|---|
| Scam reply chains | `reply-chain.ts`, `ContentItem.threadId/parentId` | Live-verify YouTube reply extraction (synthetic DOM tests pass) and fill thread ids | Claude (+ Codex adapters) |
| Creator impersonation | `impersonation.ts`, `src/core/page-context.ts` | Adapters provide owner name/key; `foldConfusables` | Claude |
| Copied comments | `copied-comment.ts`, `ContentItem.observedOrder` | Adapters fill `observedOrder` | Claude |
| "Check my profile" bait | `profile-bait.ts` | Rules + benign "link in bio" cases | Claude |
| Obfuscation handling | `src/core/obfuscation.ts` | None; good first issues | Claude / contributors |
| Generic filler preference | `generic-filler.ts` | Must be labelled a preference, never AI/bot detection | Claude |
| On-device classifier | `src/ml/local-classifier.ts`, existing `ModelAssetConfig` | Benchmark dataset; weight consent + hash pinning | Claude |

New analyzer categories were added to `AnalyzerCategory` in `src/core/analyzer-ports.ts`.

## Trust

| Feature | Groundwork | Next step | Owner |
|---|---|---|---|
| Never hide creator / pinned / hearted / allowlisted | Policy + exact platform/account allowlist + popup editor; dedup respects trust | Adapters fill verified creator flags; browser E2E | Claude (+ Codex adapters) |
| Cross-site mute words | Matcher, labelled policy, persisted list and popup editor | Browser E2E and accessibility | Claude (+ Codex UI) |
| Settings / blocklist export-import | Strict import helper and `src/extension/popup-portability.ts`; default list merge preserves current preferences | Implemented: bounded download, preview, cancel, serialized merge and confirmed replacement; browser fixture coverage | Codex |

`Settings` stores `mutedWords` and `allowedAccounts`, both enforced and editable in the popup. The per-channel `scopeOverrides` setting was removed for v1.0 and returns only with verified page-owner context and UI.

## Batch 2 (added 2026-10-12)

| Feature | Group | Groundwork | Next step | Owner |
|---|---|---|---|---|
| Show where a link really goes | detection | `src/core/links.ts` | Offline decoding and strict bundled ICANN/private-suffix boundaries implemented; unknown/ambiguous hosts fail open; UI remains unwired | Claude |
| Look-alike brand domains | detection | `src/intel/lookalike-domains.ts` | Verified brand-domain list (empty until verified); confusables + edit distance | Claude |
| Fake verification badges | detection | `src/detectors/fake-badge.ts` | ✔️/☑️/✓ imitation in display names, with benign cases | Claude |
| YouTube live chat + Twitch | detection | `src/core/live-chat.ts` (`ChatMessage`, `ChatBudget`); Twitch is now a registered platform (`src/adapters/platforms/twitch.ts`, default off, provisional selectors) | live_chat iframe content script; verify Twitch selectors in a real browser; apply budget | Codex |
| Fake giveaway livestreams | detection | `src/detectors/giveaway-stream.ts` | Title + channel impersonation rules on video cards | Claude |
| AutoModerator / Discord AutoMod export | community | `src/rules/export-automod.ts`, `docs/automod-export.md` | Copy-paste config only; verify platform limits in official docs | Claude |
| npm core package | community | `src/lib.ts`, `docs/npm-package.md` | Implemented local standalone ESM package, declarations, licenses and actual-tarball consumer checks; npm publication pending | Codex |
| "Hidden on this page" review list | trust | `src/core/review-list.ts`, `HiddenItemsRequest` in `messages.ts`, `src/extension/popup-review.ts` | Implemented explicit current-tab popup list and temporary reveal with stale-document protection | Codex |
| Right-click "Check this comment" | trust | `src/core/explain.ts` | Post-1.0: `contextMenus` permission, background entrypoint and message (permission review) | Claude |
| Per-channel strictness | trust | `src/core/scopes.ts` | Overrides keyed by page owner, never by topic/audience; the `scopeOverrides` setting was removed for v1.0 | Claude |
| Translated interface | distribution | `locales/` (staged outside `public/` so the manifest is unchanged) | Move to `public/_locales`, set `default_locale`, wire `browser.i18n` | Codex |
| Supply-chain hardening | trust | `docs/supply-chain.md`, `.github/dependabot.yml`, `SECURITY.md` | Lockfile, `npm ci`, Scorecard, release attestations | maintainer |
| Scam pattern of the week | distribution | `docs/scam-patterns/` | Entry per rule-list release; short-form video content | maintainer |

New analyzer categories: `fake-badge`, `fake-giveaway`, `lookalike-domain`, `deceptive-link`.

## Network and storage review needed before shipping

| Feature | Network | Storage |
|---|---|---|
| Rule list subscriptions | Fetch list URL (v2 only) | List contents, last-fetched time |
| On-device classifier | Optional one-time weight download | Cached weights |
| Stats card | None | Monthly counts only |
| Trust / mute | None | Allowlist, mute words |
| Per-channel strictness | None | Channel override list |
| Check this comment | None (adds `contextMenus` permission) | None |
| npm package publishing | CI publish to npm | None |
