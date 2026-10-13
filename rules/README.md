# Rule lists

Community-contributed spam/scam rules. Format: [docs/rule-list-spec.md](../docs/rule-list-spec.md). **Not loaded by the extension yet** (feature `community-rule-lists` is scaffolded).

Layout, one folder per language (BCP-47):

```text
rules/
  examples/en/   format examples, never shipped
  en/            English core list (to come)
  es/  pt-BR/  hi/ ...
```

Rules for contributors:
- Positive examples **and** benign look-alikes for every rule.
- Synthetic or fully redacted text only: no real usernames, phone numbers or links.
- Describe *behavior* (off-platform contact + money promise), never groups of people, nationalities or languages as risk signals.
