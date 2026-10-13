# AutoModerator / Discord AutoMod export — local helpers

Feature `automod-export`. Code: `src/rules/export-automod.ts`. Helpers are implemented and tested; no popup export UI or platform installation is verified.

## Idea

Moderators can paste AliveInternet community rules into the tools they already use, so the rule lists reach whole communities rather than one browser at a time:

- **Reddit AutoModerator:** generate YAML rules (`body (includes-word)`, `action: report` with an `action_reason` citing the AliveInternet rule id).
- **Discord AutoMod:** generate keyword-filter rules a server admin enters in Server Settings → AutoMod.

## Boundaries

- Export produces **text the moderator copies**. AliveInternet never logs in, calls a moderation API, or acts on a community (AGENTS.md rule 1).
- Reddit exports only `report`; Discord exports keyword suggestions with no action configuration. The moderator owns the outcome. Nothing is sent to either platform.
- Rules that cannot be expressed faithfully (e.g. `noneOf` exceptions on Discord keyword filters) are skipped and listed in `skippedRuleIds`, never approximated loosely.
- Exports retain every alternative in a single required group. Multi-group conjunctions, exclusions, incompatible terms and unsupported platform scopes are skipped rather than flattened. Reddit comments are made single-line and YAML values are quoted to prevent metadata from injecting directives. Discord retains complete supported rules within the documented 1,000-keyword / 60-character limits; overflowing rules are skipped, never truncated.
- Target word matching differs from AliveInternet normalization. These are reviewed literal suggestions, not a claim of equivalent classifiers; test in the target community before saving. The bundled multi-group testimonial example is intentionally skipped by both exporters.

References checked 2026-10-12: [Reddit AutoModerator documentation](https://support.reddithelp.com/hc/en-us/articles/52866343172500-Full-automoderator-documentation) and [Discord Auto Moderation documentation](https://docs.discord.com/developers/resources/auto-moderation).

## Next step

Add a preview UI that shows skipped rules and matching limitations. Validate copied configurations on authorized test communities before claiming platform support.
