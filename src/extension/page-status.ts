import { PLATFORMS, PLATFORM_LABELS, type Platform } from '../core/platforms.ts';
import type { Settings } from './settings.ts';
import { SITE_ORIGINS } from './site-access.ts';

export const PAGE_STATUS_REQUEST = 'aliveinternet/page-status';
export interface PageStatus { platform: Platform; enabled: boolean; ready: boolean; total: number; }
export function platformForUrl(value: string | undefined): Platform | undefined {
  try {
    const url = new URL(value!);
    if (url.protocol !== 'https:') return undefined;
    return PLATFORMS.find(platform => SITE_ORIGINS[platform].some(origin => new URL(origin).origin === url.origin));
  } catch { return undefined; }
}
export function parsePageStatus(value: unknown, platform: Platform): PageStatus {
  if (!value || typeof value !== 'object') throw new Error('Page did not respond');
  const data = value as PageStatus & { ok?: unknown };
  if (data.ok === false || data.platform !== platform || typeof data.enabled !== 'boolean' ||
      typeof data.ready !== 'boolean' || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid page response');
  return data;
}
export interface ToolbarState { kind: string; title: string; detail: string; action?: string; count?: number; review?: boolean; }
export function toolbarState(settings: Settings, url: string | undefined, granted: boolean, page?: PageStatus): ToolbarState {
  const platform = platformForUrl(url);
  if (!settings.enabled) return { kind: 'disabled', title: 'Filtering is off', detail: 'Paused on every website. Turn it on here or in Settings.', action: 'Turn on for all websites' };
  if (!url) return { kind: 'permission', title: 'Page access unavailable', detail: 'The browser has not shared this page’s address. Check website access in Settings.' };
  if (!platform) return { kind: 'unsupported', title: 'No filtering here', detail: 'This page is outside the supported websites. YouTube is the focus of this alpha.' };
  const name = PLATFORM_LABELS[platform];
  if (!granted) return { kind: 'permission', title: 'Site access needed', detail: `Allow ${name} in Settings. Your browser asks before granting access.` };
  if (!settings.platforms[platform]) return { kind: 'paused', title: 'Paused on this site', detail: `Content on ${name} stays visible. Other enabled websites are unaffected.`, action: `Resume on ${name}` };
  if (!page) return { kind: 'unavailable', title: 'Page not connected', detail: 'Reload this website after installation or granting access, then refresh here.', action: `Pause on ${name}` };
  if (!page.ready || !page.enabled) return { kind: 'loading', title: 'Waiting for the page', detail: 'Settings are saved. Refresh in a moment to check the page.', action: `Pause on ${name}` };
  return { kind: 'active', title: 'Filtering is active', detail: page.total ? 'Local rules and your preferences changed this page. Review any hide and undo it.' : 'Nothing is hidden right now. Only content loaded on this page is checked.', action: `Pause on ${name}`, count: page.total, review: true };
}
