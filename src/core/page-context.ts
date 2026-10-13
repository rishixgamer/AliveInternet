import type { Platform } from './platforms.ts';

/**
 * GROUNDWORK. Facts about the page itself (not about any commenter) that some
 * planned analyzers need, e.g. the channel owner for impersonation checks.
 * Must come from explicit, on-platform page elements; never inferred.
 */
export interface PageContext {
  platform: Platform;
  /** Validated profile key of the page/channel owner, if the page shows one. */
  ownerAccountKey?: string;
  /** Owner display name exactly as rendered on the page. */
  ownerDisplayName?: string;
  surface: 'watch' | 'feed' | 'profile' | 'thread' | 'unknown';
}
