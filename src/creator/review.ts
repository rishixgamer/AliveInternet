import type { Platform } from '../core/platforms.ts';
import type { AnalyzerEvidence } from '../core/analyzer-ports.ts';
import { NotImplementedError } from '../core/scaffold.ts';

/**
 * GROUNDWORK — feature `creator-mode`.
 * Lets a creator see likely scam comments on THEIR OWN page in one panel, with
 * jump links, so they can remove/report them through the platform's normal UI.
 * AGENTS.md rule 1 still applies: no moderation API calls, no automated
 * deletion, no hidden actions on the creator's behalf.
 */
export interface CreatorReviewItem {
  /** Index into the scanned page items (ephemeral, not persisted). */
  itemIndex: number;
  excerpt: string;
  evidence: AnalyzerEvidence[];
}
export interface CreatorReviewSummary {
  platform: Platform;
  candidates: CreatorReviewItem[];
  caveat: string;
}
export function buildCreatorReview(): CreatorReviewSummary {
  throw new NotImplementedError('creator-mode');
}
