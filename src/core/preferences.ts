import { PLATFORMS, blockId, type Platform } from './platforms.ts';
import type { FilterMode } from './types.ts';

export interface Settings {
  enabled: boolean;
  mode: FilterMode;
  annotateFlagged: boolean;
  filterComments: boolean;
  filterPosts: boolean;
  filterAccounts: boolean;
  showBlockControls: boolean;
  /** Opt-in: collapse other visible content from accounts with 3+ distinct high-evidence spam items. */
  autoCampaignAccounts: boolean;
  platforms: Record<Platform, boolean>;
  /** User-directed local hides, not changes to a site's own blocklist. */
  blockedAccounts: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true, mode: 'balanced', annotateFlagged: false,
  filterComments: true, filterPosts: true, filterAccounts: true,
  showBlockControls: true, autoCampaignAccounts: false,
  platforms: { youtube: true, x: false, instagram: false, reddit: false,
    tiktok: false, facebook: false, threads: false, bluesky: false, linkedin: false },
  blockedAccounts: [],
};

export function sanitizeSettings(value: unknown): Settings {
  const options: Record<string, unknown> = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const bool = (name: keyof Settings): boolean => typeof options[name] === 'boolean'
    ? options[name] as boolean : DEFAULT_SETTINGS[name] as boolean;
  const platforms = options.platforms && typeof options.platforms === 'object' && !Array.isArray(options.platforms)
    ? options.platforms as Record<string, unknown> : {};
  const normalizedPlatforms = { ...DEFAULT_SETTINGS.platforms };
  for (const platform of PLATFORMS) {
    if (typeof platforms[platform] === 'boolean') normalizedPlatforms[platform] = platforms[platform];
  }
  const validPlatformKeys = new Set<string>(PLATFORMS);
  const blockedAccounts = Array.isArray(options.blockedAccounts)
    ? [...new Set(options.blockedAccounts.filter((v): v is string => typeof v === 'string')
      .map(s => s.toLowerCase()).filter(s => {
        const colon = s.indexOf(':');
        return colon > 0 && validPlatformKeys.has(s.slice(0, colon)) && /^[a-z\d@._:/-]{2,140}$/.test(s.slice(colon + 1));
      }))].slice(0, 500)
    : [];
  return {
    enabled: bool('enabled'),
    mode: options.mode === 'conservative' || options.mode === 'balanced' || options.mode === 'aggressive'
      ? options.mode : DEFAULT_SETTINGS.mode,
    annotateFlagged: bool('annotateFlagged'), filterComments: bool('filterComments'),
    filterPosts: bool('filterPosts'), filterAccounts: bool('filterAccounts'),
    showBlockControls: bool('showBlockControls'), autoCampaignAccounts: bool('autoCampaignAccounts'),
    platforms: normalizedPlatforms, blockedAccounts,
  };
}

export function withAccountBlock(settings: Settings, platform: Platform, accountKey: string, blocked: boolean): Settings {
  const id = blockId(platform, accountKey);
  const next = settings.blockedAccounts.filter(value => value !== id);
  if (blocked) next.push(id);
  return sanitizeSettings({ ...settings, blockedAccounts: next });
}
