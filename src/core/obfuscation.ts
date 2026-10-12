/**
 * GROUNDWORK — feature `obfuscation-normalization`.
 *
 * Spammers dodge keyword rules with look-alike characters ("Tеlеgram" with
 * Cyrillic е), spaced letters ("T e l e g r a m") and phone numbers. These
 * helpers are inert today (identity / empty) so nothing changes until they are
 * implemented with tests, then fed into filter.ts.
 */
export type ContactHandleKind = 'phone' | 'telegram' | 'whatsapp' | 'email' | 'social-handle';
export interface ContactHandle { kind: ContactHandleKind; value: string; }

/** Planned: Unicode TR39 confusable skeleton (map look-alikes to a canonical form). */
export function foldConfusables(text: string): string { return text; }

/** Planned: "T e l e g r a m" -> "Telegram", only for runs of >= 4 single letters. */
export function collapseSpacedLetters(text: string): string { return text; }

/** Planned: phone numbers, t.me / wa.me links, @handles named alongside a messaging app. */
export function extractContactHandles(_text: string): ContactHandle[] { return []; }
