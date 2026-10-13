import { registerSettingsWriter } from '../src/extension/settings-background.ts';
import { registerSiteAccess } from '../src/extension/site-access-background.ts';

export default defineBackground(() => {
  // Register synchronously on every worker start; consent is checked again
  // before optional scripts run. Research detectors remain inert.
  registerSettingsWriter();
  registerSiteAccess();
});
