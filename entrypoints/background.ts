import { registerSettingsWriter } from '../src/extension/settings-background.ts';
import { registerSiteAccess } from '../src/extension/site-access-background.ts';
import { browser } from 'wxt/browser';

export default defineBackground(() => {
  // Register synchronously on every worker start; consent is checked again
  // before optional scripts run. Research detectors remain inert.
  registerSettingsWriter();
  registerSiteAccess();
  browser.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
      void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') }).catch(() => {
        // The popup also offers the tour if the browser cannot open a tab.
      });
    }
  });
});
