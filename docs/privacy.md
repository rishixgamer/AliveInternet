# AliveInternet privacy and threat model (v0.3 alpha)

## Browser extension

- Parses **currently rendered** enabled-platform content and links in memory. No off-page private social graph collection, private messages, session token access, IP address extraction or location inference.
- Persists `settings` (preferences + explicit per-platform user account hides) and a **user-uploaded** public-indicator JSON pack when explicitly imported. Does not persist raw posts, comments, observed account histories, browsing sessions, or network graphs. `browser.storage.local` is not encrypted; profile hides are potentially sensitive personal preference data.
- No automatic external HTTP requests, analytics, telemetry, comment uploads, or AI weight downloads. Manual source code scripts that query internet services are separate and are never invoked by browser content scripts.
- Imported indicator matches produce explainable *advisory labels* when the user opts in. They never trigger automatic collapse or account-level blocks. Publishers/URLs in imported packs are self-declared, not independently authenticated.
- Local rule-based collapse is conservative; user can **Show temporarily**. User-selected account hides remain visible in a removable popup list. Optional deduplication preserves the first long comment; may still suppress legitimate repeated speech, so default is off.

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
- Manifest presently declares multiple named content-script host patterns. Before public release, implement opt-in site permissions and browser store policy compliance.
- Storage update races across tabs and browser E2E regressions remain unaddressed release blockers.

## Planned features with privacy impact (scaffolded, not active)

See [feature-groundwork.md](feature-groundwork.md). None of these store or transmit anything today.

- **Stats card / badge:** would store monthly *counts* only, never text, account ids or URLs; needs a reset control.
- **Report a miss / wrongly hidden:** user-reviewed, redacted GitHub issue draft opened only on explicit click; no usernames, profile links or page URLs.
- **Community rule list subscriptions:** would fetch a list URL; require pinned publisher keys, expiry, opt-in, and a CLAUDE.md network review.
- **Allowlist and mute words:** would store user-entered accounts/words locally, like the blocklist.
- **On-device classifier:** optional weight download with consent, hash pinning and licence review.
- **Link destination reveal / look-alike domains:** decoded and compared locally; shorteners are never expanded over the network.
- **Hidden-items review list:** ephemeral, current page only, never stored.
- **Right-click check:** would add the `contextMenus` permission; no data leaves the browser.
- **Per-channel strictness:** would store channel override ids locally.
- **Live chat:** would add a content-script match for the YouTube live-chat frame and Twitch; same local-only processing.

## Prior to release

Dependency audit/SBOM, browser-specific selector fixture tests, consent and deletion UX, accessibility, platform terms review, better account allowlist, exact model licensing verification, reproducible evaluation on permissioned labels, geographic bias audit without geography-based classifier signals, signed community-list validation and code review.
