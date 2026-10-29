import { browser } from 'wxt/browser';
import { PLATFORM_LABELS } from '../core/platforms.ts';
import { loadSettings, updateSettings, type Settings } from './settings.ts';
import { SITE_ORIGINS } from './site-access.ts';
import { PAGE_STATUS_REQUEST, parsePageStatus, platformForUrl, toolbarState } from './page-status.ts';
import { initializeReviewPopup } from './popup-review.ts';

/** Bounded status reads contain counts only. Excerpts require opening review. */
export function initializeToolbarPopup(root: Document = document): () => void {
  const find = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const toggle = find<HTMLButtonElement>('siteToggle');
  const refresh = find<HTMLButtonElement>('refreshPage');
  const review = find<HTMLButtonElement>('reviewHidden');
  const panel = find<HTMLElement>('reviewPanel');
  const status = find<HTMLElement>('status');
  let disposed = false;
  let version = 0;
  let pending = false;
  let current: Settings | undefined;
  let target: { id?: number; url?: string } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let connectionRetries = 0;
  let onboardingRevision = 0;
  const stopReview = initializeReviewPopup(root, () => { void refreshStatus(); }, () => target?.id);

  function closeReview(): void {
    panel.hidden = true; review.setAttribute('aria-expanded', 'false');
    find<HTMLElement>('hiddenItems').replaceChildren();
    if (root.defaultView) root.dispatchEvent(new root.defaultView.Event('aliveinternet-review-reset'));
  }
  async function refreshStatus(): Promise<void> {
    clearTimeout(retryTimer);
    const ticket = ++version;
    const focused = [toggle, refresh, review].find(control => root.activeElement === control);
    // A routine status read must not swallow a click between pointer down/up.
    // A known site's action keeps its displayed scope until a newer read wins.
    toggle.disabled = pending || !current; refresh.disabled = true; review.disabled = true;
    find<HTMLElement>('pageCount').textContent = '—';
    find<HTMLElement>('pageCard').setAttribute('aria-busy', 'true');
    try {
      const [settings, tabs] = await Promise.all([loadSettings(), browser.tabs.query({ active: true, currentWindow: true })]);
      const tab = tabs[0];
      const platform = platformForUrl(tab?.url);
      const granted = platform ? await browser.permissions.contains({ origins: SITE_ORIGINS[platform] }) : false;
      let page;
      if (platform && granted && settings.enabled && settings.platforms[platform] && typeof tab?.id === 'number') {
        try { page = parsePageStatus(await browser.tabs.sendMessage(tab.id, { type: PAGE_STATUS_REQUEST }), platform); }
        catch { /* An absent content script has its own state, not a zero. */ }
      }
      if (disposed || version !== ticket) return;
      if (target?.id !== tab?.id || target?.url !== tab?.url) closeReview();
      current = settings; target = tab;
      const state = toolbarState(settings, tab?.url, granted, page);
      find<HTMLElement>('pageCard').dataset.state = state.kind;
      find<HTMLElement>('siteName').textContent = platform ? PLATFORM_LABELS[platform] : 'Current page';
      find<HTMLElement>('pageState').textContent = state.title;
      find<HTMLElement>('pageDetail').textContent = state.detail;
      find<HTMLElement>('pageCount').textContent = state.count === undefined ? '—' : String(state.count);
      toggle.textContent = state.action ?? 'Manage website access';
      toggle.disabled = pending;
      toggle.dataset.settings = state.action ? 'false' : 'true';
      review.disabled = !state.review;
      if (!state.review) closeReview();
      // Only startup/settings settling gets bounded retries; no permanent poll.
      if (state.kind === 'loading' && connectionRetries++ < 6) {
        retryTimer = setTimeout(() => { if (!disposed) void refreshStatus(); }, 300);
      } else if (state.kind === 'active') connectionRetries = 0;
    } catch {
      if (disposed || version !== ticket) return;
      current = undefined; closeReview();
      find<HTMLElement>('pageCard').dataset.state = 'error';
      find<HTMLElement>('pageState').textContent = 'Could not load settings';
      find<HTMLElement>('pageDetail').textContent = 'Your preferences were not changed. Refresh to try again.';
      toggle.textContent = 'Settings unavailable'; toggle.disabled = true;
      status.textContent = 'Could not read local settings or browser access.';
    } finally {
      if (!disposed && version === ticket) {
        refresh.disabled = false; find<HTMLElement>('pageCard').setAttribute('aria-busy', 'false');
        if (focused && !focused.disabled && root.activeElement === root.body) focused.focus();
      }
    }
  }
  const change = () => {
    if (!current || pending) return;
    if (toggle.dataset.settings === 'true') {
      void browser.tabs.create({ url: browser.runtime.getURL('/options.html#websites') }).catch(() => { status.textContent = 'Could not open Settings. Use the Settings link above.'; }); return;
    }
    const platform = platformForUrl(target?.url);
    const patch = !current.enabled ? { enabled: true } : platform ? { platforms: { [platform]: !current.platforms[platform] } } : undefined;
    if (!patch) return;
    const hadFocus = root.activeElement === toggle;
    pending = true; toggle.disabled = true; status.textContent = 'Saving…';
    void updateSettings(patch).then(() => {
      if (!disposed) status.textContent = 'Saved. Site preferences apply to all tabs on this website.';
    }).catch(() => {
      if (!disposed) status.textContent = 'Could not save or confirm the change. Refresh to check the current preference, then try again.';
    }).finally(async () => {
      pending = false;
      clearTimeout(timer); // The acknowledged mutation supersedes its storage-event debounce.
      if (!disposed) {
        await refreshStatus();
        if (hadFocus && !disposed && !toggle.disabled && root.activeElement === root.body) toggle.focus();
      }
    });
  };
  const reload = () => { connectionRetries = 0; status.textContent = ''; closeReview(); void refreshStatus(); };
  const openReview = () => {
    panel.hidden = false; review.setAttribute('aria-expanded', 'true');
    find<HTMLButtonElement>('refreshHidden').click();
    find<HTMLElement>('reviewTitle').tabIndex = -1; find<HTMLElement>('reviewTitle').focus();
  };
  const close = () => { closeReview(); review.focus(); };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !panel.hidden) close(); };
  const changed = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area !== 'local') return;
    if (changes.uiOnboardingComplete) { onboardingRevision++; find<HTMLElement>('firstRun').hidden = changes.uiOnboardingComplete.newValue === true; }
    if (changes.settings) schedule();
  };
  const schedule = () => { connectionRetries = 0; clearTimeout(timer); timer = setTimeout(() => { if (!disposed) { closeReview(); void refreshStatus(); } }, 200); };
  toggle.addEventListener('click', change); refresh.addEventListener('click', reload);
  review.addEventListener('click', openReview); find<HTMLElement>('closeReview').addEventListener('click', close);
  root.addEventListener('keydown', escape);
  browser.storage.onChanged.addListener(changed);
  browser.permissions.onAdded.addListener(schedule); browser.permissions.onRemoved.addListener(schedule);
  const beforeOnboardingRead = onboardingRevision;
  void browser.storage.local.get('uiOnboardingComplete').then(saved => {
    if (!disposed && beforeOnboardingRead === onboardingRevision) find<HTMLElement>('firstRun').hidden = saved.uiOnboardingComplete === true;
  }).catch(() => { /* The guide remains accessible when metadata cannot load. */ });
  void refreshStatus();
  return () => {
    disposed = true; version++; clearTimeout(timer); clearTimeout(retryTimer); stopReview();
    toggle.removeEventListener('click', change); refresh.removeEventListener('click', reload);
    review.removeEventListener('click', openReview); find<HTMLElement>('closeReview').removeEventListener('click', close);
    root.removeEventListener('keydown', escape); browser.storage.onChanged.removeListener(changed);
    browser.permissions.onAdded.removeListener(schedule); browser.permissions.onRemoved.removeListener(schedule);
  };
}
