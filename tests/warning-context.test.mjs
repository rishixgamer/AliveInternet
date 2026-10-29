import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessBatch} from '../src/core/filter.ts';
const row=text=>({id:'synthetic',author:'synthetic',text,links:[]});
for(const mode of ['conservative','balanced','aggressive']) {
  test(`explicit contact warnings stay visible in ${mode}`,()=> {
    for(const text of [
      'Never contact a stranger on Telegram claiming guaranteed profit from crypto investment.',
      'Do not message anyone on WhatsApp promising to double your investment.',
      "Don't contact me on Telegram for guaranteed crypto profit; that is a scam.",
      'Avoid contacting strangers on Telegram who promise guaranteed returns.',
    ]) assert.notEqual(assessBatch([row(text)],mode)[0].decision,'collapse',text);
  });
}
test('separate solicitation cannot be exempted by a preceding warning',()=>{
  for(const text of [
    'Never contact strangers on Telegram. Contact me on WhatsApp for guaranteed crypto profit!',
    'Beware of scammers. Contact me on Telegram to double your investment!',
    'Never contact strangers on Telegram, but contact me on WhatsApp for guaranteed crypto profit!',
  ]) for(const mode of ['balanced','aggressive']) assert.equal(assessBatch([row(text)],mode)[0].decision,'collapse',text);
});
