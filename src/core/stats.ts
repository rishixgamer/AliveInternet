import type { LocalActionReason } from './policy.ts';
import { NotImplementedError } from './scaffold.ts';

/**
 * GROUNDWORK — features `toolbar-badge-count` and `shareable-stats-card`.
 *
 * COUNTS ONLY. Never store comment text, account ids, URLs or page titles here.
 * The page tally feeds the toolbar badge; the monthly tally feeds a card the
 * user may screenshot/share themselves (generated locally, never uploaded).
 * Persisting MonthlyStats requires a docs/privacy.md update and a reset control.
 */
export type HideCategory = Exclude<LocalActionReason, 'none'> | 'duplicate' | 'muted-word';

export interface PageTally {
  hidden: number;
  byCategory: Partial<Record<HideCategory, number>>;
}
export interface MonthlyStats {
  /** "YYYY-MM" */
  month: string;
  hidden: number;
  byCategory: Partial<Record<HideCategory, number>>;
}
export interface ShareCardData {
  month: string;
  headline: string; // e.g. "AliveInternet hid 1,284 scam comments this month"
  topCategories: { category: HideCategory; count: number }[];
}

export function tallyPage(_reasons: readonly HideCategory[]): PageTally {
  throw new NotImplementedError('toolbar-badge-count');
}
export function addToMonth(_stats: MonthlyStats | undefined, _tally: PageTally, _now: Date = new Date()): MonthlyStats {
  throw new NotImplementedError('shareable-stats-card');
}
export function shareCard(_stats: MonthlyStats): ShareCardData {
  throw new NotImplementedError('shareable-stats-card');
}
