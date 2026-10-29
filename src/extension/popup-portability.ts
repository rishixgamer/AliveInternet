import { browser } from 'wxt/browser';
import { exportSettings, importSettings, MAX_SETTINGS_IMPORT_BYTES, parseSettingsImport, type ImportMode } from '../core/portability.ts';
import { sanitizeSettings, type Settings } from '../core/preferences.ts';
import { importSettingsSnapshot, loadSettings } from './settings.ts';

const LISTS = ['blockedAccounts', 'allowedAccounts', 'mutedWords', 'scopeOverrides'] as const;

function previewText(current: Settings, next: Settings, mode: ImportMode): string {
  const lines = [mode === 'replace-all'
    ? 'Replace all preferences and lists. Review removals before confirming.'
    : 'Merge local hides, allowed accounts and muted words. Keep other preferences.'];
  for (const key of LISTS) {
    const before = current[key].map(entry => typeof entry === 'string' ? entry : `${entry.scopeId}: ${entry.mode}`);
    const after = next[key].map(entry => typeof entry === 'string' ? entry : `${entry.scopeId}: ${entry.mode}`);
    const added = after.filter(entry => !before.includes(entry));
    const removed = before.filter(entry => !after.includes(entry));
    lines.push(`${key}: ${before.length} → ${after.length} (+${added.length}, −${removed.length})`);
    lines.push(...added.map(entry => `  + ${entry}`), ...removed.map(entry => `  − ${entry}`));
  }
  for (const key of Object.keys(current) as (keyof Settings)[]) {
    if (LISTS.includes(key as typeof LISTS[number])) continue;
    if (JSON.stringify(current[key]) !== JSON.stringify(next[key])) {
      lines.push(`${key}: ${JSON.stringify(current[key])} → ${JSON.stringify(next[key])}`);
    }
  }
  if (mode === 'replace-all') lines.push('Platform preferences are restored without requesting site access. Grant access using the platform controls.');
  return lines.join('\n');
}

/** Local backup/restore with a validation-only preview and explicit commit. */
export function initializePortabilityPopup(root: Document = document): () => void {
  const exportButton = root.querySelector<HTMLButtonElement>('#exportSettings')!;
  const fileInput = root.querySelector<HTMLInputElement>('#importSettings')!;
  const modeInput = root.querySelector<HTMLSelectElement>('#importMode')!;
  const preview = root.querySelector<HTMLElement>('#importPreview')!;
  const confirm = root.querySelector<HTMLButtonElement>('#confirmImport')!;
  const cancel = root.querySelector<HTMLButtonElement>('#cancelImport')!;
  const status = root.querySelector<HTMLElement>('#status')!;
  const urls = root.defaultView?.URL ?? URL;
  const BlobConstructor = root.defaultView?.Blob ?? Blob;
  const activeUrls = new Set<string>();
  let source: string | undefined;
  let payload: Settings | undefined;
  let current: Settings | undefined;
  let importMode: ImportMode = 'merge-blocklist';
  let generation = 0;
  let revision = 0;
  let reading = false;
  let saving = false;
  let exporting = false;
  let disposed = false;
  modeInput.value = importMode;
  preview.setAttribute('aria-live', 'polite');

  function controls(): void {
    if (disposed) return;
    fileInput.disabled = saving;
    modeInput.disabled = saving;
    confirm.disabled = saving || reading || !payload || !current;
    cancel.disabled = saving || (!reading && source === undefined);
    exportButton.disabled = exporting;
  }

  function renderPreview(): void {
    if (disposed || saving || source === undefined || !current) { controls(); return; }
    payload = undefined;
    try {
      importMode = modeInput.value as ImportMode;
      const validated = parseSettingsImport(source, importMode);
      const next = importSettings(current, validated, importMode);
      payload = validated;
      preview.textContent = previewText(current, next, importMode);
      confirm.textContent = importMode === 'replace-all' ? 'Confirm replace all' : 'Confirm merge';
    } catch (error) {
      preview.textContent = '';
      status.textContent = error instanceof Error ? error.message : 'Invalid settings import';
    }
    controls();
  }

  async function refresh(): Promise<void> {
    const before = revision;
    const loaded = await loadSettings();
    if (disposed) return;
    if (before === revision) current = loaded;
    renderPreview();
  }

  const selectFile = (): void => {
    if (disposed || saving) return;
    const ticket = ++generation;
    const file = fileInput.files?.[0];
    // Reset so reselecting the same file after an error generates a change.
    fileInput.value = '';
    source = undefined; payload = undefined; preview.textContent = '';
    reading = Boolean(file); controls();
    if (!file) return;
    status.textContent = 'Validating settings backup…';
    void (async () => {
      if (file.size > MAX_SETTINGS_IMPORT_BYTES) throw new Error('Settings import exceeds 200,000 bytes');
      const text = await file.text();
      if (disposed || ticket !== generation) return;
      // Recheck encoded length; the parser never trusts file metadata alone.
      parseSettingsImport(text, modeInput.value as ImportMode);
      source = text;
      await refresh();
      if (!disposed && ticket === generation && payload) status.textContent = 'Review the preview, then confirm to save';
    })().catch((error: unknown) => {
      if (!disposed && ticket === generation) {
        source = undefined; payload = undefined; preview.textContent = '';
        status.textContent = error instanceof Error ? error.message : 'Could not read settings backup; select it again';
      }
    }).finally(() => {
      if (!disposed && ticket === generation) { reading = false; controls(); }
    });
  };

  const changeMode = (): void => {
    if (disposed || saving) return;
    renderPreview();
  };
  const cancelImport = (): void => {
    if (disposed || saving) return;
    generation++; reading = false; source = undefined; payload = undefined;
    preview.textContent = ''; fileInput.value = ''; status.textContent = 'Import cancelled'; controls();
  };
  const confirmImport = (): void => {
    if (disposed || saving || reading || !payload || !current) return;
    const incoming = payload;
    const mode = importMode;
    const baseline = current;
    saving = true; controls(); status.textContent = 'Saving imported settings…';
    void importSettingsSnapshot(incoming, mode, mode === 'replace-all' ? baseline : undefined).then(settings => {
      if (disposed) return;
      current = settings;
      generation++; source = undefined; payload = undefined; preview.textContent = '';
      status.textContent = mode === 'replace-all' ? 'Settings replaced' : 'Lists merged';
    }).catch(async () => {
      if (disposed) return;
      // Rebuild against durable state before allowing explicit retry, including
      // stale replacements and list-limit errors caused by a queued tab hide.
      payload = undefined;
      try { await refresh(); }
      catch { current = undefined; }
      if (!disposed) status.textContent = 'Import was not saved. Review the current preview and confirm again, or select the file again';
    }).finally(() => {
      if (!disposed) { saving = false; renderPreview(); controls(); }
    });
  };
  const download = (): void => {
    if (disposed || exporting) return;
    exporting = true; controls();
    void loadSettings().then(settings => {
      if (disposed) return;
      const backup = exportSettings(settings);
      const blob = new BlobConstructor([JSON.stringify(backup)], { type: 'application/json' });
      const url = urls.createObjectURL(blob);
      activeUrls.add(url);
      const link = root.createElement('a'); link.href = url;
      link.download = `aliveinternet-settings-${backup.exportedAt.slice(0, 10)}.json`;
      root.body.append(link);
      try { link.click(); }
      finally {
        link.remove();
        // Keep the URL alive until the browser has started the download.
        setTimeout(() => { if (activeUrls.delete(url)) urls.revokeObjectURL(url); }, 0);
      }
      status.textContent = 'Settings backup downloaded';
    }).catch((error: unknown) => {
      if (!disposed) status.textContent = error instanceof Error && error.message.includes('backup exceeds')
        ? error.message : 'Could not export settings; retry';
    })
      .finally(() => { if (!disposed) { exporting = false; controls(); } });
  };
  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string): void => {
    if (disposed || area !== 'local' || !changes.settings) return;
    revision++; current = sanitizeSettings(changes.settings.newValue); renderPreview();
  };
  const listeners = [
    [exportButton, 'click', download], [fileInput, 'change', selectFile],
    [modeInput, 'change', changeMode], [confirm, 'click', confirmImport], [cancel, 'click', cancelImport],
  ] as const;
  for (const [element, event, listener] of listeners) element.addEventListener(event, listener);
  browser.storage.onChanged.addListener(onChanged);
  controls();
  void refresh().catch(() => { if (!disposed) status.textContent = 'Could not load settings; select a backup to retry'; });
  return () => {
    disposed = true; generation++;
    for (const [element, event, listener] of listeners) element.removeEventListener(event, listener);
    browser.storage.onChanged.removeListener(onChanged);
    for (const url of activeUrls) urls.revokeObjectURL(url);
    activeUrls.clear();
  };
}
