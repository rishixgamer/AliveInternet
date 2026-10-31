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
import { annotateContent, collapseContent, accountAction, reportMissAction, type AppliedUi } from './ui.ts';
import { buildDraft, type ReportDraft, type ReportKind } from '../feedback/report.ts';
import { toReviewRecord, type HiddenItemRecord } from '../core/review-list.ts';
import { HIDDEN_ITEMS_REQUEST, REVEAL_ITEM_REQUEST, REPORT_DRAFT_REQUEST, REPORT_PENDING_REQUEST, REVIEW_PAGE_SIZE, isPageItemId } from './messages.ts';

interface RenderState { key: string; ui: AppliedUi[]; review?: HiddenItemRecord; fingerprint: string; }

// Bound extraction, rule evaluation and quadratic deduplication per task. Yield
// between batches; DOM selector discovery itself is still a page-wide operation.
const SCAN_BATCH_SIZE = 350;
const BATCH_DELAY_MS = 25;
// Module lifetime exceeds a consent-driven controller restart on the same page.
// Old popup rows must never acquire the ID of a newly managed element.
let nextReviewId = 0;
const reviewSession = crypto.randomUUID();

export function startPlatformController(platform: Platform): () => void {
  let settings: Settings = structuredClone(DEFAULT_SETTINGS);
  let disposed = false;
  let indicatorPack: IndicatorPack | undefined;
  let indicatorRevision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let candidates: Generator<RenderableItem | undefined> | undefined;
  const active = new Set<HTMLElement>();
  let rescanRequested = false;
  let settingsLoaded = false;
  const managed = new Map<HTMLElement, RenderState>();
  const revealed = new Set<string>();
  let lastUrl = location.href;
  // The one staged report draft. Memory only; handed to the popup once, never stored or sent.
  let pendingReport: ReportDraft | undefined;

  /** Re-extract the element now; a recycled node must never be reported or revealed as another item. */
  function currentItem(element: HTMLElement, fingerprint: string): RenderableItem | undefined {
    if (!element.isConnected || !element.parentNode) return undefined;
    for (const candidate of iteratePlatformItems(platform, element.parentNode)) {
      if (candidate?.element === element) return candidate.fingerprint === fingerprint ? candidate : undefined;
    }
    return undefined;
  }

  function draftFor(kind: ReportKind, element: HTMLElement, reason: string): ReportDraft | undefined {
    const state = managed.get(element);
    const item = state && currentItem(element, state.fingerprint);
    if (!item) return undefined;
    let version: string | undefined;
    try { version = browser.runtime.getManifest().version; } catch { /* optional field */ }
    return buildDraft({
      kind, platform, text: item.text, links: item.links, author: item.author,
      accountKey: item.accountKey, reason, mode: settings.mode, version,
    });
  }

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
      pendingReport = undefined;
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
      const duplicate = !actionResult.hide && actionResult.reason !== 'trusted' && kindEnabled && item.kind === 'comment'
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
      const showReport = settings.showReportControls && item.kind === 'comment';
      const key = [item.fingerprint, item.links.join('|'), reason.decision, reason.reason,
        settings.mode, String(settings.annotateFlagged), String(kindEnabled), String(shouldCollapse), String(showAction), String(showInspector), String(showReport),
        String(settings.inspectAccounts), String(settings.dedupeComments),
        ...intelHits.map(hit => hit.observedValue + ':' + hit.source),
        JSON.stringify(inspector)].join('\u001f');
      const old = managed.get(item.element);
      if (old?.key === key && old.ui.every(part => part.isCurrent())) continue;
      if (old) for (const ui of old.ui) ui.teardown();
      const ui: AppliedUi[] = [];
      let review: HiddenItemRecord | undefined;
      const action = item.accountKey ? () => block(item.accountKey!) : undefined;
      if (shouldCollapse && !revealed.has(item.fingerprint)) {
        review = toReviewRecord(item, reason.reason,
          duplicate ? 'duplicate' : actionResult.hide && actionResult.reason !== 'none' ? actionResult.reason : 'content-rule', `${reviewSession}:${++nextReviewId}`);
        ui.push(collapseContent(item.element, reason, item.kind, () => {
          revealed.add(item.fingerprint);
          managed.delete(item.element);
        }, showAction ? item.accountKey : undefined, showAction ? action : undefined, inspector,
        () => { pendingReport = draftFor('wrongly-hidden', item.element, reason.reason); }));
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
        if (showReport) ui.push(reportMissAction(item.element, () => { pendingReport = draftFor('missed', item.element, ''); }));
        if ((showAction || showInspector) && item.accountKey)
          ui.push(accountAction(item.element, item.accountKey, showAction ? action : undefined, inspector));
      }
      managed.set(item.element, { key, ui, review, fingerprint: item.fingerprint });
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
  const onNavigation = () => { revealed.clear(); pendingReport = undefined; clearManaged(); resetPass(); schedule(); };
  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string) => {
    if (area !== 'local') return;
    if (changes.settings) { settings = sanitizeSettings(changes.settings.newValue); settingsLoaded = true; }
    if (changes.indicatorPack) {
      indicatorRevision++;
      try { indicatorPack = parseIndicatorPack(changes.indicatorPack.newValue); }
      catch { indicatorPack = undefined; }
    }
    if (changes.settings || changes.indicatorPack) { clearManaged(); resetPass(); schedule(); }
  };
  window.addEventListener('yt-navigate-finish', onNavigation);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pageshow', onNavigation);
  browser.storage.onChanged.addListener(onChanged);
  // Only the extension popup can request excerpts or reveal local content.
  // No background copy, persistent review history or on-platform action.
  const onMessage = (message: unknown, sender: { id?: string; url?: string }, respond: (value: unknown) => void) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return;
    const input = message as Record<string, unknown>;
    if (input.type !== HIDDEN_ITEMS_REQUEST && input.type !== REVEAL_ITEM_REQUEST &&
        input.type !== REPORT_DRAFT_REQUEST && input.type !== REPORT_PENDING_REQUEST) return;
    if (sender.id !== browser.runtime.id || sender.url !== browser.runtime.getURL('/popup.html')) return;
    if (disposed || location.href !== lastUrl) { respond({ items: [], total: 0, truncated: false, ok: false }); return; }
    if (input.type === REPORT_PENDING_REQUEST) {
      if (Object.keys(input).length !== 1) return;
      const draft = pendingReport; pendingReport = undefined;
      respond({ ok: Boolean(draft), draft }); return;
    }
    if (input.type === REPORT_DRAFT_REQUEST) {
      if (Object.keys(input).some(key => !['type', 'pageItemId'].includes(key)) || !isPageItemId(input.pageItemId)) return;
      const hit = [...managed.entries()].find(([, state]) => state.review?.pageItemId === input.pageItemId);
      const draft = hit ? draftFor('wrongly-hidden', hit[0], hit[1].review!.reason) : undefined;
      respond({ ok: Boolean(draft), draft }); return;
    }
    if (input.type === HIDDEN_ITEMS_REQUEST) {
      if (Object.keys(input).some(key => !['type', 'offset'].includes(key)) ||
          (input.offset !== undefined && (!Number.isSafeInteger(input.offset) || (input.offset as number) < 0))) return;
      const records = [...managed.entries()].filter(([element, state]) => element.isConnected && state.review &&
        state.ui.every(part => part.isCurrent())).map(([, state]) => state.review!);
      const offset = (input.offset as number | undefined) ?? 0;
      const items = records.slice(offset, offset + REVIEW_PAGE_SIZE);
      respond({ items, total: records.length, truncated: offset + items.length < records.length });
      return;
    }
    if (Object.keys(input).some(key => !['type', 'pageItemId'].includes(key)) ||
        !isPageItemId(input.pageItemId)) return;
    const match = [...managed.entries()].find(([, state]) => state.review?.pageItemId === input.pageItemId);
    if (!match) { respond({ ok: false }); return; }
    const [element, state] = match;
    // A renderer can recycle a node between scans. Never reveal a different
    // item on the strength of an obsolete popup row.
    const current = currentItem(element, state.fingerprint);
    const reveal = state.ui.find(part => part.reveal)?.reveal;
    if (!current || !reveal || !state.ui.every(part => part.isCurrent())) {
      respond({ ok: false }); return;
    }
    reveal(); respond({ ok: true }); schedule();
  };
  browser.runtime.onMessage.addListener(onMessage);
  const initialIndicatorRevision = indicatorRevision;
  void browser.storage.local.get('indicatorPack').then(stored => {
    if (disposed || initialIndicatorRevision !== indicatorRevision) return;
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
    pendingReport = undefined;
    resetPass();
    if (timer !== undefined) clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener('yt-navigate-finish', onNavigation);
    window.removeEventListener('popstate', onNavigation);
    window.removeEventListener('pageshow', onNavigation);
    browser.storage.onChanged.removeListener(onChanged);
    browser.runtime.onMessage.removeListener(onMessage);
    clearManaged();
  };
}
