# AliveInternet core (alpha)

DOM-free, network-free ESM modules for local, explainable content heuristics,
reversible preferences, validated imports and offline research. No runtime
packages, remote requests, scraping, storage or background processes.

```js
import { assessBatch } from '@aliveinternet/core';
const [result] = assessBatch([
  { id: '1', author: 'a', text: 'Contact me on Telegram for guaranteed crypto profit', links: [] }
]);
console.log(result.decision, result.reason);
```

Scores are uncalibrated observations, never bot probabilities or verified
identity claims. Shared-domain graph edges do not establish common ownership.
Allowlist and account identifiers are platform-scoped. Imported metadata is
untrusted. No exported helper performs platform moderation.

The 0.3 API is experimental. The source extension remains private; this package
can be built and packed locally without publishing. The npm scope/name has not
been reserved or verified available. Publication requires maintainer ownership
and a separate explicit action. See the repository's docs/npm-package.md for
build and tarball validation commands.
