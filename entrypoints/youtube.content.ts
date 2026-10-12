import '../src/extension/content.css';
import { startYouTubeController } from '../src/extension/controller.ts';

export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    const stop = startYouTubeController();
    ctx.onInvalidated(stop);
  },
});
