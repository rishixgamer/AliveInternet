import { duplicateKey } from './normalize.ts';
import type { Comment } from './types.ts';

/** Exact normalized duplication only. NOT semantic clustering. */
export function repeatedCampaigns(comments: Comment[]): Map<string, number> {
  const byKey = new Map<string, Set<string>>();
  for (const comment of comments) {
    const key = duplicateKey(comment.text);
    if (key.length < 40) continue; // Ordinary short agreements are not useful evidence.
    const authors = byKey.get(key) ?? new Set<string>();
    authors.add(comment.accountKey ?? (comment.author.trim().toLocaleLowerCase('en') || `unknown:${comment.id}`));
    byKey.set(key, authors);
  }
  return new Map([...byKey].map(([key, authors]) => [key, authors.size]));
}
