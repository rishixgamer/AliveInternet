import { browser } from 'wxt/browser';
import { collectPlatformItems } from '../adapters/social.ts';
import { suspiciousAccounts } from '../core/accounts.ts';
import { assessBatch } from '../core/filter.ts';
import type { Platform } from '../core/platforms.ts';
import { localAction } from '../core/policy.ts';
import type { Assessment } from '../core/types.ts';
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings, setBlockedAccount, type Settings } from './settings.ts';
import { annotateContent, collapseContent, accountAction, type AppliedUi } from './ui.ts';

interface RenderState { key: string; ui: AppliedUi[]; }

export function startPlatformController(platform: Platform): () => void {
  let settings: Settings = structuredClone(DEFAULT_SETTINGS);
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const managed = new Map<HTMLElement, RenderState>();
  const revealed = new Set<string>();
  let lastUrl = location.href;

  function clearManaged() {
    for (const state of managed.values()) for (const ui of state.ui) ui.teardown();
    managed.clear();
  }

  function block(key: string): void {
    void setBlockedAccount(platform, key, true).catch((error: unknown) => {
      console.warn('[ThreadSieve] Could not save local block:', String(error));
      clearManaged();
      schedule();
    });
  }

  function scan() {
    if (disposed) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      revealed.clear();
      clearManaged();
    }
    if (!settings.enabled || !settings.platforms[platform]) { clearManaged(); return; }
    const items = collectPlatformItems(platform);
    const verdicts = assessBatch(items, settings.mode);
    const accountCampaigns = settings.autoCampaignAccounts ? suspiciousAccounts(items, verdicts) : new Set<string>();
    const active = new Set(items.map(item => item.element));
    for (const [el, state] of managed) {
      if (!active.has(el)) { for (const ui of state.ui) ui.teardown(); managed.delete(el); }
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const verdict = verdicts[i]!;
      const actionResult = localAction(item, verdict, settings, accountCampaigns);
      const userBlocked = actionResult.reason === 'user-block';
      const campaignBlocked = actionResult.reason === 'page-campaign';
      const kindEnabled = item.kind === 'comment' ? settings.filterComments : settings.filterPosts;
      const shouldCollapse = actionResult.hide;
      const reason: Assessment = userBlocked
        ? { ...verdict, decision: 'collapse', reason: 'Account on your local blocklist' }
        : campaignBlocked
          ? { ...verdict, decision: 'collapse', reason: 'Multiple distinct high-evidence spam posts from this visible account (not proof of automation)' }
          : verdict;
      const showAction = settings.filterAccounts && settings.showBlockControls && Boolean(item.accountKey) && !userBlocked;
      const key = [item.fingerprint, item.links.join('|'), reason.decision, reason.reason,
        settings.mode, String(settings.annotateFlagged), String(kindEnabled), String(shouldCollapse), String(showAction)].join('\u001f');
      const old = managed.get(item.element);
      if (old?.key === key) continue;
      if (old) for (const ui of old.ui) ui.teardown();
      const ui: AppliedUi[] = [];
      const action = item.accountKey ? () => block(item.accountKey!) : undefined;
      if (shouldCollapse && !revealed.has(item.fingerprint)) {
        ui.push(collapseContent(item.element, reason, item.kind, () => {
          revealed.add(item.fingerprint);
          managed.delete(item.element);
        }, showAction ? item.accountKey : undefined, showAction ? action : undefined));
      } else {
        if (actionResult.annotate) {
          ui.push(annotateContent(item.element, verdict));
        }
        if (showAction && item.accountKey) ui.push(accountAction(item.element, item.accountKey, action!));
      }
      managed.set(item.element, { key, ui });
    }
  }

  function schedule() {
    if (disposed || timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; scan(); }, 450);
  }

  const observer = new MutationObserver((mutations) => {
    // Mutations confined to our own UI should not reschedule full timeline scans.
    const own = mutations.every((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (target?.closest('[class^="threadsieve-"], [class*=" threadsieve-"]')) return true;
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length > 0 && nodes.every(node => node instanceof Element &&
        (node.matches('[class^="threadsieve-"], [class*=" threadsieve-"]') ||
          node.closest('[class^="threadsieve-"], [class*=" threadsieve-"]')));
    });
    if (!own) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  // URL changes are common in social media SPAs; remount through WXT on invalidation
  // and re-scan on browser history/navigation events without scraping history.
  const onNavigation = () => { revealed.clear(); clearManaged(); schedule(); };
  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string) => {
    if (area !== 'local' || !changes.settings) return;
    settings = sanitizeSettings(changes.settings.newValue);
    clearManaged();
    schedule();
  };
  window.addEventListener('yt-navigate-finish', onNavigation);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pageshow', onNavigation);
  browser.storage.onChanged.addListener(onChanged);
  void loadSettings().then(initial => { if (!disposed) { settings = initial; schedule(); } })
    .catch((error: unknown) => console.warn('[ThreadSieve] Could not load preferences:', String(error)));
  schedule();

  return () => {
    disposed = true;
    if (timer !== undefined) clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener('yt-navigate-finish', onNavigation);
    window.removeEventListener('popstate', onNavigation);
    window.removeEventListener('pageshow', onNavigation);
    browser.storage.onChanged.removeListener(onChanged);
    clearManaged();
  };
}
