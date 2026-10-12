import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, sanitizeSettings, withAccountBlock, type Settings } from '../core/preferences.ts';
import type { Platform } from '../core/platforms.ts';
export { DEFAULT_SETTINGS, sanitizeSettings, withAccountBlock, type Settings };

export async function loadSettings(): Promise<Settings> {
  const saved = await browser.storage.local.get('settings');
  return sanitizeSettings(saved.settings);
}
export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings: sanitizeSettings(settings) });
}
export async function setBlockedAccount(platform: Platform, accountKey: string, blocked: boolean): Promise<void> {
  const current = await loadSettings();
  await saveSettings(withAccountBlock(current, platform, accountKey, blocked));
}
