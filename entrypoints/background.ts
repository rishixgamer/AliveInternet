import { registerSettingsWriter } from '../src/extension/settings-background.ts';

export default defineBackground(() => {
  // Register synchronously on every worker start. This writer only processes
  // explicit local settings actions; scaffolded message features remain inert.
  registerSettingsWriter();
});
