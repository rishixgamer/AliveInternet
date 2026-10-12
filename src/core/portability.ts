import { sanitizeSettings, type Settings } from './preferences.ts';

/**
 * Feature `settings-portability` — implemented local export/import.
 * Export/import of preferences and blocklists (also how people will share
 * blocklists). Imports are UNTRUSTED: run through sanitizeSettings, cap size,
 * and merge blocklists rather than replace by default.
 */
export interface SettingsExport {
  format: 'aliveinternet-settings';
  version: 1;
  exportedAt: string;
  settings: Settings;
}
export type ImportMode = 'merge-blocklist' | 'replace-all';
export const MAX_SETTINGS_IMPORT_BYTES = 200_000;

export function exportSettings(settings: Settings, now: Date = new Date()): SettingsExport {
  const clean = sanitizeSettings(settings);
  return {
    format: 'aliveinternet-settings',
    version: 1,
    exportedAt: now.toISOString(),
    settings: clean,
  };
}
export function importSettings(current: Settings, raw: unknown, mode: ImportMode = 'merge-blocklist'): Settings {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (text.length > MAX_SETTINGS_IMPORT_BYTES) throw new Error('Settings import is too large');
  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const payload = (parsed && typeof parsed === 'object' && 'settings' in (parsed as Record<string, unknown>)
    ? (parsed as { settings: unknown }).settings : parsed);
  const incoming = sanitizeSettings(payload);
  if (mode === 'replace-all') return incoming;
  // Merge blocklists/word lists rather than replacing the user's own hides.
  return sanitizeSettings({
    ...incoming,
    blockedAccounts: [...new Set([...current.blockedAccounts, ...incoming.blockedAccounts])].slice(0, 500),
    allowedAccounts: [...new Set([...current.allowedAccounts, ...incoming.allowedAccounts])].slice(0, 500),
    mutedWords: [...new Set([...current.mutedWords, ...incoming.mutedWords])].slice(0, 200),
  });
}
