/**
 * Feature `lookalike-domains` — offline, advisory lexical comparison against a
 * supplied reviewed list. Domain boundaries include PRIVATE suffix tenants.
 * A similar spelling never proves impersonation, ownership or maliciousness.
 * The bundled list stays empty until each entry has authoritative verification.
 * IDNs/confusable homographs remain unsupported and produce no advisory.
 */
import { domainBoundary, type DomainBoundary } from '../core/domains.ts';

export interface BrandDomain {
  brand: string;
  /** Official registrable domains, e.g. ["paypal.com", "paypal.me"]. */
  officialDomains: string[];
  /** Caller-reviewed authoritative source; a valid URL alone does not verify it. */
  verifiedFrom: string;
}
export interface LookalikeMatch {
  observedHost: string;
  brand: string;
  technique: 'confusable' | 'edit-distance' | 'brand-plus-keyword';
}

/** Empty until each entry is verified against the brand's own site. */
export const BRAND_DOMAINS: readonly BrandDomain[] = [];
const KEYWORDS = new Set(['support', 'secure', 'login', 'verify', 'verification', 'account',
  'wallet', 'payment', 'official', 'help', 'service']);

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const nextDiag = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = nextDiag;
    }
  }
  return prev[b.length]!;
}

function keywordVariant(observed: string, official: string): boolean {
  // Compare to the verified domain label, not arbitrary words in a brand title.
  const other = observed.startsWith(`${official}-`) ? observed.slice(official.length + 1) :
    observed.endsWith(`-${official}`) ? observed.slice(0, -(official.length + 1)) : undefined;
  return other !== undefined && other.split('-').every(token => KEYWORDS.has(token));
}

/** Compares a bare DNS hostname against a caller-reviewed list (empty by default). */
export function lookalikeOf(host: string, brands: readonly BrandDomain[] = BRAND_DOMAINS): LookalikeMatch | undefined {
  const observed = domainBoundary(host);
  if (!observed || brands.length === 0) return undefined;
  const reviewed = brands.map(brand => ({ brand, domains: brand.officialDomains
    .map(official => domainBoundary(official))
    .filter((domain): domain is DomainBoundary => Boolean(domain && domain.hostname === domain.domain)) }));
  // Exempt every reviewed official domain before spelling comparisons. Otherwise
  // an earlier list entry could falsely accuse a later entry's legitimate domain.
  if (reviewed.some(entry => entry.domains.some(domain => domain.domain === observed.domain))) return undefined;
  for (const { brand, domains } of reviewed) {
    for (const official of domains) {
      if (official.label.length < 4 || observed.label.length < 4) continue;
      const maxDistance = Math.min(official.label.length, observed.label.length) >= 7 ? 2 : 1;
      if (observed.label !== official.label && editDistance(observed.label, official.label) <= maxDistance) {
        return { observedHost: observed.hostname, brand: brand.brand, technique: 'edit-distance' };
      }
      if (keywordVariant(observed.label, official.label)) {
        return { observedHost: observed.hostname, brand: brand.brand, technique: 'brand-plus-keyword' };
      }
    }
  }
  return undefined;
}
