import type { FilterMode } from './types.ts';
import type { PageContext } from './page-context.ts';

/**
 * Feature `per-channel-strictness` — implemented pure override.
 * Let users soften (or tighten) filtering on specific channels/subreddits,
 * e.g. a finance educator whose audience legitimately discusses trading.
 * Keyed by the page owner's validated profile key from PageContext, never by
 * topic, language or audience demographics.
 */
export interface ScopeOverride {
  /** `platform:ownerAccountKey`, same format as blockedAccounts. */
  scopeId: string;
  mode: FilterMode | 'off';
}
export const MAX_SCOPE_OVERRIDES = 300;

/** Returns the per-page mode, or global mode when no override matches. */
export function effectiveMode(globalMode: FilterMode, context: PageContext | undefined,
  overrides: readonly ScopeOverride[] = []): FilterMode | 'off' {
  const ownerKey = context?.ownerAccountKey?.toLowerCase();
  if (!ownerKey || overrides.length === 0) return globalMode;
  const scopeId = `${context!.platform}:${ownerKey}`;
  for (const override of overrides) {
    if (override.scopeId.toLowerCase() === scopeId) return override.mode;
  }
  return globalMode;
}
