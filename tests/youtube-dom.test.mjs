import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { collectYouTubeComments } from '../src/adapters/youtube.ts';
import { collectPlatformItems } from '../src/adapters/social.ts';
import { assessBatch } from '../src/core/filter.ts';
import { localAction } from '../src/core/policy.ts';
import { DEFAULT_SETTINGS } from '../src/core/preferences.ts';
import { collapseContent } from '../src/extension/ui.ts';

const benign = 'This is such an important point. I completely agree.';
const scam = 'Contact me on Telegram to double your investment. Guaranteed profit!';

function comment(tag, key, text, extra = '') {
  return `<${tag} data-fixture="${key}">
    <a id="author-text" href="/@${key}">Same display name</a>
    <div id="content-text">${text}</div>${extra}
  </${tag}>`;
}

function withPage(html, run) {
  const dom = new JSDOM(html, { url: 'https://www.youtube.com/watch?v=synthetic' });
  const previous = new Map(['document', 'location'].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of previous.keys()) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  try { run(dom.window.document); }
  finally {
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

for (const tag of ['ytd-comment-view-model', 'ytd-comment-renderer']) {
  test(`${tag}: assesses parent and expanded replies independently`, () => {
    withPage(`<ytd-comment-thread-renderer>
      ${comment(tag, 'parent', benign)}
      <ytd-comment-replies-renderer>
        ${comment(tag, 'reply', scam)}
        ${comment(tag, 'benign-reply', benign)}
      </ytd-comment-replies-renderer>
    </ytd-comment-thread-renderer>`, () => {
      const items = collectPlatformItems('youtube');
      assert.equal(items.length, 3);
      assert.deepEqual(items.map(item => item.accountKey), ['@parent', '@reply', '@benign-reply']);
      assert.deepEqual(items.map(item => item.text), [benign, scam, benign]);
      assert.deepEqual(assessBatch(items).map(verdict => verdict.decision), ['allow', 'collapse', 'allow']);
      assert.ok(items.every(item => item.element.localName === tag));
    });
  });
}

test('a nested legacy renderer and view-model produce one item per comment', () => {
  withPage(`<ytd-comment-thread-renderer>
    <ytd-comment-renderer>${comment('ytd-comment-view-model', 'parent', benign)}</ytd-comment-renderer>
    <ytd-comment-replies-renderer>
      <ytd-comment-renderer>${comment('ytd-comment-view-model', 'reply', scam)}</ytd-comment-renderer>
    </ytd-comment-replies-renderer>
  </ytd-comment-thread-renderer>`, () => {
    const items = collectPlatformItems('youtube');
    assert.equal(items.length, 2);
    assert.ok(items.every(item => item.element.localName === 'ytd-comment-view-model'));
    assert.deepEqual(items.map(item => item.accountKey), ['@parent', '@reply']);
  });
});

test('hiding a parent leaves replies visible and restores its original display', () => {
  withPage(`<ytd-comment-thread-renderer>
    ${comment('ytd-comment-view-model', 'parent', scam)}
    <ytd-comment-replies-renderer>${comment('ytd-comment-view-model', 'reply', benign)}</ytd-comment-replies-renderer>
  </ytd-comment-thread-renderer>`, document => {
    const [parent, reply] = collectPlatformItems('youtube');
    parent.element.style.display = 'flex';
    const [verdict] = assessBatch([parent]);
    const settings = structuredClone(DEFAULT_SETTINGS);
    assert.equal(localAction(parent, verdict, settings).hide, true);
    let revealed = false;
    const ui = collapseContent(parent.element, verdict, parent.kind, () => { revealed = true; });
    assert.equal(parent.element.style.display, 'none');
    assert.equal(reply.element.closest('[style="display: none;"]'), null);
    assert.equal(document.querySelector('ytd-comment-thread-renderer').style.display, '');
    document.querySelector('.aliveinternet-collapsed button').click();
    assert.equal(revealed, true);
    assert.equal(parent.element.style.display, 'flex');
    assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
    ui.teardown();
    assert.equal(parent.element.style.display, 'flex');
  });
});

test('reply collapse teardown leaves the parent and sibling intact', () => {
  withPage(`<ytd-comment-thread-renderer>
    ${comment('ytd-comment-view-model', 'parent', benign)}
    <ytd-comment-replies-renderer>
      ${comment('ytd-comment-view-model', 'reply', scam)}
      ${comment('ytd-comment-view-model', 'sibling', benign)}
    </ytd-comment-replies-renderer>
  </ytd-comment-thread-renderer>`, document => {
    const items = collectPlatformItems('youtube');
    const verdicts = assessBatch(items);
    const reply = items[1];
    const ui = collapseContent(reply.element, verdicts[1], reply.kind, () => {});
    assert.equal(reply.element.style.display, 'none');
    assert.equal(items[0].element.style.display, '');
    assert.equal(items[2].element.closest('[style="display: none;"]'), null);
    // Extension UI must not become part of the next extracted comment.
    assert.deepEqual(collectPlatformItems('youtube').map(item => item.text), [benign, scam, benign]);
    ui.teardown();
    assert.equal(reply.element.style.display, '');
    assert.equal(document.querySelector('.aliveinternet-collapsed'), null);
  });
});

test('missing parent content never borrows a reply author or text', () => {
  withPage(`<ytd-comment-thread-renderer>
    <ytd-comment-view-model><a id="author-text" href="/@parent">Parent</a></ytd-comment-view-model>
    <ytd-comment-replies-renderer>${comment('ytd-comment-view-model', 'reply', benign)}</ytd-comment-replies-renderer>
  </ytd-comment-thread-renderer>`, () => {
    const items = collectPlatformItems('youtube');
    assert.equal(items.length, 1);
    assert.equal(items[0].accountKey, '@reply');
  });
});

test('unrecognized thread markup fails open instead of hiding the whole thread', () => {
  withPage(`<ytd-comment-thread-renderer>
    <unknown-comment><a id="author-text" href="/@parent">Parent</a>
      <div id="content-text">${scam}</div>
    </unknown-comment>
  </ytd-comment-thread-renderer>`, () => {
    assert.deepEqual(collectYouTubeComments(), []);
  });
});

test('comment links stay within the content boundary and unsafe schemes are excluded', () => {
  withPage(comment('ytd-comment-view-model', 'parent', `${benign}
    <a href="https://example.org/paper">paper</a>
    <a href="javascript:alert(1)">unsafe</a>
    <a href="data:text/html,example">unsafe</a>`,
  '<a href="https://unrelated.example/">unrelated control</a>'), () => {
    assert.deepEqual(collectPlatformItems('youtube')[0].links, ['https://example.org/paper']);
  });
});

test('expanded replies are discovered on subsequent scans', () => {
  withPage(`<ytd-comment-thread-renderer>
    ${comment('ytd-comment-view-model', 'parent', benign)}
    <ytd-comment-replies-renderer></ytd-comment-replies-renderer>
  </ytd-comment-thread-renderer>`, document => {
    assert.equal(collectPlatformItems('youtube').length, 1);
    document.querySelector('ytd-comment-replies-renderer').innerHTML =
      comment('ytd-comment-view-model', 'reply', scam);
    const items = collectPlatformItems('youtube');
    assert.equal(items.length, 2);
    assert.equal(assessBatch(items)[1].decision, 'collapse');
  });
});
