# Feature groundwork (v0.4 planning)

This catalog includes inert groundwork, implemented pure helpers and partial UI features. The machine-readable status is `src/core/features.ts`; registry flags remain default-off and tests check referenced files. Obfuscation/link decoding already feed the live filter; trust and mute preferences feed policy. The popup now edits empty-by-default mute words and platform-scoped allowlists. The extension now uses `storage` and `scripting`, required YouTube access and exact optional origins for nine other sites. Optional access is requested only on explicit activation.

**Inert means:** not-yet-implemented analyzers return no evidence, and unimplemented
entry points throw `NotImplementedError` and are not called anywhere.
Implemented helpers (`obfuscation.ts`, `trust.ts`, `mute.ts`, `links.ts`,
`scopes.ts`, `explain.ts`, `portability.ts`, `stats.ts`, `review-list.ts`,
`rules/schema.ts`, `rules/export-automod.ts`, `intel/lookalike-domains.ts` and the
seven detectors in `src/detectors/`) have true-positive *and* benign tests in
`tests/features-implemented.test.mjs`. Detectors stay unwired from the controller
until each has a benchmark result. Consent, backup/restore and hidden-review UI are implemented; see [completion evidence](completion-report.md).

**To implement one:** replace the stub, add true-positive *and* benign tests, wire it through `policy.ts` (never hide directly), update `docs/privacy.md` if it stores data, follow CLAUDE.md if it makes a network call, then set its status in `features.ts` and this file.

## Distribution

| Feature | Groundwork | Next step | Owner |
|---|---|---|---|
| Store listings (Chrome, Firefox, Edge) | `docs/store-listing.md` | Stable ID, progressive permissions and icons implemented; screenshots, policy review and submission pending | maintainer |
| Firefox and Edge builds | `build:firefox`, `build:edge`, `zip:*`, `dev:firefox` scripts; CI builds all three | Smoke-test Firefox desktop/Android and Edge | Codex |
| Before/after demo GIF | `docs/media/README.md`, README placeholder | Record after the YouTube replies fix | maintainer |
| Toolbar badge count | `src/core/stats.ts` (`PageTally`), `src/extension/messages.ts` | Add stats handling to the settings-only background + `action.setBadgeText` | Codex |
| Shareable stats card | `src/core/stats.ts` (`MonthlyStats`, `ShareCardData`) | Persist counts only, reset control, render card | Codex |
| Hacktoberfest onboarding | `.github/ISSUE_TEMPLATE/*`, `PULL_REQUEST_TEMPLATE.md`, `docs/good-first-issues.md` | Push to GitHub, add topic, open issues | maintainer |

## Community

| Feature | Groundwork | Next step | Owner |
|---|---|---|---|
| Community rule lists | Strict parser/matcher with example self-tests in `src/rules/schema.ts` | Local import UI, expiration enforcement before use, benchmark | Claude |
| Report a miss / wrongly hidden | `src/feedback/report.ts`, issue templates | Redaction + preview; open prefilled issue on click | Claude |
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
| Creator mode | `src/creator/review.ts` | Review panel with jump links; no moderation API | Claude |

`Settings` stores `mutedWords`, `allowedAccounts` and `scopeOverrides`. The first two are enforced and editable in the popup. Scope overrides remain unused until adapters provide verified page-owner context; no scope UI is active.

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
| "Hidden on this page" review list | trust | `src/core/review-list.ts`, `HiddenItemsRequest` in `messages.ts`, `src/extension/popup-review.ts` | Implemented explicit current-tab popup list and temporary reveal with stale-document protection; report flow pending | Codex |
| Right-click "Check this comment" | trust | `src/core/explain.ts`, `CheckItemRequest` in `messages.ts` | `contextMenus` permission + background entrypoint (permission review) | Claude |
| Per-channel strictness | trust | `src/core/scopes.ts` | Overrides keyed by page owner, never by topic/audience | Claude |
| Translated interface | distribution | `locales/` (staged outside `public/` so the manifest is unchanged) | Move to `public/_locales`, set `default_locale`, wire `browser.i18n` | Codex |
| Supply-chain hardening | trust | `docs/supply-chain.md`, `.github/dependabot.yml`, `SECURITY.md` | Lockfile, `npm ci`, Scorecard, release attestations | maintainer |
| Scam pattern of the week | distribution | `docs/scam-patterns/` | Entry per rule-list release; short-form video content | maintainer |

New analyzer categories: `fake-badge`, `fake-giveaway`, `lookalike-domain`, `deceptive-link`.

## Network and storage review needed before shipping

| Feature | Network | Storage |
|---|---|---|
| Rule list subscriptions | Fetch list URL (v2 only) | List contents, last-fetched time |
| Report a miss | User opens a github.com URL with a redacted draft | None |
| On-device classifier | Optional one-time weight download | Cached weights |
| Stats card | None | Monthly counts only |
| Trust / mute | None | Allowlist, mute words |
| Per-channel strictness | None | Channel override list |
| Check this comment | None (adds `contextMenus` permission) | None |
| npm package publishing | CI publish to npm | None |
