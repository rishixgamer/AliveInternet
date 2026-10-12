import type { Assessment } from '../core/types.ts';

export interface AppliedUi {
  teardown(): void;
}

export function annotateComment(element: HTMLElement, verdict: Assessment): AppliedUi {
  const note = document.createElement('div');
  note.className = 'threadsieve-flag';
  note.textContent = `ThreadSieve: ${verdict.reason}`;
  note.title = 'This is a rule-based signal, not a verified bot classification.';
  element.prepend(note);
  return { teardown: () => note.remove() };
}

export function collapseComment(element: HTMLElement, verdict: Assessment, onReveal: () => void): AppliedUi {
  const previousDisplay = element.style.display;
  const holder = document.createElement('div');
  holder.className = 'threadsieve-collapsed';
  const explanation = document.createElement('span');
  explanation.textContent = `ThreadSieve collapsed a suspicious comment: ${verdict.reason}. `;
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.textContent = 'Show comment';
  reveal.setAttribute('aria-label', 'Reveal collapsed YouTube comment');
  reveal.addEventListener('click', () => { onReveal(); holder.remove(); element.style.display = previousDisplay; });
  holder.append(explanation, reveal);
  element.before(holder);
  element.style.display = 'none';
  return { teardown() { holder.remove(); element.style.display = previousDisplay; } };
}
