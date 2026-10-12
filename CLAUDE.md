# Claude Code project guide

Read `AGENTS.md` first: it is the authoritative shared instruction file for all agents.

## Commands
- `npm install`: install runtime + WXT.
- `npm run dev`: Chrome development extension.
- `npm run test`: dependency-free Node 22 unit tests of the pure TypeScript filtering core.
- `npm run typecheck`: WXT-generated TS types + strict typecheck.
- `npm run build`: production extension bundle.
- `npm run embedding:poc`: **large optional model download**, Node-only. Ask before running expensive downloads.

## Useful files
- `entrypoints/youtube.content.ts`: WXT YouTube content script.
- `src/adapters/youtube.ts`: platform DOM extraction.
- `src/core/filter.ts`: deterministic filtering rules.
- `src/extension/controller.ts`: mutation observer and UI lifecycle.
- `src/extension/ui.ts`: safe reversible UI.
- `docs/model-research.md`: EmbeddingGemma 2 integration constraints.

## Review checklist
Think adversarially: can an ordinary legitimate comment be collapsed? Are DOM selectors resilient to changes? Are annotations duplicated? Are UI changes reversible when preferences change? Is remote execution forbidden by MV3? Does a benchmark measure the actual thing claimed?
