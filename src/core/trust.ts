import type { ContentItem } from './types.ts';

/**
 * Feature `trusted-content-exemptions` — implemented pure check.
 *
 * One wrongly hidden creator comment can sink user trust, so these items are
 * never auto-hidden by rules or analyzers (user blocks still win):
 *  - the page/channel owner's own posts and comments (item.isCreator)
 *  - pinned items (item.isPinned) and creator-hearted items (item.isCreatorHearted)
 *  - accounts on the user's local allowlist
 */
export interface TrustSettings {
  trustCreatorContent: boolean;
  /** `platform:accountKey` ids, same format as Settings.blockedAccounts. */
  allowedAccounts: string[];
}
export const DEFAULT_TRUST_SETTINGS: TrustSettings = { trustCreatorContent: true, allowedAccounts: [] };

export type TrustReason = 'creator' | 'pinned' | 'creator-hearted' | 'allowlisted';

/** Returns the exemption reason, or undefined when the item is not trusted. */
export function trustReason(item: ContentItem, settings: TrustSettings = DEFAULT_TRUST_SETTINGS): TrustReason | undefined {
  if (settings.trustCreatorContent) {
    if (item.isCreator) return 'creator';
    if (item.isPinned) return 'pinned';
    if (item.isCreatorHearted) return 'creator-hearted';
  }
  const key = item.accountKey?.toLowerCase();
  if (key && item.platform && settings.allowedAccounts.some((entry) => entry.toLowerCase() === `${item.platform}:${key}`)) {
    return 'allowlisted';
  }
  return undefined;
}
