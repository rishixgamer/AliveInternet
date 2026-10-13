# Community rule list format — draft v1

Features `community-rule-lists`, `language-rule-packs`. Parser/matcher: `src/rules/schema.ts`. Status: implemented local helpers with synthetic tests; the extension does not load rule lists yet.

## Goals

- Anyone can contribute a scam pattern by PR without writing code (like uBlock Origin filter lists).
- Lists are **untrusted input**: strictly validated, size-capped, no executable content, **no raw regex** (ReDoS and unreviewable patterns).
- Every rule carries its own tests: `examples.positive` must match, `examples.benign` must not. CI will enforce this.

## Shape

```json
{
  "schemaVersion": 1,
  "id": "aliveinternet-core-en",
  "title": "AliveInternet core scams (English)",
  "maintainer": "AliveInternet contributors",
  "homepage": "https://github.com/OWNER/AliveInternet",
  "version": "2026.10.12",
  "expires": "2027-01-12",
  "license": "CC0-1.0",
  "rules": [
    {
      "id": "en.testimonial.named-advisor",
      "description": "Testimonial naming a person who 'earned me' money",
      "category": "spam",
      "locale": "en",
      "allOf": [
        {"anyOf": ["mrs", "mr", "dr", "miss"]},
        {"anyOf": ["earned me", "made me", "helped me make", "changed my life"]},
        {"anyOf": ["strategy", "trading", "investment", "bitcoin", "crypto"]}
      ],
      "noneOf": [{"anyOf": ["scam", "beware", "fake"]}],
      "weight": 4,
      "action": "collapse-candidate",
      "examples": {
        "positive": ["I met Mrs. Jane Example, her trading strategy earned me $40k in a month"],
        "benign": ["Beware of comments saying Mrs. X earned me money, it's a scam"]
      }
    }
  ]
}
```

## Semantics

- Text is normalized with `duplicateKey`, `foldConfusables` and `collapseSpacedLetters` before matching. Terms match on normalized word boundaries.
- `allOf`: every group must have at least one term present. `noneOf`: any hit cancels the rule.
- `action: "collapse-candidate"` only contributes evidence; `policy.ts` still decides, and trusted-content exemptions still apply. `flag` never hides.
- Limits: 500 rules, 20 groups per condition, 50 terms per group, 80 chars per term, 20 examples per type, 10,000 chars per example, 250,000 UTF-8 bytes per list. Unknown fields, invalid categories/platforms, duplicate rule IDs and malformed metadata are rejected. Platform-restricted rules do not match without site context.

## Distribution (later)

1. **v1:** local file import in the popup (same flow as indicator packs).
2. **v2:** subscriptions with a pinned publisher key; unsigned or expired lists are ignored. Before shipping this, document the network call per CLAUDE.md: exact data sent (list URL only), opt-in control, refresh interval, caching, provider terms.
