import type { ContentItem } from './types.ts';

/**
 * GROUNDWORK — feature `trusted-content-exemptions`.
 *
 * One wrongly hidden creator comment can sink user trust, so these items should
 * never be auto-hidden by rules or analyzers (user blocks still win):
 *  - the page/channel owner's own posts and comments (item.isCreator)
 *  - pinned items (item.isPinned) and creator-hearted items (item.isCreatorHearted)
 *  - accounts on the user's local allowlist
 *
 * Planned settings, NOT yet part of Settings / sanitizeSettings so nothing is
 * stored before it is enforced.
 */
export interface TrustSettings {
  trustCreatorContent: boolean;
  /** `platform:accountKey` ids, same format as Settings.blockedAccounts. */
  allowedAccounts: string[];
}
export const DEFAULT_TRUST_SETTINGS: TrustSettings = { trustCreatorContent: true, allowedAccounts: [] };

export type TrustReason = 'creator' | 'pinned' | 'creator-hearted' | 'allowlisted';

/** Inert today: returns undefined (no exemption), which matches current behavior. */
export function trustReason(_item: ContentItem, _settings: TrustSettings = DEFAULT_TRUST_SETTINGS): TrustReason | undefined {
  return undefined;
}
