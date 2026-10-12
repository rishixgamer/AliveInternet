import type { Decision } from '../core/types.ts';
export interface LabeledDecision { actualSpam: boolean; decision: Decision; }
export interface BinaryMetrics {
  tp: number; tn: number; fp: number; fn: number;
  precision: number | null; recall: number | null; falsePositiveRate: number | null;
}
/** For permissioned labeled datasets only; 'flag' is treated as not collapsed. */
export function evaluateDecisions(rows: readonly LabeledDecision[]): BinaryMetrics {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const {actualSpam, decision} of rows) {
    const hidden = decision === 'collapse';
    if (actualSpam && hidden) tp++;
    else if (actualSpam) fn++;
    else if (hidden) fp++;
    else tn++;
  }
  return { tp, tn, fp, fn, precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
    falsePositiveRate: fp + tn ? fp / (fp + tn) : null };
}
