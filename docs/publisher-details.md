# Publisher defaults and verification

The maintainer requested defaults on October 13, 2026. The authenticated GitHub connector and `gh api user` agree on **Rishi Haldar**, login **rishixgamer**. This verifies the GitHub account used for this work, not legal identity or a browser-store publisher account.

The default repository, **https://github.com/rishixgamer/AliveInternet**, was created privately. A GitHub API receipt confirms `PRIVATE` visibility and `ADMIN` permission. No source was uploaded, no working-tree commit/push was made, and no store submission or npm publication occurred. Package repository metadata now points to this real repository. A public source mirror and a matching revision remain necessary for public package provenance.

The default privacy contact in the local policy draft is **rishihaldar@umass.edu**, supplied by the authenticated GitHub profile. The public profile does not expose an email address. This contact has not been sent mail or tested for mailbox delivery; including it in a public policy needs the maintainer's publication approval. An address being present in a connected profile is not evidence that support messages can be received.

Proposed hosting: **https://rishixgamer.github.io/AliveInternet/privacy/**. The static policy page in `site/privacy/index.html` is prepared locally, without JavaScript, external fonts or tracking. The address remains unpublished. Never advertise it as a working policy link until an unauthenticated HTTPS fetch succeeds and the hosted policy matches the reviewed source.

`release/publisher.json` records verified identity separately from unverified delivery, hosting and store accounts. It deliberately leaves publication authorization and store verification false. There are no usable default Chrome Web Store, Microsoft Partner Center, AMO signing credentials or npm scope ownership. Creating those accounts, accepting their agreements and supplying legal/payment information require the maintainer. Do not put credentials into that JSON or this repository.

Before submission:

1. Approve publishing the prepared source, publisher name and contact; make the repository public and host the reviewed policy.
2. Confirm the privacy mailbox receives messages. If this address is unsuitable, replace it before publication; public GitHub issues are not a private channel for sensitive browsing information.
3. Sign in to the chosen store publisher accounts and verify the visible publisher identity. Account access alone does not establish review approval.
4. For Firefox, request an unlisted signed alpha using AMO and retain the returned XPI. Test a normal signed install in Firefox with signing enforcement intact; temporary installation is insufficient. Android remains pending as requested.
5. Keep stable-release or broad spam-detection claims blocked until an appropriate independent, current labelled evaluation succeeds. The retrospective UCI result did not meet even nonzero collapse recall.

Official routes: [Chrome developer registration](https://developer.chrome.com/docs/webstore/register), [Microsoft Edge developer account](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/create-dev-account), [Mozilla signing and distribution](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [Mozilla web-ext signing](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).
