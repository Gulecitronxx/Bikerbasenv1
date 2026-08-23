/* Roegtest af det, kun en proxy foran GitHub Pages kan give: HTTP-sikkerheds-
   headere, HSTS, Brotli, lang cache paa versionerede filer — og at intet af det
   gamle er gaaet i stykker (redirects, udvidelsesfri sider, 404).

   Kun laesning, ingen noegler. Koer:  node scripts/tjek-headers.js
   Exit 1 ved mangler, saa den kan staa i en pipeline (fx efter deploy). */

const path = require('path');
const siteUrl = require('./site-url')(path.join(__dirname, '..'));
const HOST = new URL(siteUrl).hostname;

const res = [];
const noter = (ok, hvad, detalje) => res.push({ ok, hvad, detalje });
const hent = (url, opts = {}) => fetch(url, { redirect: 'manual', ...opts });
const h = (r, n) => r.headers.get(n) || '';

(async () => {
  console.log(`Header-roegtest mod ${siteUrl}\n`);

  const forside = await hent(`${siteUrl}/`);
  const html = await forside.text();
  const bagCloudflare = /cloudflare/i.test(h(forside, 'server')) || !!h(forside, 'cf-ray');
  noter(bagCloudflare, 'svarer via Cloudflare', bagCloudflare ? `server=${h(forside, 'server')} cf-ray=${h(forside, 'cf-ray')}` : `server=${h(forside, 'server') || '?'} — ingen cf-ray (nameserverne peger stadig paa GitHub direkte)`);

  const hsts = h(forside, 'strict-transport-security');
  noter(/max-age=(\d+)/.test(hsts) && Number(hsts.match(/max-age=(\d+)/)[1]) >= 31536000 && /includeSubDomains/i.test(hsts), 'Strict-Transport-Security (>= 1 aar, includeSubDomains)', hsts || 'mangler');
  noter(/nosniff/i.test(h(forside, 'x-content-type-options')), 'X-Content-Type-Options: nosniff', h(forside, 'x-content-type-options') || 'mangler');
  noter(/deny|sameorigin/i.test(h(forside, 'x-frame-options')), 'X-Frame-Options', h(forside, 'x-frame-options') || 'mangler');
  noter(/frame-ancestors/i.test(h(forside, 'content-security-policy')), 'CSP-header med frame-ancestors', h(forside, 'content-security-policy').slice(0, 60) || 'mangler');
  noter(!!h(forside, 'permissions-policy'), 'Permissions-Policy', h(forside, 'permissions-policy').slice(0, 60) || 'mangler');
  noter(!!h(forside, 'referrer-policy'), 'Referrer-Policy (header)', h(forside, 'referrer-policy') || 'mangler (meta findes, header goer ikke)');

  // Meta-CSP'en skal stadig vaere der — header-CSP'en er et tillaeg, ikke en erstatning.
  noter(/http-equiv="Content-Security-Policy"/.test(html), 'meta-CSP staar stadig i HTML', /default-src 'self'/.test(html) ? "default-src 'self' fundet" : 'IKKE fundet');

  const cssSti = (html.match(/href="(css\/styles\.css\?v=[a-z0-9]+)"/) || [])[1];
  if (cssSti){
    const css = await hent(`${siteUrl}/${cssSti}`, { headers: { 'Accept-Encoding': 'br, gzip' } });
    const enc = h(css, 'content-encoding');
    noter(/br/.test(enc), 'css leveres med Brotli', `content-encoding=${enc || 'ingen'}`);
    const cc = h(css, 'cache-control');
    noter(/max-age=31536000/.test(cc) && /immutable/.test(cc), 'versioneret css: Cache-Control et aar + immutable', cc || 'mangler');
  } else noter(false, 'fandt css-link paa forsiden', 'regex matchede ikke');

  const htmlCc = h(forside, 'cache-control');
  noter(!/max-age=(\d{5,})/.test(htmlCc), 'HTML caches IKKE laenge i browseren', htmlCc || '(ingen cache-control)');

  const http = await hent(`http://${HOST}/`);
  noter([301, 302, 307, 308].includes(http.status) && /^https:\/\//.test(h(http, 'location')), 'http -> https', `${http.status} ${h(http, 'location')}`);
  const www = await hent(`https://www.${HOST}/`);
  noter([301, 302, 307, 308].includes(www.status) && h(www, 'location').startsWith(`https://${HOST}`), 'www -> apex', `${www.status} ${h(www, 'location')}`);
  const ren = await hent(`${siteUrl}/soegning`);
  noter(ren.status === 200, 'udvidelsesfri side (/soegning) svarer 200', `${ren.status}`);
  const fire = await hent(`${siteUrl}/denne-side-findes-ikke-${Date.now()}`);
  noter(fire.status === 404, 'ukendt sti svarer 404', `${fire.status}`);

  const b = Math.max(...res.map(r => r.hvad.length));
  for (const r of res) console.log(`  ${r.ok ? 'OK  ' : 'FEJL'}  ${r.hvad.padEnd(b)}  ${r.detalje}`);
  const fejl = res.filter(r => !r.ok).length;
  console.log(`\n${res.length - fejl}/${res.length} bestaaet.`);
  if (fejl){ console.log('Se docs/CLOUDFLARE.md — nameservere + node scripts/cloudflare-setup.js.'); process.exit(1); }
})().catch(e => { console.error('Roegtesten kunne ikke koere:', e.message); process.exit(2); });
