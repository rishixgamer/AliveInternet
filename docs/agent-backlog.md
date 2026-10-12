# Suggested agent task queue for Claude Code / Codex

Each task should land in a focused PR with tests, browser screenshots/recordings where appropriate, and exact validation output. Never label adapter matching patterns alone as working feature support.

## P0 — can users actually install it?

- Install pinned WXT deps; run WXT-generated TypeScript checker and `wxt build -b chrome`.
- Chrome MV3 install/uninstall/reinstall smoke tests and verify permissions shown match README.
- Write Playwright browser extension tests with YouTube synthetic DOM fixtures, then test on the live page with consent.
- Validate local account hide/unhide end to end across comments and video cards.
- Fix storage races for multi-tab blocking and settings edits; test rapid consecutive writes.

## P1 — initial public platforms

- Stabilize YouTube original comment + video + community selectors, including SPA navigation, replies, channel profile links and infinite scroll.
- Stabilize X tweet/reply feed extraction and profile URLs. Avoid processing private messages, navigation, and quoted unrelated profiles.
- Stabilize Reddit posts/comments on current web UI; fail open on Old Reddit or unsupported layouts.
- Only then consider enabling these platforms by default.

## P2 — broaden adapters

- Instagram post captions + replies; TikTok video descriptions + comments.
- Facebook feed posts/comments with strong root scoping; Threads cards and replies.
- Bluesky feed posts/replies; LinkedIn updates/comments.
- Prefer small per-site modules and real-browser fixtures over speculative universal selectors.

## P3 — validated semantic layer

- Compare baseline vs embeddings offline using labeled, ethically sourced data.
- WebGPU/WASM inference only after packaging and weights-consent review.
- Add latency, GPU/RAM budgets and per-device fallback.
- Never auto-block an account based on embeddings alone.
