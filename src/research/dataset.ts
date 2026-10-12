import type { Platform } from '../core/platforms.ts';
import type { AnalyzerCategory } from '../core/analyzer-ports.ts';
import { NotImplementedError } from '../core/scaffold.ts';

/**
 * GROUNDWORK — feature `scam-benchmark`. See benchmark/README.md.
 * Labelled items for measuring precision / false-positive rate with
 * evaluateDecisions(). Only synthetic, permissioned or de-identified data;
 * no usernames or profile URLs (accountGroup is an opaque per-dataset id).
 */
export type Label = 'scam' | 'spam' | 'legitimate';
export interface LabeledItem {
  id: string;
  platform: Platform;
  kind: 'comment' | 'post';
  text: string;
  links: string[];
  label: Label;
  category?: AnalyzerCategory;
  locale: string;
  /** Opaque grouping id so duplicate/reply-chain logic can be evaluated without identities. */
  accountGroup?: string;
  threadId?: string;
  parentId?: string;
}
export interface DatasetManifest {
  name: string;
  version: string;
  license: string;
  provenance: string;
  split: 'train' | 'dev' | 'test';
  items: number;
}
export function parseDataset(_value: unknown): LabeledItem[] {
  throw new NotImplementedError('scam-benchmark');
}
