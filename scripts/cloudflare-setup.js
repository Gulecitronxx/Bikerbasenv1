/* Saetter Cloudflare op foran GitHub Pages — HTTP-sikkerhedsheadere, HSTS,
   Brotli, lang cache paa versionerede filer og DNS til GitHub. Idempotent:
   kan koeres igen, og den skriver kun det, der afviger.

   Hvorfor: GitHub Pages kan ikke saette egne svar-headere. Audit 23.08.2026:
   ingen Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options/
   frame-ancestors (meta-CSP kan ikke udtrykke den), Permissions-Policy, og
   Cache-Control: max-age=600 paa alt, ogsaa de ?v=-stemplede filer. En
   proxy foran loeser alle fire i ét hug, uden at flytte sitet.

   Kraever:
     CLOUDFLARE_API_TOKEN   API-token (dash.cloudflare.com -> My Profile ->
                            API Tokens) med rettighederne
                              Zone . Zone Settings . Edit
                              Zone . Zone . Read
                              Zone . DNS . Edit
                              Zone . Transform Rules . Edit
                              Zone . Cache Rules . Edit
                            for zonen bikerbasen.dk. Laeses KUN fra miljoeet.
   Valgfrit:
     CLOUDFLARE_ZONE        standard: domaenet fra SITE_URL i js/seo.js
   Flag:
     --dry-run              vis hvad der ville aendres, skriv intet

   Forudsaetning (manuelt, én gang): zonen er oprettet i Cloudflare og
   nameserverne hos one.com peger paa Cloudflares — se docs/CLOUDFLARE.md.

   Koer:  node scripts/cloudflare-setup.js           (eller: npm run cloudflare:setup)
   Efterproev bagefter:  node scripts/tjek-headers.js */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!TOKEN){
  console.error('CLOUDFLARE_API_TOKEN mangler i miljoeet. Se hovedet af denne fil for rettighederne.\n' +
    '  PowerShell:  $env:CLOUDFLARE_API_TOKEN="..."; node scripts/cloudflare-setup.js');
  process.exit(2);
}

const siteUrl = require('./site-url')(ROOT);               // https://bikerbasen.dk
const ZONE = process.env.CLOUDFLARE_ZONE || new URL(siteUrl).hostname;
const GITHUB_PAGES_HOST = 'gulecitronxx.github.io';         // repoets Pages-vaert (CNAME for www)
const GITHUB_PAGES_A = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'];

const API = 'https://api.cloudflare.com/client/v4';
async function cf(method, p, body){
  const r = await fetch(API + p, {
    method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.success === false){
    const fejl = (d.errors || []).map(e => `${e.code}: ${e.message}`).join('; ') || `HTTP ${r.status}`;
    const err = new Error(`${method} ${p} -> ${fejl}`); err.status = r.status; throw err;
  }
  return d.result;
}
const log = (...a) => console.log(...a);
const aendr = async (hvad, fn) => { log(`${DRY ? '(dry-run) ville' : 'saetter'}: ${hvad}`); if (!DRY) await fn(); };

/* ---------- 1. Zone ---------- */
async function findZone(){
  const z = await cf('GET', `/zones?name=${ZONE}`);
  if (!z.length) throw new Error(`Zonen ${ZONE} findes ikke paa kontoen — opret den i Cloudflare foerst (docs/CLOUDFLARE.md, trin 1).`);
  log(`Zone: ${ZONE} (${z[0].id}) status=${z[0].status} nameservere=${(z[0].name_servers || []).join(', ')}`);
  if (z[0].status !== 'active') log('  BEMAERK: zonen er ikke aktiv endnu — nameserverne hos one.com peger ikke paa Cloudflare. Indstillingerne gemmes alligevel og traeder i kraft, naar de goer.');
  return z[0].id;
}

/* ---------- 2. Zone-indstillinger ----------
   ssl=strict: GitHub har et gyldigt Let's Encrypt-certifikat for domaenet, saa
   Cloudflare kan kraeve det. Aldrig "flexible" — det giver redirect-loekke
   mod GitHub Pages med "Enforce HTTPS". Falder GitHubs fornyelse en dag
   (HTTP-01 gennem proxyen), saet midlertidigt "full" — se docs/CLOUDFLARE.md.
   rocket_loader/email_obfuscation/minify af: de injicerer scripts/aendrer
   markup, og sitet har baade en CSP og sin egen minificering (scripts/udgiv.js). */
const SETTINGS = {
  ssl: 'strict',
  always_use_https: 'on',
  automatic_https_rewrites: 'on',
  min_tls_version: '1.2',
  tls_1_3: 'on',
  brotli: 'on',
  early_hints: 'on',
  rocket_loader: 'off',
  email_obfuscation: 'off',
  security_header: {
    strict_transport_security: { enabled: true, max_age: 31536000, include_subdomains: true, preload: true, nosniff: false },
  },
};
async function zoneSettings(zid){
  for (const [navn, vaerdi] of Object.entries(SETTINGS)){
    let nu;
    try { nu = (await cf('GET', `/zones/${zid}/settings/${navn}`)).value; }
    catch (e) { log(`  (springer ${navn} over: ${e.message})`); continue; }
    const ens = JSON.stringify(nu) === JSON.stringify(vaerdi) ||
      (navn === 'security_header' && nu && nu.strict_transport_security &&
       ['enabled', 'max_age', 'include_subdomains', 'preload'].every(k => nu.strict_transport_security[k] === vaerdi.strict_transport_security[k]));
    if (ens){ log(`  ok: ${navn} = ${JSON.stringify(vaerdi)}`); continue; }
    await aendr(`${navn} ${JSON.stringify(nu)} -> ${JSON.stringify(vaerdi)}`, () => cf('PATCH', `/zones/${zid}/settings/${navn}`, { value: vaerdi }));
  }
}

/* ---------- 3. DNS: apex A x4 -> GitHub, www CNAME -> GitHub, begge proxied ---------- */
async function dns(zid){
  const alle = await cf('GET', `/zones/${zid}/dns_records?per_page=200`);
  const apexA = alle.filter(r => r.type === 'A' && r.name === ZONE);
  for (const ip of GITHUB_PAGES_A){
    const fundet = apexA.find(r => r.content === ip);
    if (!fundet) await aendr(`A ${ZONE} -> ${ip} (proxied)`, () => cf('POST', `/zones/${zid}/dns_records`, { type: 'A', name: ZONE, content: ip, proxied: true, ttl: 1 }));
    else if (!fundet.proxied) await aendr(`A ${ZONE} -> ${ip}: proxied`, () => cf('PATCH', `/zones/${zid}/dns_records/${fundet.id}`, { proxied: true }));
    else log(`  ok: A ${ZONE} -> ${ip} (proxied)`);
  }
  for (const r of apexA.filter(r => !GITHUB_PAGES_A.includes(r.content)))
    log(`  BEMAERK: fremmed A-record ${ZONE} -> ${r.content} — peger ikke paa GitHub Pages. Ikke roert; fjern den selv, hvis den er forkert.`);
  const aaaa = alle.filter(r => r.type === 'AAAA' && r.name === ZONE);
  for (const r of aaaa) log(`  BEMAERK: AAAA ${ZONE} -> ${r.content} findes — GitHub Pages' IPv6 er 2606:50c0:8000..8003::153; tjek at den er rigtig.`);

  const www = alle.find(r => r.name === `www.${ZONE}`);
  if (!www) await aendr(`CNAME www.${ZONE} -> ${GITHUB_PAGES_HOST} (proxied)`, () => cf('POST', `/zones/${zid}/dns_records`, { type: 'CNAME', name: 'www', content: GITHUB_PAGES_HOST, proxied: true, ttl: 1 }));
  else if (www.type !== 'CNAME' || www.content !== GITHUB_PAGES_HOST || !www.proxied)
    await aendr(`www.${ZONE}: ${www.type} ${www.content} proxied=${www.proxied} -> CNAME ${GITHUB_PAGES_HOST} proxied`, () => cf('PATCH', `/zones/${zid}/dns_records/${www.id}`, { type: 'CNAME', content: GITHUB_PAGES_HOST, proxied: true }));
  else log(`  ok: CNAME www.${ZONE} -> ${GITHUB_PAGES_HOST} (proxied)`);
}

/* ---------- 4. Svar-headere (Transform Rules) ----------
   HSTS saettes af security_header ovenfor — IKKE her, saa den ikke staar to gange.
   Content-Security-Policy-headeren har KUN frame-ancestors: sidens fulde CSP
   ligger i <meta> i hver side (scripts/build-brand-pages.js laeser den fra
   index.html), og to kopier af samme politik ville blive uenige. Begge
   haandhaeves samtidig, saa det her er en tilfoejelse, ikke en erstatning. */
const VERSIONERET = '(http.request.uri.query contains "v=") and (http.request.uri.path.extension in {"css" "js" "woff2"})';
const HEADER_RULES = [
  {
    description: 'Bikerbasen: sikkerhedsheadere paa alle svar (scripts/cloudflare-setup.js)',
    expression: 'true',
    action: 'rewrite',
    action_parameters: { headers: {
      'X-Content-Type-Options':      { operation: 'set', value: 'nosniff' },
      'X-Frame-Options':             { operation: 'set', value: 'DENY' },
      'Content-Security-Policy':     { operation: 'set', value: "frame-ancestors 'none'" },
      'Referrer-Policy':             { operation: 'set', value: 'strict-origin-when-cross-origin' },
      'Permissions-Policy':          { operation: 'set', value: 'camera=(), microphone=(), geolocation=(), usb=(), interest-cohort=()' },
      'Cross-Origin-Opener-Policy':  { operation: 'set', value: 'same-origin-allow-popups' },
    } },
  },
  {
    description: 'Bikerbasen: ?v=-stemplede css/js/woff2 er uforanderlige — et aar i browseren',
    expression: VERSIONERET,
    action: 'rewrite',
    action_parameters: { headers: { 'Cache-Control': { operation: 'set', value: 'public, max-age=31536000, immutable' } } },
  },
];
/* ---------- 5. Edge-cache paa de samme filer (Cache Rules) ---------- */
const CACHE_RULES = [
  {
    description: 'Bikerbasen: ?v=-stemplede css/js/woff2 caches et aar paa edge (scripts/cloudflare-setup.js)',
    expression: VERSIONERET,
    action: 'set_cache_settings',
    action_parameters: {
      cache: true,
      edge_ttl:    { mode: 'override_origin', default: 31536000 },
      browser_ttl: { mode: 'override_origin', default: 31536000 },
    },
  },
];
async function ruleset(zid, phase, rules, navn){
  let nu = null;
  try { nu = await cf('GET', `/zones/${zid}/rulesets/phases/${phase}/entrypoint`); }
  catch (e) { if (e.status !== 404) throw e; }
  const strip = r => ({ description: r.description, expression: r.expression, action: r.action, action_parameters: r.action_parameters });
  const ens = nu && JSON.stringify(nu.rules.map(strip)) === JSON.stringify(rules);
  if (ens){ log(`  ok: ${navn} (${rules.length} regler)`); return; }
  if (nu && nu.rules.some(r => !/^Bikerbasen:/.test(r.description || '')))
    log(`  BEMAERK: ${navn} har regler, der ikke er lavet af dette script — de bliver ERSTATTET. Stop med Ctrl+C, hvis det ikke er meningen.`);
  await aendr(`${navn}: ${rules.length} regler`, () => cf('PUT', `/zones/${zid}/rulesets/phases/${phase}/entrypoint`, { rules }));
}

(async () => {
  const zid = await findZone();
  log('\nZone-indstillinger:');      await zoneSettings(zid);
  log('\nDNS:');                      await dns(zid);
  log('\nSvar-headere:');             await ruleset(zid, 'http_response_headers_transform', HEADER_RULES, 'Transform Rules (svar-headere)');
  log('\nEdge-cache:');               await ruleset(zid, 'http_request_cache_settings', CACHE_RULES, 'Cache Rules');
  log(DRY ? '\nDry-run: intet er aendret.' : '\nFaerdig. Efterproev med:  node scripts/tjek-headers.js');
})().catch(e => { console.error('\nAFBRUDT:', e.message); process.exit(1); });
