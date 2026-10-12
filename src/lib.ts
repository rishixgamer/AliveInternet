/**
 * GROUNDWORK — feature `npm-core-package`. See docs/npm-package.md.
 * Planned public entry point for publishing the detection core to npm, so bots,
 * research tools and other extensions can reuse it. Exports only DOM-free,
 * network-free modules. Not built or published yet; package.json stays private.
 * Anything exported here becomes a semver commitment once published.
 */
export { assessBatch } from './core/filter.ts';
export { duplicateComments } from './core/dedupe.ts';
export { accountEvidence } from './core/behavior.ts';
export { normalizeText, duplicateKey } from './core/normalize.ts';
export { profileKey, platformFromHostname, PLATFORMS } from './core/platforms.ts';
export { parseIndicatorPack, matchIndicators } from './intel/indicators.ts';
export { domainCampaignCandidates, campaignGraph } from './network/campaigns.ts';
export { evaluateDecisions } from './research/metrics.ts';
export type { ContentItem, Assessment, Decision, FilterMode } from './core/types.ts';
export type { Platform } from './core/platforms.ts';
export type { ContentAnalyzer, AnalyzerEvidence, AnalyzerCategory } from './core/analyzer-ports.ts';
