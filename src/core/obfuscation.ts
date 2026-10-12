/**
 * Feature `obfuscation-normalization` — implemented pure helpers.
 *
 * Spammers dodge keyword rules with look-alike characters ("Tеlеgram" with
 * Cyrillic е), spaced letters ("T e l e g r a m") and phone numbers. These
 * helpers normalize text before rule matching in filter.ts.
 */

/** Confusable skeleton map: Cyrillic/Greek look-alikes -> Latin canonical form. */
const CONFUSABLE_MAP: Record<string, string> = {
  // Cyrillic lower/upper -> Latin
  'а': 'a', 'А': 'a', 'е': 'e', 'Е': 'e', 'ё': 'e', 'Ё': 'e',
  'о': 'o', 'О': 'o', 'р': 'p', 'Р': 'p', 'с': 'c', 'С': 'c',
  'х': 'x', 'Х': 'x', 'у': 'y', 'У': 'y', 'к': 'k', 'К': 'k',
  'м': 'm', 'М': 'm', 'н': 'h', 'Н': 'h', 'т': 't', 'Т': 't',
  'в': 'b', 'В': 'b', 'н\u0306': 'h',
  // Greek look-alikes
  'α': 'a', 'Α': 'a', 'ε': 'e', 'Ε': 'e', 'ο': 'o', 'Ο': 'o',
  'ρ': 'p', 'Ρ': 'p', 'ς': 's', 'Σ': 's', 'σ': 's', 'κ': 'k', 'Κ': 'k',
  'μ': 'm', 'Μ': 'm', 'ν': 'v', 'Ν': 'v', 'τ': 't', 'Τ': 't',
  'χ': 'x', 'Χ': 'x', 'ι': 'i', 'Ι': 'i', 'η': 'n', 'Η': 'n',
  // Misc symbols commonly abused
  '“': '"', '”': '"', '‘': "'", '’': "'",
};

export type ContactHandleKind = 'phone' | 'telegram' | 'whatsapp' | 'email' | 'social-handle';
export interface ContactHandle { kind: ContactHandleKind; value: string; }

/** Unicode TR39-style confusable skeleton (canonical Latin fold + NFKC). */
export function foldConfusables(text: string): string {
  const normalized = text.normalize('NFKC');
  let out = '';
  for (const ch of normalized) {
    out += CONFUSABLE_MAP[ch] ?? ch;
  }
  return out;
}

/** "T e l e g r a m" -> "Telegram", only for runs of >= 4 single letters. */
export function collapseSpacedLetters(text: string): string {
  return text.replace(/\b(?:[A-Za-z]\s+){3,}[A-Za-z]\b/g, (run) => run.replace(/\s+/g, ''));
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const TELEGRAM_LINK_RE = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[A-Za-z0-9_]{3,64}(?:\/[A-Za-z0-9_]+)*/gi;
const WHATSAPP_LINK_RE = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send)[^\s]*/gi;
const PHONE_RE = /(?:\+\d[\d\s().-]{6,}\d|\b\d[\d\s().-]{8,}\d\b)/g;
const HANDLE_RE = /@[A-Za-z0-9_]{3,30}/g;
const MESSAGING_CONTEXT_RE = /telegram|whatsapp|contact\s+me|message\s+me|\bdm\s+me|\btext\s+me/i;

/** Phone/email/messenger links/@handles named alongside a messaging app. */
export function extractContactHandles(text: string): ContactHandle[] {
  const found: ContactHandle[] = [];
  const seen = new Set<string>();
  const push = (kind: ContactHandleKind, value: string): void => {
    const key = `${kind}:${value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ kind, value });
  };
  for (const m of text.matchAll(EMAIL_RE)) push('email', m[0]);
  for (const m of text.matchAll(TELEGRAM_LINK_RE)) push('telegram', m[0]);
  for (const m of text.matchAll(WHATSAPP_LINK_RE)) push('whatsapp', m[0]);
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '');
    // 7-15 digits is a plausible phone; shorter digit runs are not handles.
    if (digits.length >= 7 && digits.length <= 15) push('phone', m[0].trim());
  }
  // @handles only count when the text also names a messaging app/action,
  // so "great video @creator" is not treated as a contact handle.
  if (MESSAGING_CONTEXT_RE.test(text)) {
    for (const m of text.matchAll(HANDLE_RE)) push('social-handle', m[0]);
  }
  return found;
}
