import { DEFAULT_SETTINGS, parseSettingsLists, sanitizeSettings, type Settings } from './preferences.ts';
import { PLATFORMS } from './platforms.ts';

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
  const backup: SettingsExport = {
    format: 'aliveinternet-settings',
    version: 1,
    exportedAt: now.toISOString(),
    settings: clean,
  };
  if (new TextEncoder().encode(JSON.stringify(backup)).length > MAX_SETTINGS_IMPORT_BYTES) {
    throw new Error('Settings backup exceeds 200,000 bytes; shorten lists before exporting');
  }
  return backup;
}
/** Validate untrusted input and return an independent, canonical snapshot. */
export function parseSettingsImport(raw: unknown, mode: ImportMode = 'merge-blocklist'): Settings {
  if (mode !== 'merge-blocklist' && mode !== 'replace-all') throw new Error('Invalid import mode');
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (!text || new TextEncoder().encode(text).length > MAX_SETTINGS_IMPORT_BYTES) throw new Error('Invalid or oversized settings import');
  const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Settings import must be an object');
  const envelope = parsed as Record<string, unknown>;
  if (Object.hasOwn(envelope, 'settings') && Object.keys(envelope).some(key =>
    !['format', 'version', 'exportedAt', 'settings'].includes(key))) throw new Error('Unknown export field');
  if (Object.hasOwn(envelope, 'format') || Object.hasOwn(envelope, 'version')) {
    if (envelope.format !== 'aliveinternet-settings' || envelope.version !== 1 || !Object.hasOwn(envelope, 'settings')) {
      throw new Error('Unsupported settings export');
    }
  }
  if (Object.hasOwn(envelope, 'exportedAt') && (typeof envelope.exportedAt !== 'string' ||
      !Number.isFinite(Date.parse(envelope.exportedAt)))) throw new Error('Invalid export date');
  const payload = (parsed && typeof parsed === 'object' && 'settings' in (parsed as Record<string, unknown>)
    ? (parsed as { settings: unknown }).settings : parsed);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid settings payload');
  // Backups from earlier builds always carried `scopeOverrides`, a setting that was
  // removed before 1.0. Drop it so those backups still restore.
  const { scopeOverrides: _legacyScopeOverrides, ...fields } = payload as Record<string, unknown>;
  if (!Object.keys(fields).length || Object.keys(fields).some(key => !Object.hasOwn(DEFAULT_SETTINGS, key))) {
    throw new Error('Empty or unknown settings fields');
  }
  // Replacements must be complete backups; partial list imports cannot silently
  // erase unrelated preferences by resetting omitted fields to defaults.
  if (mode === 'replace-all' && Object.keys(DEFAULT_SETTINGS).some(key => !Object.hasOwn(fields, key))) {
    throw new Error('Replace all requires a complete settings backup');
  }
  for (const [key, value] of Object.entries(fields)) {
    if (typeof DEFAULT_SETTINGS[key as keyof Settings] === 'boolean' && typeof value !== 'boolean') throw new Error(`Invalid ${key}`);
  }
  if (Object.hasOwn(fields, 'mode') && !['conservative', 'balanced', 'aggressive'].includes(fields.mode as string)) throw new Error('Invalid mode');
  if (Object.hasOwn(fields, 'platforms')) {
    const platforms = fields.platforms;
    if (!platforms || typeof platforms !== 'object' || Array.isArray(platforms) ||
        Object.entries(platforms).some(([key, value]) => !PLATFORMS.includes(key as typeof PLATFORMS[number]) || typeof value !== 'boolean')) {
      throw new Error('Invalid platform settings');
    }
    if (mode === 'replace-all' && PLATFORMS.some(key => !Object.hasOwn(platforms, key))) {
      throw new Error('Replace all requires complete platform preferences');
    }
  }
  parseSettingsLists(fields);
  return sanitizeSettings(fields);
}

export function importSettings(current: Settings, raw: unknown, mode: ImportMode = 'merge-blocklist'): Settings {
  const incoming = parseSettingsImport(raw, mode);
  if (mode === 'replace-all') return incoming;
  const clean = sanitizeSettings(current);
  // Merge blocklists/word lists rather than replacing the user's own hides.
  const merged = {
    ...clean,
    blockedAccounts: [...new Set([...clean.blockedAccounts, ...incoming.blockedAccounts])],
    allowedAccounts: [...new Set([...clean.allowedAccounts, ...incoming.allowedAccounts])],
    mutedWords: [...new Set([...clean.mutedWords, ...incoming.mutedWords])],
  };
  parseSettingsLists(merged); // Never silently discard overflowed imported entries.
  return sanitizeSettings(merged);
}
