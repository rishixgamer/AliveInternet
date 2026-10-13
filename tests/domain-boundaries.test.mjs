import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { domainBoundary, validatedDomainUrl } from '../src/core/domains.ts';
import { decodeRedirect, revealLink } from '../src/core/links.ts';
import { BRAND_DOMAINS, lookalikeOf } from '../src/intel/lookalike-domains.ts';

// Synthetic offline examples exercise production PSL and URL parsing. Supplied
// brand fixtures are illustrative; tests do not independently verify brands.
const paypal = { brand: 'PayPal', officialDomains: ['paypal.com', 'paypal.me'], verifiedFrom: 'https://www.paypal.com/' };
const brands = [paypal];
const redirect = target => `https://www.youtube.com/redirect?q=${encodeURIComponent(target)}`;

test('multipart ICANN suffixes preserve the actual registrable label', () => {
  for (const [host, domain, suffix, label] of [
    ['www.example.co.uk', 'example.co.uk', 'co.uk', 'example'],
    ['login.example.com.au', 'example.com.au', 'com.au', 'example'],
    ['news.school.k12.ca.us', 'school.k12.ca.us', 'k12.ca.us', 'school'],
  ]) {
    const parsed = domainBoundary(host);
    assert.equal(parsed.domain, domain); assert.equal(parsed.publicSuffix, suffix);
    assert.equal(parsed.label, label); assert.equal(parsed.isPrivate, false);
  }
});

test('PSL wildcard and exception rules are honored', () => {
  assert.equal(domainBoundary('a.ck'), undefined, 'a.ck is a public suffix under the wildcard');
  assert.equal(domainBoundary('a.b.ck').domain, 'a.b.ck');
  assert.equal(domainBoundary('a.b.ck').publicSuffix, 'b.ck');
  assert.equal(domainBoundary('www.ck').domain, 'www.ck', 'exception to wildcard');
  assert.equal(domainBoundary('www.city.kawasaki.jp').domain, 'city.kawasaki.jp');
});

test('private suffix tenants remain distinct across supported hosting services', () => {
  for (const suffix of ['github.io', 'blogspot.com', 'pages.dev', 'herokuapp.com', 's3.amazonaws.com']) {
    const alice = domainBoundary(`www.alice.${suffix}`);
    const bob = domainBoundary(`bob.${suffix}`);
    assert.equal(alice.domain, `alice.${suffix}`); assert.equal(alice.label, 'alice');
    assert.equal(alice.publicSuffix, suffix); assert.equal(alice.isPrivate, true);
    assert.equal(bob.domain, `bob.${suffix}`); assert.notEqual(alice.domain, bob.domain);
    assert.equal(domainBoundary(suffix), undefined, 'provider suffix is not one registrable tenant');
  }
});

test('mismatches distinguish separate co.uk domains but permit benign same-domain subdomains', () => {
  assert.equal(revealLink('https://evil.co.uk/login', 'good.co.uk/login').textMismatch, true);
  assert.equal(revealLink('https://login.example.co.uk/a', 'news.example.co.uk/b').textMismatch, false);
  assert.equal(revealLink('https://example.com.au', 'example.co.uk').textMismatch, true);
  assert.equal(revealLink('https://www.example.org:8443/a', 'EXAMPLE.ORG:443/b').textMismatch, false);
  assert.equal(revealLink('http://example.org/a', 'https://example.org/b').textMismatch, false);
});

test('mismatches distinguish private tenants without asserting common ownership', () => {
  for (const suffix of ['github.io', 'blogspot.com', 'pages.dev', 's3.amazonaws.com']) {
    assert.equal(revealLink(`https://bob.${suffix}/`, `alice.${suffix}/`).textMismatch, true);
    assert.equal(revealLink(`https://www.alice.${suffix}/`, `alice.${suffix}/`).textMismatch, false);
  }
});

test('absolute http(s) URLs and bare visible-domain paths use distinct parsing contracts', () => {
  assert.equal(validatedDomainUrl('HTTPS://EXAMPLE.COM/path').hostname, 'example.com');
  assert.equal(validatedDomainUrl('example.com/path'), undefined, 'href must be absolute');
  assert.equal(revealLink('example.com/path', 'paypal.com').textMismatch, false);
  assert.equal(revealLink('https://example.com/a', 'paypal.com/login').textMismatch, true);
  for (const visible of ['Visit paypal.com', 'support@paypal.com', '//paypal.com/a', 'javascript://paypal.com',
    'mailto:paypal.com', 'paypal.com and example.com', 'paypal.com:bogus']) {
    assert.equal(revealLink('https://example.com/a', visible).textMismatch, false, visible);
  }
});

test('malformed hostnames, public suffix roots and unknown suffixes produce no advisory', () => {
  for (const host of ['', 'localhost', 'co.uk', 'github.io', 'com', '.example.com', 'example..com', 'example.com.',
    'example.com..', '-example.com', 'example-.com', 'ex_ample.com', 'a'.repeat(64) + '.com',
    'a'.repeat(63) + '.' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(63) + '.com',
    ' example.com', 'example.com ', 'example.invalid', 'good.example', 'paypal.unknownsuffix']) {
    assert.equal(domainBoundary(host), undefined, host);
    assert.equal(lookalikeOf(host, brands), undefined, host);
  }
  assert.equal(revealLink('https://evil.example', 'good.example').textMismatch, false);
  assert.equal(revealLink('https://evil.invalid', 'paypal.com').textMismatch, false);
  assert.equal(revealLink('https://example.org', 'co.uk').textMismatch, false);
});

test('IDN, Unicode dot/fullwidth aliases and IP literals fail open for domain evidence', () => {
  const unsupported = ['bücher.de', 'раypal.com', 'xn--bcher-kva.de', 'foo.xn--p1ai', 'xn--foo.paypal.com',
    'paypal。com', 'ＰＡＹＰＡＬ.com', '127.0.0.1', '127.1', '0x7f000001', '[::1]', '2001:db8::1'];
  for (const host of unsupported) {
    assert.equal(domainBoundary(host), undefined, host);
    assert.equal(lookalikeOf(host, brands), undefined, host);
    assert.equal(revealLink(`https://${host}/`, 'paypal.com').textMismatch, false, host);
    assert.equal(revealLink('https://example.org/', host).textMismatch, false, host);
  }
});

test('unsafe schemes, credentials, raw whitespace and URL repairs are never compared or decoded', () => {
  for (const input of ['ftp://paypal.com', 'javascript://paypal.com/a', 'data:text/plain,paypal.com',
    'https:paypal.com', 'https:/paypal.com', 'https:///paypal.com', 'https://', '//paypal.com',
    'https://user:password@paypal.com', 'https://@paypal.com', 'https://%70aypal.com',
    'https://paypal.com./', 'https://paypal.com:65536/', 'https://paypal.com\\@example.com',
    'https://pay\tpal.com', ' https://paypal.com', 'https://paypal.com/path with spaces',
    'https://paypal.com\n', 'https://paypal.com\u0000']) {
    assert.equal(validatedDomainUrl(input), undefined, input);
    assert.equal(revealLink(input, 'example.org').textMismatch, false, input);
    assert.equal(decodeRedirect(redirect(input)), undefined, input);
    assert.equal(revealLink(redirect(input), 'paypal.com').textMismatch, false, input);
  }
});

test('valid exact platform wrappers decode one supported target without network', () => {
  for (const [href, expected, wrapper] of [
    [redirect('https://example.co.uk/pay'), 'https://example.co.uk/pay', 'youtube-redirect'],
    ['https://l.facebook.com/l.php?u=https%3A%2F%2Falice.github.io%2F', 'https://alice.github.io/', 'facebook-redirect'],
    ['https://out.reddit.com/t3_fixture?url=http%3A%2F%2Fexample.org', 'http://example.org', 'reddit-out'],
  ]) {
    assert.equal(decodeRedirect(href), expected);
    const revealed = revealLink(href, expected);
    assert.equal(revealed.wrapper, wrapper); assert.equal(revealed.textMismatch, false);
    assert.equal(revealed.destinationHost, new URL(expected).hostname);
  }
  assert.equal(revealLink(redirect('https://bob.github.io/'), 'alice.github.io').textMismatch, true);
});

test('duplicate/missing redirect parameters and deceptive wrapper hosts fail open', () => {
  for (const href of ['https://www.youtube.com/redirect?q=https://example.com&q=https://example.org',
    'https://www.youtube.com/redirect?q=', 'https://www.youtube.com/redirect',
    'https://l.facebook.com/l.php?u=https://example.com&u=https://example.org',
    'https://out.reddit.com/t3_test?url=https://example.invalid']) {
    assert.equal(decodeRedirect(href), undefined);
    assert.equal(revealLink(href, 'paypal.com').textMismatch, false);
  }
  for (const host of ['notyoutube.com', 'youtube.com.example.org', 'l.facebook.com.example.org', 'arbitrary.youtube.com']) {
    const href = `https://${host}/redirect?q=https://paypal.com`;
    assert.equal(decodeRedirect(href), undefined);
    assert.equal(revealLink(href, 'paypal.com').wrapper, undefined);
  }
});

test('shorteners report an unresolved destination instead of a guessed domain mismatch', () => {
  for (const host of ['t.co', 'bit.ly', 'tinyurl.com', 'cutt.ly', 'is.gd', 'goo.gl']) {
    const revealed = revealLink(`https://${host}/fixture`, 'paypal.com');
    assert.equal(revealed.wrapper, 'shortener'); assert.equal(revealed.textMismatch, false);
    assert.equal(revealed.destinationHost, undefined); assert.equal(decodeRedirect(`https://${host}/fixture`), undefined);
  }
  assert.equal(revealLink('https://arbitrary.t.co/fixture', 'paypal.com').wrapper, undefined);
});

test('official-domain exemptions are independent of brand/domain list ordering', () => {
  const similar = { brand: 'Illustrative Paypa1', officialDomains: ['paypa1.com'], verifiedFrom: 'https://paypa1.com' };
  for (const table of [[similar, paypal], [paypal, similar],
    [{ ...paypal, officialDomains: ['paypa1.com', 'paypal.com'] }],
    [{ ...paypal, officialDomains: ['paypal.com', 'paypa1.com'] }]]) {
    assert.equal(lookalikeOf('paypal.com', table), undefined);
    assert.equal(lookalikeOf('www.paypal.com', table), undefined);
    assert.equal(lookalikeOf('PAYPA1.COM', table), undefined);
  }
});

test('multipart official domains compare the actual label and exempt their benign subdomains', () => {
  const table = [{ brand: 'Illustrative PayPal UK', officialDomains: ['paypal.co.uk'], verifiedFrom: 'https://paypal.co.uk' }];
  assert.equal(lookalikeOf('paypa1.co.uk', table)?.technique, 'edit-distance');
  assert.equal(lookalikeOf('paypal-support.co.uk', table)?.technique, 'brand-plus-keyword');
  assert.equal(lookalikeOf('support.paypal.co.uk', table), undefined);
  assert.equal(lookalikeOf('example.co.uk', table), undefined);
  assert.equal(lookalikeOf('paypal.co.uk.example.org', table), undefined, 'brand subdomain is not registrable label');
});

test('private tenant official domains remain tenant-scoped and provider suffixes never exempt tenants', () => {
  const table = [{ brand: 'Illustrative tenant', officialDomains: ['paypal.github.io'], verifiedFrom: 'https://paypal.github.io' }];
  assert.equal(lookalikeOf('paypa1.github.io', table)?.technique, 'edit-distance');
  assert.equal(lookalikeOf('www.paypal.github.io', table), undefined);
  assert.equal(lookalikeOf('other.github.io', table), undefined);
  assert.equal(lookalikeOf('paypal.github.io', brands), undefined, 'same label in a different tenant suffix is no identity proof');
  assert.equal(lookalikeOf('githvb.io', [{ brand: 'GitHub', officialDomains: ['github.io'], verifiedFrom: 'https://github.io' }]), undefined);
});

test('brand keyword patterns use exact reviewed label plus bounded tokens; unrelated mentions stay silent', () => {
  for (const host of ['paypal-secure-support.com', 'paypal-login.net', 'secure-paypal.org']) {
    assert.equal(lookalikeOf(host, brands)?.technique, 'brand-plus-keyword', host);
  }
  for (const host of ['paypal-history.com', 'paypalhistory.com', 'mypaypal-support.com', 'notpaypal.com',
    'paypal-supportive.com', 'support-paypal-museum.com', 'paypal--secure.com', 'paypal-secure-extra.com',
    'paypal.com.example.org', 'example-paypal.com']) {
    assert.equal(lookalikeOf(host, brands), undefined, host);
  }
  const arbitraryBrand = [{ brand: 'Unrelated Arbitrary Label', officialDomains: ['example.org'], verifiedFrom: 'https://example.org' }];
  assert.equal(lookalikeOf('unrelatedarbitrarylabel-support.com', arbitraryBrand), undefined);
});

test('short labels, full URLs and malformed official table entries cannot create spelling advisories', () => {
  for (const host of ['pad.com', 'paypal.com/a', 'https://paypa1.com', 'paypa1.com:443', 'user@paypa1.com']) {
    assert.equal(lookalikeOf(host, brands), undefined, host);
  }
  assert.equal(lookalikeOf('visa-secure.com', [{ brand: 'Visa', officialDomains: ['https://visa.com'], verifiedFrom: 'https://visa.com' }]), undefined);
  assert.equal(lookalikeOf('paypa1.com', [{ ...paypal, officialDomains: ['login.paypal.com'] }]), undefined);
  assert.equal(lookalikeOf('paypa1.com', [{ ...paypal, officialDomains: ['paypal.com.'] }]), undefined);
});

test('default brand list is empty; lexical result contains no identity/probability verdict', () => {
  assert.deepEqual(BRAND_DOMAINS, []);
  assert.equal(lookalikeOf('paypa1.com'), undefined);
  const result = lookalikeOf('paypa1.com', brands);
  assert.deepEqual(result, { observedHost: 'paypa1.com', brand: 'PayPal', technique: 'edit-distance' });
});

test('owned domain modules use only offline imports and no automatic network path', async () => {
  for (const name of ['../src/core/domains.ts', '../src/core/links.ts', '../src/intel/lookalike-domains.ts']) {
    const source = await readFile(new URL(name, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|node:(?:https?|net|dns)/);
  }
});
