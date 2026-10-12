import type { Assessment, ContentItem } from './types.ts';
import { NotImplementedError } from './scaffold.ts';

/**
 * GROUNDWORK — feature `check-this-comment`.
 * Right-click "Check this comment with AliveInternet": explains the signals for
 * ANY item, including ones that were not hidden, and offers "report a miss".
 * Needs the `contextMenus` permission plus a background entrypoint; neither is
 * added yet so the manifest and permission prompt are unchanged.
 */
export interface ItemExplanation {
  assessment: Assessment;
  /** Plain-language lines, e.g. "Mentions Telegram together with crypto profit". */
  lines: string[];
  /** Why it was NOT hidden, when it wasn't (threshold, missing combination, trusted content). */
  notHiddenBecause?: string;
}
export function explainItem(_item: ContentItem): ItemExplanation {
  throw new NotImplementedError('check-this-comment');
}
