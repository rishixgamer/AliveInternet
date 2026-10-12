# Contributing

Open an issue describing the behavior, reproduction steps, environment, expected outcome, and privacy implications before large changes. For a new spam rule, add both true-positive and benign counterexamples to the tests. For a new social platform, keep its DOM adapter separate from the scoring core and review applicable platform policies.

Use descriptive branches and focused PRs. Run `npm run test`, `npm run typecheck`, and `npm run build` before requesting review; document any unavailable checks. Do not commit model weights, secrets, scraped comments containing personal data, or undocumented network endpoints.

Please disclose security vulnerabilities privately to a maintainer rather than opening an exploit-bearing public issue. The repository does not currently operate a hosted backend.
