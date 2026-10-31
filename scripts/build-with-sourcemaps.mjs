// Builds the production extension with the repository's own WXT config, adding
// only source maps and a separate output directory, so tests can inspect which
// source modules reach the bundle. Usage: node scripts/build-with-sourcemaps.mjs <browser> <outDir>
import { build } from 'wxt';
import { fileURLToPath } from 'node:url';

const [browser = 'chrome', outDir] = process.argv.slice(2);
if (!outDir) throw new Error('usage: build-with-sourcemaps.mjs <browser> <outDir>');
await build({
  root: fileURLToPath(new URL('..', import.meta.url)),
  browser,
  outDir,
  vite: () => ({ build: { sourcemap: true } }),
});
