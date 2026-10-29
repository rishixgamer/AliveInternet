import { browser } from 'wxt/browser';

/** UI metadata uses separate primitive keys, never a settings snapshot. */
export function initializeAppearance(root: Document = document): () => void {
  const select = root.querySelector<HTMLSelectElement>('#appearance');
  const status = root.querySelector<HTMLElement>('#status');
  let revision = 0;
  let disposed = false;
  let current = 'system';
  const render = (value: unknown) => {
    if (disposed) return;
    current = value === 'light' || value === 'dark' ? value : 'system';
    if (current === 'system') delete root.documentElement.dataset.theme;
    else root.documentElement.dataset.theme = current;
    if (select) select.value = current;
  };
  const changed = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && changes.uiTheme) { revision++; render(changes.uiTheme.newValue); }
  };
  const edit = () => {
    if (!select) return;
    select.disabled = true;
    void browser.storage.local.set({ uiTheme: select.value }).then(() => {
      if (!disposed && status) status.textContent = 'Appearance saved';
    }).catch(() => {
      render(current);
      if (!disposed && status) status.textContent = 'Could not save appearance. Try again.';
    }).finally(() => { if (!disposed) select.disabled = false; });
  };
  browser.storage.onChanged.addListener(changed);
  const before = revision;
  void browser.storage.local.get('uiTheme').then(saved => {
    if (before === revision) render(saved.uiTheme);
  }).catch(() => { if (!disposed && status) status.textContent = 'Could not load appearance; using system theme.'; });
  select?.addEventListener('change', edit);
  return () => { disposed = true; browser.storage.onChanged.removeListener(changed); select?.removeEventListener('change', edit); };
}
