/* Tests for datakvaliteten i det indekserede lager (Gauntlet bølge 3, strøm w3-data).
   Kør: node --test js/data-kvalitet.test.js

   Hver gruppe låser ét fund fra docs/review/gauntlet/detective-funktion.md:
   F-002 falsk "Ny", F-003 alder på lageret, F-006 stand-facet "Ny", F-007
   ccm/hk/årgang læst forkert, F-008 tom model/"Ukendt", F-009 "købes"-annoncer,
   F-010 forhandlerjargon, F-011 skrivemåde der splitter facetter.

   BEVIST PÅ FIXTURES. Rækkerne herunder er de navngivne eksempler fra detective-
   rapporten (samme tal), skrevet ind som rå `eksterne_annoncer`-rækker. Testen
   rører aldrig produktion. Ejeren kan køre scripts/sweep-datakvalitet.js på et
   rigtigt snapshot senere.

   Koden prøves, som browseren kører den: scripts/shared.js browserModules()
   samler js/data.js + components.js + backend-bridge.js i ét scope. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { browserModules } = require('../scripts/shared.js');
const crawler = require('../crawler/normalize.js');

const M = browserModules();
const NU = 2026;

function raa(o){
  return Object.assign({
    id: 'x', kilde_annonce_id: '1', url: 'https://example.dk/a/1', titel: 'Honda CB 500', maerke: 'Honda', model: 'CB 500',
    variant: null, type: null, aargang: 2010, km: 20000, ccm: 500, hk: 48, pris_dkk: 50000, stand: null,
    salgsmarkoerer: [], udledte_felter: [], by: 'Aarhus', postnr: 8000, saelgertype: 'privat',
    thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-08-01', sidst_set: '2026-08-24T10:00:00Z',
    kilde: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' },
  }, o);
}
const norm = o => M.normalizeExternalListing(raa(o));

/* ---------------------------------------------------------------- F-002 / F-006 */
test('F-002: "ny" gælder kun, når tallene ikke modsiger det', () => {
  const ny = (o) => M.kildeNyStatus(o, NU);
  // Kilden siger ny, tallene er enige eller tavse.
  assert.equal(ny({ kildeStand: 'ny', km: null, year: 2026 }), true);
  assert.equal(ny({ kildeStand: 'ny', km: 0, year: 2026 }), true);
  assert.equal(ny({ kildeStand: 'ny', km: 500, year: 2023 }), true, 'grænsen: 500 km og 2023 (= i år − 3) tæller stadig');
  assert.equal(ny({ kildeStand: 'ny', km: null, year: 2023 }), true, 'MC Syds 2023-lager');
  // Modsagt: Suzuki VZR1800 2007 med 53.000 km, BMW K 100 RT 1985 med 122.000 km, Triumph Daytona T100R 1971.
  assert.equal(ny({ kildeStand: 'ny', km: 53000, year: 2007 }), false);
  assert.equal(ny({ kildeStand: 'ny', km: 122000, year: 1985 }), false);
  assert.equal(ny({ kildeStand: 'ny', km: null, year: 1971 }), false);
  assert.equal(ny({ kildeStand: 'ny', km: 501, year: 2026 }), false, '501 km er over grænsen');
  assert.equal(ny({ kildeStand: 'ny', km: 0, year: 2022 }), false, '2022 er ældre end i år − 3');
  // Ubevist: Gul og Gratis siger ny, men oplyser hverken km eller årgang. Intet mærke.
  assert.equal(ny({ kildeStand: 'ny', km: null, year: null }), null);
  // ...medmindre kildens egen katalogsti siger det (MC Syds /Ny/).
  assert.equal(ny({ kildeStand: 'ny', km: null, year: null, externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20X/1' }), true);
  assert.equal(ny({ kildeStand: 'ny', km: 90000, year: null, externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20X/1' }), false, 'stien redder ikke en modsagt ny');
  // Brugt og tavs er som før.
  assert.equal(ny({ kildeStand: 'brugt', km: 0, year: 2026 }), false);
  assert.equal(ny({}), null);
  assert.equal(ny({ externalUrl: 'https://www.guloggratis.dk/annonce/abc/en-flot-mc' }), null);
});

test('F-002: den fælles funktion bruges af kort, annonceside, SEO og generatorer', () => {
  const l = M.normalizeExternalListing(raa({ titel: 'Suzuki VZR1800', maerke: 'Suzuki', model: 'VZR1800', aargang: 2007, km: 53000, stand: 'ny', pris_dkk: 189000 }));
  assert.equal(M.eksternErNy(l), false);
  assert.equal(l.condition, 'Brugt');
  const html = M.listingCardHTML(l, 0);
  assert.ok(!/rk-ny/.test(html), 'kortet må ikke bære Ny-mærket');
  const ok = M.normalizeExternalListing(raa({ titel: 'Honda CB 650 R', model: 'CB 650 R', aargang: 2026, km: null, stand: 'ny', url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/2' }));
  assert.equal(M.eksternErNy(ok), true);
  assert.equal(ok.condition, 'Ny');
  assert.match(M.listingCardHTML(ok, 0), /rk-ny/);
  const facet = fs.readFileSync(path.join(__dirname, '..', 'scripts/build-facet-pages.js'), 'utf8');
  assert.ok(!/kildeStand\s*===\s*'ny'/.test(facet), 'build-facet-pages.js må ikke have sin egen ny-test');
});

test('F-002: Gul og Gratis-annonce uden km og årgang får intet ny-mærke og ingen stand', () => {
  const l = norm({ stand: 'ny', aargang: null, km: null, ccm: 600, hk: null });
  assert.equal(M.eksternErNy(l), null);
  assert.equal(l.condition, null);
});

test('F-006: "Ny" er en filterværdi, men ikke en del af CONDITIONS (check constraint i databasen)', () => {
  assert.deepEqual([...M.CONDITIONS], ['Som ny', 'God stand', 'Brugt', 'Defekt/Projekt']);
  assert.deepEqual([...M.FILTER_CONDITIONS], ['Ny', 'Som ny', 'God stand', 'Brugt', 'Defekt/Projekt']);
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase/008_haerdning.sql'), 'utf8');
  assert.ok(/Som ny/.test(sql) && !/'Ny'/.test(sql), 'listings.condition har fire værdier');
  const opret = fs.readFileSync(path.join(__dirname, 'opret-annonce.js'), 'utf8');
  assert.ok(/CONDITIONS\.map/.test(opret) && !/FILTER_CONDITIONS/.test(opret));
  const soeg = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');
  assert.ok(/FILTER_CONDITIONS\.map/.test(soeg), 'søgningens stand-facet renderer FILTER_CONDITIONS');
});

test('F-006: filteret Stand = Ny finder kun de bekræftet nye', () => {
  const liste = [
    norm({ id: 'a', stand: 'ny', aargang: 2026, km: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/1' }),
    norm({ id: 'b', stand: 'ny', aargang: 2007, km: 53000 }),
    norm({ id: 'c', stand: 'brugt' }),
    norm({ id: 'd', stand: null }),
  ];
  const ny = M.Filtrering.anvendFiltre(liste, { conditions: ['Ny'] });
  assert.deepEqual(ny.map(l => l.id), ['a']);
  const brugt = M.Filtrering.anvendFiltre(liste, { conditions: ['Brugt'] });
  assert.deepEqual(brugt.map(l => l.id).sort(), ['b', 'c']);
});

/* ---------------------------------------------------------------- F-007 */
const TAL_CASES = [
  // [navn, input, forventet ccm, forventet hk]
  ['GPZ 500S årg 1992 (ccm = årstal)', { ccm: 1992, hk: null, aargang: 1992, tekst: 'Kawasaki GPZ 500S årg 1992' }, null, null],
  ['XJ 900 årg 90 (ccm = årg-tal)', { ccm: 90, hk: 98, aargang: 1990, tekst: 'Yamaha xj 900 årg 90' }, null, 98],
  ['Bonneville T 120 (1200 læst som 120)', { ccm: 120, hk: 80, aargang: 2027, tekst: 'Triumph Bonneville T 120' }, null, 80],
  ['ccm under 45', { ccm: 12, hk: null, aargang: 2000, tekst: 'x' }, null, null],
  ['44 er for lidt, 45 er grænsen', { ccm: 45, hk: 3, aargang: 2000, tekst: 'x' }, 45, 3],
  ['GL1800 bevares', { ccm: 1832, hk: 125, aargang: 2013, tekst: 'Honda GL 1800 Gold Wing' }, 1832, 125],
  ['Harley 1923 ccm bevares', { ccm: 1923, hk: 90, aargang: 2022, tekst: 'Harley-Davidson Road King' }, 1923, 90],
  ['Hayabusa 1340/190 bevares', { ccm: 1340, hk: 190, aargang: 2015, tekst: 'Suzuki Hayabusa' }, 1340, 190],
  ['2-takt 125 cm3 med 37 hk (0,296) bevares', { ccm: 125, hk: 37, aargang: 1998, tekst: 'x' }, 125, 37],
  ['hk/ccm > 0,30 med urealistisk hk nulstiller hk', { ccm: 600, hk: 400, aargang: 2010, tekst: 'x' }, 600, null],
  ['ukendte tal er stadig ukendte', { ccm: null, hk: null, aargang: null, tekst: '' }, null, null],
];
for (const [navn, inp, ccm, hk] of TAL_CASES){
  test(`F-007: ${navn}`, () => {
    const u = M.saniterTal(inp);
    assert.equal(u.ccm, ccm);
    assert.equal(u.hk, hk);
  });
}

test('F-007: normalizeExternalListing bruger reglerne på de tre navngivne rækker', () => {
  const gpz = norm({ titel: 'Kawasaki GPZ 500S årg 1992', maerke: 'Kawasaki', model: 'GPZ 500S', aargang: 1992, ccm: 1992, hk: null, pris_dkk: 1900 });
  assert.equal(gpz.ccm, null);
  const xj = norm({ titel: 'Yamaha xj 900 årg 90', maerke: 'Yamaha', model: 'xj 900', aargang: 1990, ccm: 90, hk: 98 });
  assert.equal(xj.ccm, null);
  assert.equal(xj.power, 98);
  const t120 = norm({ titel: 'Triumph Bonneville T 120', maerke: 'Triumph', model: 'Bonneville T 120', aargang: 2027, ccm: 120, hk: 80 });
  assert.equal(t120.ccm, null);
  assert.equal(t120.power, 80);
  const gl = norm({ titel: 'Honda GL 1800 Gold Wing', maerke: 'Honda', model: 'GL 1800 Gold Wing', aargang: 2013, ccm: 1832, hk: 125 });
  assert.equal(gl.ccm, 1832);
});

test('F-007: crawlerens spejl og browserens regel giver det samme svar (drift-test)', () => {
  assert.equal(typeof crawler.renseUrealistiskeTal, 'function');
  const ccms = [null, 0, 12, 44, 45, 50, 90, 120, 125, 399, 500, 600, 749, 1200, 1340, 1832, 1923, 1990, 1992, 2000, 2026, 2458];
  const hks = [null, 0, 3, 14, 35, 47, 80, 98, 125, 190, 250, 251, 400];
  const aar = [null, 1990, 1992, 2000, 2027];
  const tekster = ['', 'Yamaha xj 900 årg 90', 'Kawasaki GPZ 500S årg 1992', 'Triumph Bonneville T 120', 'Honda CB 500 årg. 1992'];
  let n = 0;
  for (const ccm of ccms) for (const hk of hks) for (const aargang of aar) for (const tekst of tekster){
    const a = M.saniterTal({ ccm, hk, aargang, tekst });
    const b = crawler.renseUrealistiskeTal({ ccm, hk, aargang, tekst });
    assert.deepEqual({ ccm: b.ccm, hk: b.hk }, { ccm: a.ccm, hk: a.hk }, JSON.stringify({ ccm, hk, aargang, tekst }));
    n++;
  }
  assert.ok(n > 5000);
});

/* ---------------------------------------------------------------- F-008 / F-009 / F-011 */
test('F-008: model udledes af deeplink-stien, når titlen kun er mærket', () => {
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20GL%201800%20Gold%20Wing/165233', 'Honda'), 'GL 1800 Gold Wing');
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=180898&m=1489', 'Honda'), null, 'ingen model i stien: ingen opfindelse');
  assert.equal(M.modelFraDeeplink('https://www.guloggratis.dk/annonce/abc/en-flot-mc', 'Honda'), null);
  const l = norm({ titel: 'Honda', maerke: 'Honda', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20GL%201800%20Gold%20Wing/165233' });
  assert.equal(l.model, 'GL 1800 Gold Wing');
  const tom = norm({ titel: 'Honda', maerke: 'Honda', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=1&m=2' });
  assert.equal(tom.model, '');
});

test('F-008: mærket "Ukendt" afledes af stien, når den nævner et kendt mærke; ellers bliver det Ukendt', () => {
  assert.equal(M.maerkeFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/CFMOTO%20MTX800/12345'), 'CFMoto');
  assert.equal(M.maerkeFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Ukendt%20DKW%20250/1'), null);
  assert.equal(M.maerkeFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Royal%20Enfield%20Bullet/1'), 'Royal Enfield');
  const a = norm({ titel: 'Ukendt MTX800', maerke: 'Ukendt', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/CFMOTO%20MTX800/12345' });
  assert.equal(a.brand, 'CFMoto');
  assert.equal(a.model, 'MTX800');
  const b = norm({ titel: 'Ukendt DKW 250', maerke: 'Ukendt', model: null, url: 'https://x.dk/a/1' });
  assert.equal(b.brand, 'Ukendt');
  assert.equal(b.model, 'DKW 250');
});

test('F-009: købes/søges-annoncer er ikke til salg', () => {
  for (const t of ['BSA / Triumph / Norton købes', 'Søges: Honda CB 750', 'Ønskes købt: Kawasaki Z1', 'MC købes kontant'])
    assert.equal(M.erEfterspoergsel(t), true, t);
  for (const t of ['Honda CB 500', 'Yamaha XV 750 Virago', 'Triumph Bonneville søger ny ejer', 'Kawasaki Z1 sælges, køber betaler omregistrering', 'Suzuki Intruder'])
    assert.equal(M.erEfterspoergsel(t), false, t);
  const liste = [
    norm({ id: 'k', titel: 'BSA / Triumph / Norton købes', maerke: 'BSA', model: null, pris_dkk: null }),
    norm({ id: 's', titel: 'BSA A65', maerke: 'BSA', model: 'A65' }),
  ];
  const { beholdt, dubletter } = M.markerTvaerkildeDubletter(liste);
  assert.deepEqual(beholdt.map(l => l.id), ['s']);
  assert.ok(dubletter.some(l => l.id === 'k'), 'direkte adresse virker stadig via EXTERNAL_DUBLETTER');
});

test('F-011: SYM/Sym og FB Mondial/Fb Mondial er ét mærke', () => {
  assert.equal(norm({ maerke: 'Sym', model: 'Jet 14' }).brand, 'SYM');
  assert.equal(norm({ maerke: 'SYM', model: 'Jet 14' }).brand, 'SYM');
  assert.equal(norm({ maerke: 'Fb Mondial', model: 'HPS 125' }).brand, 'FB Mondial');
  assert.equal(norm({ maerke: 'FB MONDIAL', model: 'HPS 125' }).brand, 'FB Mondial');
});

test('F-011: modeller, der kun adskiller sig på store/små bogstaver og mellemrum, får samme stavemåde', () => {
  const rk = (id, model) => norm({ id, maerke: 'Honda', model, titel: 'Honda ' + model, url: 'https://x.dk/' + id });
  const liste = [rk('1', 'NT 1100 D'), rk('2', 'NT 1100 D'), rk('3', 'Nt 1100 d'),
                 rk('4', 'CBF 1000 A'), rk('5', 'CBF 1000A'), rk('6', 'CBF 1000 A'),
                 rk('7', 'XV 750 Virago'), rk('8', 'Xv 750 virago'),
                 rk('9', 'CB 500'), rk('10', 'CB 650')];
  M.harmoniserStavning(liste);
  const modeller = [...new Set(liste.map(l => l.model))].sort();
  assert.deepEqual(modeller, ['CB 500', 'CB 650', 'CBF 1000 A', 'NT 1100 D', 'XV 750 Virago']);
  // Samme resultat, uanset rækkefølgen.
  const omvendt = liste.map(l => ({ ...l, model: l.model })).reverse();
  M.harmoniserStavning(omvendt);
  assert.deepEqual([...new Set(omvendt.map(l => l.model))].sort(), modeller);
});

test('F-011: filteret sammenligner mærke og model uden forskel på store/små bogstaver', () => {
  const liste = [norm({ id: 'a', maerke: 'Sym', model: 'Jet 14' }), norm({ id: 'b', maerke: 'Honda', model: 'CB 500' })];
  assert.deepEqual(M.Filtrering.anvendFiltre(liste, { brands: ['SYM'] }).map(l => l.id), ['a']);
  assert.deepEqual(M.Filtrering.anvendFiltre(liste, { brands: ['sym'] }).map(l => l.id), ['a']);
  assert.deepEqual(M.Filtrering.anvendFiltre(liste, { models: ['cb 500'] }).map(l => l.id), ['b']);
});

/* ---------------------------------------------------------------- F-010 */
test('F-010: forhandlerjargon vises som neutral tekst på kortet', () => {
  assert.equal(M.salgsmarkoerLabel('ENGROS'), 'Handelspris');
  assert.equal(M.salgsmarkoerLabel('UDEN KLARGØRING'), 'Uden klargøring');
  assert.equal(M.salgsmarkoerLabel('BYTTER GERNE'), 'Bytter gerne');
  assert.equal(M.salgsmarkoerLabel('MED GARANTI'), 'Med garanti');
  const l = norm({ salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'], url: 'https://mcsyd.dk/a/1', saelgertype: 'forhandler' });
  const m = M.eksternSalgsmarkoerer(l);
  assert.equal(m.tekst, 'Handelspris +1');
  assert.ok(!/ENGROS/.test(m.tekst));
  const html = M.listingCardHTML(l, 0);
  assert.ok(!/ENGROS/.test(html), 'ordet engros står ikke på kortet');
  assert.match(html, /Handelspris/);
});

/* ---------------------------------------------------------------- F-003 */
test('F-003: seneste bekræftelse regnes af sidstSet, og lageret kaldes gammelt efter 14 dage', () => {
  const liste = [{ sidstSet: '2026-08-16T12:00:00Z' }, { sidstSet: '2026-08-24T12:00:00Z' }, { sidstSet: null }, {}];
  const nu = new Date('2026-08-30T12:00:00Z');
  const r = M.senesteBekraeftet(liste, nu);
  assert.equal(r.dage, 6);
  assert.equal(r.gammel, false);
  assert.equal(r.datoTekst, '24. aug.');
  assert.equal(r.tekst, 'Senest bekræftet hos kilderne 24. aug.');
  assert.equal(r.advarsel, '');
  const gammel = M.senesteBekraeftet(liste, new Date('2026-10-15T12:00:00Z'));
  assert.equal(gammel.dage, 52);
  assert.equal(gammel.gammel, true);
  assert.equal(gammel.advarsel, 'Annoncerne kan være ændret siden.');
  assert.equal(M.senesteBekraeftet(liste, new Date('2026-09-07T12:00:00Z')).gammel, false, '14 dage er stadig inden for grænsen');
  assert.equal(M.senesteBekraeftet(liste, new Date('2026-09-08T12:00:00Z')).gammel, true, '15 dage er over');
  // Andet år end i dag skrives med årstal.
  assert.equal(M.senesteBekraeftet([{ sidstSet: '2025-12-24T12:00:00Z' }], nu).datoTekst, '24. dec. 2025');
  // Egne annoncer har ingen sidstSet: så står der ingenting (ingen opfundet dato).
  assert.equal(M.senesteBekraeftet([{ id: 'egen' }], nu), null);
  assert.equal(M.senesteBekraeftet([], nu), null);
});

test('F-003: forside og søgning viser datoen (kildekode-kontrakt)', () => {
  for (const f of ['home.js', 'search.js']){
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.ok(/senesteBekraeftet\(/.test(src), f + ' skal kalde senesteBekraeftet');
  }
});
