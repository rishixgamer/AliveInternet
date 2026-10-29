import type { Assessment, ContentKind } from '../core/types.ts';
import type { AccountEvidence } from '../core/behavior.ts';

type AccountAction = () => void | Promise<void>;
let nextEvidenceId = 0;

function focusContent(element: HTMLElement): void {
  if (!element.isConnected) return;
  const focus = element.querySelector<HTMLElement>('a[href],button,[tabindex="0"]') ?? element;
  const previous = focus.getAttribute('tabindex');
  if (focus === element) focus.tabIndex = -1;
  focus.focus({ preventScroll: true });
  if (focus === element) {
    if (previous === null) focus.removeAttribute('tabindex'); else focus.setAttribute('tabindex', previous);
  }
}

function addAccountButton(container: HTMLElement, label: string, action: AccountAction): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = label;
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation(); button.disabled = true;
    const oldError = container.querySelector('.aliveinternet-action-error'); oldError?.remove();
    void Promise.resolve().then(action).catch(() => {
      const error = document.createElement('p'); error.className = 'aliveinternet-action-error';
      error.setAttribute('role', 'status'); error.textContent = 'Could not save this local choice. Try again or open extension settings.';
      container.append(error);
    }).finally(() => { button.disabled = false; });
  });
  container.append(button); return button;
}

export interface AppliedUi {
  teardown(): void;
  /** Same reversible operation used by the visible reveal button. */
  reveal?(): void;
  /** Site renderers may remove or move UI while recycling a content element. */
  isCurrent(): boolean;
}

export function annotateContent(element: HTMLElement, verdict: Assessment): AppliedUi {
  const note = document.createElement('div');
  note.className = 'aliveinternet-flag';
  note.textContent = `AliveInternet: ${verdict.reason}`;
  note.title = 'Explainable, uncalibrated observations. Not proof that an author is a bot.';
  element.prepend(note);
  return { teardown: () => note.remove(), isCurrent: () => note.parentElement === element };
}

function evidencePanel(evidence: AccountEvidence): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'aliveinternet-evidence';
  const heading = document.createElement('strong');
  heading.textContent = `Visible-page observations for ${evidence.accountId}`;
  panel.append(heading);
  const summary = document.createElement('p');
  summary.textContent = `${evidence.itemsObserved} item(s), ${evidence.distinctTexts} distinct text(s), ${evidence.collapsedByRules} high-evidence rule match(es).`;
  panel.append(summary);
  const list = document.createElement('ul');
  const findings = [...evidence.findings, evidence.limits];
  for (const message of findings) {
    const item = document.createElement('li'); item.textContent = message; list.append(item);
  }
  panel.append(list);
  return panel;
}

function addInspectButton(container: HTMLElement, evidence?: AccountEvidence): void {
  if (!evidence) return;
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = 'Inspect evidence';
  button.setAttribute('aria-expanded', 'false');
  const id = `aliveinternet-evidence-${++nextEvidenceId}`;
  button.setAttribute('aria-controls', id);
  let panel: HTMLDivElement | undefined;
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (panel) { panel.remove(); panel = undefined; button.setAttribute('aria-expanded', 'false'); }
    else { panel = evidencePanel(evidence); panel.id = id; container.append(panel); button.setAttribute('aria-expanded', 'true'); }
  });
  container.append(button);
}

export function accountAction(
  element: HTMLElement, accountKey: string, onBlock?: AccountAction, evidence?: AccountEvidence,
): AppliedUi {
  const controls = document.createElement('div'); controls.className = 'aliveinternet-controls';
  if (onBlock) {
    const action = addAccountButton(controls, `Hide ${accountKey} locally`, onBlock);
    action.className = 'aliveinternet-account-action';
    action.title = 'Hide visible posts and comments from this profile locally, not on the social platform.';
  }
  addInspectButton(controls, evidence);
  element.append(controls);
  return {
    teardown: () => { const hadFocus = controls.contains(document.activeElement); controls.remove(); if (hadFocus) focusContent(element); },
    isCurrent: () => controls.parentElement === element,
  };
}

export function collapseContent(
  element: HTMLElement, verdict: Assessment, kind: ContentKind, onReveal: () => void,
  accountKey?: string, onBlock?: AccountAction, evidence?: AccountEvidence, onUnhide?: AccountAction,
): AppliedUi {
  const previousDisplay = element.style.display;
  const holder = document.createElement('div'); holder.className = 'aliveinternet-collapsed';
  const title = document.createElement('strong'); title.className = 'aliveinternet-collapse-title';
  title.textContent = 'AliveInternet · hidden locally';
  holder.append(title);
  const explanation = document.createElement('span');
  explanation.className = 'aliveinternet-reason';
  explanation.textContent = verdict.reason;
  const reveal = document.createElement('button'); reveal.type = 'button';
  reveal.textContent = 'Show temporarily'; reveal.setAttribute('aria-label', `Reveal hidden ${kind}`);
  const show = () => {
    const hadFocus = holder.contains(document.activeElement);
    onReveal(); holder.remove(); element.style.display = previousDisplay;
    if (hadFocus) focusContent(element);
  };
  reveal.addEventListener('click', show);
  holder.append(explanation, reveal);
  if (accountKey && onBlock) {
    addAccountButton(holder, `Hide ${accountKey} on this site`, onBlock);
  }
  if (onUnhide) addAccountButton(holder, 'Unhide account on this site', onUnhide);
  addInspectButton(holder, evidence);
  element.before(holder);
  const hadContentFocus = element.contains(document.activeElement);
  element.style.display = 'none';
  if (hadContentFocus) reveal.focus({ preventScroll: true });
  return {
    reveal: show,
    teardown() {
      const hadFocus = holder.contains(document.activeElement);
      holder.remove(); element.style.display = previousDisplay;
      if (hadFocus) focusContent(element);
    },
    isCurrent: () => holder.parentNode === element.parentNode && holder.nextSibling === element,
  };
}
