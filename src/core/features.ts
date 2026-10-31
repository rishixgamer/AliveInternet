/**
 * Registry of planned and partially implemented features. Optional analyzer
 * wiring remains default-off until validation; some helpers already feed the
 * existing filter/policy. Empty preference lists have no effect by default.
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
  /**
   * v1.0 disposition from docs/v1-scope.md, recorded in docs/feature-groundwork.md.
   * `ship`: finished and covered by the v1.0 claim or release process.
   * `defer`: stays inert; no module, message type, permission or storage key may reach the
   * production bundle (tests/deferred-features.test.mjs). Removed features are not listed.
   */
  v1: 'ship' | 'defer';
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
    status: 'scaffolded', owner: 'maintainer', files: ['docs/store-listing.md'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Policy review, privacy draft and synthetic assets complete. Next: official project/contact and hosted policy links, native/signed browser checks and maintainer submission.' },
  { id: 'cross-browser-builds', title: 'Firefox and Edge build targets', group: 'distribution',
    status: 'implemented', owner: 'codex', files: ['package.json', 'docs/store-listing.md'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Firefox temporary desktop fixtures pass; verify signed Firefox/Android installs and branded Edge execution.' },
  { id: 'demo-media', title: 'Before/after demo GIF for the README', group: 'distribution',
    status: 'implemented', owner: 'codex', files: ['docs/media/README.md'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Synthetic production-UI screenshots and reversible GIF generated with provenance. Maintainer reviews assets before store submission.' },
  { id: 'toolbar-badge-count', title: 'Hidden-item count on the toolbar icon', group: 'distribution',
    status: 'in-progress', owner: 'codex', files: ['src/core/stats.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: counts-only tallyPage helper with tests. Next (post-1.0): re-add a page-stats message, a background handler and action.setBadgeText.' },
  { id: 'shareable-stats-card', title: 'Local monthly stats and shareable card', group: 'distribution',
    status: 'in-progress', owner: 'codex', files: ['src/core/stats.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: counts-only addToMonth/shareCard with tests. Next: persist counts only with reset control + popup card.' },
  { id: 'hacktoberfest-onboarding', title: 'Contributor onboarding and issue templates', group: 'distribution',
    status: 'scaffolded', owner: 'maintainer', files: ['.github/ISSUE_TEMPLATE', 'docs/good-first-issues.md'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Push to GitHub, add the hacktoberfest topic, open the issues in docs/good-first-issues.md.' },
  // Community
  { id: 'community-rule-lists', title: 'Declarative, subscribable community rule lists', group: 'community',
    status: 'in-progress', owner: 'claude', files: ['src/rules/schema.ts', 'docs/rule-list-spec.md', 'rules/README.md'], v1: 'defer', defaultEnabled: false,
    needsNetwork: true, changesStorage: true,
    nextStep: 'Done: strict parseRuleList + matchRuleList with example self-tests. Next: local file import UI; signed subscriptions later.' },
  { id: 'scam-benchmark', title: 'Public scam-comment benchmark and leaderboard', group: 'community',
    status: 'in-progress', owner: 'claude', files: ['src/research/dataset.ts', 'src/research/benchmark.ts', 'benchmark/README.md', 'scripts/benchmark.mjs'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Strict offline rule-only runner and synthetic plumbing fixture implemented. Obtain representative permissioned labels and freeze evaluation splits before accuracy claims.' },
  { id: 'language-rule-packs', title: 'Per-language rule packs', group: 'community',
    status: 'scaffolded', owner: 'qwen', files: ['rules/README.md', 'src/rules/schema.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Recruit native-speaker contributors; each pack ships with positive and benign examples.' },
  // Detection
  { id: 'reply-chain-detection', title: 'Scam testimonial reply chains', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/reply-chain.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: thread-grouped analyzer with tests; returns [] without threadId/parentId. Next: live-verify fields, wire via policy with benchmark.' },
  { id: 'creator-impersonation', title: 'Creator impersonation in comments', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/impersonation.ts', 'src/core/page-context.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: skeleton + solicitation analyzer with tests; silent without PageContext. Next: adapters provide owner key, wire via policy.' },
  { id: 'copied-comment-detection', title: 'Stolen / copied comments', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/copied-comment.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: verbatim-copy analyzer with length floor and earliest-copy rule. Next: benchmark, wire via policy.' },
  { id: 'profile-bait-detection', title: '"Check my profile" bait', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/profile-bait.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: rules plus creator/portfolio exclusions with tests. Next: benchmark, wire via policy.' },
  { id: 'obfuscation-normalization', title: 'Look-alike characters, spaced letters, contact handles', group: 'detection',
    status: 'implemented', owner: 'claude', files: ['src/core/obfuscation.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: TR39-style folding, spaced-letter collapsing and handle extraction feed filter.ts with tests.' },
  { id: 'generic-filler-preference', title: 'Opt-in "generic filler comment" preference filter', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/generic-filler.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: short-praise matcher labelled as preference with tests. Next: popup toggle, wire via policy.' },
  { id: 'local-classifier', title: 'Small on-device classifier / embedding clustering', group: 'detection',
    status: 'scaffolded', owner: 'claude', files: ['src/ml/local-classifier.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: true, changesStorage: true,
    nextStep: 'Blocked on the benchmark dataset; weights need consent, hash pinning and licence review.' },
  // Trust
  { id: 'trusted-content-exemptions', title: 'Never hide creator, pinned, hearted or allowlisted content', group: 'trust',
    status: 'implemented', owner: 'claude', files: ['src/core/trust.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: exact platform/account allowlist, popup editor and controller dedupe exemptions. Next: verified creator/pinned/hearted adapter flags and browser E2E.' },
  { id: 'cross-site-mute-words', title: 'Personal mute words across all sites', group: 'trust',
    status: 'implemented', owner: 'claude', files: ['src/core/mute.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: labelled mute policy plus validated popup editor and serialized saves. Next: browser E2E and accessibility checks.' },
  { id: 'settings-portability', title: 'Export / import settings and blocklists', group: 'trust',
    status: 'implemented', owner: 'codex', files: ['src/core/portability.ts', 'src/extension/popup-portability.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: bounded local backup, preview, cancel, serialized merge and explicitly confirmed replacement; imports do not grant host access.' },
  // Batch 2 (2026-10-12)
  { id: 'link-destination-reveal', title: 'Show where a link really goes (offline redirect decoding)', group: 'detection',
    status: 'implemented', owner: 'claude', files: ['src/core/links.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: YouTube/Facebook/Reddit wrappers decode offline; shorteners never fetched; mismatch flag with tests.' },
  { id: 'lookalike-domains', title: 'Look-alike brand domains', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/intel/lookalike-domains.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: confusable/edit-distance/brand-keyword matcher with tests. Next: verify a brand list entry by entry (list stays empty).' },
  { id: 'fake-verification-badges', title: 'Fake verification badges in display names', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/fake-badge.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: author-field imitation analyzer with tests. Next: adapters expose genuine badges, benchmark, wire via policy.' },
  { id: 'live-chat-filtering', title: 'YouTube live chat and Twitch chat', group: 'detection',
    status: 'scaffolded', owner: 'codex', files: ['src/core/live-chat.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Content script for the youtube.com/live_chat iframe; verify Twitch chat selectors live; apply ChatBudget.' },
  { id: 'fake-giveaway-streams', title: 'Fake crypto-giveaway livestreams in feeds', group: 'detection',
    status: 'in-progress', owner: 'claude', files: ['src/detectors/giveaway-stream.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: post-only multiplier analyzer with tests. Next: benchmark, wire via policy.' },
  { id: 'automod-export', title: 'Export rules to Reddit AutoModerator / Discord AutoMod', group: 'community',
    status: 'implemented', owner: 'claude', files: ['src/rules/export-automod.ts', 'docs/automod-export.md'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: copy-paste exporter defaults to report/flag for review with golden-text tests.' },
  { id: 'npm-core-package', title: 'Reusable detection core npm package', group: 'community',
    status: 'implemented', owner: 'codex', files: ['src/lib.ts', 'packages/core/package.json', 'docs/npm-package.md'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: standalone offline ESM tarball, declarations, third-party licenses and isolated consumer checks. Publication and namespace ownership remain maintainer actions.' },
  { id: 'hidden-items-review', title: '"Hidden on this page" review list in the popup', group: 'trust',
    status: 'implemented', owner: 'codex', files: ['src/core/review-list.ts', 'src/extension/messages.ts', 'src/extension/popup-review.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: explicit current-tab review with 50-item pagination, bounded excerpts, temporary reveal and stale-document protection; no content persistence.' },
  { id: 'report-feedback', title: 'Redacted "wrongly hidden / missed" report drafts', group: 'trust',
    status: 'implemented', owner: 'claude', files: ['src/feedback/report.ts', 'src/extension/popup-report.ts'], v1: 'ship', defaultEnabled: false,
    needsNetwork: true, changesStorage: false,
    nextStep: 'Done: in-memory redacted draft, popup preview/edit, bounded prefilled GitHub URL opened only by an explicit click; no extension request or storage. Network review in docs/privacy.md; store-policy classification still unverified.' },
  { id: 'check-this-comment', title: 'Right-click "Check this comment"', group: 'trust',
    status: 'in-progress', owner: 'claude', files: ['src/core/explain.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Done: local explainItem with tests. Next (post-1.0): contextMenus permission, background entrypoint and a check-item message (permission review).' },
  { id: 'per-channel-strictness', title: 'Per-channel / per-community filtering strength', group: 'trust',
    status: 'in-progress', owner: 'claude', files: ['src/core/scopes.ts'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: true,
    nextStep: 'Done: effectiveMode pure helper with tests. The scopeOverrides setting was removed for v1.0. Next (post-1.0): PageContext owner key, popup control and a re-added, validated setting.' },
  { id: 'ui-localization', title: 'Translated extension interface', group: 'distribution',
    status: 'scaffolded', owner: 'codex', files: ['locales/en/messages.json', 'locales/README.md'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Move to public/_locales, set default_locale, route UI strings through browser.i18n.' },
  { id: 'supply-chain-hardening', title: 'Lockfile, Dependabot, Scorecard, signed releases', group: 'trust',
    status: 'scaffolded', owner: 'maintainer', files: ['docs/supply-chain.md', '.github/dependabot.yml', 'SECURITY.md'], v1: 'ship', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Lockfile and npm ci CI are present, with browser/package checks. Next: maintainer review, Scorecard workflow and release attestations.' },
  { id: 'scam-pattern-changelog', title: '"Scam pattern of the week" public changelog', group: 'distribution',
    status: 'scaffolded', owner: 'maintainer', files: ['docs/scam-patterns/README.md', 'docs/scam-patterns/TEMPLATE.md'], v1: 'defer', defaultEnabled: false,
    needsNetwork: false, changesStorage: false,
    nextStep: 'Write an entry with each rule-list release; reuse as short-form video content.' },
];

export function featureById(id: string): FeatureEntry | undefined {
  return FEATURES.find(feature => feature.id === id);
}
