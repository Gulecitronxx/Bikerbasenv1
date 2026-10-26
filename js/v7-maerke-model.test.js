/* V7 mærke: konservativ rensning af modelnavne (rensModelStoej i js/backend-bridge.js) — ingen støj i modelfilteret, ingen rigtige modelnavne tabt.
   Datagrundlag: scripts/fixtures/v7-lager-maerke.json (hele lageret, 735 aktive rækker, læst fra produktions-Supabase 26.10.2026, kun GET) og
   scripts/fixtures/v7-modelnavne-rigtige.json (100 rigtige modelnavne fra lageret). Kør: node --test js/v7-maerke-model.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const M = browserModules();
const F = M.Filtrering;

const LAGER = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v7-lager-maerke.json'), 'utf8')).raekker;
const RIGTIGE = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v7-modelnavne-rigtige.json'), 'utf8')).modeller;

/* En rå eksterne_annoncer-række i den form, bridgen får den fra PostgREST. */
function raa(o) {
  return {
    id: o.i || `00000000-0000-4000-8000-${String(Math.floor(Math.random() * 1e9)).padStart(12, '0')}`, kilde_annonce_id: '1', url: o.u || 'https://eksempel.test/a/1',
    titel: o.t, maerke: o.m, model: o.mo, variant: null, type: o.ty || null, aargang: o.a == null ? null : o.a, km: o.km == null ? null : o.km, ccm: o.c == null ? null : o.c,
    hk: null, pris_dkk: o.p == null ? null : o.p, stand: o.s || null, salgsmarkoerer: [], udledte_felter: [], by: null, postnr: o.pn == null ? null : o.pn,
    saelgertype: o.st || null, thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-10-01', sidst_set: o.ss || '2026-10-20T10:00:00Z',
    kilde: { navn: o.kn || 'Gul og Gratis', domaene: o.k || 'guloggratis.dk' },
  };
}
const model = (brand, rawModel, aar, titel) => M.normalizeExternalListing(raa({ m: brand, mo: rawModel, t: titel || `${brand} ${rawModel}`, a: aar })).model;

test('100 rigtige modelnavne fra lageret røres ikke (heller ikke XV 1900, VN 2000, GSX-8R, CX 650 E (Eurosport))', () => {
  assert.strictEqual(RIGTIGE.length, 100);
  const aendret = [];
  for (const [b, m, y] of RIGTIGE) {
    const ud = model(b, m, y);
    if (ud !== m) aendret.push(`${b} "${m}" -> "${ud}"`);
  }
  assert.deepStrictEqual(aendret, []);
});

test('støjtabel: kendte lagerrækker får en ren model (rå model, årgang -> forventet)', () => {
  const T = [
    ['Honda', 'VT600 ‘NY pris’', 1994, 'VT600'],
    ['Honda', 'CBF125 2009 Projekt mekaniker-tilbud', 2009, 'CBF125'],
    ['Kymco', 'kymco x town 300 rabatpris', null, 'X town 300'],
    ['Yamaha', 'XSR 900 GP DEMOPRIS', 2024, 'XSR 900 GP'],
    ['Honda', 'Cb500 1996 a2', 1997, 'Cb500'],
    ['Kawasaki', 'Nye Kawasaki kx 450', 2026, 'Kx 450'],
    ['Kawasaki', 'ZL600 lav sædehøjde', 1987, 'ZL600'],
    ['Yamaha', 'Xj 900 årg 90', 1990, 'Xj 900'],
    ['Suzuki', 'GSX-8T 776 83HK 6g', 2026, 'GSX-8T'],
    ['Suzuki', 'GSX-8R 776 83HK 6g', 2026, 'GSX-8R'],
    ['Royal Enfield', 'Classic 350cc classic-bike.dk', 2026, 'Classic'],   // domænet klippes, og cc-halen følger den eksisterende regel (ccm står i sit eget felt)
    ['Hyosung', 'God velkørende custom med lav. KM', null, ''],
    ['Yamaha', 'Moto yamaha', null, ''],
    ['Fantic', 'Fantic moto maskine', null, ''],
    ['Victory', 'Victory motorcykel V 92 Prototype', 1998, 'V 92 Prototype'],
    ['BSA', 'A65 Thunderbolt Classic Bike', 1970, 'A65 Thunderbolt'],
    ['BSA', 'Spitfire 650 Classic Bike', 1967, 'Spitfire 650'],
    ['Triumph', 'Daytona 955i bike', 2005, 'Daytona 955i'],
    ['Triumph', 'Tiger Classic Bike', 1955, 'Tiger'],
    ['Honda', 'CB 500 25000 km', 2010, 'CB 500'],
    ['Honda', 'CB 500 25.000km', 2010, 'CB 500'],
    ['Suzuki', 'Bandit 1200 kampagnepris', 2009, 'Bandit 1200'],
    ['Yamaha', 'MT-07 Nedsat pris', 2019, 'MT-07'],
  ];
  const fejl = [];
  for (const [b, m, y, forventet] of T) {
    const ud = model(b, m, y);
    if (ud !== forventet) fejl.push(`${b} "${m}": ${JSON.stringify(ud)} (forventet ${JSON.stringify(forventet)})`);
  }
  assert.deepStrictEqual(fejl, []);
});

test('beskyttelse: modelnavne, der LIGNER støj, bevares (store ccm som årstal, Custom Bike, Motocompo, ord inde i et navn)', () => {
  const T = [
    ['Yamaha', 'XV 1900', 2010, 'XV 1900'],           // 1900 er ccm, ikke et årstal (annoncen er fra 2010)
    ['Kawasaki', 'VN 2000', 2005, 'VN 2000'],
    ['Honda', 'CB 600 2003', 2005, 'CB 600 2003'],     // årstal 2 år fra årgangen: røres ikke (kun ±1)
    ['Honda', 'Hornet 600 2003', 2003, 'Hornet 600'],  // eksisterende regel (D8-S5): annoncens egen årgang
    ['Honda', 'Motocompo', 1982, 'Motocompo'],
    ['Honda', 'CB 1100 EX', 2018, 'CB 1100 EX'],
    ['Harley-Davidson', 'Custom Bike', 1976, 'Custom Bike'],
    ['Victory', 'Cross Country', 2012, 'Cross Country'],
    ['Moto Guzzi', 'Moto Guzzi V7', 2020, 'V7'],
    ['Suzuki', 'GSX 750 F', 1990, 'GSX 750 F'],
    ['Honda', 'CL 500 A', 2024, 'CL 500 A'],           // "A" er ikke "A2"
    ['Honda', 'NC 750 X A2', 2020, 'NC 750 X'],        // A2-hængsel i halen klippes
    ['Kawasaki', 'Z 900 RS', null, 'Z 900 RS'],
    ['Aprilia', 'Pegaso 650 Trail', 2001, 'Pegaso 650 Trail'],
  ];
  const fejl = [];
  for (const [b, m, y, forventet] of T) {
    const ud = model(b, m, y);
    if (ud !== forventet) fejl.push(`${b} "${m}" ${y}: ${JSON.stringify(ud)} (forventet ${JSON.stringify(forventet)})`);
  }
  assert.deepStrictEqual(fejl, []);
});

/* Hele lageret gennem den rigtige kæde (normalisering + dubletter + stavning) — som modelfilteret får det. */
function lagerNormaliseret() {
  const l = LAGER.map(o => M.normalizeExternalListing(raa(o)));
  return M.markerTvaerkildeDubletter(l).beholdt;
}

test('hele lageret: ingen støjord tilbage i modelfilteret (pris, rabat, projekt, mekaniker, årg, km, hk, a2, domæne, Classic Bike)', () => {
  const STOEJ = /(?:^|[\s‘'"(])(?:[a-zæøå]*pris|rabat|projekt|mekaniker|reservedele|defekt|velkørende|lav|lavt|sædehøjde|a2)(?:$|[\s’'")\.,;:])|\d\s?hk\b|\d\s?km\b|\bårg\b|\.(?:dk|com)\b|classic bike/i;
  const modeller = F.modelListe(lagerNormaliseret(), []);
  assert.ok(modeller.length > 300, 'modelfilteret har rigtige modeller: ' + modeller.length);
  const stoej = modeller.filter(m => STOEJ.test(m.navn)).map(m => m.navn);
  assert.deepStrictEqual(stoej, []);
});

test('hele lageret: rensningen er idempotent (en ren model renses ikke anderledes en gang til)', () => {
  const fejl = [];
  for (const l of lagerNormaliseret()) {
    if (!l.model) continue;
    const igen = model(l.brand, l.model, l.year);
    if (igen !== l.model) fejl.push(`${l.brand} "${l.model}" -> "${igen}"`);
  }
  assert.deepStrictEqual(fejl, []);
});

test('hele lageret: kun støjrækkerne ændrer sig — ingen annonce mister sin model uden at modellen var støj eller kategoriord', () => {
  const tomme = [];
  for (const o of LAGER) {
    const l = M.normalizeExternalListing(raa(o));
    if (l.model === '' && o.mo && !/^(?:motorcykel|mc|moto|scooter)$/i.test(o.mo)) tomme.push(o.mo);
  }
  // Præcis de tre rækker, der kun var en beskrivelse eller kun kategoriord (se støjtabellen ovenfor) — dubletter i lageret tæller med.
  const unikke = [...new Set(tomme)].sort();
  assert.deepStrictEqual(unikke, ['Fantic moto maskine', 'God velkørende custom med lav. KM', 'Moto yamaha'].sort());
});
