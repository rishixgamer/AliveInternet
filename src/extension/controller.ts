import { browser } from 'wxt/browser';
import { collectPlatformItems } from '../adapters/social.ts';
import { suspiciousAccounts } from '../core/accounts.ts';
import { accountEvidence } from '../core/behavior.ts';
import { duplicateComments } from '../core/dedupe.ts';
import { parseIndicatorPack, matchIndicators, type IndicatorPack } from '../intel/indicators.ts';
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
  let indicatorPack: IndicatorPack | undefined;
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
      console.warn('[AliveInternet] Could not save local block:', String(error));
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
    const duplicates = settings.dedupeComments ? duplicateComments(items) : new Map();
    const evidence = settings.inspectAccounts ? accountEvidence(items, verdicts) : new Map();
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
      // Duplicate collapsing is a *readability preference*, not bot detection.
      // Never hide the anchor copy or override a user's disabled content surface.
      const duplicate = !actionResult.hide && kindEnabled && item.kind === 'comment'
        ? duplicates.get(i) : undefined;
      const shouldCollapse = actionResult.hide || Boolean(duplicate);
      const baseReason: Assessment = userBlocked
        ? { ...verdict, decision: 'collapse', reason: 'Account on your local blocklist' }
        : campaignBlocked
          ? { ...verdict, decision: 'collapse', reason: 'Multiple distinct high-evidence spam posts from this visible account (not proof of automation)' }
          : verdict;
      const reason: Assessment = duplicate
        ? { ...baseReason, decision: 'collapse', reason: `Near-duplicate long comment seen from ${duplicate.independentAccounts} distinct visible accounts; the first copy remains visible (not proof of automation)` }
        : baseReason;
      const intelHits = settings.intelAdvisories && indicatorPack
        ? matchIndicators(item, indicatorPack) : [];
      const inspector = item.accountKey ? evidence.get(`${platform}:${item.accountKey}`) : undefined;
      const showAction = settings.filterAccounts && settings.showBlockControls && Boolean(item.accountKey) && !userBlocked;
      const showInspector = settings.inspectAccounts && Boolean(item.accountKey);
      const key = [item.fingerprint, item.links.join('|'), reason.decision, reason.reason,
        settings.mode, String(settings.annotateFlagged), String(kindEnabled), String(shouldCollapse), String(showAction), String(showInspector),
        String(settings.inspectAccounts), String(settings.dedupeComments),
        ...intelHits.map(hit => hit.observedValue + ':' + hit.source),
        String(inspector?.itemsObserved ?? 0), String(inspector?.collapsedByRules ?? 0)].join('\u001f');
      const old = managed.get(item.element);
      if (old?.key === key) continue;
      if (old) for (const ui of old.ui) ui.teardown();
      const ui: AppliedUi[] = [];
      const action = item.accountKey ? () => block(item.accountKey!) : undefined;
      if (shouldCollapse && !revealed.has(item.fingerprint)) {
        ui.push(collapseContent(item.element, reason, item.kind, () => {
          revealed.add(item.fingerprint);
          managed.delete(item.element);
        }, showAction ? item.accountKey : undefined, showAction ? action : undefined, inspector));
      } else {
        if (actionResult.annotate) {
          ui.push(annotateContent(item.element, verdict));
        }
        if (intelHits.length) {
          const indicator = intelHits[0]!;
          ui.push(annotateContent(item.element, {
            ...verdict, decision: 'flag',
            reason: `User-imported advisory pack “${indicator.source}” matched ${indicator.indicator.kind} ${indicator.observedValue}. Not a verified bot claim. Review provenance: ${indicator.indicator.evidenceUrl}`,
          }));
        }
        if ((showAction || showInspector) && item.accountKey)
          ui.push(accountAction(item.element, item.accountKey, showAction ? action : undefined, inspector));
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
      if (target?.closest('[class^="aliveinternet-"], [class*=" aliveinternet-"]')) return true;
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length > 0 && nodes.every(node => node instanceof Element &&
        (node.matches('[class^="aliveinternet-"], [class*=" aliveinternet-"]') ||
          node.closest('[class^="aliveinternet-"], [class*=" aliveinternet-"]')));
    });
    if (!own) schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  // URL changes are common in social media SPAs; remount through WXT on invalidation
  // and re-scan on browser history/navigation events without scraping history.
  const onNavigation = () => { revealed.clear(); clearManaged(); schedule(); };
  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string) => {
    if (area !== 'local') return;
    if (changes.settings) settings = sanitizeSettings(changes.settings.newValue);
    if (changes.indicatorPack) {
      try { indicatorPack = parseIndicatorPack(changes.indicatorPack.newValue); }
      catch { indicatorPack = undefined; }
    }
    if (changes.settings || changes.indicatorPack) { clearManaged(); schedule(); }
  };
  window.addEventListener('yt-navigate-finish', onNavigation);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pageshow', onNavigation);
  browser.storage.onChanged.addListener(onChanged);
  void browser.storage.local.get('indicatorPack').then(stored => {
    try { indicatorPack = parseIndicatorPack(stored.indicatorPack); } catch { indicatorPack = undefined; }
    if (!disposed) { clearManaged(); schedule(); }
  }).catch(() => { /* Advisory packs fail open. */ });
  void loadSettings().then(initial => { if (!disposed) { settings = initial; schedule(); } })
    .catch((error: unknown) => console.warn('[AliveInternet] Could not load preferences:', String(error)));
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
