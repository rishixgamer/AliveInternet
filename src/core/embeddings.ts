/** Framework-independent semantic similarity utilities for future model integration. */
export interface EmbeddingProvider {
  embed(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) throw new Error('Expected equal, non-empty embedding dimensions');
  let dot = 0;
  let squaredA = 0;
  let squaredB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Non-finite embedding coordinate');
    dot += x * y;
    squaredA += x * x;
    squaredB += y * y;
  }
  if (squaredA === 0 || squaredB === 0) throw new Error('Zero-vector embedding');
  return dot / Math.sqrt(squaredA * squaredB);
}

export async function pairwiseSimilarities(provider: EmbeddingProvider, texts: string[]): Promise<{i: number; j: number; similarity: number}[]> {
  const vectors = await provider.embed(texts);
  if (vectors.length !== texts.length) throw new Error('Embedding count mismatch');
  const pairs: {i: number; j: number; similarity: number}[] = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      pairs.push({ i, j, similarity: cosineSimilarity(vectors[i]!, vectors[j]!) });
    }
  }
  return pairs;
}
