import { PLATFORMS, blockId, type Platform } from '../core/platforms.ts';
import type { ContentItem } from '../core/types.ts';

/** User-imported packs are UNTRUSTED; matches are advisory, never auto-blocking. */
export interface Indicator {
  kind: 'domain' | 'account';
  value: string;
  platform?: Platform;
  evidenceUrl: string;
  note: string;
}
export interface IndicatorPack {
  schemaVersion: 1;
  title: string;
  publisher: string;
  sourceUrl: string;
  indicators: Indicator[];
}
export interface IndicatorMatch {
  indicator: Indicator;
  observedValue: string;
  source: string;
}
const MAX_INDICATORS = 250;
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const VALID_PLATFORMS = new Set<string>(PLATFORMS);

function webLink(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 500) return false;
  try { const u = new URL(value); return u.protocol === 'https:'; } catch { return false; }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
/** Strict schema and size validation. Embedded code and arbitrary URLs are not executable. */
export function parseIndicatorPack(value: unknown): IndicatorPack {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.title !== 'string' ||
    value.title.length > 100 || !value.title || typeof value.publisher !== 'string' ||
    value.publisher.length > 100 || !value.publisher || !webLink(value.sourceUrl) ||
    !Array.isArray(value.indicators) || value.indicators.length > MAX_INDICATORS) {
    throw new Error('Invalid indicator pack header or size');
  }
  const indicators: Indicator[] = value.indicators.map((entry: unknown) => {
    if (!isRecord(entry) || (entry.kind !== 'domain' && entry.kind !== 'account') ||
      typeof entry.value !== 'string' || typeof entry.note !== 'string' || entry.note.length > 240 ||
      !webLink(entry.evidenceUrl)) throw new Error('Invalid indicator entry');
    const normalized = entry.value.trim().toLowerCase();
    if (entry.kind === 'domain') {
      if (!HOST.test(normalized) || entry.platform !== undefined) throw new Error('Invalid domain indicator');
      return { kind: 'domain', value: normalized, note: entry.note, evidenceUrl: entry.evidenceUrl };
    }
    if (typeof entry.platform !== 'string' || !VALID_PLATFORMS.has(entry.platform) ||
      !/^[@\w.\/-]{2,130}$/.test(normalized)) throw new Error('Invalid account indicator');
    return { kind: 'account', value: normalized, platform: entry.platform as Platform,
      note: entry.note, evidenceUrl: entry.evidenceUrl };
  });
  return {schemaVersion: 1, title: value.title, publisher: value.publisher,
    sourceUrl: value.sourceUrl, indicators};
}

export function hostFromUrl(link: string): string | undefined {
  try {
    const parsed = new URL(link);
    return ['https:', 'http:'].includes(parsed.protocol) && HOST.test(parsed.hostname.toLowerCase())
      ? parsed.hostname.toLowerCase() : undefined;
  } catch { return undefined; }
}

export function matchIndicators(item: ContentItem, pack: IndicatorPack): IndicatorMatch[] {
  const hosts = new Set(item.links.map(hostFromUrl).filter((x): x is string => Boolean(x)));
  const account = item.platform && item.accountKey ? blockId(item.platform, item.accountKey) : undefined;
  return pack.indicators.flatMap(indicator => {
    if (indicator.kind === 'domain' && hosts.has(indicator.value))
      return [{indicator, observedValue: indicator.value, source: pack.title}];
    if (indicator.kind === 'account' && account === `${indicator.platform}:${indicator.value}`)
      return [{indicator, observedValue: account, source: pack.title}];
    return [];
  });
}
