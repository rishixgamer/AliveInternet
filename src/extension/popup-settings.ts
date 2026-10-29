import { browser } from 'wxt/browser';
import { PLATFORMS, PLATFORM_LABELS, type Platform } from '../core/platforms.ts';
import { loadSettings, sanitizeSettings, setBlockedAccount, updateSettings, type Settings } from './settings.ts';
import { setSiteAccess } from './site-access-popup.ts';
import { SITE_ORIGINS } from './site-access.ts';
import { BOOLEAN_SETTINGS } from './settings-protocol.ts';
import { parseSettingsLists } from '../core/preferences.ts';

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
  const siteLabels = new Map<Platform, HTMLElement>();
  const siteGranted = new Map<Platform, boolean>();
  const lists = (['mutedWords', 'allowedAccounts'] as const).map(key => ({
    key, input: root.querySelector<HTMLTextAreaElement>(`#${key}`)!,
    save: root.querySelector<HTMLButtonElement>(key === 'mutedWords' ? '#saveMutedWords' : '#saveAllowedAccounts')!,
    dirty: false, pending: false,
  }));
  const pending = new Set<HTMLInputElement | HTMLSelectElement>();
  const pendingBlocks = new Set<string>();
  const detach: (() => void)[] = [];
  let current: Settings | undefined;
  let renderedBlocks: string | undefined;
  let revision = 0;
  let refreshVersion = 0;
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
      if (!pending.has(input)) {
        input.checked = current.platforms[platform] && siteGranted.get(platform) === true; input.disabled = false;
      }
      const info = siteLabels.get(platform);
      const kind = platform === 'youtube' ? 'initial adapter' : 'experimental';
      if (info) info.textContent = `${PLATFORM_LABELS[platform]} (${kind}${siteGranted.get(platform)
        ? '' : '; enable to grant site access'})`;
    }
    for (const list of lists) {
      if (!list.dirty && !list.pending) list.input.value = current[list.key].join('\n');
      list.input.disabled = list.pending;
      list.save.disabled = list.pending || !list.dirty;
    }
    renderBlocks(current);
  }

  async function refresh(): Promise<void> {
    const before = revision;
    const version = ++refreshVersion;
    const [settings, grants] = await Promise.all([loadSettings(), Promise.all(PLATFORMS.map(async platform =>
      [platform, await browser.permissions.contains({ origins: SITE_ORIGINS[platform] })] as const))]);
    if (disposed || version !== refreshVersion) return;
    for (const [platform, granted] of grants) siteGranted.set(platform, granted);
    // A storage event arriving during the read contains newer authoritative state.
    if (!disposed && before === revision) current = settings;
    render();
  }

  async function persist(action: () => Promise<Settings>, message: string): Promise<boolean> {
    try {
      await action();
      await refresh();
      if (!disposed) status.textContent = message;
      return true;
    } catch {
      if (!disposed) status.textContent = 'Could not save settings or grant site access; retry the action';
      return false;
    }
  }

  for (const list of lists) {
    const edit = () => { list.dirty = true; render(); };
    const save = () => {
      if (!current || disposed || list.pending || !list.dirty) return;
      let values: string[];
      try {
        const draft = list.input.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        values = parseSettingsLists({ [list.key]: draft })[list.key]!;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Invalid list';
        return;
      }
      list.pending = true; render();
      void persist(() => updateSettings({ [list.key]: values }), 'List saved').then(success => {
        if (success) list.dirty = false;
      }).finally(() => { list.pending = false; render(); });
    };
    list.input.disabled = true; list.save.disabled = true;
    list.input.addEventListener('input', edit);
    list.save.addEventListener('click', save);
    detach.push(() => { list.input.removeEventListener('input', edit); list.save.removeEventListener('click', save); });
  }

  function change(control: HTMLInputElement | HTMLSelectElement, action: () => Promise<Settings>, message = 'Settings saved'): void {
    if (!current || disposed || pending.has(control)) return;
    const hadFocus = root.activeElement === control;
    pending.add(control); control.disabled = true;
    void persist(action, message).finally(() => {
      pending.delete(control); render();
      if (!disposed && hadFocus && root.activeElement === root.body) control.focus();
    });
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
    label.append(input, info); platforms.append(label); siteInputs.set(platform, input); siteLabels.set(platform, info);
    listen(input, () => {
      const checked = input.checked;
      change(input, () => setSiteAccess(platform, checked), checked
        ? 'Site enabled; reload open site tabs to start filtering' : 'Site settings saved');
    });
  }

  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string): void => {
    if (area !== 'local' || !changes.settings || disposed) return;
    revision++;
    current = sanitizeSettings(changes.settings.newValue);
    render();
  };
  const onPermissionsChanged = (): void => {
    void refresh().catch(() => { if (!disposed) status.textContent = 'Could not check site access'; });
  };
  browser.permissions.onAdded.addListener(onPermissionsChanged);
  browser.permissions.onRemoved.addListener(onPermissionsChanged);
  browser.storage.onChanged.addListener(onChanged);
  void refresh().catch(() => { if (!disposed) status.textContent = 'Could not load settings'; });
  return () => {
    disposed = true;
    browser.storage.onChanged.removeListener(onChanged);
    browser.permissions.onAdded.removeListener(onPermissionsChanged);
    browser.permissions.onRemoved.removeListener(onPermissionsChanged);
    for (const remove of detach) remove();
  };
}
