/**
 * Feature `link-destination-reveal` — implemented offline decoding.
 *
 * Shows the real destination next to a link, entirely locally (no requests):
 *  - decode platform redirect wrappers, e.g. youtube.com/redirect?q=<target>,
 *    l.facebook.com/l.php?u=<target>, out.reddit.com, t.co (t.co cannot be
 *    decoded offline: show "shortened link" instead of fetching it)
 *  - flag mismatches where the visible link text names one domain and the
 *    href points to another ("deceptive-link")
 * URL shorteners are NEVER expanded over the network.
 */
export interface RevealedLink {
  href: string;
  /** Final destination hostname when decodable offline. */
  destinationHost?: string;
  wrapper?: 'youtube-redirect' | 'facebook-redirect' | 'reddit-out' | 'shortener';
  /** Visible text names a different domain than the destination. */
  textMismatch: boolean;
}

/** Decodes platform redirect wrappers offline; shorteners return undefined (never fetched). */
export function decodeRedirect(href: string): string | undefined {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase();
  // YouTube: https://www.youtube.com/redirect?q=<target>
  if ((host === 'youtube.com' || host.endsWith('.youtube.com')) && url.pathname === '/redirect') {
    const target = url.searchParams.get('q');
    if (target && /^https?:\/\//i.test(target)) return target;
    return undefined;
  }
  // Facebook: https://l.facebook.com/l.php?u=<target>
  if (host === 'l.facebook.com' && url.pathname === '/l.php') {
    const target = url.searchParams.get('u');
    if (target && /^https?:\/\//i.test(target)) return target;
    return undefined;
  }
  // Reddit: https://out.reddit.com/t3_...?url=<target>
  if (host === 'out.reddit.com') {
    const target = url.searchParams.get('url');
    if (target && /^https?:\/\//i.test(target)) return target;
    return undefined;
  }
  return undefined;
}

const SHORTENER_HOSTS = new Set(['t.co', 'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 'goo.gl']);

function hostnameOf(value: string): string | undefined {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    // Visible text may be a bare domain like "example.com/login".
    try {
      return new URL(`https://${value}`).hostname.toLowerCase();
    } catch {
      return undefined;
    }
  }
}

function registrable(host: string): string {
  const parts = host.split('.').filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join('.') : host;
}

/** Decodes wrappers offline and flags text/destination domain mismatches. */
export function revealLink(href: string, visibleText: string): RevealedLink {
  const decoded = decodeRedirect(href);
  const effective = decoded ?? href;
  const destHost = hostnameOf(effective);
  let wrapper: RevealedLink['wrapper'];
  try {
    const originalHost = new URL(href).hostname.toLowerCase();
    if (decoded) {
      if (originalHost.includes('youtube.com')) wrapper = 'youtube-redirect';
      else if (originalHost === 'l.facebook.com') wrapper = 'facebook-redirect';
      else if (originalHost === 'out.reddit.com') wrapper = 'reddit-out';
    } else if (SHORTENER_HOSTS.has(originalHost) || originalHost.endsWith('.t.co')) {
      wrapper = 'shortener';
    }
  } catch {
    // Leave wrapper undefined for unparseable hrefs.
  }
  // Text mismatch: visible text names a domain whose registrable differs.
  let textMismatch = false;
  const textHost = hostnameOf(visibleText.trim());
  if (textHost && destHost && textHost.includes('.') && registrable(textHost) !== registrable(destHost)) {
    textMismatch = true;
  }
  const out: RevealedLink = { href, textMismatch };
  if (destHost && destHost !== hostnameOf(href)) out.destinationHost = destHost;
  else if (decoded && destHost) out.destinationHost = destHost;
  if (wrapper) out.wrapper = wrapper;
  return out;
}
