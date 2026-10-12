import type { ContentItem } from './types.ts';
/** Pluggable analyzers so optional ML cannot silently affect rule-only filtering. */
export type AnalyzerCategory = 'spam' | 'coordination' | 'repetition' | 'synthetic-media' | 'malicious-link';
export interface AnalyzerEvidence {
  category: AnalyzerCategory;
  description: string;
  evidenceIds: string[];
  /** Not a probability. Use only on an independently validated calibrated model. */
  rawScore?: number;
  source: 'rules' | 'local-embeddings' | 'reviewed-threat-indicator' | 'user-choice';
}
export interface ContentAnalyzer {
  id: string;
  capabilities: AnalyzerCategory[];
  analyze(items: readonly ContentItem[], signal?: AbortSignal): Promise<readonly AnalyzerEvidence[]>;
}
export interface ModelAssetConfig {
  modelId: string;
  requiredConsent: true;
  licenseReviewComplete: boolean;
  sha256: string;
  assetBytes: number;
  execution: 'bundled-webgpu' | 'bundled-wasm';
}
