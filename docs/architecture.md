# Architecture and implementation boundaries (v0.2)

## Feature dimensions

ThreadSieve separates *where an item came from* (platform adapter), *what it is* (`comment` or `post`), *who visibly posted it* (profile key if verifiable), and *what heuristic evidence it contains* (content score). This is not a human-vs-bot identity system.

```text
Browser / permitted websites (DOM only)
                 |
  entrypoints/social.content.ts
                 |
    platformFromHostname
                 |
    src/adapters/social.ts
       + youtube.ts
                 |
   RenderableItem[] {platform, kind, author, accountKey?, text, links, element}
                 |
    src/core/filter.ts ---> transparent scam indicators + exact normalized repeats
                 |
    src/core/accounts.ts ---> optional visible-page campaign gate
                 |
 src/extension/controller.ts <---- src/extension/settings.ts
                 |
    src/extension/ui.ts ---> local, reversible collapse, flag, manual account hide
```

### Account identity

`src/core/platforms.ts` derives identity only from **explicit same-site profile URLs** with allowlisted hostname and profile-path syntax. It rejects navigation paths, outbound links, other platforms, and display names as identifiers. `platform:profileKey` namespacing prevents cross-platform collisions. It does not link the same human's accounts across sites. Handle changes, usernames without public URLs, and DOM changes may defeat a block.

`blockedAccounts` holds user-selected profile identifiers in `browser.storage.local`. No browsing content or author activity history is persisted. Account hiding covers visible comments and feed items identified as the same profile, not the platform's entire database. The UI offers reversal. The optional campaign rule uses the **currently visible page**, never permanently blocks, and cannot establish automation.

### Content and comment filtering

`assessBatch()` is a deterministic, uncalibrated heuristic shared between all sites. `kind=post` also covers video cards and replies rendered as post cards, not necessarily full audiovisual analysis. Same text repeated by multiple accounts is weak evidence, and cannot by itself cause collapse. Per-platform selectors must be tested against actual markup, logged-out layouts, accessibility variants, localization, lazy loading, and SPA updates. The DOM specs deliberately fail open rather than processing large generic page bodies.

### Event processing

The content script observes dynamically added DOM nodes, coalesces scans, and restores page state on disabled sites. It caps each scan at 350 extracted items. Controller state uses a short-lived in-memory map. Do not add raw-text telemetry or remote code. Avoid excessive CPU usage, observer loops, and unbounded DOM modifications.

### Safety invariants

- High false-positive rates are worse than missing spam.
- No protected demographic proxies, inferred political alignment, or viewpoint-based auto suppression.
- No server-side actions or claims of authenticating an account as a bot.
- Never auto-persist an account to the blocklist from heuristics alone.
- Show clear reasons and allow instantaneous user reveal and unhide.
- Validate DOM selectors on live sites and document limitations before saying a site is supported.
- Local filtering still requires host access across named social sites. Investigate progressive optional host permissions before public store release.

### Pending verification

This generation environment could run dependency-free tests and core TypeScript checks but could not download WXT dependencies or run Chrome. Full WXT build, browser end-to-end checks, and adapter compatibility remain **unverified**.
