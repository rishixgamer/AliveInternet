# Store listings — groundwork

Status: **scaffolded** (features `store-publishing`, `cross-browser-builds`). Nothing has been submitted.

## Builds

| Store | Command | Output | Status |
|---|---|---|---|
| Chrome Web Store | `npm run build` / `npm run zip:extension` | `.output/chrome-mv3` | Builds; not browser smoke-tested |
| Firefox Add-ons (desktop + Android) | `npm run build:firefox` / `npm run zip:firefox` | `.output/firefox-mv2` | Script added; not smoke-tested |
| Microsoft Edge Add-ons | `npm run build:edge` / `npm run zip:edge` | `.output/edge-mv3` | Script added; not smoke-tested |

Firefox for Android supports extensions, which is the cheapest route to mobile users.

## Blockers before any submission

1. **Firefox add-on ID.** Pick a permanent ID (e.g. `aliveinternet@<your-domain>`) and add `browser_specific_settings.gecko.id` in `wxt.config.ts`. It cannot change after the first listing.
2. **Opt-in host permissions** (docs/privacy.md). Stores scrutinize broad content-script matches; request each site when the user enables it.
3. **YouTube replies + 350-item cap** fixed (docs/agent-backlog.md P0), so the demo matches reality.
4. Browser E2E on YouTube at minimum, and the README support matrix updated.

## Listing copy (draft)

- **Name:** AliveInternet — scam & spam filter for social media
- **Short description (≤132 chars):** Hides crypto scams, fake giveaways and spam comments on YouTube and more. Local, reversible, open source.
- **Single purpose (Chrome):** Locally hide and explain scam/spam posts and comments on social media pages the user enables.
- **Long description:** what it hides; every hide has a reason and a "Show temporarily" button; nothing leaves your browser; no account, no tracking; open source (Apache-2.0); it filters what *you* see, it does not report, delete or ban anyone.

Do **not** claim "blocks bots" or "detects AI": the extension cannot prove either (AGENTS.md).

## Permission justifications

| Permission | Why |
|---|---|
| `storage` | Saves your settings and your local list of hidden accounts. |
| Site access (YouTube, etc.) | Reads the comments and posts shown on the page to decide what to hide. Nothing is sent anywhere. |

## Privacy disclosures (Chrome data-usage form)

No data collected, sold or transferred. Website content is processed locally and not stored. Settings stay in `browser.storage.local`.

## Store assets checklist

- [ ] 128×128 icon (plus 16/32/48)
- [ ] 1280×800 screenshots: before/after YouTube comments, popup, "why was this hidden" panel
- [ ] 440×280 promo tile
- [ ] Demo GIF (docs/media/README.md)
