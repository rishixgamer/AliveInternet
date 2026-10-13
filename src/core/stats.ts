import type { LocalActionReason } from './policy.ts';

/**
 * Features `toolbar-badge-count` and `shareable-stats-card` — implemented counts-only helpers.
 *
 * COUNTS ONLY. Never store comment text, account ids, URLs or page titles here.
 * The page tally feeds the toolbar badge; the monthly tally feeds a card the
 * user may screenshot/share themselves (generated locally, never uploaded).
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
  headline: string; // Counts of reversible local hides, not verified scam identities.
  topCategories: { category: HideCategory; count: number }[];
}

export function tallyPage(reasons: readonly HideCategory[]): PageTally {
  const byCategory: Partial<Record<HideCategory, number>> = {};
  for (const reason of reasons) byCategory[reason] = (byCategory[reason] ?? 0) + 1;
  return { hidden: reasons.length, byCategory };
}
export function addToMonth(stats: MonthlyStats | undefined, tally: PageTally, now: Date = new Date()): MonthlyStats {
  const month = now.toISOString().slice(0, 7);
  const base: MonthlyStats = stats && stats.month === month
    ? { month, hidden: stats.hidden, byCategory: { ...stats.byCategory } }
    : { month, hidden: 0, byCategory: {} };
  base.hidden += tally.hidden;
  for (const [category, count] of Object.entries(tally.byCategory) as [HideCategory, number][]) {
    base.byCategory[category] = (base.byCategory[category] ?? 0) + count;
  }
  return base;
}
export function shareCard(stats: MonthlyStats): ShareCardData {
  const topCategories = Object.entries(stats.byCategory)
    .map(([category, count]) => ({ category: category as HideCategory, count: count as number }))
    .sort((a, b) => b.count - a.count).slice(0, 3);
  return {
    month: stats.month,
    headline: `AliveInternet hid ${stats.hidden} items locally in ${stats.month}`,
    topCategories,
  };
}
