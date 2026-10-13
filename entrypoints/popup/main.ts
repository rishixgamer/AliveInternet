import './style.css';
import { initializeSettingsPopup } from '../../src/extension/popup-settings.ts';
import { initializeReviewPopup } from '../../src/extension/popup-review.ts';
import { initializePortabilityPopup } from '../../src/extension/popup-portability.ts';
import { initializeIndicatorPopup } from '../../src/extension/popup-intel.ts';

const disposers = [initializeSettingsPopup(), initializeReviewPopup(),
  initializePortabilityPopup(), initializeIndicatorPopup()];
window.addEventListener('pagehide', () => { for (const dispose of disposers) dispose(); }, { once: true });
