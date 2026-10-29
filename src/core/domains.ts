import { parse } from 'tldts';

export interface DomainBoundary {
  hostname: string;
  /** Registrable domain under the bundled ICANN and PRIVATE Public Suffix List. */
  domain: string;
  label: string;
  publicSuffix: string;
  isPrivate: boolean;
}

/**
 * Offline DNS boundaries, never ownership or reputation evidence. Keep private
 * tenants separate (alice.github.io differs from bob.github.io). Unknown suffixes,
 * IP literals, IDNs and trailing-dot names remain unsupported and fail open.
 */
export function domainBoundary(hostname: string): DomainBoundary | undefined {
  if (typeof hostname !== 'string' || hostname.length > 253 || hostname.length === 0) return undefined;
  const host = hostname.toLowerCase();
  // Reject ambiguous syntax before WHATWG URL or PSL canonicalization can repair it.
  const labels = host.split('.');
  if (labels.length < 2 || labels.some(label => label.length > 63 || label.startsWith('xn--') ||
      !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/.test(label))) return undefined;
  const parsed = parse(host, { allowPrivateDomains: true, validateHostname: true, detectIp: true });
  if (parsed.isIp || (!parsed.isIcann && !parsed.isPrivate) ||
      !parsed.domain || !parsed.domainWithoutSuffix || !parsed.publicSuffix) return undefined;
  return { hostname: host, domain: parsed.domain, label: parsed.domainWithoutSuffix,
    publicSuffix: parsed.publicSuffix, isPrivate: parsed.isPrivate === true };
}

/** Strict absolute HTTP(S) URL whose hostname has a supported offline boundary. */
export function validatedDomainUrl(value: string): URL | undefined {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return undefined;
  const authority = value.slice(value.indexOf('://') + 3).split(/[/?#]/, 1)[0];
  // Empty userinfo and percent-encoded hostnames are also ambiguous for advisories.
  if (!authority || /[@%]|[^\x21-\x7e]/.test(authority)) return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        !domainBoundary(url.hostname)) return undefined;
    return url;
  } catch { return undefined; }
}
