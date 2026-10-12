import { blockId, type Platform } from './platforms.ts';
import type { Assessment, ContentItem } from './types.ts';
import type { Settings } from './preferences.ts';

export type LocalActionReason = 'user-block' | 'page-campaign' | 'content-rule' | 'none';
export interface LocalAction {
  hide: boolean;
  annotate: boolean;
  reason: LocalActionReason;
}

/** Account hides apply to both comments and posts, independently from rule filtering toggles. */
export function localAction(
  item: ContentItem & {platform: Platform}, verdict: Assessment,
  settings: Settings, pageCampaignAccounts: ReadonlySet<string> = new Set(),
): LocalAction {
  if (!settings.enabled || !settings.platforms[item.platform]) return { hide: false, annotate: false, reason: 'none' };
  const actor = item.accountKey ? blockId(item.platform, item.accountKey) : undefined;
  const accountFiltering = settings.filterAccounts && Boolean(actor);
  if (accountFiltering && actor && settings.blockedAccounts.includes(actor)) {
    return {hide: true, annotate: false, reason: 'user-block'};
  }
  if (accountFiltering && settings.autoCampaignAccounts && actor && pageCampaignAccounts.has(actor)) {
    return {hide: true, annotate: false, reason: 'page-campaign'};
  }
  const eligible = item.kind === 'comment' ? settings.filterComments : settings.filterPosts;
  if (!eligible) return {hide: false, annotate: false, reason: 'none'};
  if (verdict.decision === 'collapse') return {hide: true, annotate: false, reason: 'content-rule'};
  return {hide: false, annotate: settings.annotateFlagged && verdict.decision === 'flag', reason: 'none'};
}
