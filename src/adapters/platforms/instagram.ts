import type { DOMSpec } from '../spec.ts';

/** Instagram DOM selectors: provisional until live-browser verification. */
export const instagramSpecs: DOMSpec[] = [
    { kind: 'post', roots: 'article', text: ['[data-testid="post-caption"]', '[data-testid="caption"]', 'h1'], authorLinks: ['header a[href]'] },
    { kind: 'comment', roots: '[data-testid="commentContainer"]', text: ['[data-testid="commentText"]'], authorLinks: ['[data-testid="commentAuthor"] a[href]'] },
  ];
