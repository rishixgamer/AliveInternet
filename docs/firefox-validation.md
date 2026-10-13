# Firefox production fixture

Build with `npm run build:firefox`, install the matching test runtime once with `npx playwright install firefox`, then run `npm run test:firefox`. An optional `PLAYWRIGHT_BROWSERS_PATH` chooses the browser cache. This continuation uses the matching runtime in `artifacts/browser-runtime`, so its local command is:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/artifacts/browser-runtime" npm run test:firefox
```

`ALIVEINTERNET_FIREFOX_PATH` can select an explicit compatible executable; `ALIVEINTERNET_EXTENSION_DIR` selects the production unpacked Firefox build and `ALIVEINTERNET_FIREFOX_ARTIFACTS` selects a new evidence directory.

The harness starts a fresh temporary profile, binds Mozilla's debugging server to localhost with an ephemeral port, and installs the actual MV3 artifact through the temporary-add-on protocol used by Mozilla's web-ext. Debugging preferences apply only to that profile. It never uses an installed user profile or changes system-wide preferences. Successful profiles are removed; failed synthetic profiles and receipts are retained. HTTP(S) requests are intercepted and fulfilled only with synthetic YouTube/X pages or aborted. Local extension resources load normally.

The six groups cover temporary installation with stable ID/no-transmission declaration, independent filtering in two tabs with benign reply preservation, popup enable/disable and original-display restoration, temporary reveal/reload isolation, concurrent background mutations/local hide/unhide delivery, and no optional-origin grant or injection.

Playwright does not expose privileged extension documents in this Firefox runtime. The harness opens the actual popup through the extension's browser API, then invokes and checks its real DOM handlers through Mozilla's console actor. This is real popup/background execution, not a simulated popup. It does not establish native pointer hit testing, keyboard/toolbar behavior, or permission-prompt UX. No detector or relationship fields are enabled for this test.

Receipts record exact production SHA-256 inventory, browser user agent, completed groups, timing, scope and failures. An incomplete run fails; installing a browser or adding an XPI file to a profile is not a pass. The earlier auto-install, privileged-navigation, obsolete-protocol and evaluation attempts remain failed evidence. The latest passing receipt is linked from [dependency resolution](dependency-resolution.md).

Temporary installs do not establish signed-store installs, Firefox Android execution or live selectors. Mozilla documents those distinctions in [temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/). Protocol references: [web-ext temporary installer](https://github.com/mozilla/web-ext/blob/master/src/firefox/remote.js), [extension descriptor](https://github.com/mozilla-firefox/firefox/blob/main/devtools/shared/specs/descriptors/webextension.js), [watcher](https://github.com/mozilla-firefox/firefox/blob/main/devtools/shared/specs/watcher.js), [console](https://github.com/mozilla-firefox/firefox/blob/main/devtools/shared/specs/webconsole.js).
