import type { DOMSpec } from '../spec.ts';

/** X DOM selectors: provisional until live-browser verification. */
export const xSpecs: DOMSpec[] = [
    { kind: 'post', roots: 'article[data-testid="tweet"]', text: ['[data-testid="tweetText"]'], authorLinks: ['[data-testid="User-Name"] a[href]'] },
  ];
