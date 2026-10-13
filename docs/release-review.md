# Alpha release review — October 12, 2026

For current evidence and unresolved conditions, see [October 13 release readiness](release-readiness.md). The approved source and privacy policy are now public and verified; branded Chrome/Edge checks and repeated Mac benchmarks have completed. Signed Firefox, privacy mailbox delivery and store publisher ownership remain unverified. The licensed historical-label evaluation found zero collapse recall.

Local release engineering is ready for maintainer review. Store approval, publisher ownership and representative detection accuracy remain unverified. No store/npm submission is authorized by this continuation.

## Policy findings

Chrome requires disclosure of local data handling and a public privacy policy even when information stays on the device. The earlier draft's “no data collected” sentence concealed processing of website content and stored profile preferences. The listing now distinguishes local handling from transfer; [the user-facing policy](privacy-policy.md) records storage, retention, exports and deletion. The maintainer must host it and supply a contact. This is a source review, not a store compliance determination. [Chrome user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

The current manifest requests `storage`, `scripting`, exact required YouTube HTTPS hosts and exact optional hosts for experimental adapters. Registration uses packaged code; rules/packs do not execute imported scripts. This matches the project's narrow-access design. The policy and privacy dashboard answers must still be checked against the submitted artifact. [Chrome policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [Mozilla add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/), [Edge developer policies](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies).

The generated media uses the actual production extension on clearly labelled synthetic pages. Four screenshots are 1280×800; the promo tile is 440×280. They demonstrate reversible filtering, not live-site effectiveness. These dimensions follow Chrome's listing requirements. [Chrome listing assets](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

Firefox temporary/unsigned testing differs from a signed end-user install. The stable project ID and no-transmission declaration do not establish Firefox or Android execution. Signing and native browser checks remain necessary. [Temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/), [signing overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Supply chain and npm

The official npm audit returned zero known advisories for this installed tree; [audit receipt](validation/2026-10-12-dependencies/npm-audit.json). [The CycloneDX SBOM](validation/2026-10-12-dependencies/sbom.json) covers the installed development/runtime tree, including optional research dependencies; it is not an assertion that all those packages ship in the extension. The lockfile remains the installation source of truth. No absence of advisories proves absence of defects.

An unauthenticated official registry lookup returned E404 for `@aliveinternet/core`. That result cannot reserve the name or prove control of the `@aliveinternet` scope. This checkout has no Git remote configured, so repository/homepage/bugs/provenance identities cannot be filled honestly. Maintainer scope ownership and a public repository must be supplied before publication. npm provenance requires the package's repository identity to match the build source; trusted publishing also requires maintainer configuration. [npm provenance](https://docs.npmjs.com/generating-provenance-statements/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/).

## Release conditions still outside local verification

- Representative, permissioned test labels and agreed false-positive/recall thresholds. The now-runnable offline benchmark is evidence tooling, not a labelled corpus or calibration.
- Full YouTube layouts/localization/signed-in coverage, other live sites, native grant/refusal/withholding UX, branded Edge and signed Firefox desktop/Android installs. The expanded anonymous reply smoke and headed Chromium grant/revocation fixture reduce this gap only for their recorded scope.
- Repeatable browser CPU/RSS/GPU measurements on target devices, using the protocol in `benchmark/README.md`. Single synthetic scan/idle measurements remain regression receipts.
- Published policy/contact, store publisher accounts, final dashboard disclosures, signing/review and explicit submission. npm scope/repository/trusted-publisher ownership and explicit publication.

Inactive research features are excluded from this alpha release scope and remain default-off. They are not dependencies that can be satisfied by installing a package or wiring an unevaluated detector.
