import type { HiddenItemRecord } from '../core/review-list.ts';

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
