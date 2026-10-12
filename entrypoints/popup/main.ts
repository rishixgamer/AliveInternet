import './style.css';
import { loadSettings, saveSettings, withAccountBlock, type Settings } from '../../src/extension/settings.ts';
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '../../src/core/platforms.ts';
import { browser } from 'wxt/browser';
import { parseIndicatorPack } from '../../src/intel/indicators.ts';

const ids = ['enabled', 'annotateFlagged', 'filterComments', 'filterPosts', 'filterAccounts',
  'showBlockControls', 'autoCampaignAccounts', 'dedupeComments', 'inspectAccounts', 'intelAdvisories'] as const;
const inputs = Object.fromEntries(ids.map(id => [id, document.querySelector<HTMLInputElement>(`#${id}`)!])) as
  Record<typeof ids[number], HTMLInputElement>;
const mode = document.querySelector<HTMLSelectElement>('#mode')!;
const status = document.querySelector<HTMLElement>('#status')!;
const platforms = document.querySelector<HTMLElement>('#platforms')!;
const blocked = document.querySelector<HTMLElement>('#blockedAccounts')!;
const count = document.querySelector<HTMLElement>('#blockCount')!;
let current: Settings | undefined;

function renderBlocks(settings: Settings): void {
  blocked.replaceChildren();
  count.textContent = String(settings.blockedAccounts.length);
  if (settings.blockedAccounts.length === 0) {
    const empty = document.createElement('em'); empty.textContent = 'None'; blocked.append(empty); return;
  }
  for (const entry of settings.blockedAccounts) {
    const separator = entry.indexOf(':');
    const platform = entry.slice(0, separator) as Platform;
    const key = entry.slice(separator + 1);
    const row = document.createElement('div'); row.className = 'block-row';
    const label = document.createElement('span');
    label.textContent = `${PLATFORM_LABELS[platform]} · ${key}`;
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Unhide';
    remove.setAttribute('aria-label', `Unhide ${key} on ${PLATFORM_LABELS[platform]}`);
    remove.addEventListener('click', async () => {
      try {
        // Read recent storage state, avoiding overwrites from another open tab.
        const fresh = await loadSettings();
        const updated = withAccountBlock(fresh, platform, key, false);
        await saveSettings(updated);
        current = updated; renderBlocks(updated); status.textContent = 'Account unhidden';
      } catch { status.textContent = 'Could not update blocklist'; }
    });
    row.append(label, remove); blocked.append(row);
  }
}

function render(settings: Settings): void {
  current = settings;
  for (const id of ids) inputs[id].checked = settings[id];
  mode.value = settings.mode;
  platforms.replaceChildren();
  for (const platform of PLATFORMS) {
    const label = document.createElement('label'); label.className = 'toggle';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    checkbox.dataset.platform = platform; checkbox.checked = settings.platforms[platform];
    const info = document.createElement('span');
    info.textContent = `${PLATFORM_LABELS[platform]}${platform === 'youtube' ? ' (initial adapter)' : ' (experimental)'}`;
    label.append(checkbox, info); platforms.append(label);
    checkbox.addEventListener('change', () => void persist());
  }
  renderBlocks(settings);
}

async function persist(): Promise<void> {
  if (!current) return;
  try {
    const fresh = await loadSettings();
    const platformStates = { ...fresh.platforms };
    for (const element of platforms.querySelectorAll<HTMLInputElement>('input[data-platform]')) {
      const platform = element.dataset.platform as Platform;
      if (platform in platformStates) platformStates[platform] = element.checked;
    }
    const next: Settings = {
      ...fresh, mode: mode.value as Settings['mode'], platforms: platformStates,
      ...Object.fromEntries(ids.map(id => [id, inputs[id].checked])),
    };
    await saveSettings(next); current = next; status.textContent = 'Settings saved';
  } catch { status.textContent = 'Could not save settings'; }
}

void loadSettings().then(settings => {
  render(settings);
  for (const id of ids) inputs[id].addEventListener('change', () => void persist());
  mode.addEventListener('change', () => void persist());
}).catch(() => { status.textContent = 'Could not load settings'; });

// Only explicit user import; no background download, feed polling or network transmission.
const packInput = document.querySelector<HTMLInputElement>('#importPack')!;
const packStatus = document.querySelector<HTMLElement>('#packStatus')!;
const removePack = document.querySelector<HTMLButtonElement>('#removePack')!;
async function renderPackStatus(): Promise<void> {
  const stored = await browser.storage.local.get('indicatorPack');
  try {
    const pack = parseIndicatorPack(stored.indicatorPack);
    packStatus.textContent = `${pack.title} — ${pack.indicators.length} indicators (unverified user import)`;
  } catch { packStatus.textContent = 'No valid pack loaded'; }
}
packInput.addEventListener('change', async () => {
  const file = packInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 100_000) throw new Error('File exceeds 100 KB maximum');
    const pack = parseIndicatorPack(JSON.parse(await file.text()) as unknown);
    await browser.storage.local.set({indicatorPack: pack});
    await renderPackStatus();
    status.textContent = 'Local advisory pack imported (not automatically trusted)';
  } catch (error) { status.textContent = `Import rejected: ${String(error)}`; }
  packInput.value = '';
});
removePack.addEventListener('click', async () => {
  await browser.storage.local.remove('indicatorPack');
  await renderPackStatus();
  status.textContent = 'Indicator pack cleared';
});
void renderPackStatus().catch(() => { packStatus.textContent = 'Could not access pack storage'; });
