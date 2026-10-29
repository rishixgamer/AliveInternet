/** Synthetic page only. No third-party scripts, requests or real account data. */
export const BENIGN = 'This is such an important point. I completely agree.';
export const SPAM = 'Contact me on Telegram to double your investment. Guaranteed profit!';
export function comment(id, text = SPAM, display = '') {
  return `<ytd-comment-view-model data-fixture="${id}" style="display:${display}"><a id="author-text" href="/@${id}">Synthetic author ${id}</a><div id="content-text">${text}</div></ytd-comment-view-model>`;
}
export function youtubeFixture(url) {
  const large = new URL(url).searchParams.get('large') === '1';
  const rows = large
    ? Array.from({ length: 1400 }, (_, i) => comment(`large-${i}`)).join('') + comment('large-benign', BENIGN)
    : `<ytd-comment-thread-renderer>${comment('spam-parent', SPAM, 'flex')}<ytd-comment-replies-renderer>${comment('benign-reply', BENIGN)}</ytd-comment-replies-renderer></ytd-comment-thread-renderer>${comment('spam-other')}${comment('benign', BENIGN)}${comment('warning', 'No guaranteed profit exists. Beware of investment scams.')}`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>AliveInternet authorized synthetic fixture</title><style>ytd-comment-view-model{display:block;margin:8px;padding:4px}a{display:block}</style></head><body><h1>Authorized synthetic YouTube-shaped fixture</h1><main id="feed">${rows}</main><script>window.fixtureMetrics={longTasks:[],mutations:0};try{new PerformanceObserver(list=>window.fixtureMetrics.longTasks.push(...list.getEntries().map(x=>({duration:x.duration,startTime:x.startTime})))).observe({type:'longtask',buffered:true});}catch{}new MutationObserver(records=>window.fixtureMetrics.mutations+=records.length).observe(document.querySelector('#feed'),{subtree:true,childList:true,attributes:true});</script></body></html>`;
}
