# AliveInternet

**An open-source, privacy-first browser extension for reducing social spam, suspicious promotions and unwanted artificial engagement.** Think of content blocking with explainable evidence, transparent user controls, and modular OSINT research tools.

> **Status: v0.3 alpha.** A real Chrome/WXT build and live social-platform adapter smoke tests have **not** yet been completed in this environment. This is **not** a verified bot detector. The source contains working, tested pure functions and experimental browser adapters; deployment reliability is not established.

## What works in the source

| Capability | State |
|---|---|
| Local manual account hiding (posts + comments) with reversible UI | Implemented, needs browser E2E |
| Conservative spam/scam heuristics and optional evidence annotations | Implemented, not benchmark-calibrated |
| Optional long lexical near-duplicate comment collapsing | Implemented, enabled **off** by default |
| Visible-page account evidence inspector | Implemented, needs browser E2E |
| Manual JSON public-indicator pack import and exact match advisory | Implemented, **off** by default |
| Exact public domain matching, no unverified domain-to-person attribution | Implemented, tests pass |
| Local/offline shared-domain campaign candidate graph extraction | Implemented CLI and optional offline viewer |
| Manual opt-in RDAP domain metadata lookup | Implemented CLI, requires internet |
| Cross-platform adapters for YouTube, X, Instagram, Reddit, TikTok, Facebook, Threads, Bluesky, LinkedIn | Experimental (see below) |
| EmbeddingGemma 2 semantic similarity | Node proof of concept only; **not in browser filtering** |
| Signed community threat feeds, semantic multilingual detection, multimodal slop filters, full coordination graph, real-time domain reputation | Research/design only; **not built** |

**The project never verifies that an individual account is a bot.** It identifies observable suspicious behavior, gives users reversible local filtering, and surfaces limited, cited investigative signals. Browser hiding does **not** delete posts, ban accounts, alter platform account settings or act as a server-side moderator.

### Platforms

| Site | Feed / posts | Comments | Account identity | Readiness |
|---|---|---|---|---|
| YouTube | Video cards, community posts | Initial extractor | Public profile URL | Initial experimental adapter; default on |
| X / Twitter | Tweets / replies | Part of tweet cards | Public profile URL | Experimental, default off |
| Instagram | Caption selector | Provisional | Public profile URL | Experimental, default off |
| Reddit | Posts | Comments | Public profile URL | Experimental, default off |
| TikTok | Video descriptions | Provisional | Public profile URL | Experimental, default off |
| Facebook | Feed | Not yet | Public profile URL | Experimental, default off |
| Threads | Feed | Not separately | Public profile URL | Experimental, default off |
| Bluesky | Feed | Not separately | Public profile URL | Experimental, default off |
| LinkedIn | Feed | Provisional | Public profile URL | Experimental, default off |

The extension works only in supported **browser** pages. A matched selector is not proof the site works with its current interface. **It does not filter native mobile apps.**

## Quick start

Requirements: Node.js >= 22.16, npm, Chrome/Chromium, and network access for dependencies.

```sh
npm install
npm test
npm run typecheck:core
npm run typecheck
npm run build
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
entrypoints/                 WXT content script and popup
src/adapters/platforms/     One DOM spec per social platform
src/core/                   Spam rules, deduplication, account observations, policy, embedding ports
src/extension/              Local settings, reversible DOM UI and event controller
src/intel/                  Exact-match provenance-aware indicator packs and enrichment ports
src/network/                Shared-domain campaign candidates and evidence-labelled graph DTO
src/research/               Classification evaluation metrics
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

[Contributing](CONTRIBUTING.md) · [Threat model](docs/privacy.md) · Apache-2.0 source license (external model weights have separate terms).
