import { browser } from 'wxt/browser';
import { platformFromHostname, type Platform } from '../core/platforms.ts';
import { loadSettings } from './settings.ts';
import { OPTIONAL_PLATFORMS, SITE_ORIGINS, SITE_ACCESS_CHECK, SITE_ACCESS_SYNC,
  SITE_ACCESS_CHANGED, siteScriptId, isPlatform } from './site-access.ts';

/** Registers listeners synchronously; reconcile runs on every background restart. */
export function registerSiteAccess(): () => void {
  let disposed = false;
  let queue: Promise<void> = Promise.resolve();

  async function notify(revoked = false): Promise<void> {
    // Reading IDs needs no tabs permission. Do not read or retain URLs/history.
    const tabs = await browser.tabs.query({});
    await Promise.all(tabs.map(tab => tab.id === undefined ? Promise.resolve() :
      browser.tabs.sendMessage(tab.id, { type: SITE_ACCESS_CHANGED, revoked }).catch(() => undefined)));
  }

  async function allowed(platform: Platform): Promise<boolean> {
    const settings = await loadSettings();
    // YouTube's static controller must stay available to observe later settings changes.
    if (platform === 'youtube') return browser.permissions.contains({ origins: SITE_ORIGINS.youtube });
    return settings.enabled && settings.platforms[platform] &&
      await browser.permissions.contains({ origins: SITE_ORIGINS[platform] });
  }

  async function reconcile(): Promise<void> {
    if (disposed) return;
    const existing = await browser.scripting.getRegisteredContentScripts();
    const registered = new Set(existing.map(script => script.id));
    for (const platform of OPTIONAL_PLATFORMS) {
      if (disposed) return;
      const id = siteScriptId(platform);
      if (!await allowed(platform)) {
        if (registered.has(id)) await browser.scripting.unregisterContentScripts({ ids: [id] });
        continue;
      }
      const script = { id, matches: SITE_ORIGINS[platform], js: ['content-scripts/social.js'],
        css: ['content-scripts/social.css'], runAt: 'document_idle' as const, persistAcrossSessions: true };
      if (registered.has(id)) await browser.scripting.updateContentScripts([script]);
      else await browser.scripting.registerContentScripts([script]);
    }
    // Already injected pages retain scripts after unregister: explicitly recheck them.
    if (!disposed) await notify();
  }

  function schedule(): Promise<void> {
    const task = queue.then(reconcile);
    queue = task.catch(() => undefined);
    return task;
  }
  function event(): void {
    void schedule().catch(() => console.warn('[AliveInternet] Could not reconcile site access'));
  }
  function removed(): void {
    // Restore existing hides before the registration work can await browser APIs.
    void notify(true).catch(() => undefined);
    event();
  }
  const changed = (changes: { [key: string]: unknown }, area: string): void => {
    if (area === 'local' && changes.settings) event();
  };
  const listener = (message: unknown, sender: { id?: string; url?: string },
    sendResponse: (response: { ok: boolean; allowed?: boolean }) => void): true | undefined => {
    if (!message || typeof message !== 'object') return;
    const value = message as { type?: unknown; platform?: unknown };
    if (value.type !== SITE_ACCESS_CHECK && value.type !== SITE_ACCESS_SYNC) return;
    if (sender.id !== browser.runtime.id) { sendResponse({ ok: false }); return; }
    if (value.type === SITE_ACCESS_SYNC) {
      if (Object.keys(value).some(key => key !== 'type')) { sendResponse({ ok: false }); return; }
      void schedule().then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
      return true;
    }
    if (!isPlatform(value.platform) || Object.keys(value).some(key => key !== 'type' && key !== 'platform')) {
      sendResponse({ ok: false }); return;
    }
    try {
      const url = new URL(sender.url ?? '');
      if (url.protocol !== 'https:' || platformFromHostname(url.hostname) !== value.platform) {
        sendResponse({ ok: false }); return;
      }
    } catch { sendResponse({ ok: false }); return; }
    void allowed(value.platform).then(allowed => sendResponse({ ok: true, allowed }), () => sendResponse({ ok: false }));
    return true;
  };
  browser.runtime.onMessage.addListener(listener);
  browser.storage.onChanged.addListener(changed);
  browser.permissions.onAdded.addListener(event);
  browser.permissions.onRemoved.addListener(removed);
  event();
  return () => {
    disposed = true;
    browser.runtime.onMessage.removeListener(listener);
    browser.storage.onChanged.removeListener(changed);
    browser.permissions.onAdded.removeListener(event);
    browser.permissions.onRemoved.removeListener(removed);
  };
}
