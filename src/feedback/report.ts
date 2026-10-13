import type { Platform } from '../core/platforms.ts';
import type { Decision } from '../core/types.ts';
import { NotImplementedError } from '../core/scaffold.ts';

/**
 * GROUNDWORK — feature `report-feedback`.
 *
 * "Report a miss" / "Wrongly hidden" buttons build a PRE-FILLED GitHub issue
 * the user reviews and submits themselves. Nothing is sent automatically.
 * Network note (CLAUDE.md): the only transmission is the user opening a
 * github.com URL containing the redacted draft below, on explicit click.
 *
 * Redaction contract: no account keys, usernames, display names, profile URLs,
 * @mentions or page URLs; links reduced to hostnames; text capped.
 */
export type ReportKind = 'missed-spam' | 'wrongly-hidden';
export interface ReportDraft {
  kind: ReportKind;
  platform: Platform;
  itemKind: 'comment' | 'post';
  /** Redacted text, user-editable in the preview before submission. */
  text: string;
  linkHosts: string[];
  decision: Decision;
  signals: string[];
  extensionVersion: string;
}
export const REPORT_REPO = 'OWNER/AliveInternet'; // TODO: set once the GitHub repo exists
export const MAX_REPORT_TEXT = 1_000;

export function redactForReport(_text: string): string {
  throw new NotImplementedError('report-feedback');
}
export function issueUrl(_draft: ReportDraft, _repo: string = REPORT_REPO): string {
  throw new NotImplementedError('report-feedback');
}
