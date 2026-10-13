/**
 * Feature `link-destination-reveal` — implemented offline decoding.
 *
 * Shows decodable platform redirect destinations and visible-domain mismatches.
 * Domain boundaries include private suffixes; mismatches are observations, not
 * maliciousness or ownership claims. Unsupported/ambiguous inputs fail open.
 * URL shorteners are NEVER expanded over the network.
 */
import { domainBoundary, validatedDomainUrl } from './domains.ts';

export interface RevealedLink {
  href: string;
  /** Final destination hostname when decodable offline. */
  destinationHost?: string;
  wrapper?: 'youtube-redirect' | 'facebook-redirect' | 'reddit-out' | 'shortener';
  /** Visible text names a different registrable domain than the destination. */
  textMismatch: boolean;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const SHORTENER_HOSTS = new Set(['t.co', 'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 'goo.gl']);

function redirectKey(url: URL): string | undefined {
  if (YOUTUBE_HOSTS.has(url.hostname) && url.pathname === '/redirect') return 'q';
  if (url.hostname === 'l.facebook.com' && url.pathname === '/l.php') return 'u';
  if (url.hostname === 'out.reddit.com') return 'url';
  return undefined;
}

/** Decodes one explicit redirect parameter locally; never resolves shorteners. */
export function decodeRedirect(href: string): string | undefined {
  const url = validatedDomainUrl(href);
  if (!url) return undefined;
  const key = redirectKey(url);
  if (!key) return undefined;
  const targets = url.searchParams.getAll(key);
  const target = targets.length === 1 ? targets[0] : undefined;
  return target && validatedDomainUrl(target) ? target : undefined;
}

function visibleHostname(value: string): string | undefined {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return validatedDomainUrl(text)?.hostname;
  // A bare domain may have a path or a port, but never a scheme or credentials.
  const authority = text.split(/[/?#]/, 1)[0];
  if (!authority || !/^[a-z\d.-]+(?::\d{1,5})?$/i.test(authority)) return undefined;
  return validatedDomainUrl(`https://${text}`)?.hostname;
}

/** Decodes wrappers offline and records supported text/destination boundaries. */
export function revealLink(href: string, visibleText: string): RevealedLink {
  const original = validatedDomainUrl(href);
  const out: RevealedLink = { href, textMismatch: false };
  if (!original) return out;
  if (SHORTENER_HOSTS.has(original.hostname)) { out.wrapper = 'shortener'; return out; }
  const decoded = decodeRedirect(href);
  // An unavailable/ambiguous destination cannot be compared to visible text.
  if (redirectKey(original) && !decoded) return out;
  const effective = decoded ? validatedDomainUrl(decoded) : original;
  if (!effective) return out;
  const destination = domainBoundary(effective.hostname);
  const textHost = visibleHostname(visibleText);
  const visible = textHost ? domainBoundary(textHost) : undefined;
  out.textMismatch = Boolean(destination && visible && destination.domain !== visible.domain);
  if (decoded) {
    out.destinationHost = effective.hostname;
    if (YOUTUBE_HOSTS.has(original.hostname)) out.wrapper = 'youtube-redirect';
    else if (original.hostname === 'l.facebook.com') out.wrapper = 'facebook-redirect';
    else if (original.hostname === 'out.reddit.com') out.wrapper = 'reddit-out';
  }
  return out;
}
