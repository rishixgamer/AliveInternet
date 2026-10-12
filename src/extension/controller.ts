import { browser } from 'wxt/browser';
import { iteratePlatformItems, type RenderableItem } from '../adapters/social.ts';
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

// Bound extraction, rule evaluation and quadratic deduplication per task. Yield
// between batches; DOM selector discovery itself is still a page-wide operation.
const SCAN_BATCH_SIZE = 350;
const BATCH_DELAY_MS = 25;

export function startPlatformController(platform: Platform): () => void {
  let settings: Settings = structuredClone(DEFAULT_SETTINGS);
  let disposed = false;
  let indicatorPack: IndicatorPack | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let candidates: Generator<RenderableItem | undefined> | undefined;
  const active = new Set<HTMLElement>();
  let rescanRequested = false;
  let settingsLoaded = false;
  const managed = new Map<HTMLElement, RenderState>();
  const revealed = new Set<string>();
  let lastUrl = location.href;

  function clearManaged() {
    for (const state of managed.values()) for (const ui of state.ui) ui.teardown();
    managed.clear();
  }

  function resetPass() {
    candidates = undefined;
    active.clear();
    rescanRequested = false;
  }

  function block(key: string): void {
    void setBlockedAccount(platform, key, true).catch((error: unknown) => {
      console.warn('[AliveInternet] Could not save local block:', String(error));
      clearManaged();
      resetPass();
      schedule();
    });
  }

  function scan() {
    if (disposed) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      revealed.clear();
      clearManaged();
      resetPass();
    }
    if (!settingsLoaded || !settings.enabled || !settings.platforms[platform]) {
      clearManaged(); resetPass(); return;
    }
    if (!candidates) {
      candidates = iteratePlatformItems(platform);
      active.clear();
      // Detached nodes can be released before the rest of a large pass finishes.
      for (const [el, state] of managed) {
        if (!el.isConnected) { for (const ui of state.ui) ui.teardown(); managed.delete(el); }
      }
    }
    const items: RenderableItem[] = [];
    let finished = false;
    for (let n = 0; n < SCAN_BATCH_SIZE; n++) {
      const next = candidates.next();
      if (next.done) { finished = true; break; }
      if (next.value?.element.isConnected) { items.push(next.value); active.add(next.value.element); }
    }
    const verdicts = assessBatch(items, settings.mode);
    const accountCampaigns = settings.autoCampaignAccounts ? suspiciousAccounts(items, verdicts) : new Set<string>();
    const duplicates = settings.dedupeComments ? duplicateComments(items) : new Map();
    const evidence = settings.inspectAccounts ? accountEvidence(items, verdicts) : new Map();
    for (const entry of evidence.values()) entry.limits = 'Current processing batch only (up to 350 page items). No posting history, true location, or verified bot identity. Other batches may contain additional observations.';
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const verdict = verdicts[i]!;
      const actionResult = localAction(item, verdict, settings, accountCampaigns, {
        trust: { trustCreatorContent: true, allowedAccounts: settings.allowedAccounts },
        mute: { mutedWords: settings.mutedWords },
      });
      const userBlocked = actionResult.reason === 'user-block';
      const campaignBlocked = actionResult.reason === 'page-campaign';
      const mutedPreference = actionResult.reason === 'muted-preference';
      const kindEnabled = item.kind === 'comment' ? settings.filterComments : settings.filterPosts;
      // Duplicate collapsing is a *readability preference*, not bot detection.
      // Never hide the anchor copy or override a user's disabled content surface.
      const duplicate = !actionResult.hide && kindEnabled && item.kind === 'comment'
        ? duplicates.get(i) : undefined;
      const shouldCollapse = actionResult.hide || Boolean(duplicate);
      const baseReason: Assessment = userBlocked
        ? { ...verdict, decision: 'collapse', reason: 'Account on your local blocklist' }
        : mutedPreference
          ? { ...verdict, decision: 'collapse', reason: `Muted word (your preference): “${actionResult.detail}”` }
          : campaignBlocked
          ? { ...verdict, decision: 'collapse', reason: 'Multiple distinct high-evidence spam posts from this account in the current processing batch (not proof of automation)' }
          : verdict;
      const reason: Assessment = duplicate
        ? { ...baseReason, decision: 'collapse', reason: `Near-duplicate long comment seen from ${duplicate.independentAccounts} distinct accounts in this processing batch; the first copy remains visible (not proof of automation)` }
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
        JSON.stringify(inspector)].join('\u001f');
      const old = managed.get(item.element);
      if (old?.key === key && old.ui.every(part => part.isCurrent())) continue;
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
    if (!finished) { schedule(BATCH_DELAY_MS); return; }
    // Only a complete pass can say that a previously managed item is no longer
    // recognized. Being outside this batch must never restore an earlier hide.
    for (const [el, state] of managed) {
      if (!active.has(el) || !el.isConnected) {
        for (const ui of state.ui) ui.teardown();
        managed.delete(el);
      }
    }
    const again = rescanRequested;
    resetPass();
    if (again) schedule();
  }

  function schedule(delay = 450) {
    if (disposed || timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; scan(); }, delay);
  }

  const observer = new MutationObserver((mutations) => {
    // Mutations confined to our own UI should not reschedule full timeline scans.
    const own = mutations.every((mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      // Removing one of our nodes can also be a site renderer discarding UI.
      // Check just the affected item, not every managed element on the page.
      const affected = (target ? managed.get(target as HTMLElement) : undefined) ??
        (mutation.nextSibling instanceof Element ? managed.get(mutation.nextSibling as HTMLElement) : undefined);
      if (affected && !affected.ui.every(part => part.isCurrent())) return false;
      if (target?.closest('[class^="aliveinternet-"], [class*=" aliveinternet-"]')) return true;
      const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
      return nodes.length > 0 && nodes.every(node => node instanceof Element &&
        (node.matches('[class^="aliveinternet-"], [class*=" aliveinternet-"]') ||
          node.closest('[class^="aliveinternet-"], [class*=" aliveinternet-"]')));
    });
    // Complete the current pass before restarting, even on a busy feed. Endless
    // mutation bursts must not continually send the cursor back to item one.
    if (!own) { if (candidates) rescanRequested = true; schedule(); }
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ['href'],
  });

  // URL changes are common in social media SPAs; remount through WXT on invalidation
  // and re-scan on browser history/navigation events without scraping history.
  const onNavigation = () => { revealed.clear(); clearManaged(); resetPass(); schedule(); };
  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string) => {
    if (area !== 'local') return;
    if (changes.settings) { settings = sanitizeSettings(changes.settings.newValue); settingsLoaded = true; }
    if (changes.indicatorPack) {
      try { indicatorPack = parseIndicatorPack(changes.indicatorPack.newValue); }
      catch { indicatorPack = undefined; }
    }
    if (changes.settings || changes.indicatorPack) { clearManaged(); resetPass(); schedule(); }
  };
  window.addEventListener('yt-navigate-finish', onNavigation);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pageshow', onNavigation);
  browser.storage.onChanged.addListener(onChanged);
  void browser.storage.local.get('indicatorPack').then(stored => {
    try { indicatorPack = parseIndicatorPack(stored.indicatorPack); } catch { indicatorPack = undefined; }
    if (!disposed) { clearManaged(); resetPass(); schedule(); }
  }).catch(() => { /* Advisory packs fail open. */ });
  void loadSettings().then(initial => {
    if (!disposed && !settingsLoaded) { settings = initial; settingsLoaded = true; resetPass(); schedule(); }
  })
    .catch((error: unknown) => console.warn('[AliveInternet] Could not load preferences:', String(error)));
  schedule();

  return () => {
    disposed = true;
    resetPass();
    if (timer !== undefined) clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener('yt-navigate-finish', onNavigation);
    window.removeEventListener('popstate', onNavigation);
    window.removeEventListener('pageshow', onNavigation);
    browser.storage.onChanged.removeListener(onChanged);
    clearManaged();
  };
}
