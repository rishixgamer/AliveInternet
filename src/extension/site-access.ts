import { PLATFORMS, type Platform } from '../core/platforms.ts';

/** Exact HTTPS hosts supported by the adapters. No subdomain or scheme wildcard. */
export const SITE_ORIGINS: Record<Platform, string[]> = {
  youtube: ['https://www.youtube.com/*', 'https://youtube.com/*', 'https://m.youtube.com/*'],
  x: ['https://x.com/*', 'https://www.x.com/*', 'https://twitter.com/*', 'https://www.twitter.com/*'],
  instagram: ['https://www.instagram.com/*', 'https://instagram.com/*'],
  reddit: ['https://www.reddit.com/*', 'https://reddit.com/*', 'https://old.reddit.com/*', 'https://new.reddit.com/*'],
  tiktok: ['https://www.tiktok.com/*', 'https://tiktok.com/*'],
  facebook: ['https://www.facebook.com/*', 'https://facebook.com/*', 'https://m.facebook.com/*'],
  threads: ['https://www.threads.net/*', 'https://threads.net/*', 'https://www.threads.com/*', 'https://threads.com/*'],
  bluesky: ['https://bsky.app/*'],
  linkedin: ['https://www.linkedin.com/*', 'https://linkedin.com/*'],
  twitch: ['https://www.twitch.tv/*', 'https://twitch.tv/*', 'https://m.twitch.tv/*'],
};
export const OPTIONAL_PLATFORMS = PLATFORMS.filter(platform => platform !== 'youtube');
export const OPTIONAL_SITE_ORIGINS = OPTIONAL_PLATFORMS.flatMap(platform => SITE_ORIGINS[platform]);
export const SITE_ACCESS_CHECK = 'aliveinternet/site-access-check';
export const SITE_ACCESS_SYNC = 'aliveinternet/site-access-sync';
export const SITE_ACCESS_CHANGED = 'aliveinternet/site-access-changed';
export const siteScriptId = (platform: Platform): string => `aliveinternet-site-${platform}`;
export const isPlatform = (value: unknown): value is Platform => typeof value === 'string' && PLATFORMS.includes(value as Platform);
