import '../src/extension/content.css';
import { platformFromHostname } from '../src/core/platforms.ts';
import { startPlatformController } from '../src/extension/controller.ts';

export default defineContentScript({
  matches: [
    'https://www.youtube.com/*', 'https://youtube.com/*', 'https://m.youtube.com/*',
    'https://x.com/*', 'https://www.x.com/*', 'https://twitter.com/*', 'https://www.twitter.com/*',
    'https://www.instagram.com/*', 'https://instagram.com/*',
    'https://www.reddit.com/*', 'https://reddit.com/*', 'https://old.reddit.com/*', 'https://new.reddit.com/*',
    'https://www.tiktok.com/*', 'https://tiktok.com/*',
    'https://www.facebook.com/*', 'https://facebook.com/*', 'https://m.facebook.com/*',
    'https://www.threads.net/*', 'https://threads.net/*',
    'https://www.threads.com/*', 'https://threads.com/*',
    'https://bsky.app/*', 'https://www.linkedin.com/*', 'https://linkedin.com/*',
    'https://www.twitch.tv/*', 'https://twitch.tv/*', 'https://m.twitch.tv/*',
  ],
  runAt: 'document_idle',
  main(ctx) {
    const platform = platformFromHostname(location.hostname);
    if (!platform) return;
    const stop = startPlatformController(platform);
    ctx.onInvalidated(stop);
  },
});
