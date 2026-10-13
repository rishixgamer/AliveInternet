import { defineConfig } from 'wxt';
import { SITE_ORIGINS, OPTIONAL_SITE_ORIGINS } from './src/extension/site-access.ts';

export default defineConfig({
  manifestVersion: 3,
  zip: { excludeSources: ['artifacts/**', 'packages/core/dist/**', '**/*.log', '.env*'] },
  manifest: {
    name: 'AliveInternet',
    description: 'Local, reversible spam filtering, account evidence, and optional public-indicator advisories.',
    permissions: ['storage', 'scripting'],
    host_permissions: SITE_ORIGINS.youtube,
    optional_host_permissions: OPTIONAL_SITE_ORIGINS,
    minimum_chrome_version: '102',
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    browser_specific_settings: {
      // Generated project UUID, never an asserted maintainer email/domain.
      // Keep stable across future releases to preserve Firefox update identity.
      gecko: { id: '{c0c9c54d-10b7-4ac9-833c-e0cca4c1e407}', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } },
    },
    version: '0.3.0',
  },
});
