export type FilterMode = 'conservative' | 'balanced' | 'aggressive';
export type Decision = 'allow' | 'flag' | 'collapse';

export interface Comment {
  /** Stable within one page scan; never transmitted or persisted by the default extension. */
  id: string;
  author: string;
  text: string;
  links: string[];
}

export interface Assessment {
  id: string;
  decision: Decision;
  /** Rule score, not a calibrated probability of being a bot. */
  score: number;
  signals: string[];
  reason: string;
}
