# Privacy and threat model (v0.2)

## Local data flow

ThreadSieve reads *currently rendered* post/comment text, author display names, profile link URLs, and content links in memory when a supported site is enabled. Rule assessments and short-lived page-local account campaign counts are ephemeral. No comment bodies, post texts, viewing histories, or classification histories are persisted or transmitted.

`browser.storage.local` stores filtering preferences and **user-selected** local account block identifiers of the form `platform:profileKey`. It does not make server-side blocks. These IDs should be considered potentially sensitive browsing preferences; don't sync or publish them without consent. Clear site data or unhide individual entries via the popup.

The opt-in Node `embedding:poc` downloads public model weights and runs on synthetic examples, not user feed data. The browser extension has no model downloads today.

## Attack surfaces

- **Untrusted text/markup:** Read `textContent`, construct DOM elements, never insert untrusted `innerHTML` or execute code from content.
- **Profile confusion:** Accept keys only from platform profile URLs, not display names or off-site links. Handles can change.
- **Selector churn:** Changes to social websites can cause missed items or misattribution. Default-disable experimental platforms, test with actual page fixtures, prefer failure to detect over aggressive hiding.
- **False positives:** Multiple independent high-evidence spam signals are required for automatic collapses. Decisions are reversible and uncalibrated. Do not classify accounts as verified bots.
- **Browser privileges:** The MV3 content-script declaration requests access to multiple named social host patterns (potential install warnings). Avoid broad wildcard all-site access, cookies, browsing-history APIs, external API calls, and remote executable scripts.
- **Concurrent tabs/settings:** Existing settings storage uses read-modify-write and is not a transactional blocklist database; concurrent blocks from multiple tabs need conflict-resistant persistence before release.
- **Performance:** MutationObserver work, large comment threads, and future embeddings must be throttled, bounded, and benchmarked.

## Production expansion criteria

Consent for any model weights and updates, model-license review, WebGPU CPU/GPU budgets, platform-policy review, inspectable source and dependency SBOM, user-visible data deletion controls, and real-browser regression tests.
