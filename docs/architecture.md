# Architecture and safety invariants

## Product boundaries
ThreadSieve is a **client-side content presentation filter**, not a platform moderation system. It never deletes user comments from a remote server. It does not make authoritative claims about authorship, account identity, or authenticity.

## Components
1. `entrypoints/youtube.content.ts` registers a YouTube-only isolated content script.
2. `src/adapters/youtube.ts` extracts text, author display names, and visible URLs from comment DOM. All input is untrusted.
3. `src/core/cluster.ts` counts exact normalized long texts from distinct author display strings. This is **not** semantic clustering or account identity verification.
4. `src/core/filter.ts` combines a few transparent rule indicators. Its score is an **uncalibrated heuristic**, not a bot probability. Repetition cannot trigger automatic collapse without independent promotional/solicitation evidence.
5. `src/extension/controller.ts` debounces DOM mutations, handles YouTube navigation, respects settings, and applies UI decisions only when changed.
6. `src/extension/ui.ts` inserts text nodes and a reversible show button. Never uses `innerHTML`.
7. `entrypoints/popup` changes conservative/balanced/aggressive preferences stored in `browser.storage.local`.
8. `src/core/embeddings.ts` defines a semantic provider contract. No browser integration yet.
9. `scripts/embedding-poc.mjs` downloads EmbeddingGemma 2 text-only model on user command and calculates similarities; it does not decide what to hide.

## Performance constraints
- Avoid one inference per MutationObserver notification.
- Put CPU-only rules before expensive embedding passes.
- Bound the number and length of comments embedded per page, cache via short-lived content fingerprints, and cancel on navigation.
- Measure p50/p95 processing time, memory, GPU memory, first-download size, and regression impact across common computers before enabling WebGPU in production.

## False positives
- 'Great video' and other common agreements must not be hidden.
- Similarity or exact duplication alone cannot justify hiding.
- Never use political sentiment, dialect, or protected attributes as bot proxies.
- Surface **why** an item was collapsed and allow immediate reversal.

## Known limitations
- YouTube may rename comment DOM elements and CSS selectors.
- Duplicate authors are inferred from display text, which is neither unique nor authenticated.
- Visible comments in a page are only a small sample of a platform's activity, so coordinated campaigns can be missed.
- Filtering aggressiveness is not calibrated to fixed probabilities.
- Some dynamically loaded comments may be skipped until further DOM mutations.
- No real-browser smoke tests or full WXT build have yet been performed in the initial generation environment.
