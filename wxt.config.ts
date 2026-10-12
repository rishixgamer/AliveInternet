import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'AliveInternet',
    description: 'Local, reversible spam filtering, account evidence, and optional public-indicator advisories.',
    permissions: ['storage'],
    version: '0.3.0',
  },
});
