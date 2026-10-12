import type { FilterMode } from './types.ts';
import type { PageContext } from './page-context.ts';

/**
 * GROUNDWORK — feature `per-channel-strictness`.
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

/** Inert today: always returns the global mode. */
export function effectiveMode(globalMode: FilterMode, _context: PageContext | undefined,
  _overrides: readonly ScopeOverride[] = []): FilterMode | 'off' {
  return globalMode;
}
