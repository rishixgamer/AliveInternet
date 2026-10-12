import type { DOMSpec } from '../spec.ts';

/** Threads DOM selectors: provisional until live-browser verification. */
export const threadsSpecs: DOMSpec[] = [
    { kind: 'post', roots: 'article', text: ['[data-testid="postText"]', '[data-testid="post-content"]'], authorLinks: ['a[href^="/@"]'] },
  ];
