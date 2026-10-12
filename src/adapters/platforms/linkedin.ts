import type { DOMSpec } from '../spec.ts';

/** Linkedin DOM selectors: provisional until live-browser verification. */
export const linkedinSpecs: DOMSpec[] = [
    { kind: 'post', roots: '.feed-shared-update-v2', text: ['.feed-shared-update-v2__description', '.feed-shared-text', '.update-components-text'], authorLinks: ['.update-components-actor a[href]', 'a[href*="/in/"]'] },
    { kind: 'comment', roots: '.comments-comment-item', text: ['.comments-comment-item__main-content', '.comments-comment-item__content-body'], authorLinks: ['a[href*="/in/"]'] },
  ];
