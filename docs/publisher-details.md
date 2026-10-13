# Publisher defaults and verification

The maintainer requested defaults on October 13, 2026. The authenticated GitHub connector and `gh api user` agree on **Rishi Haldar**, login **rishixgamer**. This verifies the GitHub account used for this work, not legal identity or a browser-store publisher account.

The repository, **https://github.com/rishixgamer/AliveInternet**, is now public. The maintainer explicitly approved publishing the prepared source snapshot, publisher name and privacy contact. The approved 301-file snapshot was committed and uploaded from an isolated temporary checkout at `30c847ff8041d06a35f39b63e02471878262445f`; the original working tree and its Git history were preserved. An unauthenticated GitHub API fetch confirms public visibility. The initial private-creation receipt remains historical evidence. No store submission or npm publication occurred; npm scope/trusted-publisher ownership remains unverified.

The approved public privacy contact is **rishihaldar@umass.edu**, supplied by the authenticated GitHub profile. The public profile does not expose an email address. The maintainer explicitly authorized including this address in the public policy. No mail was sent and mailbox delivery remains unverified; publication approval is not delivery evidence.

Verified hosting: **https://rishixgamer.github.io/AliveInternet/privacy/**. The static policy page has no JavaScript, external fonts or tracking. An unauthenticated HTTPS fetch returned 200 and its complete bytes match `site/privacy/index.html`. GitHub Pages serves the dedicated `gh-pages` branch with HTTPS enforced. [Publication receipt](validation/2026-10-13-release-readiness/github-publication.json).

`release/publisher.json` records approved publication and verified source/policy hosting separately from unverified mailbox delivery and store accounts. Store verification remains false. There are no usable default Chrome Web Store, Microsoft Partner Center, AMO signing credentials or npm scope ownership. Creating those accounts, accepting their agreements and supplying legal/payment information require the maintainer. Do not put credentials into that JSON or this repository.

Before submission:

1. Source and policy publication are complete; keep the public policy synchronized with material privacy changes.
2. Confirm the privacy mailbox receives messages. If this address is unsuitable, replace it before store submission; public GitHub issues are not a private channel for sensitive browsing information.
3. Sign in to the chosen store publisher accounts and verify the visible publisher identity. Account access alone does not establish review approval.
4. For Firefox, request an unlisted signed alpha using AMO and retain the returned XPI. Test a normal signed install in Firefox with signing enforcement intact; temporary installation is insufficient. Android remains pending as requested.
5. Keep stable-release or broad spam-detection claims blocked until an appropriate independent, current labelled evaluation succeeds. The retrospective UCI result did not meet even nonzero collapse recall.

Official routes: [Chrome developer registration](https://developer.chrome.com/docs/webstore/register), [Microsoft Edge developer account](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account), [Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [Mozilla web-ext signing](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).
