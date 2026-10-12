import type { Settings } from './preferences.ts';
import { NotImplementedError } from './scaffold.ts';

/**
 * GROUNDWORK — feature `settings-portability`.
 * Export/import of preferences and blocklists (also how people will share
 * blocklists). Imports are UNTRUSTED: run through sanitizeSettings, cap size,
 * show a diff, and merge blocklists rather than replace by default.
 */
export interface SettingsExport {
  format: 'aliveinternet-settings';
  version: 1;
  exportedAt: string;
  settings: Settings;
}
export type ImportMode = 'merge-blocklist' | 'replace-all';
export const MAX_SETTINGS_IMPORT_BYTES = 200_000;

export function exportSettings(_settings: Settings, _now: Date = new Date()): SettingsExport {
  throw new NotImplementedError('settings-portability');
}
export function importSettings(_current: Settings, _raw: unknown, _mode: ImportMode = 'merge-blocklist'): Settings {
  throw new NotImplementedError('settings-portability');
}
