import type { Platform } from './platforms.ts';
import type { ContentKind } from './types.ts';
import type { HideCategory } from './stats.ts';
import { NotImplementedError } from './scaffold.ts';

/**
 * GROUNDWORK — feature `hidden-items-review`.
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

export function toReviewRecord(): HiddenItemRecord {
  throw new NotImplementedError('hidden-items-review');
}
