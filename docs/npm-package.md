# Publishing the core as an npm package — groundwork

Feature `npm-core-package`. Entry point: `src/lib.ts`.

## Plan

- Publish only DOM-free, network-free modules (`src/core`, `src/intel`, `src/network`, `src/research`) as an ESM library with type declarations.
- Separate `package.json` or a workspace (e.g. `packages/core`) so the extension stays `private: true`.
- Build with `tsc` emitting `.js` + `.d.ts` (`rewriteRelativeImportExtensions` for the `.ts` import specifiers).
- Name: check availability on npm first (e.g. `aliveinternet` or `@aliveinternet/core`).
- Publish from CI with npm provenance enabled (see docs/supply-chain.md).

## Stability

Everything exported from `src/lib.ts` becomes public API at 1.0. Keep the scaffolded/inert modules **out** of it until implemented. Document that `Assessment.score` is uncalibrated and not a bot probability.

## Example (target)

```js
import { assessBatch } from '@aliveinternet/core';
const [result] = assessBatch([{ id: '1', author: 'a', text: 'DM me on Telegram for guaranteed crypto profit', links: [] }]);
console.log(result.decision, result.reason);
```
