import type { Platform } from './platforms.ts';
export type FilterMode = 'conservative' | 'balanced' | 'aggressive';
export type Decision = 'allow' | 'flag' | 'collapse';
export type ContentKind = 'comment' | 'post';
/** One visible post/comment; never transmitted or persisted by the default extension. */
export interface ContentItem {
  id: string;
  author: string;
  text: string;
  links: string[];
  /** Only present when derived from a validated on-platform profile URL. */
  accountKey?: string;
  platform?: Platform;
  kind?: ContentKind;
}
/** Compatibility alias for the existing rule engine. */
export type Comment = ContentItem;
export interface Assessment {
  id: string;
  decision: Decision;
  /** Uncalibrated rule score, NOT probability of bot status. */
  score: number;
  signals: string[];
  reason: string;
}
