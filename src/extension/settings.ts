import { browser } from 'wxt/browser';
import { DEFAULT_SETTINGS, sanitizeSettings, withAccountBlock, type Settings } from '../core/preferences.ts';
import type { Platform } from '../core/platforms.ts';
import type { ImportMode } from '../core/portability.ts';
import { SETTINGS_MUTATION_MESSAGE, type SettingsMutation, type SettingsPatch } from './settings-protocol.ts';
export { DEFAULT_SETTINGS, sanitizeSettings, withAccountBlock, type Settings };
export type { SettingsPatch };

export async function loadSettings(): Promise<Settings> {
  const saved = await browser.storage.local.get('settings');
  return sanitizeSettings(saved.settings);
}
async function mutateSettings(mutation: SettingsMutation): Promise<Settings> {
  const response: unknown = await browser.runtime.sendMessage({ type: SETTINGS_MUTATION_MESSAGE, mutation });
  if (!response || typeof response !== 'object') throw new Error('Settings writer unavailable');
  const result = response as { ok?: unknown; settings?: unknown; error?: unknown };
  if (result.ok !== true || !result.settings || typeof result.settings !== 'object') {
    throw new Error(typeof result.error === 'string' ? result.error : 'Could not save settings');
  }
  return sanitizeSettings(result.settings);
}
export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return mutateSettings({ kind: 'preferences', patch });
}
export async function setBlockedAccount(platform: Platform, accountKey: string, blocked: boolean): Promise<Settings> {
  return mutateSettings({ kind: 'account', platform, accountKey, blocked });
}
/** Imports share the background writer with all popup preferences and tab hides. */
export async function importSettingsSnapshot(payload: Settings, mode: ImportMode, expectedSettings?: Settings): Promise<Settings> {
  return mutateSettings(mode === 'replace-all'
    ? { kind: 'import', mode, payload, expectedSettings }
    : { kind: 'import', mode, payload });
}
