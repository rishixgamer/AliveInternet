# AliveInternet privacy and threat model (v0.3 alpha)

## Browser extension

- Parses **currently rendered** enabled-platform content and links in memory. No off-page private social graph collection, private messages, session token access, IP address extraction or location inference.
- Persists `settings` (preferences + explicit per-platform user account hides, personal mute words, and allowlisted accounts) and a **user-uploaded** public-indicator JSON pack when explicitly imported. Does not persist raw posts, comments, observed account histories, browsing sessions, or network graphs. `browser.storage.local` is not encrypted; profile hides are potentially sensitive personal preference data.
- Explicit settings actions pass through one local background writer, which validates and serializes account and preference mutations. It receives only changed preferences or a platform/profile identifier, never page text. No extra persistent key or network path is introduced.
- Mute-word and allowlist popup editors require explicit saves. Drafts stay in popup memory; saved allowlists match exact platform/profile IDs and exempt automatic rule and duplicate hides. Explicit account hides still win. These preferences are not evidence of spam or bot identity.
- No automatic external HTTP requests, analytics, telemetry, comment uploads, or AI weight downloads. The one user-initiated exception is the report flow below, which only opens a browser tab after an explicit click. Manual source code scripts that query internet services are separate and are never invoked by browser content scripts.
- Imported indicator matches produce explainable *advisory labels* when the user opts in. They never trigger automatic collapse or account-level blocks. Publishers/URLs in imported packs are self-declared, not independently authenticated.
- Local rule-based collapse is conservative; user can **Show temporarily**. User-selected account hides remain visible in a removable popup list. Optional deduplication preserves the first long comment; may still suppress legitimate repeated speech, so default is off.

## Explicit review and portability

- Hidden-item review runs only when the user clicks Refresh. The popup requests the active tab's managed hidden items, 50 per page, with excerpts capped at 160 characters. Page text stays in page/popup memory and is neither sent to the background writer nor persisted. Only the extension's popup document may request/reveal these items. Document-specific IDs and content fingerprints reject stale/recycled nodes.
- Settings export downloads local preference/account-list JSON. The backup contains sensitive user preferences and host-selection preferences, but no browser permission grants, raw comments or advisory pack. Imports are UTF-8 size bounded, strictly validated and previewed before an explicit confirmation. Default merge preserves preferences; full replacement rejects stale previews. Importing a site's enabled preference alone never grants browser access.
- Indicator imports are bounded to 100,000 encoded UTF-8 bytes, strictly restrict fields and credential-free HTTPS provenance URLs, and retain the prior pack on failure. They are stored in one local key and do not toggle advisory opt-in, fetch provenance URLs, authenticate the publisher or hide matched content. Advisory storage changes cannot resurrect a removed pack through a stale initial read.

## Report a miss / wrongly hidden (network review, ticket 13)

Implemented in `src/feedback/report.ts` (pure draft building, redaction and URL bounding) and `src/extension/popup-report.ts` (preview). Required by CLAUDE.md for any feature that can cause network traffic.

**Exact data transmitted** (only after the click below), as query parameters of `https://github.com/rishixgamer/AliveInternet/issues/new`:

| Parameter | Content |
|---|---|
| `template` | `false-positive.yml` or `missed-spam.yml` |
| `platform` | Site label, e.g. YouTube |
| `text` | The item's text after redaction, plus a `Links (hostnames only): ...` line, capped at 1,000 characters and edited by the user |
| `reason` | Wrongly-hidden reports only: the on-screen reason, redacted, capped at 200 characters |
| `mode` | Wrongly-hidden reports only: Conservative, Balanced or Aggressive |
| `version` | Extension version, `x.y.z` format only |

Never included: account keys, usernames, display names, profile URLs, `@mentions`, emails, phone numbers, page URLs, link paths or queries (links become `[link: hostname]`), timestamps, tab or browsing information, settings, lists or other items. Redaction is pattern-based and best effort: it removes the identifier classes above and the item's own author and account key wherever they occur in the text, and it re-runs on whatever the user edits and on any draft the popup receives from a page. It cannot recognise names written in prose, and a distinctive quote can lead a searcher back to its public author, so the preview warns the user and lets them edit or delete everything.

**Control and consent.** The wrongly-hidden button on a collapsed item and the popup list's "Report wrongly hidden" only build an in-memory draft. "Report a miss" on visible comments is an off-by-default preference (`showReportControls`). The draft is shown in the popup (never inside the page, so page scripts cannot read edits). Only the click on "Open GitHub issue draft" calls `tabs.create` with the URL; cancel, close, navigation or a new draft discard it. The user must still press Submit on GitHub. Consent copy shown in the popup: "Nothing is sent until you press the button below. It then opens a prefilled GitHub issue in a new tab (a public post under your GitHub account) that you still have to submit yourself. Nothing is stored by AliveInternet."

**Transport.** The extension makes no `fetch`/XHR request, adds no permission (`tabs.create` needs none) and no host access to github.com. The user's browser navigates to the URL, so GitHub receives the address (including the draft) the moment the tab opens, before anything is submitted, and your GitHub account if you are signed in.

**Storage.** None. Drafts live in content-script or popup memory only; the Chromium fixture asserts nothing appears in `chrome.storage`.

**Abuse controls.** No automatic or batched submission and no API token, so every report needs a human to submit it on GitHub; one staged draft at a time, consumed when read; text cap 1,000 characters and URL cap 6,000 characters (truncated on a code-point boundary, never mid-escape); only this extension's popup may request a draft; GitHub's own rate limits and issue templates apply.

**Provider terms.** Submitted issues are public and governed by GitHub's Terms of Service and Privacy Statement. A maintainer should re-read them before release; they were not independently checked when this feature was written.

**Open store-policy question (unverified).** The ticket asks whether this counts as data transmission under Firefox's `data_collection_permissions` (currently `none`) and Chrome Web Store Limited Use. The policy pages could not be fetched when this was implemented, so no classification is claimed and the manifest is unchanged. Before submission the maintainer must read Mozilla's data-consent documentation and the Chrome Web Store User Data FAQ, decide whether a user-previewed, user-initiated tab to a third-party site counts, and if so update `wxt.config.ts` and the store privacy disclosures together. The privacy policy now discloses the flow either way.

## OSINT limitations

- Public RDAP data may expose registrant contact information; the manual CLI intentionally outputs only registration events, status and nameservers. Metadata does not establish a bot account's location, operator, or maliciousness.
- `src/intel/ports.ts` specifies explicit consent boundaries for proposed public-intelligence services. No third-party intelligence integration is active in the extension.
- Campaign-level reported origins must retain source and uncertainty and never become individual account risk or geographic proximity scores. The Global South is not an appropriate bot-classification target.
- Shared URL or account graph relationships are candidate observations, not proof of ownership, collusion, operator identity or automation.

## Attack surfaces and security tasks

- Untrusted page text is processed with `textContent` and safely constructed DOM nodes; no injected `innerHTML`, script execution or remote MV3 code.
- Page/profile link parsing is platform scoped; changes to site DOM risk misattribution. Abort and fail open on unknown layouts; no arbitrary broad page-body hiding.
- Pack parser strictly restricts fields, indicator count, lengths, HTTPS evidence URLs, hostname format and recognized sites; packs remain **untrusted** and a malicious user-installed pack could still produce false warnings.
- False positives and coordination misinterpretation can chill legitimate speech. Prefer missing ambiguous spam to hiding legitimate content.
- Large DOM scans, quadratic local near-duplicate comparisons, and future on-device embeddings require performance limits and device testing.
- Live extraction/evaluation runs in batches of at most 350 candidate roots, retaining earlier reversible UI. Repetition/account evidence is limited to that batch; groups across boundaries may be missed. Synthetic Chromium large-feed and idle measurements are recorded in completion-report.md; page-wide discovery and cleanup still require real-device overhead measurements. No content is persisted by this scheduler.
- Required host access is limited to exact HTTPS YouTube origins. Nine other sites use exact optional host permissions and dynamic content-script registration after explicit browser consent plus an enabled preference. Imports never request access; disabling optional sites removes their grants, and revocation stops filtering/restores UI. Existing tabs need a reload after first consent. `scripting` is used only to register the packaged local content bundle.
- Settings mutation races have source regressions and production Chromium fixture coverage for multi-tab delivery, concurrent writes and forced MV3 worker restart. Pending operations are not a durable queue or crash-proof transaction; native permission prompts and other browsers still require manual verification.

## Planned features with privacy impact (scaffolded, not active)

See [feature-groundwork.md](feature-groundwork.md). The following future paths remain inactive; implemented trust/mute, hidden review and portability are described above.

- **Stats card / badge:** would store monthly *counts* only, never text, account ids or URLs; needs a reset control.
- **Community rule list subscriptions:** would fetch a list URL; require pinned publisher keys, expiry, opt-in, and a CLAUDE.md network review.
- **On-device classifier:** optional weight download with consent, hash pinning and licence review.
- **Link destination reveal / look-alike domains:** decoded and compared locally; shorteners are never expanded over the network.
- **Right-click check:** would add the `contextMenus` permission; no data leaves the browser.
- **Per-channel strictness:** would store channel override ids locally.
- **Live chat:** would add a content-script match for the YouTube live-chat frame and Twitch; same local-only processing.

## Prior to release

Dependency audit/SBOM, browser-specific selector fixture tests, consent and deletion UX, accessibility, platform terms review, better account allowlist, exact model licensing verification, reproducible evaluation on permissioned labels, geographic bias audit without geography-based classifier signals, signed community-list validation and code review.
