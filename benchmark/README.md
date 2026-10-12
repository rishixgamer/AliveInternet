# AliveInternet scam-comment benchmark — groundwork

Feature `scam-benchmark`. Types: `src/research/dataset.ts`. Runner: `npm run benchmark` (stub, exits 2).

## Why

The rules have no measured precision or false-positive rate yet. A public benchmark lets every rule change be judged on numbers, and gives researchers a reason to use and cite the project.

## Data rules

- Synthetic, permissioned, or de-identified only. No usernames, profile URLs, avatars or phone numbers; use `accountGroup` opaque ids.
- Record licence and provenance in a manifest per dataset (`DatasetManifest`).
- Fixed `dev` / `test` split; rules may be tuned on `dev` only.
- Must include hard benign cases: finance educators, creator giveaways, "link in bio", repeated legitimate opinions, non-English comments.

## Planned output

Per platform × category × locale: precision, recall, false-positive rate (via `evaluateDecisions`), plus latency per 350 items. A leaderboard table in this file, updated by PR.
