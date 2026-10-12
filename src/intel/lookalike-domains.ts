/**
 * GROUNDWORK — feature `lookalike-domains`.
 *
 * Detects domains imitating well-known brands (binance-support.co,
 * paypa1-secure.net) by comparing against a bundled, reviewed list of official
 * brand domains: confusable skeletons (src/core/obfuscation.ts), small edit
 * distance on the registrable label, and brand-name-plus-keyword patterns.
 * Local only; no DNS, WHOIS or reputation lookups. A match is evidence for
 * policy.ts, never an automatic block on its own.
 */
export interface BrandDomain {
  brand: string;
  /** Official registrable domains, e.g. ["paypal.com", "paypal.me"]. */
  officialDomains: string[];
  /** Source used to verify the official domains (CLAUDE.md: authoritative verification). */
  verifiedFrom: string;
}
export interface LookalikeMatch {
  observedHost: string;
  brand: string;
  technique: 'confusable' | 'edit-distance' | 'brand-plus-keyword';
}

/** Empty until each entry is verified against the brand's own site. */
export const BRAND_DOMAINS: readonly BrandDomain[] = [];

/** Inert today: never matches. */
export function lookalikeOf(_host: string, _brands: readonly BrandDomain[] = BRAND_DOMAINS): LookalikeMatch | undefined {
  return undefined;
}
