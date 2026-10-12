/**
 * GROUNDWORK — feature `link-destination-reveal`.
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

/** Inert today: decodes nothing. */
export function decodeRedirect(_href: string): string | undefined { return undefined; }

/** Inert today: reports no wrapper or mismatch. */
export function revealLink(href: string, _visibleText: string): RevealedLink {
  return { href, textMismatch: false };
}
