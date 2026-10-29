# Alpha demonstration media

## October 15 interface screenshots

The current [UI milestone](../ui-ux.md) uses the new assets in [ui-2026-10-15/](ui-2026-10-15/), with [exact production receipts and hashes](../validation/2026-10-15-ui-ux/). Popup captures are actual 280/360-pixel extension documents, settings and guide captures are their packaged pages, and on-page captures use labelled synthetic content. Light/dark, review, empty/error, narrow and 200% CSS zoom states are included. No detection-accuracy or native-toolbar claim follows from these images.

## Historical release media

These assets show the actual unpacked production extension on hand-authored synthetic fixtures. No real profile, comment, avatar or platform screenshot is included. Page styling is a demonstration frame; extension controls are unmodified. They demonstrate behavior, not classification accuracy or broad live support.

- `before.png`, `after.png`, `reveal.png`, `popup.png`: 1280×800 PNGs.
- `promo-440x280.png`: 440×280 PNG.
- `before-after.gif`: ten-second, 1280-pixel-wide reversible filtering demo, under 8 MB.
- `provenance.json`: production hashes, source browser receipt, exact media hashes and dimensions.

Regenerate with `npm run build && npm run test:browser` using installed Chromium and ffmpeg. Each new run writes media under its own `artifacts/browser/<timestamp>/media/`; it does not overwrite these reviewed distribution assets automatically. Review the images, then copy the six named assets here and regenerate/check their provenance. Store submission remains a separate maintainer action.
