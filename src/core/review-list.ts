import type { Platform } from './platforms.ts';
import type { ContentKind } from './types.ts';
import type { HideCategory } from './stats.ts';
import type { ContentItem } from './types.ts';

/**
 * Feature `hidden-items-review` — implemented ephemeral record helper.
 * A "Hidden on this page" list in the popup so users can audit every hide in
 * one place and un-hide or report from there. EPHEMERAL: lives in the content
 * script for the current page only, sent to the popup on request, never stored.
 */
export interface HiddenItemRecord {
  /** Element-scoped id valid for this page session only. */
  pageItemId: string;
  platform: Platform;
  kind: ContentKind;
  excerpt: string;
  category: HideCategory;
  reason: string;
}
export const MAX_REVIEW_EXCERPT = 160;

export function toReviewRecord(item: ContentItem & { platform: Platform }, reason: string, category: HideCategory, pageItemId: string): HiddenItemRecord {
  const excerpt = item.text.length > MAX_REVIEW_EXCERPT ? `${item.text.slice(0, MAX_REVIEW_EXCERPT - 1)}…` : item.text;
  return { pageItemId, platform: item.platform, kind: item.kind ?? 'comment', excerpt, category, reason };
}
