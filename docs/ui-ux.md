# AliveInternet interface milestone — October 15, 2026

This continuation implements a compact toolbar popup, on-page controls, first-run guide and a dedicated settings tab in the existing WXT/TypeScript/HTML/CSS stack. It preserves the inherited dirty working tree and the existing settings, permission and storage protocols. Nothing was committed, pushed, published or submitted to a store.

## Design and source

The direction is a quiet, explainable utility: neutral surfaces, a restrained green accent, local system typography, an eight-pixel spacing basis, readable reasons and explicit actions. Light and dark themes share the same hierarchy. The system theme is the default; a local Light/Dark/System preference synchronizes between extension pages. There are no new dependencies, remote fonts, photographs, decorative animation or remote assets.

Taste source: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/f624f37a8c650b9cc550253104925efe4c8de246), revision **`f624f37a8c650b9cc550253104925efe4c8de246`**, installed `design-taste-frontend/SKILL.md`, SHA-256 recorded in the validation inventory. Its actual instructions and the existing redesign skill were read. Taste's hierarchy, content specificity, states, screenshot critique and iterative refinement apply here. Its public-marketing-page direction draw, image minimum, headline arithmetic, motion floor and public-page inspector do not fit extension utility screens: the explicit product brief takes precedence. Production-extension Playwright fixtures measure the actual extension documents instead of serving them over HTTP without extension APIs. Taste's source lint is run separately and its output retained.

## Interaction model

- **Popup:** reads only the current tab, preferences, actual grants and a bounded count-only content-script response. It shows filtering active, global off, site paused, unsupported page, missing/unavailable page access, initial loading, disconnected content script and settings-read failure separately. An unknown or incomplete count is an em dash, never a verified zero. Startup/settings settling gets at most six 300 ms retries; there is no permanent status poll.
- **Scope:** “Pause on YouTube” applies to every YouTube tab and retains the host grant. “Turn on for all websites” changes the global switch only; each site's existing preference and browser consent still apply. Detailed website controls retain their existing consent flow; disabling an optional website removes its grant. No site is enabled by opening onboarding, importing a backup or reading status.
- **Permission boundary:** the manifest still requests only `storage` and `scripting`, required YouTube origins and the existing exact optional origins. There is no `tabs` or `activeTab` addition. When the browser omits an inaccessible address, the popup says “Page access unavailable”; it cannot truthfully identify that unknown page as unsupported or name an unconsented site. The access action opens the Websites section of Settings.
- **Review:** opening the popup obtains no excerpts. Review explicitly requests the displayed tab's current hidden records, 50 at a time. Closing or switching the reviewed page clears excerpts and invalidates in-flight results. Only the exact packaged popup is authorized for count/review/reveal messages; settings and background contexts cannot retrieve excerpts. Invalid/navigation-gap responses do not become an empty-page claim.
- **On-page controls:** a short local-hide heading, separate reason, temporary reveal, account hide/unhide and expandable evidence use scoped local styles. Saving failures stay visible and can be retried. The original display value, parent/reply isolation, stale/recycled-node guards and temporary-reveal lifetime remain intact. Keyboard focus returns to restored content, an adjacent review action or the result summary rather than falling to the body.
- **Guide:** opens on a new install, can be skipped and reopened from popup/settings, and explains local processing, limitations, reversibility and optional-site consent. Its interactive example is explicitly synthetic, uses the real reversible UI component and illustrates a personal mute preference. It never changes classifier rules or filtering settings.
- **Settings:** the original document-rooted settings, backup and indicator modules run in `options.html`. Global/filtering controls, all ten websites, mute words, allowlist, local hides, export, validated preview, cancellation, explicit merge/replacement, synchronization and pack validation/removal remain available. Experimental controls are grouped separately and retain existing default-off settings. UI-only metadata uses separate primitive storage keys; filtering mutations still use the single serialized background writer. Appearance and tour metadata are separate from the existing filtering-settings backup format.

## Accessibility and refinement

The interface uses labelled native controls, semantic headings/landmarks, polite state announcements, visible focus, non-color state text and a skip link in Settings. Review supports Escape, consecutive keyboard pause/resume and focus recovery after pending saves/removal. Reduced motion disables transitions; no automatic animation runs. Settings reflows to one column and the popup keeps everyday actions near the top. Very narrow and 200% zoom layouts wrap instead of clipping controls. On-page styles follow system dark mode and YouTube's explicit dark root without changing host-page styles.

The initial real production fixture and screenshot showed a 350-pixel popup approximately 2,400 pixels tall. The replacement keeps everyday status, pause and review in a compact surface; full preferences have a section navigation in their own tab. Screenshots were inspected in both themes and narrow layouts. The first high-zoom browser attempt found horizontal overflow; wrapping headers, navigation and appearance controls fixed it. Final source review also prompted keyboard-focus repairs. A repeated production test caught a redundant refresh disabling Resume during a click; routine reads now retain the known site action, and acknowledged saves cancel their redundant debounce. A source regression and both complete browser fixtures cover the repaired behavior. Failed, interrupted and superseded attempts remain in ignored `artifacts/ui-ux/`; they are not passing evidence.

## Reproduce

```sh
npm run build:all
ALIVE_CHECK_MANIFESTS=1 npm test
npm run typecheck:core
npm run typecheck
npm run check:release
npm run test:browser
PLAYWRIGHT_BROWSERS_PATH="$PWD/artifacts/browser-runtime" npm run test:firefox
npm run check:ui
```

Use a fresh `ALIVEINTERNET_BROWSER_ARTIFACTS` / `ALIVEINTERNET_FIREFOX_ARTIFACTS` directory for each fixture run. Firefox's runtime path above is this machine's existing matching runtime, not a portable installation requirement. Browser launches may need execution approval in a restricted sandbox. The current exact receipts, command results and screenshot inventory are under [validation](validation/2026-10-15-ui-ux/). `check:ui` verifies their source, harness, screenshot and three-build hashes; after a future change, regenerate evidence rather than patching historical hashes.

## Verified result

| Check | Result |
|---|---|
| `ALIVE_CHECK_MANIFESTS=1 npm test` | 234 passed, no failures or skips |
| Core and full WXT typechecks | Both pass |
| Chrome, Firefox, Edge production builds | All pass; exact inventories match fixture receipts |
| Production Chromium fixture | 20 groups pass, no page errors |
| Production Firefox temporary fixture | 7 groups pass, no page errors |
| Manifest/icon checks and Taste source lint | Pass; lint has zero findings |
| Contrast | 16 measured text-token pairs across both themes, minimum 5.39:1; disabled/transient states are not a full accessibility audit |
| Layout and interactions | 280/360 px popup; 360/1180 px settings; 200% CSS zoom; reduced motion; keyboard and failure/retry journeys pass |
| Synthetic feed regression | 1,400 reversible hides among 1,401 items in 679 ms; zero idle UI mutations and 0.361 ms renderer task time over 1.2 seconds |

These timings are one synthetic run on this machine, not accuracy, GPU/energy or general-device performance evidence. The browser-version strings, exact production bytes, harness hashes, accessible-tree captures and command logs are in [the evidence directory](validation/2026-10-15-ui-ux/README.md).

[Light popup](media/ui-2026-10-15/popup-light.png) · [Dark popup](media/ui-2026-10-15/popup-dark.png) · [Review](media/ui-2026-10-15/popup-review-dark.png) · [Settings](media/ui-2026-10-15/settings-light.png) · [Dark settings](media/ui-2026-10-15/settings-dark.png) · [Guide](media/ui-2026-10-15/welcome-light.png) · [On-page reasons](media/ui-2026-10-15/on-page-after.png)

## Evidence boundary

All new browser content is locally fulfilled synthetic content or packaged extension pages in disposable profiles. No live user content was uploaded or used for screenshots. Chromium opens the real popup document as a tab; Firefox executes the real popup/options handlers through Mozilla RDP. These establish the recorded synthetic workflows, not native toolbar opening, manual screen-reader operation, browser permission-prompt wording/refusal, a signed installation, other-platform selector support, current detection accuracy or other-device CPU/GPU budgets. The existing synthetic idle/large-feed measurement is retained in each Chromium receipt; it is a regression guard, not a general performance claim.

Historical evidence under the October 12–13 directories and `docs/media/` is preserved. The changed UI/build/harness supersedes those artifacts for this milestone, so `check:release-evidence`, `check:release-closure` and old archive comparisons are not current-build UI gates. Old `.output/*.zip` archives were not regenerated and must not be distributed as this interface revision. Use `check:ui` for the new exact artifact boundary; the older checks should still reject byte drift rather than silently accept it.

The four external release gates in [release closure](release-closure.md) remain open. Store registration/signing, mailbox receipt and independent current evaluation are separate. The historical result remains **0 collapsed out of 810 spam-labelled comments**; no detector thresholds, research detector activation, bot probability or accuracy claims changed.
