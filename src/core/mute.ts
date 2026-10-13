import type { ContentItem } from './types.ts';

/**
 * Feature `cross-site-mute-words` — implemented pure matcher.
 * Personal mute words/phrases applied on every enabled site, like X's mute list
 * but local and cross-platform. Matching uses duplicateKey-normalized
 * text with whole-word boundaries. Hides are reversible and labelled
 * "muted word (your preference)", never "spam".
 */
export interface MuteSettings { mutedWords: string[]; }
export const DEFAULT_MUTE_SETTINGS: MuteSettings = { mutedWords: [] };
export const MAX_MUTED_WORDS = 200;

import { duplicateKey } from './normalize.ts';
/** Returns the matched mute phrase, or undefined when nothing matches. */
export function mutedWordMatch(item: ContentItem, settings: MuteSettings = DEFAULT_MUTE_SETTINGS): string | undefined {
  if (settings.mutedWords.length === 0) return undefined;
  const haystack = ` ${duplicateKey(item.text)} `;
  for (const raw of settings.mutedWords) {
    const phrase = duplicateKey(raw);
    if (!phrase) continue;
    if (haystack.includes(` ${phrase} `)) return raw;
  }
  return undefined;
}
