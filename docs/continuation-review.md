# Muse continuation review — 2026-10-12

Reviewed the latest helper implementation at `8d8699a455faaa6f3054c8e3cbe51b2f89d569fc`, its changes from `8354334`, and its interaction with the production controller/settings path. The checkout was clean at the start. Baseline: all 111 tests and both TypeScript checks passed. That baseline did not cover several product invariants.

## Confirmed findings and fixes

| Priority | Finding in inherited work | Result |
|---|---|---|
| P1 | `trustReason` matched username suffixes across platforms and accepted bare handles. | Exact `platform:accountKey` match; unknown site context fails open. |
| P1 | Controller deduplication could hide content that policy declared trusted. | Duplicate collapsing respects trust; explicit user account hides still win. |
| P1 | New list mutations kept caller arrays and nested scope objects while waiting in the writer queue. Malformed entries were silently sanitized away. | Strict entry/size validation and defensive copies before queueing. |
| P1 | Default settings import replaced unrelated preferences with imported/default values; malformed envelopes and future versions were accepted. | Default import merges account/mute lists and preserves current preferences/scope overrides; explicit replace-all remains separate. Reject invalid fields, versions and overflow, with a UTF-8 byte limit. |
| P1 | AutoMod exporters flattened required conjunctions into OR keywords, lost alternatives and ignored exclusions; untrusted metadata could inject YAML lines. | Export only supported literal single-group rules, retain alternatives, skip unsupported semantics/scopes, safely encode values/comments. No external action or API call. |
| P2 | Copied-comment analyzer conflated platforms, used unknown original identities and ignored an earlier `observedOrder` appearing later in the array. | Same-platform known accounts, comment-only groups, ordered anchor; evidence describes repeated text rather than asserting copying. |
| P2 | Reply chains counted display names as independent accounts and could use a reply as the parent. | Exactly one observed root, direct parent relationships and distinct known accounts within a platform/thread. |
| P2 | Impersonation ran without a known owner identity and treated ordinary words such as “official” or “giveaway” as solicitation. | Known owner key, same-platform candidate and actual contact/claim evidence required. |
| P2 | Share-card text called every manual/duplicate hide a “scam comment.” | Counts describe locally hidden items without identity or content-type claims. |
| P2 | Reference numbers alone became contact evidence; messenger extraction accepted misleading hostname suffixes. | Phone/email evidence requires solicitation context in filtering; messenger extraction checks host boundaries. |
| P2 | Rule-list parser cast categories, platforms and examples without validating them and kept mutable nested arrays. | Strict schema fields, enums, dates/URLs, counts, UTF-8 size cap, copied arrays and scoped example/matcher checks. |

Nine initial safety regressions failed on the inherited implementation before fixes. Added controller tests verify trusted duplicate visibility, mute propagation and explicit-block precedence. Added popup tests cover overlapping saves, retained drafts, failure/retry, list validation, clearing and synchronization. Rule/export tests cover malicious metadata and unsupported matching semantics.

## Continued functionality

The popup now provides labelled, keyboard-accessible text editors and explicit Save buttons for personal mute words and platform-scoped allowlists. Defaults remain empty. The editors send individual list patches through the existing background writer, retain dirty drafts during external storage events and retain failed-save drafts for retry. They disable only the pending editor. No new permissions, dependencies, storage keys or network path were added.

Creator/pinned/hearted flags are still unset by adapters. Only user allowlists currently supply live trust exemptions. Scope overrides, portability UI and optional analyzer wiring remain incomplete features; no placeholder was connected to the controller.

## Verification

| Check | Result |
|---|---|
| `npm test` | 132 pass, 0 fail; [full output](validation/2026-10-12-continuation/tests.txt) |
| `npm run typecheck:core` | Pass |
| `npm run typecheck` | Pass with generated WXT types |
| `npm run build:all` | Chrome MV3, Firefox MV2 and Edge MV3 pass |
| `npm run investigate:fixture` | Pass on the bundled synthetic fixture |
| `git diff --check` | Pass |

One intermediate suite failure expected the bundled multi-group rule to export a Reddit action. That expectation contradicted the documented requirement to skip unsupported semantics; the test now checks its skipped ID. The [failed output](validation/2026-10-12-continuation/tests-before-export-expectation-update.txt) is preserved.

Generated manifests still declare only `storage` in the permissions array, retain the existing host matches and have no external-message declaration. Chrome/Edge retain the settings service worker; Firefox retains its background script. WXT still warns about Firefox's missing add-on ID and data-collection declaration. Builds do not establish installation, store readiness or live-site behavior.

Exporter references: [Reddit](https://support.reddithelp.com/hc/en-us/articles/52866343172500-Full-automoderator-documentation), [Discord](https://docs.discord.com/developers/resources/auto-moderation), checked 2026-10-12. Export matching remains narrower than AliveInternet's normalized classifier and needs target-platform verification.

## Remaining work, in order

1. Chrome extension fixtures and authorized live YouTube smoke tests: popup/controller messaging, reload and worker restart, SPA navigation, infinite scroll, reversible hides, advisory pack updates and keyboard behavior. Measure actual CPU/memory and scan latency. Synthetic jsdom tests do not establish these results.
2. Progressive optional host permissions and Firefox release metadata. No additional site was marked browser-tested.
3. Permissioned detection evaluation before wiring optional detectors. Reply/owner adapter fields need live verification first.
4. Link and lookalike helpers still use a last-two-label domain approximation, not a Public Suffix List. Correct multipart-suffix behavior before enabling related advisory UI. The brand list remains empty.
5. Rule-list expiration/signature enforcement and provenance, before browser import/subscriptions. Parsing a valid date is not expiration enforcement. Settings portability needs preview/confirmation UI. Neither is activated in this continuation.

No commit, push, publication, extension installation or platform moderation was performed.
