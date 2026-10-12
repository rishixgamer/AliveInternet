import type { DOMSpec } from '../spec.ts';

/** Facebook DOM selectors: provisional until live-browser verification. */
export const facebookSpecs: DOMSpec[] = [
    { kind: 'post', roots: '[role="article"]', text: ['[data-ad-preview="message"]', '[data-testid="post_message"]'], authorLinks: ['h3 a[href]', 'strong a[href]'] },
  ];
