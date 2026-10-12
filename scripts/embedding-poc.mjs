/**
 * EXPERIMENTAL Node-only EmbeddingGemma 2 proof of concept.
 * It is NOT wired into the shipping browser extension. Model weights are
 * downloaded from Hugging Face when run and may be hundreds of MB.
 * Run: npm install && npm run embedding:poc
 */
import { AutoConfig, AutoModel, AutoTokenizer } from '@huggingface/transformers';
import { cosineSimilarity } from '../src/core/embeddings.ts';

const MODEL_ID = 'onnx-community/embeddinggemma-2-ONNX';
const texts = [
  'Contact me on Telegram for guaranteed crypto returns.',
  'DM me on Telegram and earn guaranteed cryptocurrency profits.',
  'I disagree with the speaker about city planning.',
  'This explanation of city planning was very informative.',
];

console.log(`Loading ${MODEL_ID} (CPU, q4); first run downloads weights.`);
const config = await AutoConfig.from_pretrained(MODEL_ID);
config.vision_config = null;
config.audio_config = null;
const model = await AutoModel.from_pretrained(MODEL_ID, { config, device: 'cpu', dtype: 'q4' });
const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
const encoded = await tokenizer(texts.map((value) => `task: clustering | query: ${value}`));
const { sentence_embedding } = await model(encoded);
const vectors = sentence_embedding.tolist();
for (let i = 0; i < vectors.length; i++) {
  for (let j = i + 1; j < vectors.length; j++) {
    console.log(`${i} <> ${j}: ${cosineSimilarity(vectors[i], vectors[j]).toFixed(3)}`);
  }
}
console.log('Similarity is not proof of automation. Do not turn these scores into auto-hide thresholds without validation.');
