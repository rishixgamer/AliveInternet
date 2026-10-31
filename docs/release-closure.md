# Four release gates — October 13, 2026

October 15 UI continuation: [interface milestone and fresh evidence](ui-ux.md). The popup/settings/onboarding and production builds have changed; receipts below retain their historical artifact scope. External release conditions remain unchanged.

All four gates remain open. Local signing preparation and the collection/annotation workflow are complete; mailbox receipt, registered publisher accounts, AMO signing and independent current data require external evidence.

| Gate | Current evidence | Completion requirement |
|---|---|---|
| Privacy mailbox | One requested test sent to `rishihaldar@umass.edu`; maintainer reports it has not arrived | Received token confirmed by the maintainer or read from that inbox; investigate delay/bounce before changing the published contact |
| Publisher accounts | Maintainer confirms Chrome, Edge and AMO accounts are not registered | Complete registration, then inspect authenticated publisher identity and actual account verification state in each dashboard |
| Signed Firefox | Unsigned MV3 candidate rebuilt; pinned Mozilla web-ext 10.7.0 lint has zero errors/warnings | AMO returns the matching signed XPI; release Firefox accepts a normal persistent install with default signature enforcement, then behavior passes after restart |
| Representative accuracy | No current authorized corpus or independent product labels supplied; historical recall is 0/810 | Follow the collection/annotation protocol; agree thresholds before the untouched test, assess uncertainty and browser behavior, and meet the accepted criteria |

Sending a message does not prove delivery. GitHub identity does not prove store ownership. Lint and temporary installation do not prove a signed install. Preparing an annotation tool does not produce representative labels.

For the delayed message, sign into the actual **UMass Gmail** inbox, rather than relying on personal mail forwarding. Search `in:anywhere "ALIVE-PRIVACY-20261013-7C6285A6"`, including Spam and Trash. The connected Gmail sender has no returned bounce in the scoped search, which does not prove acceptance by UMass. UMass's student mail is Gmail; its guidance recommends checking Spam and notes that forwarding can cause delivery problems. If the test remains absent, retain its send time (October 13, 5:34 p.m. Eastern) and ask UMass IT for delivery tracing through its official help route. Do not publish full headers or change security settings as a substitute for delivery evidence. [UMass email](https://www.umass.edu/it/email) · [Student Gmail FAQ](https://umass.service-now.com/sp/en/umass-amherst-gmail-f-a-q?id=kb_article_view&sysparm_article=KB0010227) · [UMass IT help](https://www.umass.edu/it/get-help).

## Owner registration wizard

Run from this repository:

```sh
bash scripts/release-owner-wizard.sh
```

The five stages are mailbox receipt, Chrome registration, Edge enrollment, AMO unlisted signing, and a normal Firefox install. They capture only owner reports in ignored `artifacts/release-readiness/owner/.env`. No credentials, payment/identity documents or API tokens are requested or stored. The wizard never changes verified flags in `release/publisher.json`. Return actual dashboard and install evidence for inspection; self-reports alone do not verify publisher identity or signatures.

Chrome registration requires a developer agreement and a one-time fee. Choose the intended owner email carefully; it cannot be changed through ordinary account editing. The owner must review the displayed agreement and payment details. [Google registration](https://developer.chrome.com/docs/webstore/register).

Edge enrollment requires a personal Microsoft account (MSA), rather than a work/school account. The documented route is Partner Center → Account settings → Programs → Microsoft Edge → Get started. Use the real country/region and appropriate Individual/Company type; those fields cannot be changed after enrollment. After registration, inspect Open Account Settings for verification status; pending/action-required is not verified. [Microsoft registration and verification](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account).

For AMO, register/sign in, confirm the account email, and review Mozilla's distribution agreement. The web upload path avoids persistent signing API credentials. Choose self-distribution/unlisted for this alpha. AMO may require manual review; submission or an email acknowledging upload is not a signed result. [Mozilla signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) · [Submission flow](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).

## Firefox upload package

- Extension: `.output/aliveinternet-0.3.0-firefox.zip`.
- Matching build sources: `.output/aliveinternet-0.3.0-sources.zip` (excludes runtime data, artifacts and `.env` files).
- Add-on ID: `{c0c9c54d-10b7-4ac9-833c-e0cca4c1e407}`; keep stable.
- Version: `0.3.0`; minimum Firefox: `142.0`.
- Data collection/transmission declaration: required `none`.
- `gecko_android` remains absent; this candidate is desktop-only. Do not enable Android distribution or claim Android validation.

The original minimum 128 produced two compatibility warnings for the declaration (desktop support starts at 140, Android at 142). The new conservative common floor 142 eliminates both warnings without enabling Android. Chromium builds retain their previous manifest metadata and exact evidence. [Mozilla version/distribution keys](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings).

Reviewer notes: TypeScript/WXT source builds with `npm ci --ignore-scripts` then `npm run build:firefox` on Node 22.16+; build tools and licences are pinned in the lockfile. The extension processes rendered content locally, has no telemetry/backend or model downloads, stores local settings/manual advisory packs, and performs reversible hides only. Nine optional adapters are disabled by default and request explicit host access. No raw evaluation corpus is in the extension/source archive. Source is Apache-2.0; include the bundled third-party notices. This is experimental: historical broad-spam collapse recall is zero and no representative accuracy claim is made.

After receiving the XPI, retain its AMO version/signing receipt and SHA-256, compare all unsigned payload entries byte-for-byte against the candidate (allow only Mozilla signature metadata), and inspect ID/version/permissions. ZIP signature-file presence alone is not cryptographic verification. Install in **official release Firefox** using a fresh profile and `about:addons` → gear → Install Add-on From File. Keep default signature enforcement enabled. Confirm no invalid-signature error, restart, and confirm the extension remains enabled.

After restart, use a YouTube page the owner is authorized to view for a native smoke: confirm popup off/on, reversible restoration and temporary reveal, local account hide/unhide, and optional sites remaining ungranted. Observe that unrelated visible replies remain accessible. Record any unavailable scenario as pending. This is a live UI smoke, not a controlled accuracy test; do not capture/upload other people's content. A future automated signed fixture must use persistent installation, not the existing temporary-install RDP method. Capture exact browser/build/XPI hashes, install/restart evidence, behavior and failures. Until the normal signed installation and smoke actually run, signedXpiVerified stays false. The current six-group temporary fixture verifies the rebuilt payload only.

## Representative evaluation

The executable [collection and annotation package](../benchmark/annotation/README.md) freezes splits and data hashes, prepares blind sheets for two independent annotators, requires a distinct adjudicator and complete labels, rejects detectable group/exact-long-text leakage, and exports separate natural/safety datasets. Private source data stays under ignored artifacts. Permission, reviewer independence, near-duplicate leakage and sampling quality still require custodian review.

Do not collect comments through hidden extension uploads or bulk scraping. No public-source tuning or broad detection claims can close the current-data gate. Use the proposed collection workload as a starting plan, approve the target claim and acceptance thresholds before viewing the test results, and retain missing strata and failed outcomes.

Local receipts are under `docs/validation/2026-10-13-release-closure/`; the initial lint warnings and failed sandbox Firefox attempt are preserved. Run `npm run check:release-closure` to verify the pinned preparation files, Firefox inventory and recorded open gates. This command checks evidence integrity and deliberately does not pass the four external gates. No store registration, payment, agreement acceptance, signing submission or publication occurred in this continuation. These local changes have not been committed or pushed; the previously approved public snapshot is unchanged.

## Closure evidence format (ticket 12)

Once the owner steps are done, record them in `docs/validation/owner-gates/closure-evidence.json` and only then set the matching flags in `release/publisher.json`. `npm run check:release-closure` verifies every flag that is `true`; `npm run check:release-closure -- --require-closed` additionally fails while any of the five gates (`mailbox`, `chrome`, `edge`, `firefox`, `signedXpi`) is open. Rules are in `scripts/lib/release-closure.mjs` and tested by `tests/release-closure.test.mjs`.

- Every section lists `evidence: [{ path, sha256 }]` files under `docs/validation/` (screenshots, dashboard exports, install logs). Hashes must match; no credentials, tokens or cookies (credential-like field names are rejected).
- `mailbox`: `contact` equals the publisher contact, `testToken` hashes to the sent-test receipt's `testTokenSha256`, both published policy files contain the contact, and `policySha256` matches `site/privacy/index.html` (republish and update it if the contact changes).
- `stores.chrome`: `dashboardState: "registered"`, `agreementAccepted: true`. `stores.edge`: `accountType: "personal-msa"`, `verificationState: "verified"` (pending or enrolled does not count). `stores.firefox`: `emailConfirmed` and `agreementReviewed` true.
- `signedXpi`: `candidateSha256` and `signedXpiSha256` (different), `addonId` and `version` matching the Firefox manifest, `unsignedEntriesIdentical: true`, `differingEntries` only under `META-INF/`, `install` (release channel, fresh profile, signature enforcement, restarted, enabled after restart) and `smoke` (popup off/on, reversible restore, local account hide/unhide, optional sites ungranted), all true.

Known issue: the Oct 13 preparation receipt still pins pre-Oct-15 bytes for other files (`package.json`, the Firefox payload), so `check:release-closure` fails on those pins until ticket #14 replaces them. `release/publisher.json`, this document and the checker are exempt from the pins because they change when gates close.
