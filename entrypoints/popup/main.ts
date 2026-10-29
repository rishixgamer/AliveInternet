import './style.css';
import { initializeToolbarPopup } from '../../src/extension/popup-toolbar.ts';
import { initializeAppearance } from '../../src/extension/appearance.ts';
const disposers = [initializeAppearance(), initializeToolbarPopup()];
window.addEventListener('pagehide', () => { for (const dispose of disposers) dispose(); }, { once: true });
