import { PLATFORM_LABELS, type Platform } from '../core/platforms.ts';
import type { FilterMode } from '../core/types.ts';

/**
 * "Wrongly hidden / missed" report drafts. Pure functions: no DOM, no network, no
 * storage. A draft is built in memory, shown to the user for editing, and only an
 * explicit click may open the prefilled GitHub issue URL (done by the popup, never here).
 */
export const REPORT_REPO = 'rishixgamer/AliveInternet';
export const MAX_REPORT_TEXT = 1000;
/** Conservative bound; GitHub rejects very long request lines (~8 KB). */
export const MAX_REPORT_URL = 6000;
const MAX_REASON = 200;
const MAX_LINK_HOSTS = 10;

export type ReportKind = 'wrongly-hidden' | 'missed';
const TEMPLATES: Record<ReportKind, string> = { 'wrongly-hidden': 'false-positive.yml', missed: 'missed-spam.yml' };
const MODE_LABELS: Record<FilterMode, string> = { conservative: 'Conservative', balanced: 'Balanced', aggressive: 'Aggressive' };

/** Everything a report may carry. Identity fields exist in the input only to be scrubbed. */
export interface ReportInput {
  kind: ReportKind;
  platform: Platform;
  text: string;
  links: string[];
  /** Display name and account key are used only to find and remove them from text. */
  author?: string;
  accountKey?: string;
  reason?: string;
  mode?: FilterMode;
  version?: string;
}
export interface ReportDraft {
  kind: ReportKind;
  platform: Platform;
  text: string;
  reason: string;
  mode: FilterMode | undefined;
  version: string;
}

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
// eslint-disable-next-line no-control-regex
// Includes U+E000/U+E001, which redactText uses internally as link placeholders.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ue000\ue001]/g;
const SCHEME_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"'`)\]]+/gi;
const BARE_URL = /(?<![\w@.-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#][^\s<>"'`)\]]*)/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const MENTION = /(?<![\w])@\w(?:[\w.-]*\w)?/g;
const PHONE = /(?<![\w])\+?\d[\d\s().-]{7,}\d(?!\w)/g;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (value: string) => value.replace(LONE_SURROGATE, '�').replace(CONTROL, '');
const cap = (value: string, max: number): string => {
  const points = [...value];
  return points.length <= max ? value : points.slice(0, max - 1).join('') + '…';
};

function hostOf(raw: string): string | undefined {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.hostname.toLowerCase() || undefined;
  } catch { return undefined; }
}

/** Remove every identifier class from free text. Idempotent, so safe to re-run on user edits. */
export function redactText(value: string, identities: readonly (string | undefined)[] = []): string {
  let text = clean(value);
  // Links first (protected from later passes), reduced to hostnames.
  const hosts: string[] = [];
  const protect = (match: string) => {
    const trailing = /[.,;:!?]+$/.exec(match)?.[0] ?? '';
    const host = hostOf(match.slice(0, match.length - trailing.length));
    if (!host) return '[link]' + trailing;
    hosts.push(host);
    return `${hosts.length - 1}` + trailing;
  };
  text = text.replace(SCHEME_URL, protect).replace(BARE_URL, protect);
  for (const identity of identities) {
    const id = identity?.trim().replace(/^@/, '');
    if (id && id.length >= 2) text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(id)}(?![\\p{L}\\p{N}_])`, 'giu'), '[handle]');
  }
  text = text.replace(EMAIL, '[email]').replace(MENTION, '[handle]').replace(PHONE, '[phone]');
  return text.replace(/(\d+)/g, (_, n: string) => `[link: ${hosts[Number(n)]}]`);
}

export function buildDraft(input: ReportInput): ReportDraft {
  const identities = [input.author, input.accountKey];
  let text = redactText(input.text, identities);
  const hosts = [...new Set(input.links.map(hostOf).filter((h): h is string => Boolean(h)))].slice(0, MAX_LINK_HOSTS);
  if (hosts.length) text += `\n\nLinks (hostnames only): ${hosts.join(', ')}`;
  const version = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input.version ?? '') ? input.version! : '';
  return {
    kind: input.kind, platform: input.platform,
    text: cap(text, MAX_REPORT_TEXT),
    reason: cap(redactText(input.reason ?? '', identities), MAX_REASON),
    mode: input.mode, version,
  };
}

/** Apply the user's edits. Redaction and the cap run again; the user cannot paste a URL path through. */
export function finalizeDraft(draft: ReportDraft, editedText: string): ReportDraft {
  return { ...draft, text: cap(redactText(editedText), MAX_REPORT_TEXT) };
}

function href(draft: ReportDraft, text: string): string {
  const params = new URLSearchParams();
  params.set('template', TEMPLATES[draft.kind]);
  params.set('platform', PLATFORM_LABELS[draft.platform]);
  if (draft.kind === 'wrongly-hidden' && draft.reason) params.set('reason', draft.reason);
  if (draft.kind === 'wrongly-hidden') params.set('mode', draft.mode ? MODE_LABELS[draft.mode] : 'Not sure');
  if (draft.version) params.set('version', draft.version);
  params.set('text', text);
  return `https://github.com/${REPORT_REPO}/issues/new?${params.toString()}`;
}

/** Build the prefilled issue URL, truncating text on a code point boundary to fit MAX_REPORT_URL. */
export function buildIssueUrl(draft: ReportDraft): string {
  const text = clean(draft.text);
  const full = href(draft, text);
  if (full.length <= MAX_REPORT_URL) return full;
  const points = [...text];
  let low = 0, high = points.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (href(draft, points.slice(0, mid).join('') + '…').length <= MAX_REPORT_URL) low = mid; else high = mid - 1;
  }
  return href(draft, points.slice(0, low).join('') + '…');
}
