import { PLATFORMS, type Platform } from '../core/platforms.ts';
import type { AnalyzerCategory } from '../core/analyzer-ports.ts';

/** Local evaluation data; account/thread groups are opaque, never profile IDs. */
export type Label = 'scam' | 'spam' | 'legitimate';
export interface LabeledItem {
  id: string;
  platform: Platform;
  kind: 'comment' | 'post';
  text: string;
  links: string[];
  label: Label;
  category?: AnalyzerCategory;
  locale: string;
  accountGroup?: string;
  threadId?: string;
  parentId?: string;
}
export interface DatasetManifest {
  name: string;
  version: string;
  license: string;
  provenance: string;
  split: 'train' | 'dev' | 'test';
  items: number;
  source: 'synthetic' | 'permissioned' | 'de-identified';
}
export interface Dataset { manifest: DatasetManifest; items: LabeledItem[]; }
export const MAX_DATASET_BYTES = 5_000_000;
const categories: readonly AnalyzerCategory[] = ['spam', 'coordination', 'repetition', 'synthetic-media', 'malicious-link', 'reply-chain', 'impersonation', 'copied-comment', 'profile-bait', 'obfuscation', 'generic-filler', 'fake-badge', 'fake-giveaway', 'lookalike-domain', 'deceptive-link'];
function record(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !fields.includes(key))) throw new Error('Invalid dataset fields');
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) throw new Error('Invalid dataset string');
  return value;
}
function opaque(value: unknown): string {
  const result = string(value, 80);
  if (!/^[a-z\d_-]+$/iu.test(result)) throw new Error('Dataset IDs must be opaque tokens');
  return result;
}
export function parseEvaluationDataset(value: unknown): Dataset {
  const envelope = record(value, ['manifest', 'items']);
  const raw = record(envelope.manifest, ['name', 'version', 'license', 'provenance', 'split', 'items', 'source']);
  if (!['train', 'dev', 'test'].includes(String(raw.split)) || !['synthetic', 'permissioned', 'de-identified'].includes(String(raw.source))) throw new Error('Missing data provenance/split');
  if (!Array.isArray(envelope.items) || envelope.items.length < 1 || envelope.items.length > 10_000 || raw.items !== envelope.items.length) throw new Error('Invalid dataset item count');
  const manifest: DatasetManifest = {
    name: string(raw.name, 200), version: string(raw.version, 80), license: string(raw.license, 200),
    provenance: string(raw.provenance, 2000), split: raw.split as DatasetManifest['split'],
    items: raw.items as number, source: raw.source as DatasetManifest['source'],
  };
  const ids = new Set<string>();
  const items = envelope.items.map(value => {
    const row = record(value, ['id', 'platform', 'kind', 'text', 'links', 'label', 'category', 'locale', 'accountGroup', 'threadId', 'parentId']);
    const id = opaque(row.id);
    if (ids.has(id)) throw new Error('Duplicate dataset item ID');
    ids.add(id);
    if (!PLATFORMS.includes(row.platform as Platform) || !['comment', 'post'].includes(String(row.kind)) || !['scam', 'spam', 'legitimate'].includes(String(row.label))) throw new Error('Invalid dataset item enum');
    if (row.category !== undefined && !categories.includes(row.category as AnalyzerCategory)) throw new Error('Invalid dataset category');
    const locale = string(row.locale, 40);
    if (!/^[a-z]{2,8}(?:-[a-z\d]{1,8})*$/iu.test(locale)) throw new Error('Invalid locale');
    if (!Array.isArray(row.links) || row.links.length > 20) throw new Error('Invalid links');
    const links = row.links.map(value => {
      const link = string(value, 2000);
      let url: URL;
      try { url = new URL(link); } catch { throw new Error('Invalid dataset URL'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid dataset URL');
      return link;
    });
    const item: LabeledItem = { id, platform: row.platform as Platform, kind: row.kind as LabeledItem['kind'], text: string(row.text, 10_000), links, label: row.label as Label, locale };
    if (row.category !== undefined) item.category = row.category as AnalyzerCategory;
    for (const key of ['accountGroup', 'threadId', 'parentId'] as const) if (row[key] !== undefined) item[key] = opaque(row[key]);
    return item;
  });
  const byId = new Map(items.map(item => [item.id, item]));
  for (const item of items) {
    if (!item.parentId) continue;
    const parent = byId.get(item.parentId);
    if (!parent || parent.id === item.id || parent.platform !== item.platform ||
        !item.threadId || parent.threadId !== item.threadId) throw new Error('Invalid parent reference');
  }
  return { manifest, items };
}
/** Compatibility helper; the envelope is mandatory to retain provenance. */
export function parseDataset(value: unknown): LabeledItem[] { return parseEvaluationDataset(value).items; }
