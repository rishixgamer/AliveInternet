/** Supported websites, not a claim that every DOM adapter has passed live validation. */
export const PLATFORMS = [
  'youtube', 'x', 'instagram', 'reddit', 'tiktok',
  'facebook', 'threads', 'bluesky', 'linkedin',
] as const;
export type Platform = typeof PLATFORMS[number];
export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube', x: 'X / Twitter', instagram: 'Instagram',
  reddit: 'Reddit', tiktok: 'TikTok', facebook: 'Facebook',
  threads: 'Threads', bluesky: 'Bluesky', linkedin: 'LinkedIn',
};

export function platformFromHostname(hostname: string): Platform | undefined {
  const host = hostname.toLowerCase();
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') return 'youtube';
  if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(host)) return 'x';
  if (host === 'instagram.com' || host === 'www.instagram.com') return 'instagram';
  if (['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com'].includes(host)) return 'reddit';
  if (['tiktok.com', 'www.tiktok.com'].includes(host)) return 'tiktok';
  if (['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(host)) return 'facebook';
  if (['threads.net', 'www.threads.net', 'threads.com', 'www.threads.com'].includes(host)) return 'threads';
  if (host === 'bsky.app') return 'bluesky';
  if (['linkedin.com', 'www.linkedin.com'].includes(host)) return 'linkedin';
  return undefined;
}

/** Only trust explicit profile URLs on the expected platform; never infer IDs from display names. */
export function profileKey(platform: Platform, href: string, base: string): string | undefined {
  let url: URL;
  try { url = new URL(href, base); } catch { return undefined; }
  if (url.protocol !== 'https:' || platformFromHostname(url.hostname) !== platform) return undefined;
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? '';
  const second = segments[1]?.toLowerCase() ?? '';
  const standardHandle = /^[a-z\d._-]{2,40}$/i;
  const clean = (name: string) => standardHandle.test(name) ? `@${name.toLowerCase()}` : undefined;

  switch (platform) {
    case 'youtube': {
      if (first.startsWith('@') && /^@[a-z\d._-]{2,40}$/i.test(first) && segments.length === 1) return first;
      if (['channel', 'user', 'c'].includes(first) && segments.length === 2 && standardHandle.test(second)) return `${first}/${second}`;
      return undefined;
    }
    case 'reddit':
      return (first === 'user' || first === 'u') && segments.length === 2 ? clean(second) : undefined;
    case 'tiktok':
    case 'threads':
      return segments.length === 1 && first.startsWith('@') ? clean(first.slice(1)) : undefined;
    case 'bluesky':
      return first === 'profile' && segments.length === 2 && /^[a-z\d.:-]{3,128}$/i.test(second) ? second : undefined;
    case 'linkedin':
      return ['in', 'company'].includes(first) && segments.length === 2 && standardHandle.test(second) ? `${first}/${second}` : undefined;
    case 'facebook': {
      if (first === 'profile.php' && /^\d{5,25}$/.test(url.searchParams.get('id') ?? '')) return `id/${url.searchParams.get('id')}`;
      const reserved = new Set(['watch', 'groups', 'events', 'photo', 'photos', 'reel', 'reels', 'posts', 'stories', 'marketplace', 'login', 'share', 'profile.php', 'permalink.php', 'pages', 'gaming']);
      return segments.length === 1 && !reserved.has(first) ? clean(first) : undefined;
    }
    case 'x': {
      const reserved = new Set(['home', 'explore', 'search', 'notifications', 'messages', 'i', 'settings', 'compose', 'intent', 'share', 'login', 'signup', 'tos', 'privacy']);
      return segments.length === 1 && !reserved.has(first) && /^[a-z\d_]{1,15}$/i.test(first) ? `@${first}` : undefined;
    }
    case 'instagram': {
      const reserved = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'direct', 'accounts', 'about', 'developer', 'privacy', 'legal', 'challenge']);
      return segments.length === 1 && !reserved.has(first) && /^[a-z\d._]{1,30}$/i.test(first) ? `@${first}` : undefined;
    }
  }
}

export function blockId(platform: Platform, key: string): string {
  return `${platform}:${key}`;
}
