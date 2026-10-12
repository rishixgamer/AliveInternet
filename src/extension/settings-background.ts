import { browser } from 'wxt/browser';
import { AccountHideLimitError, SETTINGS_MUTATION_MESSAGE, type SettingsMutationResponse } from './settings-protocol.ts';
import { createSettingsWriter } from './settings-writer.ts';

export function registerSettingsWriter(): () => void {
  const mutate = createSettingsWriter({
    async read() { return (await browser.storage.local.get('settings')).settings; },
    async write(settings) { await browser.storage.local.set({ settings }); },
  });
  const listener = (
    message: unknown, sender: { id?: string }, sendResponse: (response: SettingsMutationResponse) => void,
  ): true | undefined => {
    if (!message || typeof message !== 'object' ||
        (message as { type?: unknown }).type !== SETTINGS_MUTATION_MESSAGE) return;
    if (sender.id !== browser.runtime.id) {
      sendResponse({ ok: false, error: 'Settings request rejected' });
      return;
    }
    try {
      if (Object.keys(message).some(key => key !== 'type' && key !== 'mutation')) {
        throw new Error('Unexpected message field');
      }
      void mutate((message as { mutation?: unknown }).mutation).then(
        settings => sendResponse({ ok: true, settings }),
        (error: unknown) => sendResponse({
          ok: false,
          error: error instanceof AccountHideLimitError ? error.message : 'Could not save settings; retry the action',
        }),
      );
      // Callback responses support Chrome MV3 and Firefox without relying on
      // Promise-returning onMessage listeners. No timer keeps the worker alive.
      return true;
    } catch {
      sendResponse({ ok: false, error: 'Invalid settings request' });
    }
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
