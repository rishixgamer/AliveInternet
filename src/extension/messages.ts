import type { PageTally } from '../core/stats.ts';
import type { HiddenItemRecord } from '../core/review-list.ts';
import type { ItemExplanation } from '../core/explain.ts';

/**
 * GROUNDWORK — feature `toolbar-badge-count`.
 * Message contract between the content script and a future background
 * entrypoint (content scripts cannot call browser.action.setBadgeText).
 * Not sent or received anywhere yet. The background script handles settings
 * mutations only; this scaffold adds no manifest permissions or badge behavior.
 */
export const PAGE_STATS_MESSAGE = 'aliveinternet/page-stats' as const;
export interface PageStatsMessage {
  type: typeof PAGE_STATS_MESSAGE;
  tally: PageTally;
}
export function isPageStatsMessage(value: unknown): value is PageStatsMessage {
  return Boolean(value) && typeof value === 'object' && (value as {type?: unknown}).type === PAGE_STATS_MESSAGE;
}

/** Ephemeral page review. Excerpts travel only to this extension's popup on request. */
export const HIDDEN_ITEMS_REQUEST = 'aliveinternet/hidden-items' as const;
export const REVEAL_ITEM_REQUEST = 'aliveinternet/reveal-item' as const;
export const REVIEW_PAGE_SIZE = 50;
/** Nonce prevents a stale popup row from targeting a different document. */
export function isPageItemId(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}:\d{1,12}$/i.test(value);
}
export interface HiddenItemsRequest { type: typeof HIDDEN_ITEMS_REQUEST; offset?: number; }
export interface HiddenItemsResponse { items: HiddenItemRecord[]; total: number; truncated: boolean; }
export interface RevealItemRequest { type: typeof REVEAL_ITEM_REQUEST; pageItemId: string; }

/** GROUNDWORK — feature `check-this-comment`: background asks the tab to explain the right-clicked item. */
export const CHECK_ITEM_REQUEST = 'aliveinternet/check-item' as const;
export interface CheckItemRequest { type: typeof CHECK_ITEM_REQUEST; }
export interface CheckItemResponse { explanation?: ItemExplanation; error?: string; }
