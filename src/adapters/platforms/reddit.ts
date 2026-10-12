import type { DOMSpec } from '../spec.ts';

/** Reddit DOM selectors: provisional until live-browser verification. */
export const redditSpecs: DOMSpec[] = [
    { kind: 'post', roots: 'shreddit-post, article[data-testid="post-container"]', text: ['[slot="text-body"]', '[slot="title"]', '[data-testid="post-content"]', 'h3'], authorLinks: ['a[slot="authorName"][href]', 'a[href^="/user/"]', 'a[href^="/u/"]'] },
    { kind: 'comment', roots: 'shreddit-comment, [data-testid="comment"]', text: ['[slot="comment"]', '[data-testid="comment-body"]', '[id$="-post-rtjson-content"]'], authorLinks: ['a[slot="comment-author"][href]', 'a[href^="/user/"]', 'a[href^="/u/"]'] },
  ];
