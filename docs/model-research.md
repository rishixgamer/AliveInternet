# EmbeddingGemma 2 research plan (NOT a shipped feature)

Source: https://huggingface.co/onnx-community/embeddinggemma-2-ONNX

The model card describes 740M parameters in total, with a 270M-parameter text-only subset. For comment filtering, only text embeddings are needed; the published quantized q4 text-encoder weights are approximately 175 MB **before** tokenizer, runtime, caching, and working-memory overhead. Model download and browser inference performance need empirical validation.

## Actual POC
`scripts/embedding-poc.mjs` uses the documented `AutoConfig`, `AutoModel`, and `AutoTokenizer` API. It clears `vision_config` and `audio_config` to avoid downloading unused modalities; uses `task: clustering | query: ...` for symmetric clustering; and prints pairwise cosine similarities. It runs locally under Node, but requires an initial Hugging Face download. Scores are similarities, **not probabilities** and **not bot verdicts**.

## Browser integration gate
- Verify text-only q4 inference using the actual Chromium/WebGPU runtime and a **packaged** ONNX executable runtime; no remotely hosted executable code.
- Implement model download consent and cache eviction UX.
- Use the shared `EmbeddingProvider` contract from `src/core/embeddings.ts`.
- Batch comment texts; avoid re-embedding unchanged comments.
- Cluster within comment threads with a well-defined similarity threshold selected on a development set, evaluated on held-out examples. Similarity alone must not hide text.
- Test real-device RAM/GPU usage, cold start, p50/p95 latency, and navigation safety.
- Add opt-in toggle only after secure runtime review; preserve rule-only fallback.

## Evaluation protocol
Collect an ethically sourced, permissioned, de-identified set of comment examples labeled `spam/scam`, `coordinated promotion`, `legitimate automation`, and `normal conversation`. Record ambiguity and annotator disagreement. Compare: rules baseline, exact duplication, embeddings similarity, and hybrid pipeline. Primary measurements: **precision of collapsed comments**, false positive rate on legitimate content, and speed/resource costs. Avoid evaluating on the same dataset used to select thresholds.

## Explicit non-goals
Do not classify political viewpoints, detect AI authorship as if it were ground truth, train on unauthorized platform scraping, or share user comment corpora by default.
