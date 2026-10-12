import type { Assessment, ContentKind } from '../core/types.ts';

export interface AppliedUi { teardown(): void; }

export function annotateContent(element: HTMLElement, verdict: Assessment): AppliedUi {
  const note = document.createElement('div');
  note.className = 'threadsieve-flag';
  note.textContent = `ThreadSieve: ${verdict.reason}`;
  note.title = 'Heuristic rule-based assessment. Not a verified bot classification.';
  element.prepend(note);
  return { teardown: () => note.remove() };
}

export function accountAction(element: HTMLElement, accountKey: string, onBlock: () => void): AppliedUi {
  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'threadsieve-account-action';
  action.textContent = `Hide ${accountKey} locally`;
  action.title = 'Hide posts and comments by this account on this platform in your browser. Does not block them on the platform.';
  action.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    action.disabled = true;
    onBlock();
  });
  element.append(action);
  return { teardown: () => action.remove() };
}

export function collapseContent(
  element: HTMLElement, verdict: Assessment, kind: ContentKind, onReveal: () => void,
  accountKey?: string, onBlock?: () => void,
): AppliedUi {
  const previousDisplay = element.style.display;
  const holder = document.createElement('div');
  holder.className = 'threadsieve-collapsed';
  const explanation = document.createElement('span');
  explanation.textContent = `ThreadSieve hid ${kind === 'post' ? 'content' : 'a comment'} locally: ${verdict.reason}. `;
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.textContent = 'Show temporarily';
  reveal.setAttribute('aria-label', `Reveal hidden ${kind}`);
  reveal.addEventListener('click', () => { onReveal(); holder.remove(); element.style.display = previousDisplay; });
  holder.append(explanation, reveal);
  if (accountKey && onBlock) {
    const block = document.createElement('button');
    block.type = 'button';
    block.textContent = `Hide ${accountKey} on this site`;
    block.addEventListener('click', () => { block.disabled = true; onBlock(); });
    holder.append(' ', block);
  }
  element.before(holder);
  element.style.display = 'none';
  return { teardown() { holder.remove(); element.style.display = previousDisplay; } };
}
