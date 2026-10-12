# AliveInternet

**An open-source, privacy-first browser extension for reducing social spam, suspicious promotions and unwanted artificial engagement.** Think of content blocking with explainable evidence, transparent user controls, and modular OSINT research tools.

<!-- demo: replace with docs/media/before-after.gif once recorded (see docs/media/README.md) -->

> **Status: v0.3 alpha.** The real Chrome/WXT build and full TypeScript checks pass. YouTube extraction, reversible hiding and large-page controller behavior have synthetic DOM regression tests; live social-platform browser smoke tests remain outstanding. This is **not** a verified bot detector, and deployment reliability is not established. See the [development report](docs/development-status.md) for verified results and remaining blockers.

## What works in the source

| Capability | State |
|---|---|
| Local manual account hiding (posts + comments) with reversible UI | Implemented; serialized settings mutations have synthetic concurrency tests; needs browser E2E |
| Conservative spam/scam heuristics and optional evidence annotations | Implemented, not benchmark-calibrated |
| Optional long lexical near-duplicate comment collapsing | Implemented, enabled **off** by default |
| Large-page processing beyond 350 items | Implemented with synthetic controller tests; repetition/account context limited to each batch |
| Visible-page account evidence inspector | Implemented, needs browser E2E |
| Manual JSON public-indicator pack import and exact match advisory | Implemented, **off** by default |
| Exact public domain matching, no unverified domain-to-person attribution | Implemented, tests pass |
| Local/offline shared-domain campaign candidate graph extraction | Implemented CLI and optional offline viewer |
| Manual opt-in RDAP domain metadata lookup | Implemented CLI, requires internet |
| Cross-platform adapters for YouTube, X, Instagram, Reddit, TikTok, Facebook, Threads, Bluesky, LinkedIn, Twitch | Experimental (see below) |
| EmbeddingGemma 2 semantic similarity | Node proof of concept only; **not in browser filtering** |
| Signed community threat feeds, semantic multilingual detection, multimodal slop filters, full coordination graph, real-time domain reputation | Research/design only; **not built** |

### Planned (groundwork in the repo, not active)

Store listings and Firefox/Edge builds · toolbar hidden-count badge · shareable monthly stats card · community rule lists and language packs · "report a miss / wrongly hidden" · public scam benchmark · scam reply-chain, creator-impersonation, copied-comment and profile-bait detection · look-alike character and spaced-letter handling · opt-in generic-comment filter · on-device classifier · never-hide-creator/pinned/allowlisted content · cross-site mute words · settings export/import · creator mode · real link destinations · look-alike brand domains · fake verification badges · YouTube live chat and Twitch chat-specific handling · fake giveaway livestreams · AutoModerator/Discord AutoMod export · npm core package · "hidden on this page" review list · right-click "check this comment" · per-channel strictness · translated interface · supply-chain hardening · scam-pattern-of-the-week changelog. See [feature groundwork](docs/feature-groundwork.md) and [good first issues](docs/good-first-issues.md).

**The project never verifies that an individual account is a bot.** It identifies observable suspicious behavior, gives users reversible local filtering, and surfaces limited, cited investigative signals. Browser hiding does **not** delete posts, ban accounts, alter platform account settings or act as a server-side moderator.

### Platforms

| Site | Feed / posts | Comments | Account identity | Readiness |
|---|---|---|---|---|
| YouTube | Video cards, community posts | Parent comments and expanded replies | Public profile URL | Synthetic DOM tests; live browser unverified; default on |
| X / Twitter | Tweets / replies | Part of tweet cards | Public profile URL | Experimental, default off |
| Instagram | Caption selector | Provisional | Public profile URL | Experimental, default off |
| Reddit | Posts | Comments | Public profile URL | Experimental, default off |
| TikTok | Video descriptions | Provisional | Public profile URL | Experimental, default off |
| Facebook | Feed | Not yet | Public profile URL | Experimental, default off |
| Threads | Feed | Not separately | Public profile URL | Experimental, default off |
| Bluesky | Feed | Not separately | Public profile URL | Experimental, default off |
| LinkedIn | Feed | Provisional | Public profile URL | Experimental, default off |
| Twitch | Stream cards | Live chat (provisional) | Public channel URL; chat usernames usually unlinked | Experimental, default off; selectors unverified |

The extension works only in supported **browser** pages. A matched selector is not proof the site works with its current interface. **It does not filter native mobile apps.**

## Quick start

Requirements: Node.js >= 22.16, npm, Chrome/Chromium, and network access for dependencies.

```sh
npm ci
npm test
npm run typecheck:core
npm run typecheck
npm run build          # Chrome; also build:firefox, build:edge, build:all
```

Then go to `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose `.output/chrome-mv3`. Use the popup to select websites, filtering strength, individual account hiding, opt-in duplicate hiding, and OSINT annotations. Every content collapse has a **Show temporarily** button. Use the popup blocklist to undo local account hides.

`npm run dev` uses WXT development mode. Check the installed extension permissions and test each site's adapter manually before using it regularly.

## OSINT / network tools

**No OSINT web request is made by the browser extension.** Public indicator packs are imported explicitly from local JSON, length-validated, and matched only against exact on-page account keys / URL hostnames. **Matches are advisory only.** Imported publisher and evidence metadata are not cryptographically verified and must not be treated as authoritative.

- [Example synthetic indicator pack](docs/indicator-pack.example.json): use the popup's JSON import control; toggle on **OSINT indicator advisories** to display potential exact matches.
- `npm run investigate:fixture`: analyzes a bundled **synthetic** dataset in local memory and prints account observations, shared-domain candidate groups, and evidence-labelled graph JSON. `npm run investigate:fixture -- path/to/permissioned.json` accepts a local JSON file (<=2 MB, <=500 entries). This is investigative context, not proof of bots.
- [Offline graph viewer](tools/network-viewer.html): open locally in a browser, save the prior report to JSON, and load it to inspect edges without uploading anything.
- `npm run intel:rdap -- example.com`: manual domain registration metadata lookup, not IP/location attribution. This command uses a public RDAP service and transmits the requested domain; it is **never** called automatically.

**No geographic-proximity risk model**: publicly attributed campaign origins can be researched at the *campaign* level with citations. An individual's apparent country, language, claimed location, or proximity to documented operations is not used as evidence of automation or spam.

## Project map

```text
entrypoints/                 WXT content script, popup and local settings background writer
src/adapters/platforms/     One DOM spec per social platform
src/core/                   Spam rules, deduplication, account observations, policy, embedding ports
src/extension/              Local settings, reversible DOM UI and event controller
src/intel/                  Exact-match provenance-aware indicator packs and enrichment ports
src/network/                Shared-domain campaign candidates and evidence-labelled graph DTO
src/research/               Classification evaluation metrics, benchmark dataset types
src/detectors/              Scaffolded analyzers (reply chains, impersonation, ...); inert
src/rules/                  Community rule-list schema (scaffolded)
src/feedback/  src/creator/ src/ml/   Report drafts, creator mode, on-device classifier ports (scaffolded)
rules/  benchmark/          Community rule lists and benchmark datasets (empty / examples)
src/lib.ts                  Planned npm entry point for the detection core
locales/                    Staged UI translations (not yet in the build)
scripts/                    Offline fixture analysis, opt-in RDAP, EmbeddingGemma research
fixtures/                   Synthetic content only
tools/                      Offline network graph viewer
AGENTS.md / CLAUDE.md       Agent policy and division of work
```

Refer to [architecture v0.3](docs/architecture-v0.3.md), [roadmap](docs/roadmap.md), [privacy](docs/privacy.md), [model research](docs/model-research.md), and [agent backlog](docs/agent-backlog.md).

## Development with Claude Code, Codex, and local Qwen

Shared invariants are in `AGENTS.md`; `CLAUDE.md` covers Claude workflows. Separate worktrees/PRs by subsystem, for example `src/adapters/platforms/` versus `src/intel/` versus `src/network/`, and require tests and live browser screenshots before marking platforms supported.

## Privacy, safety, and contributions

- Local-only content processing, no telemetry or default backend; content bodies and graph research are not persisted by the extension.
- The browser stores only preferences, local account-block identifiers, and **explicitly imported** advisory pack data.
- No demographic, nationality, geography, political viewpoint, linguistic identity, or inferred physical-location classifiers.
- Account relationships are hypotheses with specific evidence labels, not inferred common ownership or real-world identity.
- No unauthorized scraping, private-message access, cookies, platform moderation API writes, or remote code execution.
- Signed feeds, model weights, server analysis, threat-data updates and optional APIs require explicit review and opt-in.

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Threat model](docs/privacy.md) · Apache-2.0 source license (external model weights have separate terms).
