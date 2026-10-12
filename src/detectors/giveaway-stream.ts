import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `fake-giveaway-streams` — implemented analyzer.
 * Feed/recommendation cards for fake livestreams ("LIVE: ETH giveaway, send 1
 * get 2 back") on channels impersonating a celebrity or company. Evidence:
 * crypto-giveaway title terms + "send X get 2X" patterns on `kind: 'post'`
 * video cards. Comments never trigger; real news without the send/get
 * multiplier is excluded.
 */
const GIVEAWAY_RE = /\b(?:giveaway|airdrop|2x|double|live)\b/i;
const CRYPTO_RE = /\b(?:crypto|bitcoin|btc|eth|ethereum|xrp|doge|usdt|wallet)\b/i;
const MULTIPLIER_RE = /\bsend\s+\d+[^.]{0,30}\bget\s+\d+/i;

export function createGiveawayStreamAnalyzer(): ContentAnalyzer {
  return {
    id: 'giveaway-stream',
    capabilities: ['fake-giveaway', 'impersonation', 'spam'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      const out: AnalyzerEvidence[] = [];
      for (const item of items) {
        if (item.kind !== 'post') continue;
        const text = `${item.author} ${item.text}`;
        if (GIVEAWAY_RE.test(text) && CRYPTO_RE.test(text) && MULTIPLIER_RE.test(text)) {
          out.push({
            category: 'fake-giveaway',
            description: 'Livestream-style crypto giveaway with send/get multiplier (advisory only)',
            evidenceIds: [item.id],
            source: 'rules',
          });
        }
      }
      return out;
    },
  };
}
