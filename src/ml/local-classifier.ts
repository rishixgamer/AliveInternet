import type { ModelAssetConfig } from '../core/analyzer-ports.ts';

/**
 * GROUNDWORK — feature `local-classifier`.
 * A small quantized on-device classifier (~20 MB) or EmbeddingGemma clustering
 * to catch reworded scam variants that term rules miss. Blocked on the
 * scam-benchmark dataset. Weights: explicit consent, SHA-256 pinning, licence
 * review, device CPU/memory budget, graceful fallback to rules.
 * Output is a raw score, NOT a probability, unless independently calibrated.
 */
export interface DeviceBudget { maxMillisPerBatch: number; maxMemoryMb: number; maxBatchSize: number; }
export interface ClassifierResult { rawScore: number; label: 'scam-like' | 'other'; }
export interface LocalClassifier {
  asset: ModelAssetConfig;
  budget: DeviceBudget;
  classify(texts: readonly string[], signal?: AbortSignal): Promise<readonly ClassifierResult[]>;
}
export const DEFAULT_DEVICE_BUDGET: DeviceBudget = { maxMillisPerBatch: 50, maxMemoryMb: 150, maxBatchSize: 32 };
