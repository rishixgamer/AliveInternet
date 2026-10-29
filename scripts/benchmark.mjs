import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MAX_DATASET_BYTES, parseEvaluationDataset } from '../src/research/dataset.ts';
import { benchmarkDataset } from '../src/research/benchmark.ts';

// Explicit local CLI only. No dataset download, raw-row output or browser wiring.
try {
  const args = process.argv.slice(2);
  if (args.length > 2 || args.some(arg => arg.startsWith('-'))) throw new Error('Usage: npm run benchmark -- [local-dataset.json] [aggregate-report.json]');
  const input = args[0] ?? fileURLToPath(new URL('../benchmark/datasets/synthetic.json', import.meta.url));
  if ((await stat(input)).size > MAX_DATASET_BYTES) throw new Error('Dataset exceeds 5 MB');
  const bytes = await readFile(input);
  if (bytes.length > MAX_DATASET_BYTES) throw new Error('Dataset exceeds 5 MB');
  const dataset = parseEvaluationDataset(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  const hash = value => createHash('sha256').update(value).digest('hex');
  const sourceHashes = {};
  const files = ['scripts/benchmark.mjs'];
  for (const directory of ['src/core', 'src/research']) {
    for (const file of await readdir(new URL('../' + directory, import.meta.url))) if (file.endsWith('.ts')) files.push(directory + '/' + file);
  }
  files.sort();
  for (const file of files) sourceHashes[file] = hash(await readFile(new URL('../' + file, import.meta.url)));
  const report = { schemaVersion: 1, timestamp: new Date().toISOString(), node: process.version,
    dataset: { sha256: hash(bytes), source: dataset.manifest.source, split: dataset.manifest.split, items: dataset.items.length },
    scope: 'Rule-only offline collapse evaluation; ordered platform-isolated batches <=350. Flags count as not hidden. Synthetic metrics cannot establish real-world accuracy or bot identity. No raw rows or manifest free text in report.',
    lockSha256: hash(await readFile(new URL('../package-lock.json', import.meta.url))), sourceHashes, results: benchmarkDataset(dataset) };
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[1]) await writeFile(args[1], output, { flag: 'wx' });
  console.log(output);
} catch {
  // Dataset contents and parser errors never reach terminal/logs.
  console.error('Benchmark rejected input or could not write output. Check bounded schema/provenance, local file paths and a new output filename.');
  process.exitCode = 1;
}
