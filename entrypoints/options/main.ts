import './style.css';
import { initializeSettingsPopup } from '../../src/extension/popup-settings.ts';
import { initializePortabilityPopup } from '../../src/extension/popup-portability.ts';
import { initializeIndicatorPopup } from '../../src/extension/popup-intel.ts';
import { initializeAppearance } from '../../src/extension/appearance.ts';
const disposers = [initializeSettingsPopup(), initializePortabilityPopup(), initializeIndicatorPopup(), initializeAppearance()];
const nav = [...document.querySelectorAll<HTMLAnchorElement>('nav a')];
const markCurrent = () => {
  const hash = location.hash || '#filtering';
  for (const link of nav) {
    if (link.hash === hash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
};
markCurrent(); window.addEventListener('hashchange', markCurrent);
document.querySelector('#retrySettings')!.addEventListener('click', () => location.reload());
window.addEventListener('pagehide', () => { window.removeEventListener('hashchange', markCurrent); for (const dispose of disposers) dispose(); }, { once: true });
