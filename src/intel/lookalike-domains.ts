/**
 * Feature `lookalike-domains` — implemented matcher over a verified list.
 *
 * Detects domains imitating well-known brands (binance-support.co,
 * paypa1-secure.net) by comparing against a bundled, reviewed list of official
 * brand domains: confusable skeletons (src/core/obfuscation.ts), small edit
 * distance on the registrable label, and brand-name-plus-keyword patterns.
 * Local only; no DNS, WHOIS or reputation lookups. A match is evidence for
 * policy.ts, never an automatic block on its own. The bundled list stays
 * empty until each entry is verified against the brand's own site.
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

import { foldConfusables } from '../core/obfuscation.ts';

/** Empty until each entry is verified against the brand's own site. */
export const BRAND_DOMAINS: readonly BrandDomain[] = [];

function registrable(host: string): string {
  const normalized = host.toLowerCase().replace(/\.+$/, '');
  const parts = normalized.split('.').filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join('.') : normalized;
}

function labelOf(host: string): string {
  return registrable(host).split('.')[0] ?? '';
}

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

/** Compares an observed host against verified brand domains (empty by default). */
export function lookalikeOf(host: string, brands: readonly BrandDomain[] = BRAND_DOMAINS): LookalikeMatch | undefined {
  const observed = host.toLowerCase().trim();
  if (!observed || brands.length === 0) return undefined;
  const observedRegistrable = registrable(observed);
  const observedLabel = labelOf(observed);
  const observedSkeleton = foldConfusables(observedLabel);
  for (const brand of brands) {
    const brandKey = brand.brand.toLowerCase();
    for (const official of brand.officialDomains) {
      const officialRegistrable = registrable(official);
      if (observedRegistrable === officialRegistrable) return undefined;
      const officialLabel = labelOf(official);
      // Confusable skeleton match (e.g. Cyrillic 'а' for Latin 'a').
      if (officialLabel && observedSkeleton === foldConfusables(officialLabel) &&
          observedLabel !== officialLabel) {
        return { observedHost: observed, brand: brand.brand, technique: 'confusable' };
      }
      // Confusable skeleton: dynamic import avoided here; caller normalizes first.
      // Edit distance on the registrable label (typosquats like paypa1).
      if (officialLabel && observedLabel.length >= 4 &&
          editDistance(observedLabel, officialLabel) <= 2 && observedLabel !== officialLabel) {
        return { observedHost: observed, brand: brand.brand, technique: 'edit-distance' };
      }
      // Brand-plus-keyword: "paypal-secure", "binance-support".
      if (observedLabel.includes(brandKey) && observedRegistrable !== officialRegistrable &&
          observedLabel.length > brandKey.length) {
        return { observedHost: observed, brand: brand.brand, technique: 'brand-plus-keyword' };
      }
    }
  }
  return undefined;
}
