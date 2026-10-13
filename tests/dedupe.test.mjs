import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duplicateComments } from '../src/core/dedupe.ts';
const text = 'Our previous discussion about the performance of this video was surprisingly detailed and informative. Here is my summary.';
const make = (accountKey, message = text, kind = 'comment', platform = 'youtube') => ({id: accountKey, text: message, author: 'Similar name', links: [], kind, platform, accountKey});
test('keeps the first long comment and collapses copies from independent accounts', () => {
 const items = ['@a','@b','@c','@d'].map(a => make(a));
 const groups = duplicateComments(items);
 assert.equal(groups.size, 3);
 assert.equal(groups.has(0), false);
 assert.equal(groups.get(3).independentAccounts, 4);
});
test('does not assume same account repeating message represents multiple actors', () => {
 const items = Array.from({length: 4}, (_,index) => ({...make('@same'), id: String(index)}));
 assert.equal(duplicateComments(items).size, 0);
});
test('does not deduplicate short generic agreement or cross-platform items', () => {
 const items = ['@a','@b','@c','@d'].map(a => make(a, 'Completely agree!'));
 assert.equal(duplicateComments(items).size, 0);
 items.forEach((x,i) => { x.text = text; x.platform = ['youtube', 'youtube', 'x', 'x'][i]; });
 assert.equal(duplicateComments(items).size, 0);
});
test('does not collapse posts with repeated copy', () => {
 assert.equal(duplicateComments(['@a','@b','@c','@d'].map(a => make(a, text, 'post'))).size, 0);
});
test('similar, but not identical, long text can group', () => {
 const messages = [text, text + '!', text.replace('surprisingly', 'particularly'), text.replace('surprisingly', 'really')];
 const items = messages.map((m,i) => make(`@author${i}`,m));
 assert.equal(duplicateComments(items).size, 3);
});
