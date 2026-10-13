# Local core package

October 13 update: the verified default GitHub repository `rishixgamer/AliveInternet` exists privately, and both package manifests reference it with maintainer name Rishi Haldar. No source is uploaded yet, npm scope/trusted-publishing ownership is unverified, and no publication was performed. See [publisher verification](publisher-details.md). The October 12 lookup below remains historical evidence.

The extension remains `private: true`. `packages/core` builds the implemented
public API from `src/lib.ts` as ESM JavaScript plus TypeScript declarations.
The runtime entry bundles its offline Public Suffix List parser; consumers need
no runtime dependencies. Third-party license notices ship in the tarball.
Inert report, creator, dataset, model and adapter scaffolds are not exported.

```sh
npm run test:package  # build, npm tarball, isolated JS + TypeScript consumer
npm run pack:core     # local tarball in .output; never publishes
```

The consumer gate executes an actual packed artifact in a new temporary package
installation, verifies benign/scam decisions and offline helpers, forbids DOM
and network access, and typechecks against the packed declarations. Building
alone does not count as package-consumer verification.

```js
import { assessBatch } from '@aliveinternet/core';
const [result] = assessBatch([
  { id: '1', author: 'a', text: 'Contact me on Telegram for guaranteed crypto profit', links: [] }
]);
console.log(result.decision, result.reason);
```

An official unauthenticated registry lookup on October 12, 2026 returned E404
for `@aliveinternet/core`. This does not prove scope ownership or reserve it.
This checkout has no configured Git remote; repository/provenance metadata must
come from the maintainer. See [release review](release-review.md). No publication
was performed. The 0.3 API is experimental; a future publication needs owner
credentials, availability verification, provenance and an explicit release
action. `Assessment.score` remains uncalibrated and is never a bot probability.
Lookalike/link helpers use bounded offline lexical comparisons; they do not
verify brand identity, reputation or domain ownership. Their browser UI remains
unwired, the default brand list is empty, and unsupported IDN/IP/unknown suffix
inputs yield no advisory. Private suffix tenants remain separate.
