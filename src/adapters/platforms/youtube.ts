import type { DOMSpec } from '../spec.ts';

/** Youtube DOM selectors: provisional until live-browser verification. */
export const youtubeSpecs: DOMSpec[] = [
    { kind: 'post', roots: 'ytd-video-renderer, ytd-rich-grid-media, ytd-compact-video-renderer', text: ['#video-title', 'a#video-title'], authorLinks: ['#channel-name a[href]', 'ytd-channel-name a[href]'] },
    { kind: 'post', roots: 'ytd-backstage-post-thread-renderer', text: ['#content-text', 'ytd-backstage-post-renderer #content-text'], authorLinks: ['#author-text[href]', 'a[href^="/@"]'] },
  ];
