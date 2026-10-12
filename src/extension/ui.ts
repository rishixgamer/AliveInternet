import type { Assessment, ContentKind } from '../core/types.ts';
import type { AccountEvidence } from '../core/behavior.ts';

export interface AppliedUi {
  teardown(): void;
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
  let panel: HTMLDivElement | undefined;
  button.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (panel) { panel.remove(); panel = undefined; button.setAttribute('aria-expanded', 'false'); }
    else { panel = evidencePanel(evidence); container.append(panel); button.setAttribute('aria-expanded', 'true'); }
  });
  container.append(button);
}

export function accountAction(
  element: HTMLElement, accountKey: string, onBlock?: () => void, evidence?: AccountEvidence,
): AppliedUi {
  const controls = document.createElement('div'); controls.className = 'aliveinternet-controls';
  if (onBlock) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'aliveinternet-account-action';
    action.textContent = `Hide ${accountKey} locally`;
    action.title = 'Hide visible posts and comments from this profile locally, not on the social platform.';
    action.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation(); action.disabled = true; onBlock();
    });
    controls.append(action);
  }
  addInspectButton(controls, evidence);
  element.append(controls);
  return { teardown: () => controls.remove(), isCurrent: () => controls.parentElement === element };
}

export function collapseContent(
  element: HTMLElement, verdict: Assessment, kind: ContentKind, onReveal: () => void,
  accountKey?: string, onBlock?: () => void, evidence?: AccountEvidence,
): AppliedUi {
  const previousDisplay = element.style.display;
  const holder = document.createElement('div'); holder.className = 'aliveinternet-collapsed';
  const explanation = document.createElement('span');
  explanation.textContent = `AliveInternet hid ${kind === 'post' ? 'content' : 'a comment'} locally: ${verdict.reason}. `;
  const reveal = document.createElement('button'); reveal.type = 'button';
  reveal.textContent = 'Show temporarily'; reveal.setAttribute('aria-label', `Reveal hidden ${kind}`);
  reveal.addEventListener('click', () => { onReveal(); holder.remove(); element.style.display = previousDisplay; });
  holder.append(explanation, reveal);
  if (accountKey && onBlock) {
    const block = document.createElement('button'); block.type = 'button';
    block.textContent = `Hide ${accountKey} on this site`;
    block.addEventListener('click', () => { block.disabled = true; onBlock(); });
    holder.append(' ', block);
  }
  addInspectButton(holder, evidence);
  element.before(holder);
  element.style.display = 'none';
  return {
    teardown() { holder.remove(); element.style.display = previousDisplay; },
    isCurrent: () => holder.parentNode === element.parentNode && holder.nextSibling === element,
  };
}
