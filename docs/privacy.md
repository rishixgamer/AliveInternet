# AliveInternet privacy and threat model (v0.3 alpha)

## Browser extension

- Parses **currently rendered** enabled-platform content and links in memory. No off-page private social graph collection, private messages, session token access, IP address extraction or location inference.
- Persists `settings` (preferences + explicit per-platform user account hides, personal mute words, allowlisted accounts and per-channel scope overrides) and a **user-uploaded** public-indicator JSON pack when explicitly imported. Two separate UI keys store the theme (`uiTheme`) and tour completion (`uiOnboardingComplete`); they contain no page content. Does not persist raw posts, comments, observed account histories, browsing sessions, or network graphs. `browser.storage.local` is not encrypted; profile hides are potentially sensitive personal preference data.
- Explicit settings actions pass through one local background writer, which validates and serializes account and preference mutations. It receives only changed preferences or a platform/profile identifier, never page text. The interface metadata keys are separate from filtering settings; they add no network path.
- Mute-word and allowlist Settings editors require explicit saves. Drafts stay in the settings tab’s memory; saved allowlists match exact platform/profile IDs and exempt automatic rule and duplicate hides. Explicit account hides still win. These preferences are not evidence of spam or bot identity.
- No automatic external HTTP requests, analytics, telemetry, comment uploads, or AI weight downloads. Manual source code scripts that query internet services are separate and are never invoked by browser content scripts.
- Imported indicator matches produce explainable *advisory labels* when the user opts in. They never trigger automatic collapse or account-level blocks. Publishers/URLs in imported packs are self-declared, not independently authenticated.
- Local rule-based collapse is conservative; user can **Show temporarily**. User-selected account hides remain visible in a removable Settings list. Optional deduplication preserves the first long comment; may still suppress legitimate repeated speech, so default is off.

## Explicit review and portability

- Hidden-item review runs only when the user opens Review or refreshes its list. Count-only status reads on popup open/refresh contain no excerpts; incomplete startup status gets bounded retries. The popup reads the current tab address only when the browser exposes it and never saves it. Explicit review requests the displayed tab's managed hidden items, 50 per page, with excerpts capped at 160 characters. Page text stays in page/popup memory and is neither sent to the background writer nor persisted. Only the extension's popup document may request/reveal these items. Document-specific IDs and content fingerprints reject stale/recycled nodes.
- Settings export downloads local preference/account-list JSON. The backup contains sensitive user preferences and host-selection preferences, but no browser permission grants, raw comments or advisory pack. Imports are UTF-8 size bounded, strictly validated and previewed before an explicit confirmation. Default merge preserves preferences; full replacement rejects stale previews. Importing a site's enabled preference alone never grants browser access.
- Indicator imports are bounded to 100,000 encoded UTF-8 bytes, strictly restrict fields and credential-free HTTPS provenance URLs, and retain the prior pack on failure. They are stored in one local key and do not toggle advisory opt-in, fetch provenance URLs, authenticate the publisher or hide matched content. Advisory storage changes cannot resurrect a removed pack through a stale initial read.

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
- **Report a miss / wrongly hidden:** user-reviewed, redacted GitHub issue draft opened only on explicit click; no usernames, profile links or page URLs.
- **Community rule list subscriptions:** would fetch a list URL; require pinned publisher keys, expiry, opt-in, and a CLAUDE.md network review.
- **On-device classifier:** optional weight download with consent, hash pinning and licence review.
- **Link destination reveal / look-alike domains:** decoded and compared locally; shorteners are never expanded over the network.
- **Right-click check:** would add the `contextMenus` permission; no data leaves the browser.
- **Per-channel strictness:** would store channel override ids locally.
- **Live chat:** would add a content-script match for the YouTube live-chat frame and Twitch; same local-only processing.

## Prior to release

Dependency audit/SBOM, browser-specific selector fixture tests, consent and deletion UX, accessibility, platform terms review, better account allowlist, exact model licensing verification, reproducible evaluation on permissioned labels, geographic bias audit without geography-based classifier signals, signed community-list validation and code review.
