import type { DOMSpec } from '../spec.ts';

/**
 * Twitch DOM selectors: PROVISIONAL, not live-browser verified (default off).
 *
 * Chat lines are treated as `comment` items. Twitch renders chat usernames as
 * buttons rather than profile links, so most chat lines will have no
 * accountKey: content rules still apply, but per-account hiding will not until
 * an adapter derives the login from a verified element. Twitch chat is
 * high-volume; see src/core/live-chat.ts (ChatBudget) before enabling broadly.
 */
export const twitchSpecs: DOMSpec[] = [
  { kind: 'comment', roots: '.chat-line__message, [data-a-target="chat-line-message"]',
    text: ['[data-a-target="chat-line-message-body"]', '.message', '.text-fragment'],
    authorLinks: ['a[href^="/"][data-a-target="chat-message-username"]', 'a.chat-author__display-name[href]'] },
  { kind: 'post', roots: 'article[data-a-target^="card-"], [data-a-target="preview-card-image-link"]',
    text: ['[data-a-target="preview-card-title-link"] h3', 'h3[title]', 'h3'],
    authorLinks: ['a[data-a-target="preview-card-channel-link"][href]', 'a[data-test-selector="ChannelLink"][href]'] },
];
