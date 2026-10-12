import { browser } from 'wxt/browser';
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '../core/platforms.ts';
import { loadSettings, sanitizeSettings, setBlockedAccount, updateSettings, type Settings } from './settings.ts';
import { BOOLEAN_SETTINGS } from './settings-protocol.ts';

/** Settings controls send individual intents, never snapshots of the whole form. */
export function initializeSettingsPopup(root: Document = document): () => void {
  const inputs = Object.fromEntries(BOOLEAN_SETTINGS.map(id => [id, root.querySelector<HTMLInputElement>(`#${id}`)!])) as
    Record<typeof BOOLEAN_SETTINGS[number], HTMLInputElement>;
  const mode = root.querySelector<HTMLSelectElement>('#mode')!;
  const status = root.querySelector<HTMLElement>('#status')!;
  const platforms = root.querySelector<HTMLElement>('#platforms')!;
  const blocked = root.querySelector<HTMLElement>('#blockedAccounts')!;
  const count = root.querySelector<HTMLElement>('#blockCount')!;
  const siteInputs = new Map<Platform, HTMLInputElement>();
  const pending = new Set<HTMLInputElement | HTMLSelectElement>();
  const pendingBlocks = new Set<string>();
  const detach: (() => void)[] = [];
  let current: Settings | undefined;
  let renderedBlocks: string | undefined;
  let revision = 0;
  let disposed = false;

  function listen(element: HTMLElement, handler: () => void): void {
    element.addEventListener('change', handler);
    detach.push(() => element.removeEventListener('change', handler));
  }

  function renderBlocks(settings: Settings): void {
    const signature = JSON.stringify([settings.blockedAccounts, [...pendingBlocks]]);
    // Preference-only events should preserve keyboard focus on Unhide buttons.
    if (signature === renderedBlocks) return;
    renderedBlocks = signature;
    blocked.replaceChildren();
    count.textContent = String(settings.blockedAccounts.length);
    if (settings.blockedAccounts.length === 0) {
      const empty = root.createElement('em'); empty.textContent = 'None'; blocked.append(empty); return;
    }
    for (const entry of settings.blockedAccounts) {
      const separator = entry.indexOf(':');
      const platform = entry.slice(0, separator) as Platform;
      const key = entry.slice(separator + 1);
      const row = root.createElement('div'); row.className = 'block-row';
      const label = root.createElement('span'); label.textContent = `${PLATFORM_LABELS[platform]} · ${key}`;
      const remove = root.createElement('button'); remove.type = 'button'; remove.textContent = 'Unhide';
      remove.disabled = pendingBlocks.has(entry);
      remove.setAttribute('aria-label', `Unhide ${key} on ${PLATFORM_LABELS[platform]}`);
      remove.addEventListener('click', () => {
        if (pendingBlocks.has(entry) || disposed) return;
        pendingBlocks.add(entry); remove.disabled = true;
        void persist(() => setBlockedAccount(platform, key, false), 'Account unhidden')
          .finally(() => { pendingBlocks.delete(entry); render(); });
      });
      row.append(label, remove); blocked.append(row);
    }
  }

  function render(): void {
    if (!current || disposed) return;
    for (const id of BOOLEAN_SETTINGS) {
      if (!pending.has(inputs[id])) { inputs[id].checked = current[id]; inputs[id].disabled = false; }
    }
    if (!pending.has(mode)) { mode.value = current.mode; mode.disabled = false; }
    for (const [platform, input] of siteInputs) {
      if (!pending.has(input)) { input.checked = current.platforms[platform]; input.disabled = false; }
    }
    renderBlocks(current);
  }

  async function refresh(): Promise<void> {
    const before = revision;
    const settings = await loadSettings();
    // A storage event arriving during the read contains newer authoritative state.
    if (!disposed && before === revision) current = settings;
    render();
  }

  async function persist(action: () => Promise<Settings>, message: string): Promise<void> {
    try {
      await action();
      await refresh();
      if (!disposed) status.textContent = message;
    } catch {
      if (!disposed) status.textContent = 'Could not save settings; retry the action';
    }
  }

  function change(control: HTMLInputElement | HTMLSelectElement, action: () => Promise<Settings>): void {
    if (!current || disposed || pending.has(control)) return;
    pending.add(control); control.disabled = true;
    void persist(action, 'Settings saved').finally(() => { pending.delete(control); render(); });
  }

  for (const id of BOOLEAN_SETTINGS) {
    inputs[id].disabled = true;
    listen(inputs[id], () => {
      const checked = inputs[id].checked;
      change(inputs[id], () => updateSettings({ [id]: checked }));
    });
  }
  mode.disabled = true;
  listen(mode, () => {
    const selected = mode.value as Settings['mode'];
    change(mode, () => updateSettings({ mode: selected }));
  });
  platforms.replaceChildren();
  for (const platform of PLATFORMS) {
    const label = root.createElement('label'); label.className = 'toggle';
    const input = root.createElement('input'); input.type = 'checkbox'; input.disabled = true;
    input.dataset.platform = platform;
    const info = root.createElement('span');
    info.textContent = `${PLATFORM_LABELS[platform]}${platform === 'youtube' ? ' (initial adapter)' : ' (experimental)'}`;
    label.append(input, info); platforms.append(label); siteInputs.set(platform, input);
    listen(input, () => {
      const checked = input.checked;
      change(input, () => updateSettings({ platforms: { [platform]: checked } }));
    });
  }

  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string): void => {
    if (area !== 'local' || !changes.settings || disposed) return;
    revision++;
    current = sanitizeSettings(changes.settings.newValue);
    render();
  };
  browser.storage.onChanged.addListener(onChanged);
  void refresh().catch(() => { if (!disposed) status.textContent = 'Could not load settings'; });
  return () => {
    disposed = true;
    browser.storage.onChanged.removeListener(onChanged);
    for (const remove of detach) remove();
  };
}
