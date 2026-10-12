import type { DOMSpec } from '../spec.ts';

/** Tiktok DOM selectors: provisional until live-browser verification. */
export const tiktokSpecs: DOMSpec[] = [
    { kind: 'post', roots: '[data-e2e="recommend-list-item-container"]', text: ['[data-e2e="browse-video-desc"]', '[data-e2e="video-desc"]'], authorLinks: ['a[href^="/@"]'] },
    { kind: 'comment', roots: '[data-e2e="comment-item"]', text: ['[data-e2e="comment-level-1"]', '[data-e2e="comment-text"]'], authorLinks: ['a[href^="/@"]'] },
  ];
