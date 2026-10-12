import { normalizeText } from '../core/normalize.ts';
import type { Comment } from '../core/types.ts';

const ROOT_SELECTOR = 'ytd-comment-thread-renderer, ytd-comment-view-model';

export interface RenderableComment extends Comment {
  element: HTMLElement;
  fingerprint: string;
}

export function collectYouTubeComments(root: ParentNode = document): RenderableComment[] {
  const results: RenderableComment[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    // YouTube often nests a view-model inside a thread renderer. Never process both.
    if (element.matches('ytd-comment-view-model') && element.parentElement?.closest('ytd-comment-thread-renderer')) continue;
    const content = element.querySelector<HTMLElement>('#content-text');
    const text = normalizeText(content?.textContent ?? '');
    if (!text || text.length > 10000) continue;
    const author = normalizeText(element.querySelector<HTMLElement>('#author-text')?.textContent ?? 'Unknown');
    const links = [...(content?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
      .map((a) => a.href)
      .filter((href) => /^https?:\/\//iu.test(href));
    const fingerprint = `${author}\u001f${text}`;
    results.push({ id: fingerprint, fingerprint, author, text, links, element });
  }
  return results;
}
