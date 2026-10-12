import type { PageTally } from '../core/stats.ts';
import type { HiddenItemRecord } from '../core/review-list.ts';
import type { ItemExplanation } from '../core/explain.ts';

/**
 * GROUNDWORK — feature `toolbar-badge-count`.
 * Message contract between the content script and a future background
 * entrypoint (content scripts cannot call browser.action.setBadgeText).
 * Not sent or received anywhere yet; no background script exists, so the
 * built manifest is unchanged.
 */
export const PAGE_STATS_MESSAGE = 'aliveinternet/page-stats' as const;
export interface PageStatsMessage {
  type: typeof PAGE_STATS_MESSAGE;
  tally: PageTally;
}
export function isPageStatsMessage(value: unknown): value is PageStatsMessage {
  return Boolean(value) && typeof value === 'object' && (value as {type?: unknown}).type === PAGE_STATS_MESSAGE;
}

/** GROUNDWORK — feature `hidden-items-review`: popup asks the active tab for its hidden items. */
export const HIDDEN_ITEMS_REQUEST = 'aliveinternet/hidden-items' as const;
export interface HiddenItemsRequest { type: typeof HIDDEN_ITEMS_REQUEST; }
export interface HiddenItemsResponse { items: HiddenItemRecord[]; }

/** GROUNDWORK — feature `check-this-comment`: background asks the tab to explain the right-clicked item. */
export const CHECK_ITEM_REQUEST = 'aliveinternet/check-item' as const;
export interface CheckItemRequest { type: typeof CHECK_ITEM_REQUEST; }
export interface CheckItemResponse { explanation?: ItemExplanation; error?: string; }
