import { rolldown } from 'rolldown';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('..', import.meta.url));
const library = path.join(root, 'packages/core/dist/lib.js');
const build = await rolldown({ input: library, platform: 'neutral', resolve: { mainFields: ['module', 'main'] } });
try { await build.write({ file: library, format: 'es', sourcemap: false }); }
finally { await build.close(); }
// Preserve third-party license terms for the bundled offline suffix data/parser.
const licenses = await Promise.all(['tldts', 'tldts-core'].map(async name =>
  `${name}\n${await readFile(path.join(root, 'node_modules', name, 'LICENSE'), 'utf8')}`));
const suffixNotice = '\n\nPublic Suffix List data included by tldts\n' +
  'The upstream list is made available under the Mozilla Public License 2.0.\n' +
  'Upstream source and terms: https://publicsuffix.org/list/public_suffix_list.dat\n' +
  'License: https://mozilla.org/MPL/2.0/\n' +
  'Bundled source: tldts 7.4.18 src/data/trie.ts (pinned in package-lock.json).\n' +
  'No list update is fetched by the extension.\n';
await writeFile(path.join(root, 'packages/core/THIRD_PARTY_LICENSES.txt'), licenses.join('\n\n') + suffixNotice);
console.log('core ESM bundled with offline Public Suffix List; no runtime dependencies');
