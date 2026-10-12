import { blockId, type Platform } from './platforms.ts';
import type { Assessment, ContentItem } from './types.ts';
import type { Settings } from './preferences.ts';
import { trustReason, DEFAULT_TRUST_SETTINGS, type TrustSettings } from './trust.ts';
import { mutedWordMatch, DEFAULT_MUTE_SETTINGS, type MuteSettings } from './mute.ts';

export type LocalActionReason = 'user-block' | 'page-campaign' | 'content-rule' | 'muted-preference' | 'trusted' | 'none';
export interface LocalAction {
  hide: boolean;
  annotate: boolean;
  reason: LocalActionReason;
  /** Present when reason is muted-preference or trusted. */
  detail?: string;
}

export interface PolicyOptions {
  trust?: TrustSettings;
  mute?: MuteSettings;
}

/** Account hides apply to both comments and posts, independently from rule filtering toggles. */
export function localAction(
  item: ContentItem & {platform: Platform}, verdict: Assessment,
  settings: Settings, pageCampaignAccounts: ReadonlySet<string> = new Set(),
  options: PolicyOptions = {},
): LocalAction {
  if (!settings.enabled || !settings.platforms[item.platform]) return { hide: false, annotate: false, reason: 'none' };
  const actor = item.accountKey ? blockId(item.platform, item.accountKey) : undefined;
  const accountFiltering = settings.filterAccounts && Boolean(actor);
  // Explicit user blocks always win, even over trusted content.
  if (accountFiltering && actor && settings.blockedAccounts.includes(actor)) {
    return {hide: true, annotate: false, reason: 'user-block'};
  }
  // Trusted content is never auto-hidden by rules or campaign gating.
  const trusted = trustReason(item, options.trust ?? DEFAULT_TRUST_SETTINGS);
  if (trusted) return {hide: false, annotate: false, reason: 'trusted', detail: trusted};
  if (accountFiltering && settings.autoCampaignAccounts && actor && pageCampaignAccounts.has(actor)) {
    return {hide: true, annotate: false, reason: 'page-campaign'};
  }
  const eligible = item.kind === 'comment' ? settings.filterComments : settings.filterPosts;
  // Personal mute words are a reversible preference, labelled as such.
  const muted = mutedWordMatch(item, options.mute ?? DEFAULT_MUTE_SETTINGS);
  if (muted && eligible) {
    return {hide: true, annotate: false, reason: 'muted-preference', detail: muted};
  }
  if (!eligible) return {hide: false, annotate: false, reason: 'none'};
  if (verdict.decision === 'collapse') return {hide: true, annotate: false, reason: 'content-rule'};
  return {hide: false, annotate: settings.annotateFlagged && verdict.decision === 'flag', reason: 'none'};
}
