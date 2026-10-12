import { browser } from 'wxt/browser';
import type { FilterMode } from '../core/types.ts';

export interface Settings {
  enabled: boolean;
  mode: FilterMode;
  annotateFlagged: boolean;
}

export const DEFAULT_SETTINGS: Settings = { enabled: true, mode: 'balanced', annotateFlagged: false };

export function sanitizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const options = value as Record<string, unknown>;
  return {
    enabled: typeof options.enabled === 'boolean' ? options.enabled : DEFAULT_SETTINGS.enabled,
    mode: options.mode === 'conservative' || options.mode === 'balanced' || options.mode === 'aggressive'
      ? options.mode : DEFAULT_SETTINGS.mode,
    annotateFlagged: typeof options.annotateFlagged === 'boolean' ? options.annotateFlagged : DEFAULT_SETTINGS.annotateFlagged,
  };
}

export async function loadSettings(): Promise<Settings> {
  const saved = await browser.storage.local.get('settings');
  return sanitizeSettings(saved.settings);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings: sanitizeSettings(settings) });
}
