# Store listings — groundwork

October 15: [new UI screenshots and validation](ui-ux.md) supersede the historical interface assets below. This file is preparation only; no store package has been submitted.

Status: **local release packages built; public source and privacy policy verified; listings remain draft**. Nothing has been submitted to a store. See [current release evidence](release-readiness.md).

## Builds

| Store | Command | Output | Status |
|---|---|---|---|
| Chrome Web Store | `npm run build` / `npm run zip:extension` | `.output/chrome-mv3` | Builds; Chromium and branded Chrome 154 production fixtures pass; unpacked install only |
| Firefox Add-ons (desktop candidate; Android pending) | `npm run build:firefox` / `npm run zip:firefox` | `.output/firefox-mv3` | Firefox 142+ MV3 candidate; clean Mozilla lint and six temporary-install fixture groups; signed/Android unverified |
| Microsoft Edge Add-ons | `npm run build:edge` / `npm run zip:edge` | `.output/edge-mv3` | Builds; 15 headed branded Edge 155 synthetic fixture groups pass; unpacked install only |

Firefox desktop temporary installation and programmatic popup/content execution have six passing fixture groups. Signed Firefox/Android remain unverified. Branded Chrome/Edge have 15 passing synthetic groups each, plus repeated Mac CPU/RSS/latency measurements; store installation and native toolbar/refusal flows remain unverified. See [current evidence and limitations](release-readiness.md) and [Firefox fixture scope](firefox-validation.md).

## Blockers before any submission

1. Verify broader live YouTube behavior and each opt-in adapter before claiming support. The expanded anonymous reply smoke verifies one page's selector/control attribution; it cannot validate all layouts or rule accuracy.
2. Exercise native optional-host prompts, withheld/revoked access and installation in Firefox/Edge; finish store-policy review.
3. Obtain representative permissioned false-positive evaluation and real-device CPU/GPU/memory measurements before stable-release claims.
4. Review the generated synthetic screenshots, promo tile and demo, confirm privacy-mailbox delivery and store publisher ownership, then submit through maintainer accounts on explicit store-release authorization. The source and hosted policy are already public; this does not authorize store submission. See [publisher verification](publisher-details.md).

Completed source prerequisites: exact optional-site consent, required YouTube boundaries, packaged icons, Firefox MV3 ID `{c0c9c54d-10b7-4ac9-833c-e0cca4c1e407}` and `data_collection_permissions.required: ["none"]`. The generated UUID is a project identifier, not a claim to an email/domain. Keep it stable for this project; see [Mozilla add-on ID guidance](https://extensionworkshop.com/documentation/develop/extensions-and-the-add-on-id/).

## Listing copy (draft)

- **Name:** AliveInternet
- **Short description (≤132 chars):** Experimental local, reversible spam filtering for YouTube comments. Other adapters are opt-in. No telemetry.
- **Single purpose (Chrome):** Locally hide and explain scam/spam posts and comments on social media pages the user enables.
- **Long description:** AliveInternet is an experimental local spam filter for YouTube comments and supported browser pages. It uses explainable text rules, with a reason and Show temporarily control for each automatic hide. You can also hide profiles locally, undo those preferences, review hidden items on the current page, and export or restore settings. Nine additional platform adapters are experimental and request browser access when enabled. They are off by default. The extension processes rendered website content in browser memory and stores preferences and manually imported advisory packs locally. It sends no content to a server and includes no telemetry. Advisory packs are optional and never automatically hide accounts. Rules can make mistakes; the extension does not prove that an account is a bot or that text was AI-generated. It is open source under Apache-2.0 and does not report, delete or ban platform content or accounts.

Do **not** claim "blocks bots" or "detects AI": the extension cannot prove either (AGENTS.md).

## Permission justifications

| Permission | Why |
|---|---|
| `storage` | Saves preferences, explicit local account hides and a manually imported advisory pack. |
| `scripting` | Registers the packaged local content bundle only for explicitly consented, enabled optional sites. |
| Required YouTube access | Reads rendered content locally on exact YouTube HTTPS origins; can be disabled in the popup or withheld in browser settings. |
| Optional access to nine other sites | Requested only on explicit site activation; imports never grant access; processing stays local. |

## Privacy disclosures (Chrome data-usage form)

Website content and public profile links are processed locally in memory. Preferences, explicit account hides and manually imported advisory packs are stored in `browser.storage.local`. No extension data is sold or transmitted to the developer or third parties. Dashboard answers must disclose local handling as required by the store; do not equate no transmission with no processing. The [public privacy policy](https://rishixgamer.github.io/AliveInternet/privacy/) is hosted and verified; keep dashboard answers aligned with the submitted artifact. [Chrome's local-data disclosure guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## Store assets checklist

- [x] 128×128 icon (plus 16/32/48), source SVG and local generator in `public/icons/`
- [x] 1280×800 screenshots from actual production UI on labelled synthetic content: before, after/reason, reveal, popup
- [x] 440×280 promo tile
- [x] 10-second synthetic reversible-filtering GIF; [media provenance](media/README.md)
