# AliveInternet v0.3 alpha — rename and modular intelligence release

## Rename

The local Git repository is now named **AliveInternet** (folder name, npm package, Chrome extension display name, popup header, and in-page filtering UI). Git history from the previous ThreadSieve alpha is retained. The local repository has **no GitHub remote**; no hosted repository rename was performed.

If the old repository is later pushed to GitHub, create a remote named `AliveInternet` or rename the hosted project under GitHub Settings → General → Repository name, then update the local `origin` URL. Do not claim a hosted rename until it has been performed.

## Implemented

- Opt-in lexical near-duplicate collapsing for long comments by >=4 validated distinct account URLs; keep the first visible, reversible; not bot detection.
- Visible-page account evidence (number of visible items, rule decisions, repetition and linked hosts; no history/inferred physical location).
- Opt-in import of strictly parsed and bounded user-provided indicator packs, shown as **advisories only** when exact account/domain matches are observed.
- Local cross-platform domain-sharing campaign hypotheses, JSON graph DTO, synthetic offline investigation CLI, and standalone offline network viewer.
- Manual domain-registration RDAP CLI, separate from browser behavior.
- Plugin interfaces for consented threat providers and future local/multimodal analyzers; evaluation metrics and safety tests.
- Updated `AGENTS.md`, `CLAUDE.md`, privacy architecture, agent backlog, and release roadmap.

## Deferred / not supported yet

No complete network-level bot classifier, cross-platform account identification, IP/geographic user location inference, automatic threat intel import, verified community subscriptions, multimedia AI-slop filter, extension EmbeddingGemma 2 inference, or tested WXT Chrome build. No real browser site adapter has passed live smoke tests here.

## Verification

- 43 Node.js test cases passing.
- `tsc -p tsconfig.core.json` passed.
- Full source TypeScript check passed **using temporary local WXT type shims**, which are not a substitute for actual WXT typecheck/build.
- Synthetic fixture investigator produced its expected JSON output.
- `npm install` failed because `registry.npmjs.org` DNS could not be resolved (`EAI_AGAIN`); real WXT installation/typecheck/build unverified.
