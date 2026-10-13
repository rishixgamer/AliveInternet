import type { Platform } from './platforms.ts';

/**
 * GROUNDWORK — feature `live-chat-filtering`.
 *
 * Livestream chats (YouTube live chat, Twitch) are flooded by crypto-giveaway
 * and "check my profile" bots. Chat differs from comments: high message rate,
 * short texts, and YouTube renders live chat in an iframe
 * (youtube.com/live_chat), which needs its own content-script match.
 *
 * Twitch is a registered platform (default off) with provisional chat selectors
 * in src/adapters/platforms/twitch.ts, scanned through the generic comment path
 * today. Chat-specific handling (rate budget, flood/repeat evidence over
 * `windowMs`) is the groundwork below.
 */

export interface ChatMessage {
  id: string;
  platform: Platform;
  author: string;
  accountKey?: string;
  text: string;
  links: string[];
  /** Milliseconds since the chat was first observed in this page session. */
  observedAtMs: number;
}
export interface ChatBudget {
  /** Hard cap on messages assessed per second, to protect busy streams. */
  maxMessagesPerSecond: number;
  /** Rolling window used for repeat/flood evidence. */
  windowMs: number;
}
export const DEFAULT_CHAT_BUDGET: ChatBudget = { maxMessagesPerSecond: 30, windowMs: 60_000 };
