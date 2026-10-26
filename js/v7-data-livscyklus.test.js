/* V7 data (A): ærlig alder, nedtoning og "senest bekræftet" i frontenden.
   Kør: node --test js/v7-data-livscyklus.test.js   (ingen netværk, ingen browser)

   Det, der låses:
     1. En annonce, der er over 14 dage uden bekræftelse, SKRIVER sin alder ("Bekræftet for 63 dage siden")
        og siger "kan være solgt, tjek hos kilden" — i stedet for stille at stå som frisk.
     2. Friske annoncer og egne annoncer får ingen advarsel (vi opfinder ingen alder).
     3. Forsinkede annoncer NEDTONES i "blandet" og SKJULES ALDRIG (samme antal ud som ind).
     4. Nedtoningen regner mod listens egen nyeste bekræftelse, ikke mod "nu": samme data giver samme
        rækkefølge i buildet og i browseren.
     5. "Senest bekræftet" ordner efter den dag, annoncen sidst blev set, uden dato bagest.
     6. Samlede tekster ("bekræftet senest 17. okt.") skjuler ikke, at en stor del er gammel. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const laes = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const M = new Function('document', 'Store', 'window', 'db',
  ['data.js', 'icons.js', 'components.js', 'sortering.js'].map(laes).join('\n;\n')
  + '\n;return { annonceAlder, livscyklusTilstand, friskhedsFordeling, senesteBekraeftet, Sortering, listingCardHTML, LIVSCYKLUS };')(
  { readyState: 'loading', addEventListener(){}, querySelector(){ return null; } },
  { getUser: () => null, isFavorite: () => false, isComparing: () => false, getCompare: () => [] },
  {}, { enabled: false, photoUrl: () => null });

const DAG = 86_400_000;
const NU = new Date('2026-10-26T12:00:00Z');
const siden = d => new Date(NU.getTime() - d * DAG).toISOString();
const ekstern = (id, dage, extra = {}) => Object.assign({
  id, brand: 'Honda', model: 'CB 1000 R', price: 99000, km: 12000, year: 2019, ccm: 998, power: 145,
  condition: 'Brugt', description: 'x'.repeat(100), photoUrls: ['https://example.test/f.webp'], createdAt: null,
  isExternal: true, externalUrl: `https://mcsyd.dk/p/${id}`, source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
  type: 'naked', city: 'Rødding', postnr: '6630', saelgertype: 'forhandler', isDealer: true,
  sidstSet: dage == null ? null : siden(dage),
}, extra);

/* ---------- 1-2. Alderen ---------- */
test('63 dage siden: "Bekræftet for 63 dage siden" + "kan være solgt, tjek hos kilden"', () => {
  const a = M.annonceAlder(ekstern('a', 63), NU);
  assert.equal(a.dage, 63);
  assert.equal(a.niveau, 'lang');
  assert.equal(a.advarsel, true);
  assert.equal(a.kort, 'Bekræftet for 63 dage siden');
  assert.equal(a.linje, 'Bekræftet for 63 dage siden. Den kan være solgt — tjek hos kilden.');
  assert.equal(a.tilstand, 'aktiv_forsinket');
});

test('niveauerne: frisk til og med 14 dage, forsinket 15-30, lang tid 31-90, udløbet over 90', () => {
  const n = d => M.annonceAlder(ekstern('x', d), NU);
  assert.equal(n(0).linje, 'Bekræftet i dag.');
  assert.equal(n(1).linje, 'Bekræftet i går.');
  assert.equal(n(14).niveau, 'frisk');
  assert.equal(n(14).kort, '', 'et friskt kort siger intet');
  assert.equal(n(15).niveau, 'forsinket');
  assert.match(n(15).linje, /Tjek hos kilden, at den stadig er til salg/);
  assert.equal(n(30).niveau, 'forsinket');
  assert.equal(n(31).niveau, 'lang');
  assert.equal(n(90).niveau, 'lang');
  assert.equal(n(91).niveau, 'udloebet');
  assert.equal(n(91).kort, 'Ikke bekræftet i 91 dage');
  assert.match(n(91).linje, /sandsynligvis ikke længere til salg/);
});

test('egne annoncer og ukendte datoer får ingen alder — vi opfinder den ikke', () => {
  assert.equal(M.annonceAlder({ id: 'egen' }, NU), null);
  assert.equal(M.annonceAlder(ekstern('a', null), NU), null);
  assert.equal(M.annonceAlder({ sidstSet: '0000' }, NU), null);
  assert.equal(M.annonceAlder({ sidstSet: '2026-12-31T00:00:00Z' }, NU), null, 'en dato i fremtiden er ukendt, ikke friskt');
});

test('"kunne ikke tjekkes" (migration 030) gør en ellers frisk annonce forsinket og siger det', () => {
  const a = M.annonceAlder(ekstern('a', 5, { tekniskFejlITraek: 2 }), NU);
  assert.equal(a.tilstand, 'midlertidigt_utilgaengelig');
  assert.equal(a.niveau, 'forsinket');
  assert.match(a.linje, /Vi kunne ikke tjekke den ved seneste forsøg/);
  assert.equal(M.annonceAlder(ekstern('b', 5, { vaekITraek: 1 }), NU).tilstand, 'midlertidigt_utilgaengelig');
  // uden kolonnerne (null) er alder det eneste, vi ved
  assert.equal(M.annonceAlder(ekstern('c', 5, { vaekITraek: null, tekniskFejlITraek: null }), NU).tilstand, 'aktiv_bekraeftet');
});

test('tærsklerne i data.js er de samme som i crawleren', () => {
  const lc = require('../crawler/livscyklus');
  assert.equal(M.LIVSCYKLUS.FRISK_DAGE, lc.TAERSKLER.FRISK_DAGE);
  assert.equal(M.LIVSCYKLUS.LANG_TID_DAGE, lc.TAERSKLER.LANG_TID_DAGE);
  assert.equal(M.LIVSCYKLUS.UDLOEB_DAGE, lc.TAERSKLER.UDLOEB_DAGE);
});

/* ---------- Kortet ---------- */
test('kortet: 63 dage gammel får mærkat (title + skjult tekst), frisk og egen får intet', () => {
  const nu = Date.now();
  const gammel = M.listingCardHTML(ekstern('g', 0, { sidstSet: new Date(nu - 63 * DAG).toISOString() }), 1);
  assert.match(gammel, /class="badge badge-alder badge-alder-lang"/);
  assert.match(gammel, />Bekræftet for 63 dage siden</);
  assert.match(gammel, /Den kan være solgt — tjek hos kilden\./);
  const frisk = M.listingCardHTML(ekstern('f', 0, { sidstSet: new Date(nu - 3 * DAG).toISOString() }), 1);
  assert.ok(!/badge-alder/.test(frisk), 'friskt kort: intet mærkat');
  const egen = M.listingCardHTML({ ...ekstern('e', 0), isExternal: false, externalUrl: null, sidstSet: null, isDealer: false, saelgertype: 'privat' }, 1);
  assert.ok(!/badge-alder/.test(egen), 'egen annonce: intet mærkat');
});

/* ---------- 3-4. Nedtoning ---------- */
const fuld = (id, dage, extra) => ekstern(id, dage, Object.assign({ createdAt: null }, extra));

test('nedtoning: en gammel 11-pointer står bag en frisk 6-pointer, men er stadig med', () => {
  // gammel: fuldt oplyst (11 point, -4 for over 30 dage = 7). frisk: uden beskrivelse og stand (9 point).
  const gammel = fuld('gammel', 63);
  const frisk = fuld('frisk', 1, { description: '', condition: null });
  assert.ok(M.Sortering.annonceOplysthed(gammel) > M.Sortering.annonceOplysthed(frisk), 'forudsætning: gammel er bedre oplyst');
  const ud = M.Sortering.sorter([gammel, frisk], 'blandet');
  assert.deepEqual(ud.map(l => l.id), ['frisk', 'gammel']);
  assert.equal(ud.length, 2, 'nedtonet er ikke skjult');
});

test('nedtoning: intet falder ud — samme antal og samme mængde ud som ind, uanset alder', () => {
  const liste = [];
  for (let i = 0; i < 60; i++) liste.push(fuld('a' + i, [0, 3, 12, 20, 45, 63, 80][i % 7], { photoUrls: i % 5 ? ['f'] : [] }));
  const ud = M.Sortering.sorter(liste.slice(), 'blandet');
  assert.equal(ud.length, liste.length);
  assert.deepEqual(ud.map(l => l.id).sort(), liste.map(l => l.id).sort());
  const bek = M.Sortering.sorter(liste.slice(), 'bekraeftet-desc');
  assert.deepEqual(bek.map(l => l.id).sort(), liste.map(l => l.id).sort());
});

test('nedtoning: trin 0 / -2 / -4 efter alder mod listens nyeste', () => {
  const ref = Date.parse(siden(0));
  const t = d => M.Sortering.nedtoning({ sidstSet: siden(d) }, ref);
  assert.equal(t(0), 0); assert.equal(t(14), 0);
  assert.equal(t(15), 2); assert.equal(t(30), 2);
  assert.equal(t(31), 4); assert.equal(t(80), 4);
  assert.equal(M.Sortering.nedtoning({ id: 'egen' }, ref), 0, 'egne annoncer nedtones aldrig');
});

test('nedtoning regner mod listens egen nyeste dato: samme data giver samme rækkefølge i buildet og i browseren, nu eller om en måned', () => {
  const liste = [fuld('a', 1), fuld('b', 40), fuld('c', 70, { price: null }), fuld('d', 2, { photoUrls: [] }), fuld('e', 50, { photoUrls: [] })];
  const forskyd = (l, dage) => ({ ...l, sidstSet: new Date(Date.parse(l.sidstSet) + dage * DAG).toISOString() });
  const a = M.Sortering.sorter(liste.slice(), 'blandet').map(l => l.id);
  // Alle bekræftelser rykkes 30 dage frem ("senere byggetidspunkt"): ens afstande -> ens rækkefølge.
  const b = M.Sortering.sorter(liste.map(l => forskyd(l, 30)), 'blandet').map(l => l.id);
  assert.deepEqual(a, b);
});

test('uden datoer (egne annoncer) er rækkefølgen den hidtidige — nedtoningen rører dem ikke', () => {
  const liste = [fuld('b', null), fuld('a', null), fuld('c', null, { photoUrls: [] })];
  const ud = M.Sortering.sorter(liste.slice(), 'blandet').map(l => l.id);
  assert.deepEqual(ud, M.Sortering.sorter(liste.slice().reverse(), 'blandet').map(l => l.id));
});

/* ---------- 5. Senest bekræftet ---------- */
test('"Senest bekræftet": nyeste dag først, ens dage samlet, uden dato bagest', () => {
  const liste = [fuld('d63', 63), fuld('d1', 1), fuld('d9', 9), fuld('u', null), fuld('d1b', 1)];
  const ud = M.Sortering.sorter(liste.slice(), 'bekraeftet-desc').map(l => l.id);
  assert.deepEqual(new Set(ud.slice(0, 2)), new Set(['d1', 'd1b']));
  assert.equal(ud[2], 'd9');
  assert.equal(ud[3], 'd63');
  assert.equal(ud[4], 'u');
});

test('"Senest bekræftet": egne annoncer sorteres efter oprettelsesdag i stedet for at falde ud', () => {
  const egen = { ...fuld('egen', null), isExternal: false, createdAt: siden(2) };
  const ud = M.Sortering.sorter([fuld('d63', 63), egen, fuld('d9', 9)], 'bekraeftet-desc').map(l => l.id);
  assert.deepEqual(ud, ['egen', 'd9', 'd63']);
});

/* ---------- 6. Tekster ---------- */
test('den samlede tekst skjuler ikke en gammel hale — tallene står der', () => {
  // Produktionens fordeling 26.10.2026: 403 bekræftet for 9 dage siden, 332 for 63-71 dage siden.
  const liste = [
    ...Array.from({ length: 403 }, (_, i) => ({ sidstSet: siden(9) })),
    ...Array.from({ length: 332 }, (_, i) => ({ sidstSet: siden(63 + (i % 9)) })),
  ];
  const r = M.senesteBekraeftet(liste, NU);
  assert.equal(r.fordeling.frisk, 403);
  assert.equal(r.fordeling.aeldre, 332);
  assert.equal(r.samlet, '403 af 735 annoncer er bekræftet inden for 14 dage (senest 17. okt.). 332 kan være solgt — tjek hos kilden.');
  assert.equal(r.kort, '403 bekræftet inden for 14 dage (senest 17. okt.), 332 kan være solgt');
  assert.match(r.detalje, /332 er ikke bekræftet i over 14 dage, heraf 332 i over 30 dage/);
  assert.ok(!/De fleste annoncer er bekræftet senest/.test(r.samlet), 'medianens formulering er væk');
});

test('en helt frisk liste siger "Alle ... inden for 14 dage"; en helt gammel siger "Ingen ..."', () => {
  const frisk = M.senesteBekraeftet([1, 2, 3].map(() => ({ sidstSet: siden(2) })), NU);
  assert.match(frisk.samlet, /^Alle 3 annoncer er bekræftet inden for 14 dage \(senest 24\. okt\.\)\.$/);
  const gammel = M.senesteBekraeftet([1, 2, 3].map(() => ({ sidstSet: siden(40) })), NU);
  assert.match(gammel.samlet, /^Ingen af de 3 annoncer er bekræftet inden for 14 dage/);
  assert.match(gammel.samlet, /kan være solgt — tjek hos kilden/);
});

test('friskhedsFordeling tæller kun annoncer med dato', () => {
  const f = M.friskhedsFordeling([{ sidstSet: siden(1) }, { sidstSet: siden(20) }, { sidstSet: siden(60) }, { sidstSet: siden(100) }, { id: 'egen' }], NU);
  assert.deepEqual(f, { dateret: 4, frisk: 1, forsinket: 1, lang: 1, udloebet: 1, aeldre: 3 });
});

/* ---------- Kildekode-kontrakter ---------- */
test('frontenden bestiller ikke migrationens kolonner, før flaget er slået til (ellers forsvinder alle annoncer)', () => {
  const bb = laes('backend-bridge.js');
  assert.match(bb, /SUPABASE_CONFIG\.livscyklus === true/);
  assert.match(laes('supabase-config.js'), /livscyklus:\s*false/, 'flaget er fra som standard');
  const kolonner = bb.match(/const EKSTERNE_KOLONNER =[\s\S]*?;/)[0];
  assert.ok(!/vaek_i_traek/.test(kolonner), 'basiskolonnerne indeholder ikke de nye');
});

test('søgningen har "Senest bekræftet" som sortering', () => {
  assert.match(laes('search.js'), /const SORTERINGER = \[[^\]]*'bekraeftet-desc'/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'soegning.html'), 'utf8'), /<option value="bekraeftet-desc">Senest bekræftet<\/option>/);
});
