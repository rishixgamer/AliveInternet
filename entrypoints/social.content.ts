import '../src/extension/content.css';
import { platformFromHostname } from '../src/core/platforms.ts';
import { startPlatformController } from '../src/extension/controller.ts';
import { SITE_ORIGINS } from '../src/extension/site-access.ts';
import { startWithSiteAccess } from '../src/extension/site-access-content.ts';

export default defineContentScript({
  // The same bundle is registered dynamically for individually consented sites.
  matches: SITE_ORIGINS.youtube,
  runAt: 'document_idle',
  main(ctx) {
    const platform = platformFromHostname(location.hostname);
    if (!platform) return;
    const stop = startWithSiteAccess(platform, () => startPlatformController(platform));
    ctx.onInvalidated(stop);
  },
});
