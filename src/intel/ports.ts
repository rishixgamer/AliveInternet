import type { Indicator } from './indicators.ts';

/**
 * Optional, explicitly invoked intelligence integrations. No implicit network
 * requests, no IP harvesting, and no geographic bot-farm proximity scoring.
 */
export interface EvidenceCitation {
  url: string;
  publisher: string;
  fetchedAt: string;
  claim: string;
  confidence: 'reported' | 'corroborated' | 'unverified';
}
export interface CampaignAttribution {
  campaignId: string;
  /** Attribution from a cited public report, never geolocation of an individual. */
  reportedOrigin?: string;
  source: EvidenceCitation;
}
export interface DomainEnrichment {
  domain: string;
  rdapEvents?: {action: string; date: string}[];
  citations: EvidenceCitation[];
  indicators: Indicator[];
  caveat: string;
}
export interface IntelligenceProvider {
  id: string;
  /** Must run only with explicit user consent; may transmit the requested domain. */
  lookupDomain(domain: string, signal?: AbortSignal): Promise<DomainEnrichment>;
}
