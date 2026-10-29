# Interface verification — October 15, 2026

The [interface report](../../ui-ux.md) explains scope, design, source revision, behavior, limitations and reproduction commands. Current screenshot assets are in [the UI gallery](../../media/ui-2026-10-15/). No real platform content was retrieved for these fixtures.

- [234 unit/DOM tests](tests.txt), [core types](typecheck-core.txt), [WXT types](typecheck.txt), [three browser builds](builds.txt), [manifest/icon checks](manifests.txt), [Taste lint](taste-lint.txt), [whitespace check](whitespace.txt).
- [Chromium receipt](chromium.json): 20 production groups, no page errors; popup-to-settings navigation, page-scoped review, multi-tab settings, recycled/stale content, imports/cancellation, worker restart, on-page hide/unhide/reveal, onboarding, themes, 200% CSS zoom, keyboard, contrast and injected save-failure recovery. Optional-host prompt remains pending; this is not visual/native grant/refusal validation.
- [Firefox receipt](firefox.json): seven groups using the temporary MV3 install and real popup/options DOM handlers through Mozilla RDP; no signed-install, pointer-hit-testing or native-toolbar claim.
- [Popup accessible structure](popup-accessibility.txt) and [settings accessible structure](settings-accessibility.txt); these are accessibility-tree inspections, not a manual VoiceOver session.
- [Command exit results](commands.json), [exact source/build/evidence inventory](inventory.json). Run `npm run check:ui` to verify current bytes against this inventory. The Edge build has a hash inventory but no new Edge browser execution in this UI milestone.

Browser versions:

```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:157.0) Gecko/20100101 Firefox/157.0
```

Historical release receipts/archive hashes and failed attempts were preserved. The new inventory deliberately does not assert those older receipts describe the changed artifact. Existing ZIP archives were not rebuilt. Raw failed/interrupted runs remain under ignored `artifacts/ui-ux/`, including the disk-space interruption, high-zoom overflow, harness adaptation failures and superseded passes. The current fixtures both passed to completion and their inventories were compared byte-for-byte after a clean three-target rebuild.

External boundaries remain: live-feed layout/localization/selector coverage, native toolbar/prompt and manual assistive-technology checks, signed/store installation, representative independently labelled accuracy, and other-device/GPU/energy budgets. No commit, push, signing submission or publication occurred.
