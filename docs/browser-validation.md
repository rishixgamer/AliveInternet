# Unpacked Chromium fixture validation

`npm run build && npm run test:browser` runs the production MV3 extension in a fresh temporary Chromium profile. Install the test browser once with `npx playwright install chromium`. The harness launches only when explicitly invoked; it never attaches to the user's browser or profile. It uses Playwright's bundled Chromium because recent branded Google Chrome releases do not support loading unpacked extensions with these automation flags.

For current branded Chrome/Edge, `ALIVEINTERNET_BROWSER_CHANNEL=chrome` or `msedge` uses the explicitly enabled DevTools `Extensions.loadUnpacked` API and removes Playwright's extension-disabling default. `ALIVEINTERNET_BROWSER_PATH` may select an extracted official runtime while retaining this channel flag. The receipt records the actual browser product/revision and installation API. This tests an unpacked developer extension, not a signed-store install. Bounded timer-based DOM polling allows checks to progress in Edge background tabs without modifying production scheduling. [October 13 branded evidence](release-readiness.md).

Every page HTTP(S) request is intercepted: the authorized synthetic YouTube-shaped fixture is fulfilled locally, an optional-site negative fixture is fulfilled locally, and other requests are aborted. No platform content is downloaded, no accounts are signed in, and no social data is changed. The extension worker, its actual popup document, production content script, browser storage events and runtime messages run inside Chromium. Opening the popup document as a tab verifies popup functionality; this does not verify the browser-toolbar affordance.

## Coverage

Release-media generation requires `ffmpeg` on PATH (or `ALIVEINTERNET_FFMPEG`). CI installs it explicitly. The fixture saves actual production-UI screenshots on clearly labelled synthetic content and a ten-second GIF; it never captures real platform users for release media.

The runnable checks exercise required/optional manifest permissions, default YouTube injection, benign comments and warning text that stay visible, parent/reply independence, original display restoration, temporary reveal, SPA navigation/reload, popup preference propagation to two tabs, local account hide/unhide, concurrent background mutations, bounded hidden-item review messages, popup reveals and stale-row rejection after reload, forced MV3 worker termination/restart, labeled controls and keyboard toggling, content edits and inserted replies, settings download/preview/cancel/merge and explicit replacement without optional-site consent, strict advisory pack import/escaped rendering/opt-in/removal without content hiding or provenance fetches, no optional-site injection without consent, and a 1,401-item feed with 1,400 deterministic collapses.

The large-feed receipt records wall time to completed processing and observed long tasks. A 1.2-second idle interval records Chromium CDP renderer task/script duration and DOM mutation count; the gate requires no further feed mutations and less than 300 ms renderer task time. This is a generous regression guard under synthetic conditions, not a cross-device CPU/GPU benchmark. It excludes GPU, whole-browser memory and real-feed cost. Large-feed timing includes document navigation and extension scheduling. No `setContent`-only or jsdom result substitutes for extension browser execution.

## Evidence and overrides

Each run writes a new `artifacts/browser/<UTC timestamp>/receipt.json` containing exact build SHA-256 hashes, completed check names and timing, browser version, network interceptions, console/page errors, metrics and failure details. Screenshots and the settings export are saved beside it. Failed receipts and temporary profiles are retained; successful profiles are removed unless `ALIVEINTERNET_KEEP_PROFILE=1`. Receipt success requires all checks to finish. Incomplete runs remain failed and cannot establish validation.

Optional environment variables:

- `ALIVEINTERNET_EXTENSION_DIR`: already-built unpacked extension directory.
- `ALIVEINTERNET_BROWSER_ARTIFACTS`: new evidence destination.
- `ALIVEINTERNET_BROWSER_PATH`: compatible Chromium/Chrome for Testing executable, instead of bundled Chromium.
- `ALIVEINTERNET_BROWSER_HEADED=1`: show the isolated browser during the test.
- `ALIVEINTERNET_BROWSER_CHANNEL`: `chrome` or `msedge`, using DevTools unpacked installation in the isolated profile.
- `ALIVEINTERNET_BROWSER_PENDING_CONSENT_ONLY=1`: leave optional-site consent pending even when headed; verify no preference enable or registration, with no grant/refusal claim.
- `ALIVEINTERNET_KEEP_PROFILE=1`: retain its isolated profile on success.
- `ALIVEINTERNET_PLAYWRIGHT_MODULE`: alternate trusted installed Playwright ES module path, for a bundled runtime; ordinarily use the npm devDependency.

In a restricted execution sandbox, launching Chromium may require the normal execution approval. A browser download requires network access once. Missing browser/dependency/build errors are failures with an explicit receipt; the harness does not silently fall back to a fake DOM or installed user browser.

## Limits

The final optional-site check leaves the native prompt pending in headless mode and asserts no grant, preference enable or registration. A headed run waits up to 60 seconds for native approval, verifies actual X fixture injection, removes the grants through the browser API, checks restoration in the existing tab and checks no injection after reload. The receipt distinguishes these paths. Neither a headless pass nor a successful grant API response verifies the visual wording, native refusal flow or toolbar affordance.

Passing proves these synthetic integration scenarios for the precise production artifact hashed in the receipt. It does **not** establish live YouTube selector support, account classification accuracy, other-platform support, real-device overhead, platform moderation, or Firefox/Safari browser execution. Keep live-platform support matrix entries provisional until separate authorized manual smoke tests are recorded.
