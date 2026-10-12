# Good first issues (Hacktoberfest-ready)

Feature `hacktoberfest-onboarding`. Open these as GitHub issues once the repo is public, and add the `hacktoberfest` topic to the repository (topics only count when set on GitHub).

| Issue | Labels | Files |
|---|---|---|
| Spanish scam rule pack (with benign examples) | rules, good first issue | `rules/` |
| Portuguese (pt-BR) scam rule pack | rules, good first issue | `rules/` |
| Hindi / Hinglish scam rule pack | rules, good first issue | `rules/` |
| Synthetic fixtures for reply-chain scams | tests, good first issue | `fixtures/` |
| Benign counterexamples: creator giveaways, "link in bio", finance educators | tests, good first issue | `tests/` |
| Implement `collapseSpacedLetters` | detection, good first issue | `src/core/obfuscation.ts` |
| Implement `extractContactHandles` (phones, t.me, wa.me) | detection | `src/core/obfuscation.ts` |
| Implement `foldConfusables` (Unicode TR39 skeleton) | detection | `src/core/obfuscation.ts` |
| Fix: `PROMISE` regex misses "doubled" / "tripled" | detection, good first issue | `src/core/filter.ts` |
| Implement `mutedWordMatch` | trust, good first issue | `src/core/mute.ts` |
| Implement settings export/import | trust | `src/core/portability.ts` |
| Firefox desktop smoke test + screenshots | adapter, testing | `docs/store-listing.md` |
| Popup accessibility audit (keyboard + screen reader) | accessibility | `entrypoints/popup/` |
| Reddit / X adapter live verification | adapter | `src/adapters/platforms/` |

Every detection PR needs true-positive **and** benign tests (CONTRIBUTING.md).
