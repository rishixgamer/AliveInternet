# ThreadSieve

**An open-source, privacy-first, client-side filter for social accounts, comments, and feed content.** Think of ad blocking, but for high-evidence spam and accounts you choose to hide.

**Status: v0.2 alpha / experimental cross-platform scaffold.** Only the original YouTube comment extractor has received initial implementation attention; **none of the adapters has passed real-browser smoke tests in this environment**, and other platforms' selectors are speculative. Expect missed items and layout changes. This is **not** a validated bot classifier.

## Capabilities

- Nine website adapters: **YouTube, X/Twitter, Instagram, Reddit, TikTok, Facebook, Threads, Bluesky, LinkedIn**.
- Distinct **comments/replies** and **posts/feed content** filtering controls. Some platforms expose only a subset in this prototype; X replies are treated as feed posts.
- Local, cross-surface *within-site* account blocking: click **Hide @account locally** to collapse matching visible posts/comments by that profile on the same platform, without using a site's Block API. A popup blocklist provides **Unhide** controls.
- High-evidence scam/promotional-content rules and exact normalized repetition detection. Rules are not calibrated bot probabilities; benign agreement/repetition cannot alone trigger automatic collapse.
- Optional, **off by default**, page-local rule that temporarily hides other items by an account that has three or more distinct high-evidence spam items visible in a scan. This **does not verify that account is a bot** and never adds a permanent block.
- Reversible collapses with explanations and **Show temporarily**, with opt-in warnings for uncertain items.
- Defaults to **YouTube enabled**. Every other site's prototype adapter must be explicitly enabled in the popup, since selectors require validation.
- Runs locally, with no backend, telemetry, comment uploads, platform API writes, or raw-text persistence. Settings and explicitly chosen account block identifiers are stored in extension local storage.
- Standalone **Node-only EmbeddingGemma 2 POC** for semantic similarity: `npm run embedding:poc`. The extension does **not** yet perform on-device embeddings or ML bot identification.

## Platform support matrix (v0.2)

| Site | Post/feed adapter | Comment adapter | Account identity | Readiness |
|---|---|---|---|---|
| YouTube | Video cards, community posts | Yes | Profile URL when present | Initial prototype |
| X / Twitter | Tweet/reply cards | Treated as cards | Handle from profile link | Experimental |
| Instagram | Caption selector | Provisional selector | Profile link if present | Experimental |
| Reddit | Post/custom elements | Comment/custom elements | Profile link if present | Experimental |
| TikTok | Video descriptions | Provisional selector | Profile link if present | Experimental |
| Facebook | Post text | Not yet | Profile link if present | Experimental |
| Threads | Post text | Not separately | Profile link if present | Experimental |
| Bluesky | Feed posts | Not separately | Profile link if present | Experimental |
| LinkedIn | Feed updates | Comment elements | Profile link if present | Experimental |

A row indicates code scaffolding, **not verified reliable blocking**. If a site has no matching element selectors, it does nothing instead of hiding arbitrary page content. Some mobile/native apps cannot be reached by a desktop browser extension.

## Quick start

Prerequisites: Node.js >= 22.16, npm, Chrome/Chromium.

```bash
npm install
npm test
npm run typecheck
npm run build
```

1. Open `chrome://extensions`, enable Developer mode.
2. Choose **Load unpacked** and select `.output/chrome-mv3`.
3. Use the extension popup to enable specific websites and select comment, feed, or account filtering.
4. Click an account's **Hide ... locally** button to collapse their visible content on that site. Use the popup blocklist to undo it.
5. Every auto-collapsed item has a **Show temporarily** option. If an adapter causes errors, disable that site.

`npm run dev` launches the WXT development workflow. A built extension is not included in the source ZIP.

## Model research

The core currently uses transparent rules. `scripts/embedding-poc.mjs` is an opt-in Node-only experiment with [EmbeddingGemma 2 ONNX](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX); it does not participate in extension filtering. Read [docs/model-research.md](docs/model-research.md) for the browser WebGPU, model-consent, licensing, quantization, resource benchmarking, and evaluation requirements.

## Design and contribution

- [Architecture](docs/architecture.md) — platform adapters, account IDs, content classifications, risk gates.
- [Privacy](docs/privacy.md) — in-memory processing, local-only blocklist and privacy threat model.
- [Roadmap](docs/roadmap.md) — fixture/regression tests and model gating.
- [Agent task queue](docs/agent-backlog.md) — prioritized tasks for Claude Code, Codex and local coding agents.
- [Contribution guide](CONTRIBUTING.md).
- [AGENTS.md](AGENTS.md) — shared guidelines for Codex, Claude Code, and local agents. [CLAUDE.md](CLAUDE.md) — Claude-specific setup.

**Never claim to verify a human/bot identity from embeddings, text style, or account name.** Do not collect or scrape social graphs, perform unauthorized platform actions, or make irreversible moderation changes. Account actions are local browser hides, not server-side blocks.

## License

Apache-2.0 for repository source. Model weights are not bundled and retain their own distribution terms.
