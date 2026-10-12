import type { ContentItem } from './types.ts';

/**
 * GROUNDWORK — feature `cross-site-mute-words`.
 * Personal mute words/phrases applied on every enabled site, like X's mute list
 * but local and cross-platform. Planned matching uses duplicateKey-normalized
 * text with whole-word boundaries. Hides are reversible and labelled
 * "muted word (your preference)", never "spam".
 */
export interface MuteSettings { mutedWords: string[]; }
export const DEFAULT_MUTE_SETTINGS: MuteSettings = { mutedWords: [] };
export const MAX_MUTED_WORDS = 200;

/** Inert today: never matches. */
export function mutedWordMatch(_item: ContentItem, _settings: MuteSettings = DEFAULT_MUTE_SETTINGS): string | undefined {
  return undefined;
}
