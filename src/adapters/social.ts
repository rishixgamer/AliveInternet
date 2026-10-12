import { profileKey, type Platform } from '../core/platforms.ts';
import { normalizeText } from '../core/normalize.ts';
import type { ContentItem, ContentKind } from '../core/types.ts';
import { collectYouTubeComments } from './youtube.ts';
import { DOM_SPECS } from './spec.ts';
import type { DOMSpec } from './spec.ts';

export interface RenderableItem extends ContentItem {
  platform: Platform;
  kind: ContentKind;
  fingerprint: string;
  element: HTMLElement;
}

/** Does not cross item boundaries when reading text; only a matched content element. */
function firstText(root: HTMLElement, selectors: string[]): { text: string; node: HTMLElement } | undefined {
  for (const selector of selectors) {
    const node = root.querySelector<HTMLElement>(selector);
    const text = normalizeText(node?.textContent ?? '');
    if (node && text.length >= 8 && text.length <= 10_000) return { text, node };
  }
  return undefined;
}

function extract(root: ParentNode, platform: Platform, spec: DOMSpec, remaining: number): RenderableItem[] {
  const items: RenderableItem[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(spec.roots)) {
    if (items.length >= remaining) break;
    // Avoid extracting duplicate nested items with the same spec.
    if (element.parentElement?.closest(spec.roots)) continue;
    const content = firstText(element, spec.text);
    if (!content) continue;
    let author = 'Unknown';
    let accountKey: string | undefined;
    for (const selector of spec.authorLinks) {
      const anchors = element.querySelectorAll<HTMLAnchorElement>(selector);
      for (const anchor of anchors) {
        const key = profileKey(platform, anchor.href, location.href);
        if (!key) continue;
        accountKey = key;
        author = normalizeText(anchor.textContent ?? '') || key;
        break;
      }
      if (accountKey) break;
    }
    const links = [...content.node.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .map(a => a.href).filter(href => /^https?:\/\//i.test(href)).slice(0, 20);
    const fingerprint = `${platform}\u001f${spec.kind}\u001f${accountKey ?? author}\u001f${content.text}`;
    items.push({ id: fingerprint, fingerprint, platform, kind: spec.kind, accountKey, author, text: content.text, links, element });
  }
  return items;
}

export function collectPlatformItems(platform: Platform, root: ParentNode = document): RenderableItem[] {
  const results: RenderableItem[] = [];
  if (platform === 'youtube') {
    for (const item of collectYouTubeComments(root)) {
      if (results.length >= 350) break;
      const anchor = item.element.querySelector<HTMLAnchorElement>('#author-text[href], a#author-text[href], #author-text a[href]');
      const accountKey = anchor ? profileKey('youtube', anchor.href, location.href) : undefined;
      results.push({ ...item, platform, kind: 'comment', accountKey });
    }
  }
  for (const spec of DOM_SPECS[platform]) {
    if (results.length >= 350) break;
    results.push(...extract(root, platform, spec, 350 - results.length));
  }
  return results;
}
