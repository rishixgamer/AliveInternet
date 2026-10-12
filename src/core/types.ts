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
  /*
   * GROUNDWORK (unset by every adapter today). Adapters may populate these only
   * after live-browser verification; see docs/feature-groundwork.md.
   */
  /** Stable per-page thread identifier, for reply-chain analysis. */
  threadId?: string;
  /** `id` of the parent item when this item is a reply. */
  parentId?: string;
  /** Position in page order at scan time; used to find the earliest copy of a comment. */
  observedOrder?: number;
  /** The platform marks this author as the page/channel owner. */
  isCreator?: boolean;
  /** The platform shows this item as pinned by the page owner. */
  isPinned?: boolean;
  /** The platform shows a creator heart/like badge on this item. */
  isCreatorHearted?: boolean;
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
