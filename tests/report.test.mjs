import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_REPO, MAX_REPORT_TEXT, MAX_REPORT_URL, buildDraft, finalizeDraft, buildIssueUrl } from '../src/feedback/report.ts';

const base = { kind: 'wrongly-hidden', platform: 'youtube', author: 'Jane Display', accountKey: '@jane_doe', links: [], reason: 'Off-platform contact solicitation', mode: 'balanced', version: '0.3.0' };

test('report repository is the real project repository', () => {
  assert.equal(REPORT_REPO, 'rishixgamer/AliveInternet');
});

test('redacts account key, display name, @mentions, emails and phone numbers', () => {
  const draft = buildDraft({ ...base, text: 'Ask Jane Display or @jane_doe or @someone_else, mail me at a.b@example.org or call +1 (555) 123-4567' });
  for (const leaked of ['Jane Display', 'jane_doe', 'someone_else', 'a.b@example.org', '555']) {
    assert.ok(!draft.text.includes(leaked), `leaked ${leaked}: ${draft.text}`);
  }
  assert.match(draft.text, /\[handle\]/);
  assert.match(draft.text, /\[email\]/);
  assert.match(draft.text, /\[phone\]/);
});

test('reduces every URL, including scheme-less ones, to a hostname and drops profile and page paths', () => {
  const draft = buildDraft({
    ...base,
    text: 'See https://www.youtube.com/@jane_doe/videos?v=abc and bit.ly/xyz123 or http://user:pw@evil.example:8080/a?b=c#d',
    links: ['https://www.youtube.com/watch?v=SECRET', 'https://t.me/joinchat/PRIVATE'],
  });
  const withoutHosts = draft.text.replace(/\[link: [a-z0-9.-]+\]/g, '').replace(/\nLinks \(hostnames only\): [a-z0-9., -]+$/, '');
  assert.ok(!/[/?#=:@]|jane_doe|SECRET|PRIVATE|pw/.test(withoutHosts.replace(/See | and | or /g, ' ')), withoutHosts);
  assert.match(draft.text, /\[link: www\.youtube\.com\]/);
  assert.match(draft.text, /\[link: bit\.ly\]/);
  assert.match(draft.text, /\[link: evil\.example\]/);
  assert.match(draft.text, /\nLinks \(hostnames only\): www\.youtube\.com, t\.me$/);
});

test('draft carries no identifying fields at all', () => {
  const draft = buildDraft({ ...base, text: 'hello' });
  assert.deepEqual(Object.keys(draft).sort(), ['kind', 'mode', 'platform', 'reason', 'text', 'version']);
});

test('reason text from rules is redacted too', () => {
  const draft = buildDraft({ ...base, text: 'x', reason: 'Muted word (your preference): “@jane_doe”' });
  assert.ok(!draft.reason.includes('jane_doe'));
});

test('text is capped at MAX_REPORT_TEXT on a code point boundary', () => {
  const draft = buildDraft({ ...base, text: '😀'.repeat(MAX_REPORT_TEXT + 50) });
  assert.ok([...draft.text].length <= MAX_REPORT_TEXT);
  assert.ok(!/[\ud800-\udbff]$/.test(draft.text));
});

test('finalizeDraft re-redacts user edits and keeps the cap', () => {
  const draft = buildDraft({ ...base, text: 'hello' });
  const edited = finalizeDraft(draft, 'I added https://x.com/me/status/1 and @me ' + 'a'.repeat(MAX_REPORT_TEXT));
  assert.ok(!edited.text.includes('/me/') && !edited.text.includes('@me'));
  assert.ok([...edited.text].length <= MAX_REPORT_TEXT);
});

test('issue URL targets the right template and prefills form fields', () => {
  const url = new URL(buildIssueUrl(buildDraft({ ...base, text: 'legit comment' })));
  assert.equal(url.origin + url.pathname, 'https://github.com/rishixgamer/AliveInternet/issues/new');
  assert.equal(url.searchParams.get('template'), 'false-positive.yml');
  assert.equal(url.searchParams.get('platform'), 'YouTube');
  assert.equal(url.searchParams.get('text'), 'legit comment');
  assert.equal(url.searchParams.get('mode'), 'Balanced');
  const miss = new URL(buildIssueUrl(buildDraft({ ...base, kind: 'missed', text: 'scam' })));
  assert.equal(miss.searchParams.get('template'), 'missed-spam.yml');
  assert.equal(miss.searchParams.get('reason'), null);
});

test('issue URL is bounded and truncation never splits an escape or code point', () => {
  const hostile = '😀&=?#%'.repeat(5000);
  const draft = finalizeDraft(buildDraft({ ...base, text: 'x' }), hostile);
  const href = buildIssueUrl(draft);
  assert.ok(href.length <= MAX_REPORT_URL, String(href.length));
  const text = new URL(href).searchParams.get('text');
  assert.ok(text.length > 100);
  assert.ok(!text.includes('�'));
  decodeURIComponent(href.split('text=')[1].split('&')[0]);
});

test('short identities only match whole words, so ordinary words are not mangled', () => {
  const draft = buildDraft({ ...base, accountKey: '@ab', author: 'Al', text: 'I am ab, a table is stable. Al said al.' });
  assert.equal(draft.text, 'I am [handle], a table is stable. [handle] said [handle].');
});

test('text containing the internal placeholder characters cannot forge a link', () => {
  const draft = buildDraft({ ...base, text: 'before 5 after 0' });
  assert.ok(!draft.text.includes('undefined'), draft.text);
  assert.ok(!/[]/.test(draft.text));
});

test('hyphenated and dotted @mentions are fully redacted, keeping sentence punctuation', () => {
  const draft = buildDraft({ ...base, text: 'cc @some-channel, @a.b-c and @x. Also @-ignored' });
  assert.equal(draft.text, 'cc [handle], [handle] and [handle]. Also @-ignored');
});
