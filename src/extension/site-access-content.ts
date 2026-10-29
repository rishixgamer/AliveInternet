import { browser } from 'wxt/browser';
import type { Platform } from '../core/platforms.ts';
import { SITE_ACCESS_CHECK, SITE_ACCESS_CHANGED } from './site-access.ts';

/** Fail open on missing authority; revocation tears down UI, timers and observers. */
export function startWithSiteAccess(platform: Platform, start: () => () => void): () => void {
  let stop: (() => void) | undefined;
  let generation = 0;
  let disposed = false;
  async function refresh(revoked = false): Promise<void> {
    const current = ++generation;
    if (revoked) { stop?.(); stop = undefined; }
    try {
      const response: unknown = await browser.runtime.sendMessage({ type: SITE_ACCESS_CHECK, platform });
      if (disposed || current !== generation) return;
      const allowed = response && typeof response === 'object' &&
        (response as { ok?: unknown; allowed?: unknown }).ok === true &&
        (response as { allowed?: unknown }).allowed === true;
      if (allowed && !stop) stop = start();
      else if (!allowed && stop) { stop(); stop = undefined; }
    } catch {
      if (!disposed && current === generation) { stop?.(); stop = undefined; }
    }
  }
  const listener = (message: unknown, sender: { id?: string }): void => {
    if (sender.id !== browser.runtime.id || !message || typeof message !== 'object') return;
    if ((message as { type?: unknown }).type !== SITE_ACCESS_CHANGED) return;
    void refresh((message as { revoked?: unknown }).revoked === true);
  };
  browser.runtime.onMessage.addListener(listener);
  void refresh();
  return () => {
    disposed = true; generation++;
    stop?.(); stop = undefined;
    browser.runtime.onMessage.removeListener(listener);
  };
}
