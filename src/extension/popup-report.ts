import { browser } from 'wxt/browser';
import { PLATFORMS, PLATFORM_LABELS } from '../core/platforms.ts';
import { MAX_REPORT_TEXT, buildIssueUrl, finalizeDraft, redactText, type ReportDraft } from '../feedback/report.ts';
import { REPORT_PENDING_REQUEST } from './messages.ts';

const KINDS = ['wrongly-hidden', 'missed'];
const MODES = ['conservative', 'balanced', 'aggressive'];

/** Validates a draft arriving from the page's content script; it is untrusted input. */
export function parseDraft(value: unknown): ReportDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const d = value as Record<string, unknown>;
  if (typeof d.kind !== 'string' || !KINDS.includes(d.kind) || typeof d.platform !== 'string' || !(PLATFORMS as readonly string[]).includes(d.platform) ||
      typeof d.text !== 'string' || typeof d.reason !== 'string' || typeof d.version !== 'string' ||
      (d.mode !== undefined && (typeof d.mode !== 'string' || !MODES.includes(d.mode)))) return undefined;
  // Rebuild every field rather than trusting the page context: redaction, caps and
  // the version format are enforced again here, so nothing else can ride along.
  const clean = redactText(d.reason.slice(0, 1000));
  return finalizeDraft({
    kind: d.kind as ReportDraft['kind'], platform: d.platform as ReportDraft['platform'], text: '',
    reason: [...clean].slice(0, 200).join(''), mode: d.mode as ReportDraft['mode'],
    version: /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(d.version) ? d.version : '',
  }, d.text.slice(0, MAX_REPORT_TEXT * 4));
}

/**
 * Preview step for "wrongly hidden / missed" reports. The only code path that opens
 * the GitHub URL is the Open button's click handler.
 */
export function initializeReportPopup(root: Document = document): { show(draft: ReportDraft): void; dispose(): void } {
  const section = root.querySelector<HTMLElement>('#reportSection')!;
  const summary = root.querySelector<HTMLElement>('#reportSummary')!;
  const text = root.querySelector<HTMLTextAreaElement>('#reportText')!;
  const open = root.querySelector<HTMLButtonElement>('#openReport')!;
  const clear = root.querySelector<HTMLButtonElement>('#clearReportText')!;
  const cancel = root.querySelector<HTMLButtonElement>('#cancelReport')!;
  let draft: ReportDraft | undefined;
  let disposed = false;

  function reset(): void { draft = undefined; text.value = ''; section.hidden = true; open.disabled = false; }
  function show(next: ReportDraft): void {
    if (disposed) return;
    draft = next; text.value = next.text; section.hidden = false;
    summary.textContent = `${next.kind === 'missed' ? 'Missed spam' : 'Wrongly hidden'} on ${PLATFORM_LABELS[next.platform]}. Review the text; nothing has been sent.`;
    text.focus();
  }
  const onOpen = () => {
    if (!draft || disposed || open.disabled) return;
    const url = buildIssueUrl(finalizeDraft(draft, text.value));
    open.disabled = true;
    void browser.tabs.create({ url, active: true }).then(() => { if (!disposed) reset(); })
      .catch(() => { if (!disposed) { open.disabled = false; summary.textContent = 'Could not open the draft. Nothing was sent.'; } });
  };
  const onClear = () => { text.value = ''; text.focus(); };
  const onCancel = () => reset();
  open.addEventListener('click', onOpen); clear.addEventListener('click', onClear); cancel.addEventListener('click', onCancel);

  // Local, same-extension message: pick up a draft staged by a page button (consumed on read).
  void (async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (typeof tab?.id !== 'number') return;
      const response = await browser.tabs.sendMessage(tab.id, { type: REPORT_PENDING_REQUEST }) as { ok?: unknown; draft?: unknown } | undefined;
      const parsed = response?.ok === true ? parseDraft(response.draft) : undefined;
      if (parsed) show(parsed);
    } catch { /* No supported page or no staged draft. */ }
  })();

  return { show, dispose() { disposed = true; open.removeEventListener('click', onOpen); clear.removeEventListener('click', onClear); cancel.removeEventListener('click', onCancel); text.value = ''; draft = undefined; } };
}
