import type { DOMSpec } from '../spec.ts';

/** Bluesky DOM selectors: provisional until live-browser verification. */
export const blueskySpecs: DOMSpec[] = [
    { kind: 'post', roots: '[data-testid="feedItem"]', text: ['[data-testid="postText"]'], authorLinks: ['a[href^="/profile/"]'] },
  ];
