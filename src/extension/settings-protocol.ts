import { PLATFORMS, type Platform } from '../core/platforms.ts';
import { parseSettingsLists, sanitizeSettings, withAccountBlock, type Settings } from '../core/preferences.ts';
import { importSettings, parseSettingsImport, type ImportMode } from '../core/portability.ts';

export const SETTINGS_MUTATION_MESSAGE = 'aliveinternet/settings-mutation' as const;
export class AccountHideLimitError extends Error {
  constructor() { super('Local account-hide limit reached (500); unhide an account first'); }
}
export const BOOLEAN_SETTINGS = [
  'enabled', 'annotateFlagged', 'filterComments', 'filterPosts', 'filterAccounts',
  'showBlockControls', 'autoCampaignAccounts', 'dedupeComments', 'inspectAccounts', 'intelAdvisories',
] as const satisfies readonly (keyof Settings)[];

/** Only changed preferences are sent; a stale popup cannot replace the blocklist. */
export type SettingsPatch = Partial<Pick<Settings, typeof BOOLEAN_SETTINGS[number] | 'mode'>> & {
  platforms?: Partial<Settings['platforms']>;
  mutedWords?: string[];
  allowedAccounts?: string[];
  scopeOverrides?: Settings['scopeOverrides'];
};
export type SettingsMutation =
  | { kind: 'preferences'; patch: SettingsPatch }
  | { kind: 'account'; platform: Platform; accountKey: string; blocked: boolean }
  | { kind: 'import'; mode: ImportMode; payload: Settings; expectedSettings?: Settings };
export interface SettingsMutationMessage {
  type: typeof SETTINGS_MUTATION_MESSAGE;
  mutation: SettingsMutation;
}
export type SettingsMutationResponse =
  | { ok: true; settings: Settings }
  | { ok: false; error: string };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error('Unknown settings field');
}

/** Reject malformed messages instead of resetting missing fields to defaults. */
export function parseSettingsMutation(value: unknown): SettingsMutation {
  const mutation = record(value);
  if (mutation.kind === 'import') {
    exactKeys(mutation, ['kind', 'mode', 'payload', 'expectedSettings']);
    if (mutation.mode !== 'merge-blocklist' && mutation.mode !== 'replace-all') throw new Error('Invalid import mode');
    const payload = parseSettingsImport(mutation.payload, mutation.mode);
    if (mutation.mode === 'replace-all') {
      return { kind: 'import', mode: mutation.mode, payload,
        expectedSettings: parseSettingsImport(mutation.expectedSettings, 'replace-all') };
    }
    if (Object.hasOwn(mutation, 'expectedSettings')) throw new Error('Unexpected import snapshot');
    return { kind: 'import', mode: mutation.mode, payload };
  }
  if (mutation.kind === 'account') {
    exactKeys(mutation, ['kind', 'platform', 'accountKey', 'blocked']);
    if (!PLATFORMS.includes(mutation.platform as Platform) || typeof mutation.blocked !== 'boolean' ||
        typeof mutation.accountKey !== 'string' || !/^[a-z\d@._:/-]{2,140}$/i.test(mutation.accountKey)) {
      throw new Error('Invalid account mutation');
    }
    return {
      kind: 'account', platform: mutation.platform as Platform,
      accountKey: mutation.accountKey.toLowerCase(), blocked: mutation.blocked,
    };
  }
  if (mutation.kind !== 'preferences') throw new Error('Unknown settings mutation');
  exactKeys(mutation, ['kind', 'patch']);
  const input = record(mutation.patch);
  exactKeys(input, [...BOOLEAN_SETTINGS, 'mode', 'platforms', 'mutedWords', 'allowedAccounts', 'scopeOverrides']);
  const patch: SettingsPatch = {};
  for (const key of BOOLEAN_SETTINGS) {
    if (!Object.hasOwn(input, key)) continue;
    if (typeof input[key] !== 'boolean') throw new Error('Invalid preference value');
    patch[key] = input[key];
  }
  if (Object.hasOwn(input, 'mode')) {
    if (!['conservative', 'balanced', 'aggressive'].includes(input.mode as string)) {
      throw new Error('Invalid filtering mode');
    }
    patch.mode = input.mode as Settings['mode'];
  }
  if (Object.hasOwn(input, 'platforms')) {
    const platforms = record(input.platforms);
    exactKeys(platforms, PLATFORMS);
    patch.platforms = {};
    for (const platform of PLATFORMS) {
      if (!Object.hasOwn(platforms, platform)) continue;
      if (typeof platforms[platform] !== 'boolean') throw new Error('Invalid platform preference');
      patch.platforms[platform] = platforms[platform];
    }
  }
  // Strictly validate and copy arrays and nested entries before queueing.
  Object.assign(patch, parseSettingsLists(input));
  if (Object.keys(patch).length === 0 ||
      (Object.keys(patch).length === 1 && patch.platforms && Object.keys(patch.platforms).length === 0)) {
    throw new Error('Empty settings patch');
  }
  return { kind: 'preferences', patch };
}

export function applySettingsMutation(settings: Settings, mutation: SettingsMutation): Settings {
  if (mutation.kind === 'import') {
    if (mutation.mode === 'replace-all' &&
        JSON.stringify(sanitizeSettings(settings)) !== JSON.stringify(mutation.expectedSettings)) {
      throw new Error('Settings changed; review the new preview and confirm again');
    }
    return importSettings(settings, mutation.payload, mutation.mode);
  }
  if (mutation.kind === 'account') {
    const next = withAccountBlock(settings, mutation.platform, mutation.accountKey, mutation.blocked);
    // Never silently drop a user's hide when the persisted list is full.
    if (mutation.blocked && !next.blockedAccounts.includes(`${mutation.platform}:${mutation.accountKey}`)) {
      throw new AccountHideLimitError();
    }
    return next;
  }
  return sanitizeSettings({
    ...settings, ...mutation.patch,
    platforms: { ...settings.platforms, ...mutation.patch.platforms },
  });
}
