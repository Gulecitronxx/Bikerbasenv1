/* SEO-kravene til de committede sider. Kør: node --test scripts/seo-krav.test.js

   Fejler hvis
   - en indekserbar side mangler title eller description, eller deler dem med en anden side,
   - en indekserbar side har andet end netop én h1 (kommentarer og scripts tæller ikke),
   - en indekserbar titel er for lang til at stå uafkortet i søgeresultatet,
   - en adresse står i sitemappet uden at siden findes eller uden at være indekserbar,
   - en indekserbar side (på nær de to kendte skabeloner) mangler i sitemappet,
   - sitemappet har dubletter eller en lastmod, der ikke er en gyldig dato.

   Testen læser filerne, som de ligger committet — den kører altså ikke generatorerne. Bryder et
   build en af reglerne, ses det første gang testen køres efter buildet. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { analyser, TITEL_MAX } = require('./seo-audit');
const { renDato } = require('./seo-vagt');

const ROOT = path.join(__dirname, '..');
const BASE = require('./site-url')(ROOT);
const { sider } = analyser(ROOT);
const indekserbare = sider.filter(s => !s.noindex);

/* Skabeloner, der er indekserbare som fil men aldrig skal i sitemappet: forhandler.html er
   adressen for en forhandlerprofil (?id=), og dens egen URL uden id er ingen side. */
const IKKE_I_SITEMAP = new Set(['forhandler.html']);

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const poster = [...sitemap.matchAll(/<url><loc>([^<]*)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?<\/url>/g)]
  .map(m => ({ loc: m[1].replace(/&amp;/g, '&'), lastmod: m[2] || null }));

function filForLoc(loc){
  if (loc === BASE) return 'index.html';
  const sti = loc.slice(BASE.length + 1).split('?')[0];
  return sti.endsWith('.html') ? sti : `${sti}.html`;
}

test('sitemappet kunne læses og har poster', () => {
  assert.ok(poster.length >= 10, `kun ${poster.length} poster`);
  assert.strictEqual(poster.length, (sitemap.match(/<url>/g) || []).length, 'en post har et format, testen ikke forstår');
});

test('hver indekserbar side har title og description', () => {
  const fejl = indekserbare.filter(s => !s.titel || !s.beskrivelse).map(s => s.fil);
  assert.deepStrictEqual(fejl, []);
});

test('hver indekserbar side har netop én h1', () => {
  const fejl = indekserbare.filter(s => s.h1 !== 1).map(s => `${s.fil}: ${s.h1} h1`);
  assert.deepStrictEqual(fejl, []);
});

test('ingen to indekserbare sider deler title, description eller h1', () => {
  for (const felt of ['titel', 'beskrivelse', 'h1Tekst']){
    const m = new Map();
    for (const s of indekserbare) if (s[felt]) m.set(s[felt], [...(m.get(s[felt]) || []), s.fil]);
    const dubletter = [...m.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${felt} "${k}": ${v.join(', ')}`);
    assert.deepStrictEqual(dubletter, [], `dubletter i ${felt}`);
  }
});

test(`ingen indekserbar title er længere end ${TITEL_MAX} tegn`, () => {
  const fejl = indekserbare.filter(s => s.titel.length > TITEL_MAX).map(s => `${s.fil}: ${s.titel.length} tegn`);
  assert.deepStrictEqual(fejl, []);
});

test('hver sitemap-adresse peger på en side, der findes og er indekserbar', () => {
  const perFil = new Map(sider.map(s => [s.fil, s]));
  const fejl = [];
  for (const p of poster){
    if (!p.loc.startsWith(BASE)){ fejl.push(`${p.loc}: uden for ${BASE}`); continue; }
    const fil = filForLoc(p.loc);
    const s = perFil.get(fil);
    if (!s) fejl.push(`${p.loc}: ${fil} findes ikke`);
    else if (s.noindex) fejl.push(`${p.loc}: ${fil} er noindex — et modsat signal`);
  }
  assert.deepStrictEqual(fejl, []);
});

test('canonical er den adresse, sitemappet nævner', () => {
  const perFil = new Map(sider.map(s => [s.fil, s]));
  const fejl = [];
  for (const p of poster){
    const fil = filForLoc(p.loc);
    if (/^annonce-/.test(fil) || p.loc.includes('?')) continue; // annoncer/forhandlere: egen canonical (js/seo.js)
    const s = perFil.get(fil);
    if (s && s.canonical && s.canonical !== p.loc) fejl.push(`${p.loc}: canonical er ${s.canonical}`);
  }
  assert.deepStrictEqual(fejl, []);
});

test('hver indekserbar side står i sitemappet (på nær skabelonerne)', () => {
  const iSitemap = new Set(poster.map(p => filForLoc(p.loc)));
  const mangler = indekserbare.filter(s => !iSitemap.has(s.fil) && !IKKE_I_SITEMAP.has(s.fil)).map(s => s.fil);
  assert.deepStrictEqual(mangler, [], 'indekserbare sider, Google ikke får at vide om');
});

test('ingen adresse står to gange i sitemappet, og lastmod er en gyldig dato eller udeladt', () => {
  const set = new Set();
  const fejl = [];
  for (const p of poster){
    if (set.has(p.loc)) fejl.push(`${p.loc}: dublet`);
    set.add(p.loc);
    if (p.lastmod !== null){
      if (renDato(p.lastmod) !== p.lastmod) fejl.push(`${p.loc}: lastmod "${p.lastmod}" er ikke en gyldig dato`);
      else if (p.lastmod > new Date().toISOString().slice(0, 10)) fejl.push(`${p.loc}: lastmod ${p.lastmod} ligger i fremtiden`);
    }
  }
  assert.deepStrictEqual(fejl, []);
});
