import { browser } from 'wxt/browser';
import { MAX_INDICATOR_PACK_BYTES, parseIndicatorPack } from '../intel/indicators.ts';

/** Explicit local advisory imports; provenance fields are unverified user claims. */
export function initializeIndicatorPopup(root: Document = document): () => void {
  const input = root.querySelector<HTMLInputElement>('#importPack')!;
  const remove = root.querySelector<HTMLButtonElement>('#removePack')!;
  const packStatus = root.querySelector<HTMLElement>('#packStatus')!;
  const status = root.querySelector<HTMLElement>('#status')!;
  let disposed = false;
  let pending = false;
  let generation = 0;
  let revision = 0;

  function controls(): void {
    if (disposed) return;
    input.disabled = pending;
    remove.disabled = pending;
  }

  function render(raw: unknown): void {
    if (disposed) return;
    try {
      const pack = parseIndicatorPack(raw);
      packStatus.textContent = `${pack.title} — ${pack.indicators.length} indicators. Publisher: ${pack.publisher}; source: ${pack.sourceUrl}. Self-declared provenance, unverified user import.`;
    } catch { packStatus.textContent = 'No valid pack loaded'; }
  }

  async function refresh(): Promise<void> {
    const before = revision;
    try {
      const stored = await browser.storage.local.get('indicatorPack');
      if (!disposed && before === revision) render(stored.indicatorPack);
    } catch (error) {
      if (!disposed && before === revision) throw error;
    }
  }

  async function refreshAfterWrite(message: string): Promise<void> {
    try {
      await refresh();
      if (!disposed) status.textContent = message;
    } catch {
      if (!disposed) status.textContent = `${message}; could not refresh pack status. Reopen Settings to retry.`;
    }
  }

  const importPack = (): void => {
    if (disposed || pending) return;
    const file = input.files?.[0];
    input.value = ''; // Allow retry by reselecting the same file.
    if (!file) return;
    const ticket = ++generation;
    revision++; // Invalidate an initial read started before this explicit intent.
    pending = true; controls(); status.textContent = 'Validating local advisory pack…';
    void (async () => {
      if (file.size > MAX_INDICATOR_PACK_BYTES) throw new Error('File exceeds 100 KB maximum');
      const text = await file.text();
      if (disposed || ticket !== generation) return;
      if (new TextEncoder().encode(text).length > MAX_INDICATOR_PACK_BYTES) {
        throw new Error('File exceeds 100 KB maximum');
      }
      const pack = parseIndicatorPack(JSON.parse(text) as unknown);
      if (disposed || ticket !== generation) return;
      // Write one advisory key only. Never enable advisories, alter preferences,
      // fetch evidence URLs or download feeds as a consequence of import.
      await browser.storage.local.set({ indicatorPack: pack });
      if (disposed || ticket !== generation) return;
      revision++;
      await refreshAfterWrite('Local advisory pack imported (not automatically trusted)');
    })().catch(async (error: unknown) => {
      if (!disposed && ticket === generation) {
        try { await refresh(); } catch { /* Preserve the actionable import error. */ }
        if (disposed || ticket !== generation) return;
        status.textContent = `Import rejected: ${error instanceof Error ? error.message : 'Could not import pack; retry'}`;
      }
    }).finally(() => {
      if (!disposed && ticket === generation) { pending = false; controls(); }
    });
  };

  const clearPack = (): void => {
    if (disposed || pending) return;
    const ticket = ++generation;
    revision++; pending = true; controls(); status.textContent = 'Clearing local advisory pack…';
    void browser.storage.local.remove('indicatorPack').then(async () => {
      if (disposed || ticket !== generation) return;
      revision++;
      await refreshAfterWrite('Indicator pack cleared');
    }).catch(async () => {
      if (!disposed && ticket === generation) {
        try { await refresh(); } catch { /* Preserve the actionable removal error. */ }
        if (!disposed && ticket === generation) status.textContent = 'Could not clear indicator pack; retry';
      }
    }).finally(() => {
      if (!disposed && ticket === generation) { pending = false; controls(); }
    });
  };

  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string): void => {
    if (disposed || area !== 'local' || !changes.indicatorPack) return;
    revision++; render(changes.indicatorPack.newValue);
  };
  input.addEventListener('change', importPack);
  remove.addEventListener('click', clearPack);
  browser.storage.onChanged.addListener(onChanged);
  controls();
  void refresh().catch(() => { if (!disposed) packStatus.textContent = 'Could not access pack storage; import or remove to retry'; });
  return () => {
    disposed = true; generation++;
    input.removeEventListener('change', importPack);
    remove.removeEventListener('click', clearPack);
    browser.storage.onChanged.removeListener(onChanged);
  };
}
