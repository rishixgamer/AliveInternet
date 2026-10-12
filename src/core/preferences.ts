import { PLATFORMS, blockId, type Platform } from './platforms.ts';
import type { FilterMode } from './types.ts';
import type { ScopeOverride } from './scopes.ts';

export interface Settings {
  enabled: boolean;
  mode: FilterMode;
  annotateFlagged: boolean;
  filterComments: boolean;
  filterPosts: boolean;
  filterAccounts: boolean;
  /** Opt-in readability: keep first long repeated comment visible. */
  dedupeComments: boolean;
  /** Account evidence from visible items only (no profile scraping). */
  inspectAccounts: boolean;
  /** Opt-in advisories from manually imported indicator pack; never auto-block. */
  intelAdvisories: boolean;
  showBlockControls: boolean;
  /** Opt-in: collapse other visible content from accounts with 3+ distinct high-evidence spam items. */
  autoCampaignAccounts: boolean;
  platforms: Record<Platform, boolean>;
  /** User-directed local hides, not changes to a site's own blocklist. */
  blockedAccounts: string[];
  /** Cross-site personal mute words (reversible preference, never "spam"). */
  mutedWords: string[];
  /** Never auto-hide these accounts (`platform:key` ids). */
  allowedAccounts: string[];
  /** Per-channel filtering strength, keyed by page owner (never demographics). */
  scopeOverrides: ScopeOverride[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true, mode: 'balanced', annotateFlagged: false,
  filterComments: true, filterPosts: true, filterAccounts: true,
  dedupeComments: false, inspectAccounts: true, intelAdvisories: false,
  showBlockControls: true, autoCampaignAccounts: false,
  platforms: { youtube: true, x: false, instagram: false, reddit: false,
    tiktok: false, facebook: false, threads: false, bluesky: false, linkedin: false, twitch: false },
  blockedAccounts: [],
  mutedWords: [],
  allowedAccounts: [],
  scopeOverrides: [],
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
  const accountId = (s: string): boolean => {
    const colon = s.indexOf(':');
    return colon > 0 && validPlatformKeys.has(s.slice(0, colon)) && /^[a-z\d@._:/-]{2,140}$/.test(s.slice(colon + 1));
  };
  const blockedAccounts = Array.isArray(options.blockedAccounts)
    ? [...new Set(options.blockedAccounts.filter((v): v is string => typeof v === 'string')
      .map(s => s.toLowerCase()).filter(accountId))].slice(0, 500)
    : [];
  const allowedAccounts = Array.isArray(options.allowedAccounts)
    ? [...new Set(options.allowedAccounts.filter((v): v is string => typeof v === 'string')
      .map(s => s.toLowerCase()).filter(accountId))].slice(0, 500)
    : [];
  const mutedWords = Array.isArray(options.mutedWords)
    ? [...new Set(options.mutedWords.filter((v): v is string => typeof v === 'string')
      .map(s => s.trim().toLowerCase()).filter(s => s.length >= 2 && s.length <= 80))].slice(0, 200)
    : [];
  const scopeOverrides: ScopeOverride[] = Array.isArray(options.scopeOverrides)
    ? options.scopeOverrides.filter((v): v is ScopeOverride =>
      Boolean(v) && typeof v === 'object' && typeof (v as ScopeOverride).scopeId === 'string' &&
      accountId((v as ScopeOverride).scopeId.toLowerCase()) &&
      ((v as ScopeOverride).mode === 'off' || (v as ScopeOverride).mode === 'conservative' ||
       (v as ScopeOverride).mode === 'balanced' || (v as ScopeOverride).mode === 'aggressive'))
      .map(v => ({ scopeId: v.scopeId.toLowerCase(), mode: v.mode })).slice(0, 300)
    : [];
  return {
    enabled: bool('enabled'),
    mode: options.mode === 'conservative' || options.mode === 'balanced' || options.mode === 'aggressive'
      ? options.mode : DEFAULT_SETTINGS.mode,
    annotateFlagged: bool('annotateFlagged'), filterComments: bool('filterComments'),
    filterPosts: bool('filterPosts'), filterAccounts: bool('filterAccounts'),
    showBlockControls: bool('showBlockControls'), autoCampaignAccounts: bool('autoCampaignAccounts'),
    dedupeComments: bool('dedupeComments'), inspectAccounts: bool('inspectAccounts'),
    intelAdvisories: bool('intelAdvisories'),
    platforms: normalizedPlatforms, blockedAccounts,
    mutedWords, allowedAccounts, scopeOverrides,
  };
}

export function withAccountBlock(settings: Settings, platform: Platform, accountKey: string, blocked: boolean): Settings {
  const id = blockId(platform, accountKey);
  const next = settings.blockedAccounts.filter(value => value !== id);
  if (blocked) next.push(id);
  return sanitizeSettings({ ...settings, blockedAccounts: next });
}
