/**
 * Registry of planned features that have GROUNDWORK in the repo (types, inert
 * stubs, docs, templates) but no working behavior yet. Every entry must stay
 * `defaultEnabled: false` until its validation step is done; tests enforce it.
 * Human-readable detail lives in docs/feature-groundwork.md.
 */
export type FeatureGroup = 'distribution' | 'community' | 'detection' | 'trust';
export type FeatureStatus = 'scaffolded' | 'in-progress' | 'implemented';
export type FeatureOwner = 'claude' | 'codex' | 'qwen' | 'maintainer';

export interface FeatureEntry {
  id: string;
  title: string;
  group: FeatureGroup;
  status: FeatureStatus;
  owner: FeatureOwner;
  /** Repo paths holding this feature's groundwork. Tests check they exist. */
  files: string[];
  /** Must remain false until validated in a real browser / benchmark. */
  defaultEnabled: false;
  /** True if a finished version would make any network request (needs CLAUDE.md network review). */
  needsNetwork: boolean;
  /** True if a finished version would persist new data (needs docs/privacy.md update). */
  changesStorage: boolean;
  nextStep: string;
}

export const FEATURES: readonly FeatureEntry[] = [
  // Distribution
  { id: 'store-publishing', title: 'Chrome Web Store, Firefox Add-ons and Edge listings', group: 'distribution',
    status: 'scaffolded', owner: 'maintainer', files: ['docs/store-listing.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Pick the Firefox add-on ID, finish opt-in host permissions, capture screenshots, submit.' },
  { id: 'cross-browser-builds', title: 'Firefox and Edge build targets', group: 'distribution',
    status: 'scaffolded', owner: 'codex', files: ['package.json', 'docs/store-listing.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Smoke-test the Firefox (desktop + Android) and Edge builds on YouTube.' },
  { id: 'demo-media', title: 'Before/after demo GIF for the README', group: 'distribution',
    status: 'scaffolded', owner: 'maintainer', files: ['docs/media/README.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Record per docs/media/README.md once YouTube replies are filtered.' },
  { id: 'toolbar-badge-count', title: 'Hidden-item count on the toolbar icon', group: 'distribution',
    status: 'in-progress', owner: 'codex', files: ['src/core/stats.ts', 'src/extension/messages.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: counts-only tallyPage helper with tests. Next: background PageStatsMessage handler + action.setBadgeText.' },
  { id: 'shareable-stats-card', title: 'Local monthly stats and shareable card', group: 'distribution',
    status: 'in-progress', owner: 'codex', files: ['src/core/stats.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: counts-only addToMonth/shareCard with tests. Next: persist counts only with reset control + popup card.' },
  { id: 'hacktoberfest-onboarding', title: 'Contributor onboarding and issue templates', group: 'distribution',
    status: 'scaffolded', owner: 'maintainer', files: ['.github/ISSUE_TEMPLATE', 'docs/good-first-issues.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Push to GitHub, add the hacktoberfest topic, open the issues in docs/good-first-issues.md.' },
  // Community
  { id: 'community-rule-lists', title: 'Declarative, subscribable community rule lists', group: 'community',
    status: 'in-progress', owner: 'claude', files: ['src/rules/schema.ts', 'docs/rule-list-spec.md', 'rules/README.md'], defaultEnabled: false,
    needsNetwork: true, changesStorage: true,
    nextStep: 'Done: strict parseRuleList + matchRuleList with example self-tests. Next: local file import UI; signed subscriptions later.' },
  { id: 'report-feedback', title: '"Report a miss" / "Wrongly hidden" GitHub issue drafts', group: 'community',
    status: 'scaffolded', owner: 'claude', files: ['src/feedback/report.ts', '.github/ISSUE_TEMPLATE/false-positive.yml', '.github/ISSUE_TEMPLATE/missed-spam.yml'], defaultEnabled: false,
    needsNetwork: true, changesStorage: false,
    nextStep: 'Implement redaction + preview UI; open a prefilled issue URL only on explicit user click.' },
  { id: 'scam-benchmark', title: 'Public scam-comment benchmark and leaderboard', group: 'community',
    status: 'scaffolded', owner: 'claude', files: ['src/research/dataset.ts', 'benchmark/README.md', 'scripts/benchmark.mjs'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Collect permissioned, de-identified labelled items; implement the runner on top of evaluateDecisions.' },
  { id: 'language-rule-packs', title: 'Per-language rule packs', group: 'community',
    status: 'scaffolded', owner: 'qwen', files: ['rules/README.md', 'src/rules/schema.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Recruit native-speaker contributors; each pack ships with positive and benign examples.' },
  // Detection
  { id: 'reply-chain-detection', title: 'Scam testimonial reply chains', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/reply-chain.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: thread-grouped analyzer with tests; returns [] without threadId/parentId. Next: live-verify fields, wire via policy with benchmark.' },
  { id: 'creator-impersonation', title: 'Creator impersonation in comments', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/impersonation.ts', 'src/core/page-context.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: skeleton + solicitation analyzer with tests; silent without PageContext. Next: adapters provide owner key, wire via policy.' },
  { id: 'copied-comment-detection', title: 'Stolen / copied comments', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/copied-comment.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: verbatim-copy analyzer with length floor and earliest-copy rule. Next: benchmark, wire via policy.' },
  { id: 'profile-bait-detection', title: '"Check my profile" bait', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/profile-bait.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: rules plus creator/portfolio exclusions with tests. Next: benchmark, wire via policy.' },
  { id: 'obfuscation-normalization', title: 'Look-alike characters, spaced letters, contact handles', group: 'detection',
    status: 'implemented', owner: 'claude', files: ['src/core/obfuscation.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: TR39-style folding, spaced-letter collapsing and handle extraction feed filter.ts with tests.' },
  { id: 'generic-filler-preference', title: 'Opt-in "generic filler comment" preference filter', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/generic-filler.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: short-praise matcher labelled as preference with tests. Next: popup toggle, wire via policy.' },
  { id: 'local-classifier', title: 'Small on-device classifier / embedding clustering', group: 'detection',
    status: 'scaffolded', owner: 'claude', files: ['src/ml/local-classifier.ts'], defaultEnabled: false,
    needsNetwork: true, changesStorage: true,
    nextStep: 'Blocked on the benchmark dataset; weights need consent, hash pinning and licence review.' },
  // Trust
  { id: 'trusted-content-exemptions', title: 'Never hide creator, pinned, hearted or allowlisted content', group: 'trust',
    status: 'implemented', owner: 'claude', files: ['src/core/trust.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: policy.ts checks trustReason before any hide; allowedAccounts persisted. Popup editor still to add.' },
  { id: 'cross-site-mute-words', title: 'Personal mute words across all sites', group: 'trust',
    status: 'implemented', owner: 'claude', files: ['src/core/mute.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: whole-word matcher wired through policy.ts as a labelled preference; mutedWords persisted. Popup editor still to add.' },
  { id: 'settings-portability', title: 'Export / import settings and blocklists', group: 'trust',
    status: 'in-progress', owner: 'codex', files: ['src/core/portability.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: export/import with merge and size caps plus tests. Next: popup buttons with diff preview.' },
  { id: 'creator-mode', title: 'Creator mode: review likely scams on your own videos', group: 'trust',
    status: 'scaffolded', owner: 'claude', files: ['src/creator/review.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'List candidates with jump links; creators remove them in the platform UI (no moderation API).' },
  // Batch 2 (2026-10-12)
  { id: 'link-destination-reveal', title: 'Show where a link really goes (offline redirect decoding)', group: 'detection',
    status: 'implemented', owner: 'claude', files: ['src/core/links.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: YouTube/Facebook/Reddit wrappers decode offline; shorteners never fetched; mismatch flag with tests.' },
  { id: 'lookalike-domains', title: 'Look-alike brand domains', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/intel/lookalike-domains.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: confusable/edit-distance/brand-keyword matcher with tests. Next: verify a brand list entry by entry (list stays empty).' },
  { id: 'fake-verification-badges', title: 'Fake verification badges in display names', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/fake-badge.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: author-field imitation analyzer with tests. Next: adapters expose genuine badges, benchmark, wire via policy.' },
  { id: 'live-chat-filtering', title: 'YouTube live chat and Twitch chat', group: 'detection',
    status: 'scaffolded', owner: 'codex', files: ['src/core/live-chat.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Content script for the youtube.com/live_chat iframe; verify Twitch chat selectors live; apply ChatBudget.' },
  { id: 'fake-giveaway-streams', title: 'Fake crypto-giveaway livestreams in feeds', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/giveaway-stream.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: post-only multiplier analyzer with tests. Next: benchmark, wire via policy.' },
  { id: 'automod-export', title: 'Export rules to Reddit AutoModerator / Discord AutoMod', group: 'community',
    status: 'implemented', owner: 'claude', files: ['src/rules/export-automod.ts', 'docs/automod-export.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: copy-paste exporter defaults to report/flag for review with golden-text tests.' },
  { id: 'npm-core-package', title: 'Detection core published as an npm package', group: 'community',
    status: 'in-progress', owner: 'codex', files: ['src/lib.ts', 'docs/npm-package.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: lib.ts exports the implemented DOM-free core. Next: separate package, tsc emit, provenance.' },
  { id: 'hidden-items-review', title: '"Hidden on this page" review list in the popup', group: 'trust',
    status: 'in-progress', owner: 'codex', files: ['src/core/review-list.ts', 'src/extension/messages.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: ephemeral toReviewRecord helper with tests. Next: content-script HiddenItemsRequest handler + popup list.' },
  { id: 'check-this-comment', title: 'Right-click "Check this comment"', group: 'trust',
    status: 'in-progress', owner: 'claude', files: ['src/core/explain.ts', 'src/extension/messages.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: local explainItem with tests. Next: contextMenus permission + background entrypoint (permission review).' },
  { id: 'per-channel-strictness', title: 'Per-channel / per-community filtering strength', group: 'trust',
    status: 'in-progress', owner: 'claude', files: ['src/core/scopes.ts'], defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: effectiveMode pure helper with tests; scopeOverrides persisted. Next: PageContext owner key + popup control.' },
  { id: 'ui-localization', title: 'Translated extension interface', group: 'distribution',
    status: 'scaffolded', owner: 'codex', files: ['locales/en/messages.json', 'locales/README.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Move to public/_locales, set default_locale, route UI strings through browser.i18n.' },
  { id: 'supply-chain-hardening', title: 'Lockfile, Dependabot, Scorecard, signed releases', group: 'trust',
    status: 'scaffolded', owner: 'maintainer', files: ['docs/supply-chain.md', '.github/dependabot.yml', 'SECURITY.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Commit package-lock.json, switch CI to npm ci, add Scorecard workflow and release attestations.' },
  { id: 'scam-pattern-changelog', title: '"Scam pattern of the week" public changelog', group: 'distribution',
    status: 'scaffolded', owner: 'maintainer', files: ['docs/scam-patterns/README.md', 'docs/scam-patterns/TEMPLATE.md'], defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Write an entry with each rule-list release; reuse as short-form video content.' },
];

export function featureById(id: string): FeatureEntry | undefined {
  return FEATURES.find(feature => feature.id === id);
}
