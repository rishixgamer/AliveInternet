import type { ContentItem } from './types.ts';
/** Pluggable analyzers so optional ML cannot silently affect rule-only filtering. */
export type AnalyzerCategory = 'spam' | 'coordination' | 'repetition' | 'synthetic-media' | 'malicious-link'
  // GROUNDWORK categories for scaffolded analyzers in src/detectors/ (none active yet).
  | 'reply-chain' | 'impersonation' | 'copied-comment' | 'profile-bait' | 'obfuscation' | 'generic-filler'
  | 'fake-badge' | 'fake-giveaway' | 'lookalike-domain' | 'deceptive-link';
export interface AnalyzerEvidence {
  category: AnalyzerCategory;
  description: string;
  evidenceIds: string[];
  /** Not a probability. Use only on an independently validated calibrated model. */
  rawScore?: number;
  source: 'rules' | 'local-embeddings' | 'local-classifier' | 'community-rule-list' | 'reviewed-threat-indicator' | 'user-choice';
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
