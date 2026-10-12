import './style.css';
import { initializeSettingsPopup } from '../../src/extension/popup-settings.ts';
import { browser } from 'wxt/browser';
import { parseIndicatorPack } from '../../src/intel/indicators.ts';

const status = document.querySelector<HTMLElement>('#status')!;
const disposeSettings = initializeSettingsPopup();
window.addEventListener('pagehide', disposeSettings, { once: true });

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
