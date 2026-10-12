import './style.css';
import { loadSettings, saveSettings } from '../../src/extension/settings.ts';
import type { Settings } from '../../src/extension/settings.ts';

const enabled = document.querySelector<HTMLInputElement>('#enabled')!;
const mode = document.querySelector<HTMLSelectElement>('#mode')!;
const annotateFlagged = document.querySelector<HTMLInputElement>('#annotateFlagged')!;
const status = document.querySelector<HTMLElement>('#status')!;

function readControls(): Settings {
  return { enabled: enabled.checked, mode: mode.value as Settings['mode'], annotateFlagged: annotateFlagged.checked };
}

async function persist() {
  try { await saveSettings(readControls()); status.textContent = 'Settings saved'; }
  catch { status.textContent = 'Could not save settings'; }
}

void loadSettings().then((settings) => {
  enabled.checked = settings.enabled;
  mode.value = settings.mode;
  annotateFlagged.checked = settings.annotateFlagged;
  for (const control of [enabled, mode, annotateFlagged]) control.addEventListener('change', () => void persist());
}).catch(() => { status.textContent = 'Could not load settings'; });
