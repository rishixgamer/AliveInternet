import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, pairwiseSimilarities } from '../src/core/embeddings.ts';

test('cosine similarity agrees with simple vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test('rejects malformed vectors', () => {
  assert.throws(() => cosineSimilarity([1], [1, 0]));
  assert.throws(() => cosineSimilarity([0, 0], [1, 0]));
  assert.throws(() => cosineSimilarity([Number.NaN], [1]));
});

test('embedding provider interface produces one score per pair', async () => {
  const fake = { embed: async (texts) => texts.map((_, index) => index === 0 ? [1, 0] : [0, 1]) };
  const pairs = await pairwiseSimilarities(fake, ['first', 'second', 'third']);
  assert.equal(pairs.length, 3);
  assert.deepEqual(pairs.map((p) => p.similarity), [0, 0, 1]);
});
