import type { ContentKind } from '../core/types.ts';
import type { Platform } from '../core/platforms.ts';
import { youtubeSpecs } from './platforms/youtube.ts';
import { xSpecs } from './platforms/x.ts';
import { instagramSpecs } from './platforms/instagram.ts';
import { redditSpecs } from './platforms/reddit.ts';
import { tiktokSpecs } from './platforms/tiktok.ts';
import { facebookSpecs } from './platforms/facebook.ts';
import { threadsSpecs } from './platforms/threads.ts';
import { blueskySpecs } from './platforms/bluesky.ts';
import { linkedinSpecs } from './platforms/linkedin.ts';

export interface DOMSpec {
  kind: ContentKind;
  roots: string;
  text: string[];
  authorLinks: string[];
}

/** Site configurations are deliberately separate so coding agents can work independently. */
export const DOM_SPECS: Record<Platform, DOMSpec[]> = {
  youtube: youtubeSpecs,
  x: xSpecs,
  instagram: instagramSpecs,
  reddit: redditSpecs,
  tiktok: tiktokSpecs,
  facebook: facebookSpecs,
  threads: threadsSpecs,
  bluesky: blueskySpecs,
  linkedin: linkedinSpecs,
};
