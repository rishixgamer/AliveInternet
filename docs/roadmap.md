# Roadmap

## Milestone 0: repository scaffold — current
- WXT content script + popup, pure filtering core, reversible collapse, YouTube DOM adapter.
- Baseline unit tests, TypeScript checks, GitHub Actions CI, agent instructions.
- Experimental EmbeddingGemma 2 Node research script.

## Milestone 1: YouTube hardening
- Manual Chrome smoke testing on old/new YouTube comment renderers, reply threads, SPA navigation, infinite scroll, themes, and disabled state.
- Add fixture-based DOM tests with synthetically generated markup.
- Add compact optional diagnostics with no raw text retention.
- Build and publish unpacked alpha on a release branch after QA.

## Milestone 2: trustworthy evaluation
- Obtain permissioned, de-identified, representative labels.
- Evaluate baseline against benign, scam, spam, multilingual, and coordinated corpora.
- Set explicit precision / false-positive budgets; audit false positive examples.

## Milestone 3: semantic alpha
- Benchmark EmbeddingGemma 2 text-only q4 locally and in MV3.
- Bundle ONNX runtime executable assets; add opt-in weights download/caching.
- Compare semantic clustering to rule/duplicate baselines; don't enable automatic collapse on embedding similarity alone.

## Milestone 4: expansion
- Add Reddit adapter only after verifying applicable terms and appropriate permission scope.
- Explore optional user-configured filters and community-contributed rules with safe review.
