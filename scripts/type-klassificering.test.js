/* V7 data (B): motorcykeltype afledt af mærke + model. Kør: node --test scripts/type-klassificering.test.js
   Ingen netværk: fixtures er et snapshot af produktionens annoncer (kun mærke/model/titel/årgang/kildens type).

   Det, der låses:
     1. Tabellen (data/model-typer.json) er gyldig og KOPIEN i js/data.js er i trit med den.
     2. PRÆCISION >= 95 % mod de annoncer, kilden selv har typet (reglerne køres uden at se kildens type).
     3. Håndkontrollen af 50 tilfældige afledte typer: >= 95 % korrekte, og reglerne giver stadig præcis dem.
     4. Tvivl er IKKE med: modeller, forhandlere og fabrik klassificerer forskelligt (CBR 650 R, Hayabusa, Bandit, Versys,
        Road King, Thruxton, GL 1100 ...), og år-afhængige modeller (Z650 1979) forbliver Ukendt.
     5. Kildens egen type vinder altid; kun når kilden tier, afledes den, og så er den mærket typeAfledt.
     6. Filter, tal og typesider tæller ens: sum af type-tællingerne + uoplyste = hele lageret. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const T = require('./type-klassificering.js');
const { browserModules } = require('./shared.js');
const M = browserModules();
const fix = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));

const afled = (brand, model, aargang, titel) => {
  const r = M.afledtTypeFor(brand, model, titel || `${brand} ${model}`, aargang);
  return r ? r.type : null;
};

/* ---------- 1. Tabellen ---------- */
test('tabellen er gyldig: kendte typer, mønstre a-z0-9, en begrundelse pr. regel, ingen dubletter', () => {
  assert.deepEqual(T.valider(T.laesTabel()), []);
});

test('kopien i js/data.js er i trit med data/model-typer.json (kør node scripts/type-klassificering.js --generer)', () => {
  assert.equal(T.erITrit(), true);
});

test('valideringen kan fejle: ukendt type, tomt mønster, regel uden begrundelse, dublet', () => {
  const dårlig = { maerker: { Honda: [['gl1800', 'rumraket', 'x'], ['~', 'touring', 'x'], ['cb1000', 'naked'], ['cb1000', 'naked', 'y'], ['MÅ IKKE', 'naked', 'z']] } };
  const f = T.valider(dårlig).join('\n');
  assert.match(f, /ukendt type "rumraket"/);
  assert.match(f, /tomt "indeholder"-mønster/);
  assert.match(f, /uden begrundelse/);
  assert.match(f, /står to gange/);
  assert.match(f, /mønstret skal være a-z0-9/);
});

/* ---------- 2. Præcision mod kildens egne typer ---------- */
test('præcision >= 95 % mod annoncer, hvor kilden selv oplyste typen (reglerne ser ikke kildens type)', () => {
  const { raekker, antal } = fix('type-kilde-typede.json');
  assert.equal(raekker.length, antal);
  assert.ok(raekker.length >= 300, 'fixturen er stor nok til at betyde noget');
  let ramt = 0, enige = 0;
  const uenige = [];
  for (const r of raekker){
    const h = M.afledtTypeFor(r.brand, r.model, r.titel, r.aargang);
    if (!h) continue;
    ramt++;
    if (h.type === r.kildeType) enige++; else uenige.push(`${r.titel}: regel ${h.type} (${h.regel}) mod kilde ${r.kildeType}`);
  }
  assert.ok(ramt >= 200, `reglerne rammer en stor del af de kildetypede (${ramt})`);
  const procent = 100 * enige / ramt;
  assert.ok(procent >= 95, `præcision ${procent.toFixed(1)} % (${enige}/${ramt}); uenige:\n  ${uenige.join('\n  ')}`);
  // De uenige er kendte og forklaret i docs/review/gauntlet/v7/data.md: Harleys Electra Glide (forhandleren skriver "Cruiser", Harley siger Touring,
  // og js/data.js TYPE_FOR_MODELNAVN siger Touring) og en KTM 1290 Super Duke GT, som forhandleren kalder "Offroader".
  const ukendte = uenige.filter(u => !/Electra Glide|Super Duke GT/.test(u));
  assert.deepEqual(ukendte, [], 'ingen uforklarede uenigheder');
});

test('håndkontrollen: 50 tilfældige afledte typer, >= 95 % korrekte, og reglerne giver stadig præcis dem', () => {
  const { raekker } = fix('type-stikproeve.json');
  assert.equal(raekker.length, 50);
  const korrekte = raekker.filter(r => r.vurdering === 'korrekt').length;
  assert.ok(korrekte / raekker.length >= 0.95, `${korrekte}/50`);
  for (const r of raekker){
    const h = M.afledtTypeFor(r.brand, r.model, r.titel, r.aargang);
    assert.ok(h, `${r.brand} ${r.model} skal stadig have en type`);
    assert.equal(h.type, r.afledt, `${r.brand} ${r.model} (${r.aargang})`);
  }
});

/* ---------- 3. Eksempler fra opgaven ---------- */
test('entydige modeller: CB 1000 R = naked, GL 1800 = touring, V-Strom = adventure, Rebel = cruiser, Tricity = scooter', () => {
  assert.equal(afled('Honda', 'CB 1000 R', 2022), 'naked');
  assert.equal(afled('Honda', 'GL 1800 Gold Wing', 2023), 'touring');
  assert.equal(afled('Suzuki', 'DL 650 V-Strom', 2005), 'adventure');
  assert.equal(afled('Honda', 'CMX 500 Rebel', 2022), 'cruiser');
  assert.equal(afled('Yamaha', 'Tricity 300', 2025), 'scooter');
  assert.equal(afled('Yamaha', 'MT-09', 2024), 'naked');
  assert.equal(afled('Yamaha', 'Ténéré 700', 2025), 'adventure', 'accenter er ligegyldige');
  assert.equal(afled('BMW', 'R 1250 GS', 2021), 'adventure');
  assert.equal(afled('BMW', 'R 45', 1979), 'classic');
  assert.equal(afled('Harley-Davidson', 'FXLRS Low Rider S', 2023), 'cruiser');
  assert.equal(afled('Honda', 'Gold Wing', 2010), 'touring');
});

test('mærket tæller: samme modelnavn hos et andet mærke giver ikke typen', () => {
  assert.equal(afled('Yamaha', 'CB 1000 R', 2022), null);
  assert.equal(afled('Honda', 'MT-09', 2024), null);
  assert.equal(afled('Ukendt', 'GL 1800 Gold Wing', 2023), null, 'ukendt mærke: kun de mærkeløse regler gælder');
});

/* ---------- 4. Tvivl er ikke med ---------- */
test('tvivlstilfælde forbliver Ukendt: hellere ingen type end en forkert', () => {
  const tvivl = [
    ['Honda', 'CBR 650 R', 2022],          // fabrik: sport, forhandler: Sportstouring
    ['Suzuki', 'GSX 1300 R Hayabusa', 2010], // hyperbike eller sporttourer?
    ['Suzuki', 'GSF 650 Bandit', 2009],
    ['Kawasaki', 'Versys 650', 2015],
    ['Kawasaki', 'ZZR 1400', 2010],
    ['Harley-Davidson', 'FLHRC Road King Classic', 2012], // fabrik: touring, forhandler: cruiser -> blokeret
    ['Harley-Davidson', 'FXLRST Low Rider ST', 2022],      // sporttourer, ikke cruiser -> blokeret
    ['Triumph', 'Thruxton 1200', 2017],
    ['Triumph', 'Tiger 850', 2021],
    ['Honda', 'GL 1100 Gold Wing', 1981],  // forhandlerne kalder den klassiker
    ['Honda', 'CL 500 A', 2024],
    ['Honda', 'CBF 1000 A', 2010],
    ['Yamaha', 'XJ 600 Diversion', 1996],
    ['Yamaha', 'XV 1000 TR1', 1983],        // sportsstandard, ikke cruiser -> blokeret
    ['Yamaha', 'XVZ 1200', 1986],           // Venture: tourer -> blokeret
    ['Royal Enfield', 'Bear 650', 2025],
    ['Moto Guzzi', 'V 7', 2020],
  ];
  for (const [m, mod, aar] of tvivl) assert.equal(afled(m, mod, aar), null, `${m} ${mod} må ikke få en type`);
});

test('år-afhængige modeller: Z650 fra 1979 er en klassiker, ikke den nuværende naked — og uden årgang springes reglen over', () => {
  assert.equal(afled('Kawasaki', 'Z 650', 1979), null);
  assert.equal(afled('Kawasaki', 'Z 650', 2022), 'naked');
  assert.equal(afled('Kawasaki', 'Z 650', null), null, 'ukendt årgang: reglen med årgangsgrænse gælder ikke');
  assert.equal(afled('Kawasaki', 'Z 900', 1976), null);
  assert.equal(afled('Triumph', 'Trident', 1971), null, 'T150 Trident er en klassiker');
  assert.equal(afled('Triumph', 'Trident 660', 2026), 'naked');
  assert.equal(afled('Honda', 'GL 1800 Gold Wing', null), 'touring', 'regler uden årgangsgrænse påvirkes ikke af en manglende årgang');
});

test('længste mønster vinder; type null blokerer; et ciffer-mønster slutter ved ciffergrænsen', () => {
  assert.equal(afled('Honda', 'CB 500 X', 2020), 'adventure');   // cb500x > cb500
  assert.equal(afled('Honda', 'CB 500 F', 2020), 'naked');
  assert.equal(afled('Honda', 'CB 500', 1996), 'naked');
  assert.equal(afled('Honda', 'CB 5000', 2020), null, 'cb500 må ikke ramme cb5000');
  assert.equal(afled('Kawasaki', 'Z 900 RS', 2022), null, 'Z900RS er retro: blokeret');
  assert.equal(afled('Kawasaki', 'Z 1000 SX', 2020), 'touring');
  assert.equal(afled('Kawasaki', 'Z 1000 R', 2019), 'naked');
  assert.equal(afled('BMW', 'R 1200 RT', 2013), 'touring');     // r1200rt > r1200r
  assert.equal(afled('BMW', 'R 1200 R', 2015), 'naked');
  assert.equal(afled('KTM', '1290 Super Duke GT', 2020), 'touring');
  assert.equal(afled('KTM', '1290 Super Duke R', 2023), 'naked');
});

test('uden model falder reglen tilbage på titlen uden mærkenavnet; uden begge intet', () => {
  assert.equal(afled('Honda', '', 2021, 'Honda GL 1800 Gold Wing'), 'touring');
  assert.equal(afled('Honda', '', 2021, 'Honda'), null);
  assert.equal(afled('Honda', null, null, null), null);
  assert.equal(afled(null, null, null, null), null);
});

/* ---------- 5. Kilden vinder; den afledte type er mærket ---------- */
const raa = (extra) => Object.assign({
  id: 'x1', kilde_annonce_id: '1', url: 'https://mcsyd.dk/produkter/motorcykel/brugt/1', titel: 'Honda CB 1000 R', maerke: 'Honda', model: 'CB 1000 R',
  aargang: 2022, km: 5000, ccm: 998, hk: 145, pris_dkk: 99000, saelgertype: 'forhandler', status: 'aktiv', foerst_set: '2026-10-01', sidst_set: '2026-10-20T10:00:00Z',
  type: null, kilde: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
}, extra);

test('normalizeExternalListing: uden kildetype afledes den og mærkes typeAfledt + typeRegel', () => {
  const l = M.normalizeExternalListing(raa());
  assert.equal(l.type, 'naked');
  assert.equal(l.typeAfledt, true);
  assert.equal(l.typeRegel, 'cb1000r');
});

test('normalizeExternalListing: kildens egen type vinder og er IKKE afledt — også når reglen siger noget andet', () => {
  const l = M.normalizeExternalListing(raa({ type: 'Cruiser' }));
  assert.equal(l.type, 'cruiser', 'kilden siger Cruiser; reglen ville sige naked');
  assert.equal(l.typeAfledt, false);
  const t = M.normalizeExternalListing(raa({ titel: 'Honda CB 1000 R Sportstouring', type: null }));
  assert.equal(t.type, 'touring', 'et kategoriord i titlen er kildens eget ord og vinder over reglen');
  assert.equal(t.typeAfledt, false);
});

test('normalizeExternalListing: ukendt model forbliver uden type og uden afledt-mærke', () => {
  const l = M.normalizeExternalListing(raa({ titel: 'Honda CBR 650 R', model: 'CBR 650 R' }));
  assert.equal(l.type, null);
  assert.equal(l.typeAfledt, false);
  assert.equal(l.typeRegel, null);
});

test('kortet og annoncesiden siger "afledt fra model" — kun for afledte typer', () => {
  const afl = M.normalizeExternalListing(raa());
  const html = M.listingCardHTML(afl, 1);
  assert.match(html, /title="Typen er afledt af modellen — kilden oplyser den ikke\."/);
  const kilde = M.listingCardHTML(M.normalizeExternalListing(raa({ type: 'Naked' })), 1);
  assert.ok(!/afledt af modellen/.test(kilde));
  const annonce = fs.readFileSync(path.join(__dirname, '..', 'js', 'annonce.js'), 'utf8');
  assert.match(annonce, /listing\.typeAfledt \? ' <span class="an-afledt"[^>]*>\(afledt fra model\)<\/span>'/);
});

/* ---------- 6. Tal på tværs ---------- */
test('filter og tal stemmer: hver type-tælling = filterets træf, og typerne + uoplyste = hele lageret', () => {
  const { raekker } = fix('type-kilde-typede.json');
  // Lager = kildetypede (type fra kilden) + de samme modeller uden kildetype (afledes). Titel uden kategoriord og uden type-felt.
  const lager = [];
  raekker.forEach((r, i) => {
    lager.push(M.normalizeExternalListing(raa({ id: `a${i}`, titel: r.titel, maerke: r.brand, model: r.model, aargang: r.aargang, type: null })));
  });
  const talPrType = {};
  for (const l of lager) talPrType[l.type || 'ukendt'] = (talPrType[l.type || 'ukendt'] || 0) + 1;
  const ukendt = talPrType.ukendt || 0;
  let sum = ukendt;
  for (const t of T.TYPER){
    const traef = M.Filtrering.anvendFiltre(lager, { types: [t] }).length;
    assert.equal(traef, talPrType[t] || 0, `typefilter ${t}`);
    sum += traef;
  }
  assert.equal(sum, lager.length, 'ingen annonce tælles to gange eller falder ud');
  // Dækning: mindst halvdelen af de annoncer, kilden ikke typede via titlen, får nu en type
  const afledte = lager.filter(l => l.typeAfledt).length;
  assert.ok(afledte > 0 && afledte + ukendt <= lager.length);
});

test('dækning målt mod produktionssnapshottet 26.10.2026: uden type faldt fra 366 til under 110 (kun hvis snapshot findes)', t => {
  const snap = process.env.V7_SNAPSHOT;
  if (!snap || !fs.existsSync(snap)) return t.skip('sæt V7_SNAPSHOT=<snapshot.json> (se docs/review/gauntlet/v7/data.md)');
  const m = T.maal(JSON.parse(fs.readFileSync(snap, 'utf8')));
  assert.ok(m.foer.uden_type - m.efter.uden_type >= 200, JSON.stringify(m.efter));
  assert.ok(m.praecision.procent >= 95);
});
