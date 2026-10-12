import { duplicateKey } from './normalize.ts';
import { foldConfusables, collapseSpacedLetters, extractContactHandles } from './obfuscation.ts';
import { decodeRedirect } from './links.ts';
import { repeatedCampaigns } from './cluster.ts';
import type { Assessment, Comment, FilterMode } from './types.ts';

const CONTACT = /(?:\btelegram\b|\bwhats\s?app\b|\bcontact\s+me\b|\bmessage\s+me\b|\b(?:dm|text)\s+me\b|\bt\.me\/|\bwa\.me\/)/iu;
const MONEY = /\b(?:crypto|bitcoin|forex|trading|investment|investor|profit|returns?|wallet|deposit|financial|cash|money|earnings?)\b/iu;
const PROMISE = /(?:\bguaranteed?\b.{0,40}\b(?:profit|return|earn|income)\b|\b(?:double|triple)\b.{0,20}\b(?:money|investment|bitcoin|deposit)\b|\b\d{2,4}%\s+(?:profit|return)\b)/iu;
const NEGATED_PROMISE = /\b(?:no|not|never|isn.t|aren.t|cannot|can.t)\s+(?:a\s+)?(?:guaranteed?|certain)\b/iu;
const PRIZE = /\b(?:giveaway|prize|winner|winnings|reward)\b/iu;
const CLAIM = /\b(?:claim|redeem|collect|verify|receive)\b.{0,24}\b(?:prize|reward|gift|winnings|payment)\b/iu;
const OFFICIAL = /\b(?:official|support team|administrator|moderator)\b/iu;
const URGENCY = /\b(?:act now|limited slots?|hurry|before it expires?|only today)\b/iu;
const RISKY_HOST = /(?:^|\/\/)(?:t\.me|wa\.me|bit\.ly|tinyurl\.com|cutt\.ly)(?:\/|$)/iu;

export function assessBatch(comments: Comment[], mode: FilterMode = 'balanced'): Assessment[] {
  const repeats = repeatedCampaigns(comments);
  const threshold = mode === 'conservative' ? 9 : mode === 'aggressive' ? 5 : 7;

  return comments.map((comment) => {
    const rawCombined = `${comment.text} ${comment.links.join(' ')}`;
    // Normalize look-alike characters and spaced-letter evasion before matching.
    const combined = collapseSpacedLetters(foldConfusables(rawCombined));
    const decodedLinks = comment.links.map((link) => decodeRedirect(link) ?? link);
    const signals: string[] = [];
    let score = 0;
    const contact = CONTACT.test(combined) || extractContactHandles(combined).length > 0;
    const money = MONEY.test(combined);
    const promise = PROMISE.test(combined) && !NEGATED_PROMISE.test(combined);
    const prize = PRIZE.test(combined);
    const claim = CLAIM.test(combined);
    const official = OFFICIAL.test(combined);
    const linked = comment.links.some((link) => RISKY_HOST.test(link))
      || decodedLinks.some((link) => RISKY_HOST.test(link));
    // Redirect wrappers that decode to a risky host count even when the
    // visible href is a benign platform domain.
    const wrappedRisky = decodedLinks.some((link, i) => link !== comment.links[i] && RISKY_HOST.test(link));
    const repeated = (repeats.get(duplicateKey(comment.text)) ?? 0) >= 4;

    // Context-dependent signals: generic comments and links alone must not be collapsed.
    if (contact && (money || prize)) { score += 4; signals.push('Off-platform contact solicitation'); }
    if (money && promise) { score += 4; signals.push('Implausible financial promise'); }
    if (prize && claim) { score += 3; signals.push('Prize-claim solicitation'); }
    if (official && contact) { score += 2; signals.push('Unverified authority claim with contact request'); }
    if (linked && (money || prize)) { score += 2; signals.push('External contact link associated with promotion'); }
    if (wrappedRisky && (money || prize)) { score += 1; signals.push('Redirect link resolves to an external contact host'); }
    if (URGENCY.test(combined) && (contact || claim)) { score += 1; signals.push('Urgency language'); }
    if (repeated) { score += 2; signals.push('Identical long message posted by at least four distinct authors'); }

    // Repetition alone, or an uncertain signal, never justifies automatic collapse.
    const substantiveEvidence = (contact && (money || prize)) || (money && promise) || (prize && claim);
    const decision = score >= threshold && substantiveEvidence
      ? 'collapse'
      : score >= 2 || repeated
        ? 'flag'
        : 'allow';

    return {
      id: comment.id,
      score,
      decision,
      signals,
      reason: signals.length ? signals.join(' · ') : 'No strong spam signals found',
    };
  });
}
