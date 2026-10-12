import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ThreadSieve',
    description: 'Collapse high-confidence spam comments without sending comment text to a server.',
    permissions: ['storage'],
    version: '0.1.0',
  },
});
