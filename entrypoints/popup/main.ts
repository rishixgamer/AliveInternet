import './style.css';
import { initializeSettingsPopup } from '../../src/extension/popup-settings.ts';
import { initializeReportPopup } from '../../src/extension/popup-report.ts';
import { initializeReviewPopup } from '../../src/extension/popup-review.ts';
import { initializePortabilityPopup } from '../../src/extension/popup-portability.ts';
import { initializeIndicatorPopup } from '../../src/extension/popup-intel.ts';

const report = initializeReportPopup();
const disposers = [initializeSettingsPopup(), initializeReviewPopup(document, report.show), report.dispose,
  initializePortabilityPopup(), initializeIndicatorPopup()];
window.addEventListener('pagehide', () => { for (const dispose of disposers) dispose(); }, { once: true });
