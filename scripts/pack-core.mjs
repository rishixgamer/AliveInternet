import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const cache = await mkdtemp(path.join(tmpdir(), 'aliveinternet-pack-cache-'));
try {
  await mkdir(path.join(root, '.output'), { recursive: true });
  execFileSync('npm', ['pack', './packages/core', '--ignore-scripts', '--pack-destination', '.output'], {
    cwd: root, env: { ...process.env, npm_config_cache: cache }, stdio: 'inherit',
  });
} finally { await rm(cache, { recursive: true, force: true }); }
