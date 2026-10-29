import './style.css';
import '../../src/extension/content.css';
import { browser } from 'wxt/browser';
import { initializeAppearance } from '../../src/extension/appearance.ts';
import { collapseContent, type AppliedUi } from '../../src/extension/ui.ts';
const stopAppearance = initializeAppearance();
const mount = document.querySelector<HTMLElement>('#demoMount')!;
const reset = document.querySelector<HTMLButtonElement>('#resetDemo')!;
const status = document.querySelector<HTMLElement>('#status')!;
let demo: AppliedUi | undefined;
function showDemo() {
  demo?.teardown(); mount.replaceChildren(); reset.hidden = true;
  const comment = document.createElement('p'); comment.className = 'demo-comment';
  comment.textContent = 'Synthetic comment: please watch my channel.'; mount.append(comment);
  demo = collapseContent(comment, { id: 'synthetic-demo', decision: 'collapse', reason: 'Contains your muted phrase “watch my channel”', score: 0, signals: [] }, 'comment', () => { reset.hidden = false; status.textContent = 'Revealed. The original content is still here.'; });
}
showDemo(); reset.addEventListener('click', showDemo);
let pending = false;
const complete = () => {
  if (pending) return;
  pending = true;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('#finishTour,#skipTour')];
  for (const button of buttons) button.disabled = true;
  void browser.storage.local.set({ uiOnboardingComplete: true }).then(() => { location.href = browser.runtime.getURL('/options.html'); }).catch(() => {
    status.textContent = 'Could not save tour completion. Try again.'; pending = false;
    for (const button of buttons) button.disabled = false;
  });
};
document.querySelector('#finishTour')!.addEventListener('click', complete);
document.querySelector('#skipTour')!.addEventListener('click', complete);
window.addEventListener('pagehide', () => { stopAppearance(); demo?.teardown(); }, { once: true });
