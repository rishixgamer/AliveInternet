# AliveInternet v0.4.0 — experimental, YouTube-only, unlisted beta

**Read this first.** This is an experimental beta for collecting real-world false-positive and miss reports. It is not a recommendation to rely on it.

- **YouTube only.** Required host access is `youtube.com` only. Other platform adapters are experimental, off by default, and not part of this beta.
- **No representative accuracy evidence.** The only labelled evaluation is a historical, licensed YouTube corpus. On that fixed test split the extension's collapse rules caught **0 of 810** labelled spam comments (recall 0/810) with 0 of 903 legitimate comments hidden. That shows the rules do not match that corpus; it does not establish safety or accuracy on today's feeds.
- **Heuristics are not bot detection.** Scores are not probabilities, and nothing here identifies bots, accounts, locations or identities.
- **Reversible and local.** Every hide can be undone. No telemetry, backend or comment upload.

## Help us find mistakes

Use the in-extension report flow (redacted "wrongly hidden / missed" report) when a comment is hidden that should not be, or spam slips through. The report is redacted locally and opens a prefilled GitHub issue only after you click; nothing is sent automatically.

## Artifacts and verification

Built in CI from the tagged commit: Chrome, Firefox and Edge ZIPs, a source ZIP, a CycloneDX SBOM (`aliveinternet-sbom.cdx.json`) and `SHA256SUMS`. Verify with `sha256sum -c SHA256SUMS`.

Distribution: Chrome unlisted, Edge hidden, Firefox unlisted self-distributed signed XPI. Store review status is not asserted by these notes.
