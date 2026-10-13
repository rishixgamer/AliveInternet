# UI translations — groundwork

Feature `ui-localization`. Browser-extension `messages.json` catalogs (Chrome/Firefox i18n format), one folder per locale.

**Deliberately outside `public/`.** If a `_locales/` folder ships in the build, Chrome requires `default_locale` in the manifest and every UI string must be wired through `browser.i18n.getMessage`. Until that wiring is done, these files are staging only and change nothing.

To activate (Codex):
1. Move to `public/_locales/<locale>/messages.json` and set `default_locale: 'en'` in `wxt.config.ts`.
2. Replace hard-coded strings in `src/extension/ui.ts` and `entrypoints/popup/` with `browser.i18n.getMessage(...)`.
3. Keep detection explanations (`Assessment.reason`) translatable too.

`en` is the source catalog; add other locales by copying it. Translators: keep `$PLACEHOLDERS$` intact.
