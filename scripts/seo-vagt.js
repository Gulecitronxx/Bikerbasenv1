/* SEO-vagter til byggekæden: fail-safe ved hentning og ÆGTE lastmod i sitemappet.

   Ingen af funktionerne her rører netværket eller gør noget ved filsystemet,
   før de bliver bedt om det (undtagen laes/skrivLedger) — de er rene, så
   scripts/seo-vagt.test.js kan låse logikken med fixtures.

   HVORFOR (findings S-005 og S-011)
   ---------------------------------
   S-005: en forbigående Supabase-fejl fik fetchListings() til at returnere sit
   fallback (js/data.js har 0 annoncer). build-listing-pages.js slettede derefter
   ALLE annonce-*.html, og sitemap.xml blev skrevet uden dem — uden at buildet
   fejlede. Et build, der stopper, kan ses. Et sitemap, der stilfærdigt skrumper,
   kan ikke. Reglen her er derfor: falder et antal under MIN_ANDEL af det sidst
   kendte gode (de committede sider, det sidste sitemap), AFBRYDES buildet med en
   klar fejl, før noget slettes eller overskrives.

   S-011: sitemap-lastmod var byggedatoen på næsten alle URL'er. Google lærer så
   at ignorere lastmod fra sitet. Nu følger lastmod sidens INDHOLD: et hash af
   den synlige tekst i <main> (+ title og description) gemmes i
   scripts/sitemap-lastmod.json, og datoen rykkes kun, når hashet ændrer sig.
   ?v=-stempler, CSP-hashes og indlejret CSS ændrer ikke hashet — det gør
   priser, antal og tekst. Kendes en sides tidligere tilstand ikke (første gang
   ledgeren oprettes), udelades lastmod hellere end at opfinde en dato. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIN_ANDEL = 0.5;
/* Absolut gulv: sammenlignes baseline under dette tal, giver små tal (0 af 2, 1 af 3) ingen
   mening som "drastisk fald" — to egne annoncer, der sælges, må ikke kunne låse en deploy. */
const GULV = 20;
/* Hele eksterne lageret og de egne annoncer skal holde 70 %; en enkelt kilde 50 % (en kilde
   kan lovligt flytte sig meget, men en kilde, der pludselig mangler, er en delvis hentning). */
const MIN_ANDEL_KATEGORI = 0.85;
/* Exit-kode, generatorerne bruger ved et fald/en fejlet hentning, så scripts/build.js kan bevare de
   committede sider og fortsætte (fail-soft) i stedet for at låse hele udgivelsen. */
const EXIT_FALD = 3;
const LEDGER_FIL = 'sitemap-lastmod.json';

/* ---------- Fail-safe antal ---------- */

/* Handlingsorienteret udvej, fælles for alle fejlbeskeder. "Sticky": CI skriver aldrig ledgeren, så
   baseline (scripts/sitemap-lastmod.json) skifter først, når en LOKAL build er committet. Uden det
   springes brand/facet/srp over igen ved næste push. */
const UDVEJE = 'Er faldet bevidst (fx en kilde er fravalgt, regel 5): '
  + '(1) kør LOKALT `BB_TILLAD_FALD=1 node scripts/build.js` og commit scripts/sitemap-lastmod.json + de berørte sider '
  + '(uden den commit springes trinnet over igen ved næste push), eller (2) start workflowet "Byg og udgiv" manuelt med '
  + 'tillad_fald = true (engangsudgivelse — kør derefter punkt 1, ellers er baseline stadig den gamle).';

/* Er `nu` rimeligt i forhold til `forrige`? forrige ukendt eller 0 => ja (første
   byg, eller der var intet at miste). Lig med grænsen er stadig ok. */
function vurderAntal(navn, nu, forrige, minAndel = MIN_ANDEL, nulErFejl = false){
  const n = Number(nu), f = Number(forrige);
  if (nulErFejl && n === 0 && f > 0){
    return { ok: false, nu: n, forrige: f, besked: `${navn}: 0 nu mod ${f} sidst. Nul er signaturen på en tom/fejlet hentning, så der slettes ingen sider — `
      + 'dette byggetrin afbrudt. I CI (scripts/build.js) beholdes de committede sider og hele sitemappet, og resten udgives med en advarsel. '
      + UDVEJE };
  }
  if (!Number.isFinite(n) || n < 0) return { ok: false, nu: n, forrige: f, besked: `${navn}: ugyldigt antal (${nu}).` };
  if (!Number.isFinite(f) || f < GULV) return { ok: true, nu: n, forrige: f, besked: '' };
  if (n >= f * minAndel) return { ok: true, nu: n, forrige: f, besked: '' };
  return {
    ok: false, nu: n, forrige: f,
    besked: `${navn}: kun ${n} nu mod ${f} sidst (under ${Math.round(minAndel * 100)} %). `
      + 'Det ligner en fejlet eller tom hentning, ikke en rigtig ændring — dette byggetrin afbrudt, før der slettes '
      + 'eller overskrives noget. I CI (scripts/build.js) beholdes de committede sider og hele sitemappet, og resten '
      + 'udgives med en advarsel. ' + UDVEJE,
  };
}

/* Loft for antal SLETTEDE sider pr. byg (mærke-/annoncesider). En delvis hentning over procentgulvet kan
   ellers fjerne sjældne mærkers sider uden en lyd. Loft: 3 sider, eller 5 % af sidemængden, hvis det er
   mere. Derover afbrydes trinnet (fail-soft). BB_TILLAD_FALD=1 omgår loftet. */
function tjekSletninger(navn, antal, total, opts = {}){
  const loft = Math.max(3, Math.floor((Number(total) || 0) * 0.05));
  if (antal <= loft) return { ok: true, loft };
  const tillad = opts.tillad !== undefined ? opts.tillad : process.env.BB_TILLAD_FALD === '1';
  const besked = `${navn}: ${antal} sider ville blive slettet i ét byg (loft ${loft}). Det ligner en delvis hentning, ikke en rigtig ændring — `
    + 'dette byggetrin afbrudt, før noget slettes. ' + UDVEJE;
  if (tillad){ console.warn(`ADVARSEL (BB_TILLAD_FALD=1): ${besked}`); return { ok: true, loft, tilladt: true }; }
  throw Object.assign(new Error(besked), { code: 'SEO_FALD' });
}

/* Kaster ved et drastisk fald. BB_TILLAD_FALD=1 er den eneste vej udenom, og den
   skal vælges bevidst; faldet logges stadig. */
function tjekAntal(navn, nu, forrige, opts = {}){
  const v = vurderAntal(navn, nu, forrige, opts.minAndel, opts.nulErFejl);
  if (v.ok) return v;
  const tillad = opts.tillad !== undefined ? opts.tillad : process.env.BB_TILLAD_FALD === '1';
  if (tillad){
    console.warn(`ADVARSEL (BB_TILLAD_FALD=1): ${v.besked}`);
    return Object.assign({}, v, { ok: true, tilladt: true });
  }
  const e = new Error(v.besked);
  e.code = 'SEO_FALD';
  throw e;
}

/* Kilder, YAML'en selv har sat til aktiv: false (opt-out, CLAUDE.md regel 5), tæller ikke med i
   baseline: en bevidst fravalgt kilde må ikke blive et "fald" der blokerer. Kun YAML læses; flaget
   i databasen (kilder.aktiv) kan byggekæden ikke se, så et fravalg DER skal også stå i YAML'en
   (eller udgivelsen startes med tillad_fald). Ren funktion: tager filtekster. */
function inaktiveDomaener(yamlTekster){
  const ud = new Set();
  for (const t of yamlTekster){
    const dom = (String(t).match(/^domaene:\s*['"]?([^\s'"#]+)/m) || [])[1];
    const aktiv = (String(t).match(/^aktiv:\s*(\S+)/m) || [])[1];
    if (dom && aktiv === 'false') ud.add(dom);
  }
  return ud;
}
function laesInaktiveDomaener(root){
  const dir = path.join(root, 'sources');
  try {
    return inaktiveDomaener(fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f)).map(f => fs.readFileSync(path.join(dir, f), 'utf8')));
  } catch { return new Set(); }
}

/* Antal pr. kilde-domæne (kun indekserede annoncer har en kilde). */
function taelPrKilde(items){
  const m = {};
  for (const l of items){ const d = l.source && l.source.domaene; if (d) m[d] = (m[d] || 0) + 1; }
  return m;
}

/* Tjekker hver kategori for sig: egne, eksterne i alt, og hver kilde. Kilder i `inaktive` er
   trukket ud af baseline. Kaster ved første fald (via tjekAntal). */
function tjekLager({ egne, eksterne, perKilde, baseline, inaktive = new Set(), egneSider }){
  // nulErFejl: 0 egne med committede annoncesider er en tom hentning — ellers ville sitemappet miste annonce-
  // poster, mens siderne blev stående (inkonsistent). Siden hele sitemappet gendannes ved et sprunget trin.
  tjekAntal('Egne annoncer', egne, egneSider, { minAndel: MIN_ANDEL_KATEGORI, nulErFejl: true });
  const bKilder = baseline.perKilde || {};
  const fravalgt = Object.entries(bKilder).filter(([d]) => inaktive.has(d)).reduce((s, [, n]) => s + n, 0);
  tjekAntal('Indekserede annoncer', eksterne, (baseline.eksterne || 0) - fravalgt, { minAndel: MIN_ANDEL_KATEGORI });
  for (const [d, n] of Object.entries(bKilder)){
    if (inaktive.has(d)) continue;
    tjekAntal(`Kilde ${d}`, (perKilde || {})[d] || 0, n);
  }
}

/* Skal fejlen behandles fail-soft (bevar committede sider, fortsæt)? */
const erFaldFejl = e => !!e && (e.code === 'SEO_FALD' || e.code === 'SEO_HENT');
function afslut(e){
  console.error(e.message);
  process.exit(erFaldFejl(e) ? EXIT_FALD : 1);
}

function taelFiler(root, re){
  try { return fs.readdirSync(root).filter(f => re.test(f)).length; } catch { return 0; }
}
const taelAnnonceSider = root => taelFiler(root, /^annonce-.+\.html$/);
const taelMaerkeSider = root => taelFiler(root, /^maerke-.+\.html$/);

/* Antal <url> i en sitemap-streng. */
function taelSitemapUrls(xml){
  return (String(xml || '').match(/<url>/g) || []).length;
}

/* ---------- Ledger (lastmod + sidst kendte gode tal) ---------- */

function ledgerSti(root){ return path.join(root, 'scripts', LEDGER_FIL); }

function tomLedger(){ return { version: 1, meta: {}, sider: {} }; }

function laesLedger(root){
  const p = ledgerSti(root);
  if (!fs.existsSync(p)) return Object.assign(tomLedger(), { ny: true });
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { version: 1, meta: j.meta || {}, sider: j.sider || {}, ny: false };
  } catch (e) {
    throw new Error(`${LEDGER_FIL} kan ikke læses (${e.message}) — ret eller slet filen, så den kan genskabes.`);
  }
}

function skrivLedger(root, ledger){
  if (process.env.GITHUB_ACTIONS) return;   // CI ændrer aldrig ledgeren — se lastmodFor
  const sider = {};
  for (const k of Object.keys(ledger.sider).sort()) sider[k] = ledger.sider[k];
  const ud = { version: 1, meta: ledger.meta || {}, sider };
  fs.writeFileSync(ledgerSti(root), JSON.stringify(ud, null, 1) + '\n', 'utf8');
}

/* Hash af det, en læser (og en crawler) faktisk ser: synlig tekst i <main> samt
   title og description. Alt, der ændrer sig uden at siden har ændret sig, er
   skåret væk: scripts, styles, kommentarer, attributter (dermed ?v=), og
   "Senest bekræftet <dato>" (crawleren stempler hele kørslen ens, så den dato
   ville flytte lastmod på hver side ved hver crawl). */
function indholdsHash(html){
  const s = String(html || '');
  const titel = (s.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '';
  const besk = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const main = (s.match(/<main[\s\S]*?<\/main>/) || [s])[0];
  const tekst = main
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(?:Senest\s+)?bekræftet(?:\s+hos\s+kilderne)?\s+\d{1,2}\.\s*[a-zæøå]{3,9}\.?\s+\d{4}\.?/gi, '')
    .trim();
  return crypto.createHash('sha1').update(`${titel}\n${besk}\n${tekst}`).digest('hex').slice(0, 12);
}

/* Giver lastmod for en side og opdaterer ledgeren.
   - Kendt side, uændret hash  => den gemte dato (kan være null = ukendt).
   - Kendt side, nyt hash      => i dag.
   - Ukendt side i en ledger, der fandtes i forvejen => ny side: i dag.
   - Ukendt side, når ledgeren lige er oprettet     => null (vi ved det ikke). */
function lastmodFor(ledger, nøgle, hash, idag){
  const e = ledger.sider[nøgle];
  /* I CI committes ledgeren ikke (ingen bot-commit), så CI kan kun BEVIDNE en committet dato: er hashet lig
     det committede, bruges dens dato; ellers udelades lastmod. Byggedagen opfindes aldrig (S-011), og CI
     ændrer ikke ledgeren (skrivLedger). Lokale builds, der committes, flytter datoerne. */
  if (process.env.GITHUB_ACTIONS) return e && e.h === hash ? (e.d || null) : null;
  if (!e){
    const d = ledger.ny ? null : idag;
    ledger.sider[nøgle] = { h: hash, d };
    return d;
  }
  if (e.h !== hash){ e.h = hash; e.d = idag; }
  return e.d || null;
}

/* Én <url>-linje; lastmod udelades, hvor den ikke er ægte. */
function urlLinje(loc, lastmod, esc = s => s){
  return `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
}

/* Genberegner lastmod for alle poster i et sitemap, hvis adresse peger paa en side i roden, ud fra
   siden som den ligger NU. Poster uden for `base`, med ?query (forhandler.html?id=), annonce-*
   og guides beholder deres egen linje (egne, ægte datoer). `laesSide(fil)` giver html eller null. */
function genberegnLastmod(xml, base, laesSide, ledger, idag){
  return String(xml).split('\n').map(linje => {
    const m = /^\s*<url><loc>([^<]*)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?<\/url>\s*$/.exec(linje);
    if (!m) return linje;
    const loc = m[1];
    if (loc !== base && !loc.startsWith(base + '/')) return linje;
    const sti = loc.slice(base.length).replace(/^\//, '');
    if (sti.includes('?')) return linje;
    const noegle = sti === '' ? 'index' : sti.replace(/\.html$/, '');
    if (/^annonce-/.test(noegle) || /^guides?(-|$)/.test(noegle)) return linje;
    const html = laesSide(noegle + '.html');
    if (html == null) return linje;
    return urlLinje(loc, lastmodFor(ledger, noegle, indholdsHash(html), idag));
  }).join('\n');
}

/* Gyldig W3C-dato (YYYY-MM-DD) eller null. */
function renDato(v){
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v || ''));
  if (!m) return null;
  const d = new Date(m[1] + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === m[1] ? m[1] : null;
}

/* ---------- HTML-analyse (bruges af sideaudit og test) ---------- */

const uden = html => String(html || '').replace(/<!--[\s\S]*?-->/g, '');

function sideFakta(html){
  const h = uden(html);
  const dekod = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const titel = dekod((h.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]);
  const beskrivelse = dekod((h.match(/<meta name="description" content="([^"]*)"/) || [])[1]);
  const robots = (h.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
  const canonical = (h.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const h1 = (h.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').match(/<h1[\s>]/g) || []).length;
  return { titel, beskrivelse, noindex: /noindex/i.test(robots), canonical, h1 };
}

module.exports = {
  MIN_ANDEL, MIN_ANDEL_KATEGORI, GULV, EXIT_FALD, LEDGER_FIL, UDVEJE, tjekSletninger, inaktiveDomaener, laesInaktiveDomaener, taelPrKilde, tjekLager, erFaldFejl, afslut, vurderAntal, tjekAntal, taelAnnonceSider, taelMaerkeSider, taelSitemapUrls,
  laesLedger, skrivLedger, indholdsHash, lastmodFor, genberegnLastmod, urlLinje, renDato, sideFakta, taelSitemapUrls,
};
