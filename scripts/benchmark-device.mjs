import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { youtubeFixture } from '../tests/browser/youtube-fixture.mjs';

// Explicit isolated local experiment. No user profile or real-platform traffic.
const root = fileURLToPath(new URL('../', import.meta.url));
const extensionDir = path.resolve(process.env.ALIVEINTERNET_EXTENSION_DIR || path.join(root, '.output/chrome-mv3'));
const output = path.resolve(process.argv[2] || path.join(root, 'artifacts/device-benchmark', new Date().toISOString().replace(/[:.]/g, '-')));
if (process.argv.length > 3) throw new Error('Usage: npm run benchmark:device -- [new-output-directory]');
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output, { recursive: false });
const receipt = {
  schemaVersion: 1, startedAt: new Date().toISOString(), status: 'running',
  scope: 'One real device, intercepted synthetic 1401-item fixture, extension absent versus production extension installed. Three warm-up pairs and ten measured pairs; alternating order. Not live-feed or cross-device evidence.',
  protocol: { warmupPairs: 3, measuredPairs: 10, settleMs: 650, idleMs: 1200,
    headless: process.env.ALIVEINTERNET_BROWSER_HEADED !== '1', itemCount: 1401,
    pageFocusedBeforeEachSample: true,
    baseline: 'Separate browser process with no extension; both isolated contexts remain open, inactive pages blank.',
    readyDefinition: 'Navigation to DOMContentLoaded plus two animation frames, then all 1400 expected collapses when enabled; includes navigation and scheduling.',
    cpuDefinition: 'CDP SystemInfo cumulative process CPU deltas; exited processes unavailable. GPU-process CPU is host CPU time, never GPU utilization.',
    memoryDefinition: 'OS ps resident-set KiB summed by CDP process type at settled checkpoint, not peak/unique physical memory; shared pages may be counted more than once.',
    gpuDefinition: 'GPU utilization and energy unavailable; no dedicated hardware sampler is attached.',
    rendererDefinition: 'CDP Performance renderer TaskDuration/ScriptDuration deltas, including navigation, completion and equal settle time.',
  },
  samples: [], errors: [],
};
const contexts = [];
const profiles = [];
const checkpoint = () => writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const command = (executable, args) => execFileSync(executable, args, { encoding: 'utf8', timeout: 10_000 }).trim();
function device() {
  const details = { platform: os.platform(), release: os.release(), arch: os.arch(),
    cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryBytes: os.totalmem(),
    loadAverage: os.loadavg() };
  if (os.platform() === 'darwin') {
    details.model = command('/usr/sbin/sysctl', ['-n', 'hw.model']);
    details.osVersion = command('/usr/bin/sw_vers', ['-productVersion']);
    details.power = command('/usr/bin/pmset', ['-g', 'batt']);
    details.powerSettings = command('/usr/bin/pmset', ['-g', 'custom']);
  } else details.power = 'Not measured on this OS';
  return details;
}
async function inventory(directory, prefix = '') {
  const result = {};
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) Object.assign(result, await inventory(path.join(directory, entry.name), prefix + entry.name + '/'));
    else if (entry.isFile()) result[prefix + entry.name] = hash(await readFile(path.join(directory, entry.name)));
  }
  return result;
}
async function processes(session) {
  return (await session.send('SystemInfo.getProcessInfo')).processInfo;
}
function cpuDelta(before, after) {
  const previous = new Map(before.map(row => [row.id, row]));
  const cpuMs = {};
  let startedProcesses = 0;
  for (const row of after) {
    const old = previous.get(row.id);
    if (!old) startedProcesses++;
    const delta = Math.max(0, row.cpuTime - (old?.cpuTime || 0)) * 1000;
    cpuMs[row.type] = (cpuMs[row.type] || 0) + delta;
    previous.delete(row.id);
  }
  return { cpuMs, startedProcesses, exitedProcesses: previous.size };
}
function residentSet(rows) {
  const ids = rows.map(row => row.id);
  const values = command('/bin/ps', ['-p', ids.join(','), '-o', 'pid=,rss=']);
  const rss = new Map(values.split('\n').map(line => line.trim().split(/\s+/).map(Number)));
  const byTypeKiB = {};
  let missingProcesses = 0;
  for (const row of rows) {
    const value = rss.get(row.id);
    if (value === undefined) { missingProcesses++; continue; }
    byTypeKiB[row.type] = (byTypeKiB[row.type] || 0) + value;
  }
  return { byTypeKiB, totalKiB: Object.values(byTypeKiB).reduce((a, b) => a + b, 0), missingProcesses };
}
const metric = (response, name) => {
  const value = response.metrics.find(row => row.name === name)?.value;
  assert.equal(typeof value, 'number', 'Missing CDP metric: ' + name);
  return value;
};
const rendererDelta = (before, after) => ({ taskMs: (metric(after, 'TaskDuration') - metric(before, 'TaskDuration')) * 1000,
  scriptMs: (metric(after, 'ScriptDuration') - metric(before, 'ScriptDuration')) * 1000 });
const quantiles = values => {
  const sorted = [...values].sort((a, b) => a - b);
  assert.ok(sorted.length > 0 && sorted.every(Number.isFinite));
  const middle = Math.floor(sorted.length / 2);
  return { count: sorted.length, median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1], min: sorted[0], max: sorted.at(-1) };
};
try {
  receipt.deviceBefore = device();
  receipt.buildSha256 = await inventory(extensionDir);
  receipt.lockSha256 = hash(await readFile(path.join(root, 'package-lock.json')));
  receipt.harnessSha256 = hash(await readFile(fileURLToPath(import.meta.url)));
  receipt.fixtureSha256 = hash(await readFile(path.join(root, 'tests/browser/youtube-fixture.mjs')));
  const fixture = youtubeFixture('https://www.youtube.com/watch?v=local-device&large=1');
  receipt.fixtureHtmlSha256 = hash(fixture);
  const runners = {};
  for (const condition of ['off', 'on']) {
    const profile = await mkdtemp(path.join(os.tmpdir(), 'aliveinternet-device-'));
    profiles.push(profile);
    const channel = process.env.ALIVEINTERNET_BROWSER_CHANNEL;
    if (channel && !['chrome', 'msedge'].includes(channel)) throw new Error('Unsupported browser channel');
    const args = condition === 'off' ? [] : channel ? ['--enable-unsafe-extension-debugging']
      : [`--disable-extensions-except=${extensionDir}`, `--load-extension=${extensionDir}`];
    const context = await chromium.launchPersistentContext(profile, {
      channel: process.env.ALIVEINTERNET_BROWSER_PATH ? undefined : channel || 'chromium',
      executablePath: process.env.ALIVEINTERNET_BROWSER_PATH || undefined,
      ignoreDefaultArgs: condition === 'on' && channel ? ['--disable-extensions'] : undefined,
      headless: receipt.protocol.headless, viewport: { width: 1100, height: 850 }, args,
    });
    contexts.push(context);
    const session = await context.browser().newBrowserCDPSession();
    receipt.browser = await session.send('Browser.getVersion');
    const info = await session.send('SystemInfo.getInfo');
    receipt.gpuHardware = info.gpu.devices.map(row => ({ deviceString: row.deviceString, vendorString: row.vendorString, driverVersion: row.driverVersion }));
    if (condition === 'on') {
      if (channel) receipt.installation = { method: 'CDP Extensions.loadUnpacked', ...(await session.send('Extensions.loadUnpacked', { path: extensionDir })) };
      else receipt.installation = { method: 'unpacked command-line flags' };
      const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15_000 });
      const popup = await context.newPage();
      await popup.goto(`chrome-extension://${new URL(worker.url()).hostname}/popup.html`);
      await popup.evaluate(async () => {
        const response = await chrome.runtime.sendMessage({ type: 'aliveinternet/settings-mutation', mutation: { kind: 'preferences', patch: { mode: 'balanced' } } });
        if (!response.ok) throw new Error('Settings mutation failed');
      });
      await popup.close();
    } else assert.equal(context.serviceWorkers().length, 0, 'Absent baseline must have no extension worker');
    await context.route('**/*', route => {
      const request = route.request();
      if (request.isNavigationRequest() && new URL(request.url()).hostname === 'www.youtube.com')
        return route.fulfill({ status: 200, contentType: 'text/html', body: fixture });
      return route.abort('blockedbyclient');
    });
    const page = context.pages()[0] || await context.newPage();
    const renderer = await context.newCDPSession(page);
    await renderer.send('Performance.enable');
    runners[condition] = { page, session, renderer };
  }
  for (let pair = 0; pair < 13; pair++) {
    for (const condition of pair % 2 ? ['on', 'off'] : ['off', 'on']) {
      const { page, session, renderer } = runners[condition];
      await page.bringToFront();
      const beforeProcesses = await processes(session);
      const beforeRenderer = await renderer.send('Performance.getMetrics');
      const start = performance.now();
      await page.goto(`https://www.youtube.com/watch?v=local-device-${pair}&large=1`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (condition === 'on') await page.waitForFunction(() => document.querySelectorAll('.aliveinternet-collapsed').length === 1400, undefined, { timeout: 20_000, polling: 100 });
      const readyMs = performance.now() - start;
      assert.equal(await page.locator('ytd-comment-view-model').count(), 1401);
      assert.equal(await page.locator('.aliveinternet-collapsed').count(), condition === 'on' ? 1400 : 0);
      await page.waitForTimeout(650);
      const settledRenderer = await renderer.send('Performance.getMetrics');
      const settledProcesses = await processes(session);
      const rss = residentSet(settledProcesses);
      const fixtureBefore = await page.evaluate(() => ({ ...window.fixtureMetrics }));
      await page.waitForTimeout(1200);
      const idleRenderer = await renderer.send('Performance.getMetrics');
      const idleProcesses = await processes(session);
      const mutations = await page.evaluate(() => window.fixtureMetrics.mutations);
      const sample = { pair: pair - 3, warmup: pair < 3, condition, readyMs,
        renderer: rendererDelta(beforeRenderer, settledRenderer), cpu: cpuDelta(beforeProcesses, settledProcesses), rss,
        longTaskCount: fixtureBefore.longTasks.length, longTaskTotalMs: fixtureBefore.longTasks.reduce((total, row) => total + row.duration, 0),
        idle: { ...rendererDelta(settledRenderer, idleRenderer), ...cpuDelta(settledProcesses, idleProcesses), mutations: mutations - fixtureBefore.mutations },
        gpuBusyPercent: null, gpuEnergyJoules: null,
      };
      assert.equal(sample.idle.mutations, 0, 'Static feed mutated during idle interval');
      assert.ok(sample.renderer.taskMs >= 0 && sample.renderer.scriptMs >= 0, 'Renderer counters reset during workload');
      assert.ok(sample.idle.taskMs >= 0 && sample.idle.scriptMs >= 0, 'Renderer counters reset during idle');
      assert.equal(sample.rss.missingProcesses, 0, 'RSS checkpoint missed browser processes');
      receipt.samples.push(sample);
      await checkpoint();
      await page.goto('about:blank');
    }
    console.log(`${pair < 3 ? 'Warmup' : 'Measured'} pair ${pair < 3 ? pair + 1 : pair - 2}/ ${pair < 3 ? 3 : 10} complete`);
  }
  receipt.summary = {};
  for (const condition of ['off', 'on']) {
    const samples = receipt.samples.filter(row => !row.warmup && row.condition === condition);
    assert.equal(samples.length, 10);
    receipt.summary[condition] = Object.fromEntries([
      ['readyMs', row => row.readyMs], ['rendererTaskMs', row => row.renderer.taskMs], ['rendererScriptMs', row => row.renderer.scriptMs],
      ['rssMiB', row => row.rss.totalKiB / 1024], ['idleTaskMs', row => row.idle.taskMs], ['longTaskTotalMs', row => row.longTaskTotalMs],
      ['processCpuMs', row => Object.values(row.cpu.cpuMs).reduce((a, b) => a + b, 0)],
      ['rendererProcessCpuMs', row => row.cpu.cpuMs.renderer || 0], ['gpuProcessHostCpuMs', row => row.cpu.cpuMs.GPU || 0],
      ['idleProcessCpuMs', row => Object.values(row.idle.cpuMs).reduce((a, b) => a + b, 0)],
    ].map(([key, select]) => [key, quantiles(samples.map(select))]));
  }
  const off = receipt.samples.filter(row => !row.warmup && row.condition === 'off');
  const on = receipt.samples.filter(row => !row.warmup && row.condition === 'on');
  receipt.pairedOnMinusOff = {
    readyMs: quantiles(on.map((row, index) => row.readyMs - off[index].readyMs)),
    rendererTaskMs: quantiles(on.map((row, index) => row.renderer.taskMs - off[index].renderer.taskMs)),
    rssMiB: quantiles(on.map((row, index) => (row.rss.totalKiB - off[index].rss.totalKiB) / 1024)),
  };
  receipt.deviceAfter = device();
  receipt.status = 'passed';
} catch (error) {
  receipt.status = 'failed';
  receipt.errors.push(String(error));
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (receipt.status === 'passed') for (const profile of profiles) await rm(profile, { recursive: true, force: true });
  else receipt.failedProfiles = profiles;
  receipt.finishedAt = new Date().toISOString();
  await checkpoint();
  console.log(`${receipt.status}: ${path.join(output, 'receipt.json')}`);
}
