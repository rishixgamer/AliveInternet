# Claude Code — AliveInternet

Read `AGENTS.md`, `docs/architecture-v0.3.md`, `docs/privacy.md` and `docs/roadmap.md` before proposing code changes.

Recommended ownership: OSINT provider interfaces, local ML experiments, uncertainty-aware detection methods, evaluation harnesses. Keep browser platform selectors with the Codex worktree to prevent merge conflicts.

Start by reproducing `npm test`, `npm run typecheck:core`, `npm run typecheck` and `npm run build` in an internet-enabled checkout. Distinguish failed dependency installation from failed compilation. Follow documented data minimization and threat-model constraints. New models, public reports, API endpoints and browser selectors require authoritative verification and explicit integration tests. Never auto-classify account geography or identity.

For changes that add network calls, enumerate exact data transmitted, opt-in controls, caching/storage, abuse controls, provider terms, and consent. Review license and policy restrictions before merging.
