# ThreadSieve

**An open-source, privacy-first comment filter.** An ad blocker for obvious bot spam and coordinated promotional comments, starting with YouTube.

**Status: v0.1 prototype, not a validated bot detector.** The Chrome extension uses *local, deterministic rules* and exact normalized duplicate detection today. EmbeddingGemma 2 has a working example script in `scripts/embedding-poc.mjs`, but semantic inference is **not yet integrated into the extension**. Do not claim the extension is AI-powered until that work is complete and measured.

## What it does today

- Observes YouTube comment renderers; works across dynamic page navigation.
- Automatically collapses comments with multiple corroborating spam signals (for example, off-platform investment solicitations promising implausible returns).
- Displays a reason and a **Show comment** button for every collapse.
- Can optionally annotate less-certain comments without hiding them.
- Supports Conservative, Balanced, and Aggressive modes.
- Stores only extension preferences in Chrome's local storage. No analytics, server, API keys, or comment uploads.
- Includes a separate **Node.js EmbeddingGemma 2 proof of concept** for semantic similarity experiments.

What it does **not** do: delete content on a platform, classify all accounts as bots, identify AI-authored text reliably, scan other websites, run EmbeddingGemma inside the extension, or guarantee detection accuracy.

## Quick start

Prerequisites: Node.js >= 22.16, npm, Chrome/Chromium.

```bash
npm install
npm run test
npm run typecheck
npm run dev
```

`npm run dev` starts WXT's Chrome extension development workflow. To build for manual installation:

```bash
npm run build
```

1. Visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and select `.output/chrome-mv3`.
4. Visit a YouTube video with comments. Open the extension popup to set a mode.
5. Click **Show comment** on a collapsed item to reverse the action.

We recommend reviewing collapsed content periodically for false positives. YouTube changes its DOM frequently, so selectors require real-browser smoke tests.

## EmbeddingGemma 2 research

To download the text-only quantized model and compare four sample comments **locally in Node.js**:

```bash
npm install
npm run embedding:poc
```

The model is retrieved from [onnx-community/embeddinggemma-2-ONNX](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX) on first run, and the text encoder alone still requires a substantial download and memory allocation. This CLI POC is opt-in and never invoked during ordinary browsing. It is **not a bot classifier**.

Read [docs/model-research.md](docs/model-research.md) before attempting browser integration. In Manifest V3, package any executable WebAssembly/JavaScript with the extension; remotely hosted executable code is not acceptable. Treat model weights as downloaded data, and review the Chrome Web Store policies and Hugging Face model license before distribution.

## Architecture

```text
YouTube DOM (no site API)
      |
YouTube adapter: src/adapters/youtube.ts
      |
Batch assessment: src/core/filter.ts
      |                \
Rules (active)          normalized duplicate counts (active)
      |
allow / flag / collapse
      |
reversible in-page UI: src/extension/ui.ts

Embeddings provider contract: src/core/embeddings.ts (research only)
EmbeddingGemma 2: scripts/embedding-poc.mjs (Node CLI only)
```

See [architecture](docs/architecture.md), [privacy](docs/privacy.md), and [roadmap](docs/roadmap.md).

## Contributing

Issues and PRs welcome. Start with a failing test, add minimal changes, and report regression/failure cases. Sensitive platform-specific behavior should be verified on a real browser. No bulk scraping or unauthorized APIs. **Never add telemetry or upload comments by default.** See [CONTRIBUTING.md](CONTRIBUTING.md).

### AI coding agents

[AGENTS.md](AGENTS.md) is the shared contract for OpenAI Codex and compatible tools. [CLAUDE.md](CLAUDE.md) adds Claude Code setup. Local models (including prospective Qwen variants) can follow the same instructions; model capability and exact version should be checked in the user's chosen environment rather than assumed.

## Roadmap summary

1. Stabilize YouTube parsing/UI and collect consensually labeled evaluation fixtures.
2. Establish false-positive-rate, precision, latency, and resource benchmarks for the rules-only system.
3. Research EmbeddingGemma 2 similarity and clustering **offline**; validate whether it improves over simple repetition detection.
4. Only then ship opt-in, on-device semantic inference, with bundled runtime, model-download consent, caching, and memory caps.
5. Add platform adapters individually after legal/policy review.

## License

Apache-2.0. See [LICENSE](LICENSE). Model weights are **not** included in this repository and retain their own model license.
