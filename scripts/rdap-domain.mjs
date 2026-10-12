/** Opt-in manual RDAP lookups; no browser auto queries or account geolocation. */
const domain = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) {
  console.error('Usage: node scripts/rdap-domain.mjs example.com');
  process.exitCode = 2;
} else {
  const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {signal: AbortSignal.timeout(7000)});
  if (!response.ok) throw new Error(`RDAP lookup returned HTTP ${response.status}`);
  const data = await response.json();
  // Deliberately omit registrant/contact identity fields and IP/geolocation guesses.
  console.log(JSON.stringify({domain, objectClassName:data.objectClassName,
    status:data.status, events:data.events?.map(({eventAction,eventDate})=>({eventAction,eventDate})),
    nameservers:data.nameservers?.map(ns=>ns.ldhName).slice(0,30),
    note:'Registry metadata is context, not a maliciousness or account-identity verdict.'},null,2));
}
