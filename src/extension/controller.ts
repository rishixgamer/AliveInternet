import { browser } from 'wxt/browser';
import { collectYouTubeComments } from '../adapters/youtube.ts';
import { assessBatch } from '../core/filter.ts';
import { normalizeText } from '../core/normalize.ts';
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings } from './settings.ts';
import type { Settings } from './settings.ts';
import { annotateComment, collapseComment } from './ui.ts';
import type { AppliedUi } from './ui.ts';

interface RenderState { key: string; ui: AppliedUi | null; }

export function startYouTubeController(): () => void {
  let settings: Settings = { ...DEFAULT_SETTINGS };
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const managed = new Map<HTMLElement, RenderState>();
  const revealed = new Set<string>();

  function clearManaged() {
    for (const state of managed.values()) state.ui?.teardown();
    managed.clear();
  }

  function scan() {
    if (disposed) return;
    if (!settings.enabled) { clearManaged(); return; }
    const comments = collectYouTubeComments();
    const verdicts = assessBatch(comments, settings.mode);
    const active = new Set(comments.map((item) => item.element));
    for (const [el, state] of managed) {
      if (!active.has(el)) { state.ui?.teardown(); managed.delete(el); }
    }
    for (let i = 0; i < comments.length; i++) {
      const item = comments[i]!;
      const verdict = verdicts[i]!;
      const key = `${item.fingerprint}\u001f${item.links.join('|')}\u001f${settings.mode}\u001f${settings.annotateFlagged}\u001f${verdict.decision}\u001f${verdict.reason}`;
      const old = managed.get(item.element);
      if (old?.key === key) continue;
      old?.ui?.teardown();
      let ui: AppliedUi | null = null;
      if (!revealed.has(item.fingerprint) && verdict.decision === 'collapse') {
        ui = collapseComment(item.element, verdict, () => {
          revealed.add(item.fingerprint);
          managed.delete(item.element);
        });
      } else if (settings.annotateFlagged && verdict.decision === 'flag') {
        ui = annotateComment(item.element, verdict);
      }
      managed.set(item.element, { key, ui });
    }
  }

  function schedule() {
    if (disposed || timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; scan(); }, 400);
  }

  const observer = new MutationObserver((mutations) => {
    // Ignore our own UI changes, otherwise DOM annotations may trigger a scan loop.
    if (mutations.every((change) => {
      const target = change.target instanceof Element ? change.target : change.target.parentElement;
      return target?.closest('.threadsieve-collapsed, .threadsieve-flag') !== null &&
        [...change.addedNodes, ...change.removedNodes].every((node) =>
          !(node instanceof Element) || node.closest('.threadsieve-collapsed, .threadsieve-flag') !== null);
    })) return;
    schedule();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  const onNavigation = () => { revealed.clear(); clearManaged(); schedule(); };
  const onChanged = (changes: { [key: string]: { newValue?: unknown } }, area: string) => {
    if (area !== 'local' || !changes.settings) return;
    settings = sanitizeSettings(changes.settings.newValue);
    clearManaged();
    schedule();
  };

  window.addEventListener('yt-navigate-finish', onNavigation);
  browser.storage.onChanged.addListener(onChanged);
  void loadSettings().then((initial) => { if (disposed) return; settings = initial; schedule(); })
    .catch((error: unknown) => console.warn('[ThreadSieve] Unable to read settings:', normalizeText(String(error))));
  schedule();

  return () => {
    disposed = true;
    if (timer !== undefined) clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener('yt-navigate-finish', onNavigation);
    browser.storage.onChanged.removeListener(onChanged);
    clearManaged();
  };
}
