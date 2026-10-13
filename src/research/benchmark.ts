import { assessBatch } from '../core/filter.ts';
import { PLATFORMS } from '../core/platforms.ts';
import type { FilterMode } from '../core/types.ts';
import type { Dataset } from './dataset.ts';
import { evaluateDecisions, type LabeledDecision } from './metrics.ts';

/** Rule-only, batches <=350, platform isolated. No adapters, optional analyzers or user policy. */
export function benchmarkDataset(dataset: Dataset) {
  return (['conservative', 'balanced', 'aggressive'] as FilterMode[]).map(mode => {
    const rows: (LabeledDecision & { platform: string; category: string; locale: string })[] = [];
    const batchMs: number[] = [];
    for (const platform of PLATFORMS) {
      const platformItems = dataset.items.filter(item => item.platform === platform);
      for (let offset = 0; offset < platformItems.length; offset += 350) {
        const batch = platformItems.slice(offset, offset + 350);
        const start = performance.now();
        const decisions = assessBatch(batch.map(item => ({ ...item, author: item.accountGroup ?? `item-${item.id}` })), mode);
        batchMs.push(performance.now() - start);
        batch.forEach((item, index) => rows.push({ actualSpam: item.label !== 'legitimate', decision: decisions[index]!.decision, platform, category: item.category ?? 'uncategorized', locale: item.locale }));
      }
    }
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = JSON.stringify([row.platform, row.category, row.locale]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return { mode, overall: evaluateDecisions(rows), flagged: rows.filter(row => row.decision === 'flag').length,
      groups: [...groups].map(([key, members]) => ({ dimensions: JSON.parse(key) as string[], count: members.length, ...evaluateDecisions(members) })),
      latency: { batchLimit: 350, batches: batchMs.length, totalMs: batchMs.reduce((a, b) => a + b, 0), maxBatchMs: Math.max(...batchMs) } };
  });
}
