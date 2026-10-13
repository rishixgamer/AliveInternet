import { normalizeText } from '../core/normalize.ts';
import type { Comment } from '../core/types.ts';

// Collapse individual comments, never a thread container that also owns replies.
const ROOT_SELECTOR = 'ytd-comment-renderer, ytd-comment-view-model';

export interface RenderableComment extends Comment {
  element: HTMLElement;
  fingerprint: string;
}

/** One yield per candidate, including invalid wrappers, so callers can budget work. */
export function* iterateYouTubeComments(root: ParentNode = document): Generator<RenderableComment | undefined> {
  for (const element of root.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    // Some layouts wrap a view-model in a legacy renderer. Use the innermost
    // comment so text, author and reversible hiding share the same boundary.
    if (element.querySelector(ROOT_SELECTOR)) { yield undefined; continue; }
    const content = element.querySelector<HTMLElement>('#content-text');
    const text = normalizeText(content?.textContent ?? '');
    if (!text || text.length > 10000) { yield undefined; continue; }
    const author = normalizeText(element.querySelector<HTMLElement>('#author-text')?.textContent ?? 'Unknown');
    const links = [...(content?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
      .map((a) => a.href)
      .filter((href) => /^https?:\/\//iu.test(href)).slice(0, 20);
    const fingerprint = `${author}\u001f${text}`;
    yield { id: fingerprint, fingerprint, author, text, links, element };
  }
}

/** Eager helper for fixtures; the live controller uses the budgeted iterator. */
export function collectYouTubeComments(root: ParentNode = document): RenderableComment[] {
  return [...iterateYouTubeComments(root)].filter((item): item is RenderableComment => item !== undefined);
}
