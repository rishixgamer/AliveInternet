import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'ThreadSieve',
    description: 'Hide suspicious comments, feed content, and locally blocked accounts across social platforms.',
    permissions: ['storage'],
    version: '0.2.0',
  },
});
