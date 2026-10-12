import { sanitizeSettings, type Settings } from '../core/preferences.ts';
import { applySettingsMutation, parseSettingsMutation } from './settings-protocol.ts';

interface SettingsStorage {
  read(): Promise<unknown>;
  write(settings: Settings): Promise<void>;
}

/** Instantiate once in the background, never separately in each tab or popup. */
export function createSettingsWriter(storage: SettingsStorage): (input: unknown) => Promise<Settings> {
  let tail: Promise<void> = Promise.resolve();
  return input => {
    // Copy and validate before waiting, so callers cannot alter queued intent.
    const mutation = parseSettingsMutation(input);
    const result = tail.then(async () => {
      const current = sanitizeSettings(await storage.read());
      const next = applySettingsMutation(current, mutation);
      await storage.write(next);
      return next;
    });
    // A rejected read/write must not poison later requests. Each request rereads
    // durable storage; no settings cache or pending operations are persisted.
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}
