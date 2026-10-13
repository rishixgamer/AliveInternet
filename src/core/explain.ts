import type { Assessment, ContentItem } from './types.ts';
import { assessBatch } from './filter.ts';
import { trustReason, DEFAULT_TRUST_SETTINGS, type TrustSettings } from './trust.ts';
import { mutedWordMatch, DEFAULT_MUTE_SETTINGS, type MuteSettings } from './mute.ts';

/**
 * Feature `check-this-comment` — implemented pure explainer.
 * Right-click "Check this comment with AliveInternet": explains the signals for
 * ANY item, including ones that were not hidden, and offers "report a miss".
 * No permission or background entrypoint is added here; this is the local
 * text explainer used by that UI.
 */
export interface ItemExplanation {
  assessment: Assessment;
  /** Plain-language lines, e.g. "Mentions Telegram together with crypto profit". */
  lines: string[];
  /** Why it was NOT hidden, when it wasn't (threshold, missing combination, trusted content). */
  notHiddenBecause?: string;
}
export function explainItem(item: ContentItem, options: {
  trust?: TrustSettings; mute?: MuteSettings;
} = {}): ItemExplanation {
  const [assessment] = assessBatch([item]);
  const verdict: Assessment = assessment ?? { id: item.id, decision: 'allow', score: 0, signals: [], reason: 'No strong spam signals found' };
  const lines = verdict.signals.length > 0
    ? verdict.signals.map((signal) => `• ${signal}`)
    : ['• No strong spam signals found in the visible text or links'];
  const trusted = trustReason(item, options.trust ?? DEFAULT_TRUST_SETTINGS);
  const muted = mutedWordMatch(item, options.mute ?? DEFAULT_MUTE_SETTINGS);
  if (verdict.decision !== 'collapse') {
    let notHiddenBecause = 'Below the collapse threshold, or a required signal combination is missing.';
    if (trusted) notHiddenBecause = `Not hidden: trusted content (${trusted}) is never auto-hidden.`;
    else if (muted) notHiddenBecause = `Would hide as a muted-word preference (“${muted}”), not as spam.`;
    else if (verdict.decision === 'flag') notHiddenBecause = 'Flagged for review but below the automatic-collapse threshold.';
    return { assessment: verdict, lines, notHiddenBecause };
  }
  if (trusted) {
    return { assessment: verdict, lines, notHiddenBecause: `Would otherwise collapse, but trusted content (${trusted}) is never auto-hidden.` };
  }
  return { assessment: verdict, lines };
}
