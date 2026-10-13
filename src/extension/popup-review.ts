import { browser } from 'wxt/browser';
import { PLATFORMS } from '../core/platforms.ts';
import type { HiddenItemRecord } from '../core/review-list.ts';
import { HIDDEN_ITEMS_REQUEST, REVEAL_ITEM_REQUEST, REVIEW_PAGE_SIZE, isPageItemId, type HiddenItemsResponse } from './messages.ts';

/** Explicit, page-local review; never stores excerpts or requests browsing history. */
export function initializeReviewPopup(root: Document = document): () => void {
  const refresh = root.querySelector<HTMLButtonElement>('#refreshHidden')!;
  const previous = root.querySelector<HTMLButtonElement>('#previousHidden')!;
  const next = root.querySelector<HTMLButtonElement>('#nextHidden')!;
  const list = root.querySelector<HTMLElement>('#hiddenItems')!;
  const summary = root.querySelector<HTMLElement>('#hiddenSummary')!;
  let disposed = false;
  let busy = false;
  let offset = 0;
  let tabId: number | undefined;
  let total = 0;
  let epoch = 0;

  function controls(): void {
    refresh.disabled = busy;
    previous.disabled = busy || offset === 0;
    next.disabled = busy || offset + REVIEW_PAGE_SIZE >= total;
  }

  function parse(value: unknown): HiddenItemsResponse {
    if (!value || typeof value !== 'object') throw new Error('Review unavailable');
    const response = value as HiddenItemsResponse;
    if (!Array.isArray(response.items) || response.items.length > REVIEW_PAGE_SIZE ||
        !Number.isSafeInteger(response.total) || response.total < response.items.length || typeof response.truncated !== 'boolean') {
      throw new Error('Invalid page response');
    }
    for (const item of response.items) {
      if (!item || typeof item !== 'object' || !isPageItemId(item.pageItemId) ||
          !PLATFORMS.includes(item.platform) || !['comment', 'post'].includes(item.kind) ||
          typeof item.excerpt !== 'string' || item.excerpt.length > 160 ||
          typeof item.reason !== 'string' || item.reason.length > 2000) throw new Error('Invalid review item');
    }
    return response;
  }

  async function load(reset = false): Promise<void> {
    if (busy || disposed) return;
    if (reset) offset = 0;
    busy = true; controls();
    const request = ++epoch;
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (typeof tab?.id !== 'number') throw new Error('No active page');
      if (tabId !== undefined && tabId !== tab.id) offset = 0;
      tabId = tab.id;
      let data = parse(await browser.tabs.sendMessage(tab.id, { type: HIDDEN_ITEMS_REQUEST, offset }));
      if (offset >= data.total && offset > 0) {
        offset = Math.max(0, Math.floor((data.total - 1) / REVIEW_PAGE_SIZE) * REVIEW_PAGE_SIZE);
        data = parse(await browser.tabs.sendMessage(tab.id, { type: HIDDEN_ITEMS_REQUEST, offset }));
      }
      if (disposed || request !== epoch) return;
      total = data.total;
      summary.textContent = total ? `Showing ${offset + 1}–${offset + data.items.length} of ${total} locally hidden items.` : 'No items currently hidden on this page.';
      list.replaceChildren();
      for (const item of data.items) append(item, tab.id);
    } catch {
      if (!disposed) {
        total = 0; list.replaceChildren();
        summary.textContent = 'Review unavailable here. Open an enabled supported website, reload it after granting site access, then refresh.';
      }
    } finally { busy = false; if (!disposed) controls(); }
  }

  function append(item: HiddenItemRecord, sourceTab: number): void {
    const row = root.createElement('li'); row.className = 'review-row';
    const excerpt = root.createElement('p'); excerpt.textContent = item.excerpt;
    const reason = root.createElement('p'); reason.className = 'hint'; reason.textContent = item.reason;
    const reveal = root.createElement('button'); reveal.type = 'button'; reveal.textContent = 'Show temporarily';
    reveal.setAttribute('aria-label', `Reveal ${item.kind}: ${item.excerpt.slice(0, 60)}`);
    reveal.addEventListener('click', () => {
      if (disposed || reveal.disabled) return;
      reveal.disabled = true;
      const listEpoch = epoch;
      void browser.tabs.sendMessage(sourceTab, { type: REVEAL_ITEM_REQUEST, pageItemId: item.pageItemId }).then((result: unknown) => {
        if (disposed || epoch !== listEpoch || tabId !== sourceTab) return;
        if (!result || typeof result !== 'object' || (result as { ok?: unknown }).ok !== true) {
          summary.textContent = 'That item changed or is no longer hidden. Refresh the list.';
          reveal.disabled = false; return;
        }
        row.remove(); total = Math.max(0, total - 1);
        summary.textContent = 'Item revealed temporarily. Refresh for the current list.';
        controls();
      }).catch(() => {
        if (!disposed && epoch === listEpoch && tabId === sourceTab) {
          summary.textContent = 'Could not reveal this item; refresh and retry.'; reveal.disabled = false;
        }
      });
    });
    row.append(excerpt, reason, reveal); list.append(row);
  }

  const reload = () => { void load(true); };
  const backward = () => { if (!busy && offset > 0) { offset -= REVIEW_PAGE_SIZE; void load(); } };
  const forward = () => { if (!busy && offset + REVIEW_PAGE_SIZE < total) { offset += REVIEW_PAGE_SIZE; void load(); } };
  refresh.addEventListener('click', reload);
  previous.addEventListener('click', backward);
  next.addEventListener('click', forward);
  controls();
  return () => {
    disposed = true; epoch++;
    refresh.removeEventListener('click', reload);
    previous.removeEventListener('click', backward);
    next.removeEventListener('click', forward);
    list.replaceChildren();
  };
}
