# AutoModerator / Discord AutoMod export — groundwork

Feature `automod-export`. Code: `src/rules/export-automod.ts` (stub).

## Idea

Moderators can paste AliveInternet community rules into the tools they already use, so the rule lists reach whole communities rather than one browser at a time:

- **Reddit AutoModerator:** generate YAML rules (`body (includes-word)`, `action: filter` with an `action_reason` citing the AliveInternet rule id).
- **Discord AutoMod:** generate keyword-filter rules a server admin enters in Server Settings → AutoMod.

## Boundaries

- Export produces **text the moderator copies**. AliveInternet never logs in, calls a moderation API, or acts on a community (AGENTS.md rule 1).
- Default to `filter` / review queue (Reddit) and "block message + alert" (Discord), not silent removal. The moderator owns the outcome.
- Rules that cannot be expressed faithfully (e.g. `noneOf` exceptions on Discord keyword filters) are skipped and listed in `skippedRuleIds`, never approximated loosely.
- Check current platform limits (keyword counts, term lengths, regex support) against the official Reddit and Discord documentation before implementing. Do not hard-code limits from memory.

## Next step

Implement after `parseRuleList`. Add golden-file tests per target and a "Export for moderators" button on the future rule-list page.
