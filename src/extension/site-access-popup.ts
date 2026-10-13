import { browser } from 'wxt/browser';
import type { Platform } from '../core/platforms.ts';
import { updateSettings, type Settings } from './settings.ts';
import { isPlatform, SITE_ORIGINS, SITE_ACCESS_SYNC } from './site-access.ts';

/** Call directly from a user change/click handler: request must precede any await. */
export async function setSiteAccess(platform: Platform, enabled: boolean): Promise<Settings> {
  if (!isPlatform(platform) || typeof enabled !== 'boolean') throw new Error('Invalid site access');
  let grantedBefore: Promise<boolean | undefined> | undefined;
  if (enabled) {
    // Attach rejection handling immediately; the user may leave the prompt open.
    grantedBefore = browser.permissions.contains({ origins: SITE_ORIGINS[platform] }).catch(() => undefined);
    const granted = await browser.permissions.request({ origins: SITE_ORIGINS[platform] });
    if (!granted) throw new Error('Site access was not granted');
  }
  let settings: Settings;
  try { settings = await updateSettings({ platforms: { [platform]: enabled } }); }
  catch (error) {
    if (platform !== 'youtube' && grantedBefore && await grantedBefore === false) await browser.permissions.remove({ origins: SITE_ORIGINS[platform] });
    throw error;
  }
  if (!enabled && platform !== 'youtube') await browser.permissions.remove({ origins: SITE_ORIGINS[platform] });
  // Wait until the durable preference and registrations agree before announcing success.
  // YouTube remains statically registered; it needs no runtime registration sync.
  const response: unknown = platform === 'youtube' ? { ok: true } :
    await browser.runtime.sendMessage({ type: SITE_ACCESS_SYNC });
  if (!response || typeof response !== 'object' || (response as { ok?: unknown }).ok !== true ||
      (enabled && !await browser.permissions.contains({ origins: SITE_ORIGINS[platform] }))) {
    throw new Error('Could not update site access; retry the action');
  }
  return settings;
}
