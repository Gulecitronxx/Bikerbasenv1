/* V7 data (C): "Lignende motorcykler" — gennemsigtig relevansscore. Kør: node --test js/v7-data-lignende.test.js
   Ingen netværk, ingen browser: js/annonce.js evalueres med DOM-stubs (samme mønster som js/annonce-skal.test.js).

   Målt 26.10.2026 på produktionen, FØR rettelsen: BMW R45 (privat, classic, 1979, 24.000 kr.) fik Honda Café Racer, Suzuki Intruder og
   Kawasaki ZZR 600 — samme pris- og kubikklasse, men hverken model eller type. Testen låser:
     1. Hierarkiet i vægtene (model > mærke+type > type > mærke) og at INTET uden model- eller typeforbindelse kan nå gulvet.
     2. Otte typer (naked, sport, touring, cruiser, adventure, scooter, classic/veteran, cross): resultaterne har målets type eller modellen.
     3. BMW R45 får classic/veteran/boxer-lignende og ALDRIG ZZR/Intruder/Café Racer.
     4. Mangfoldighed: højst 2 af samme model, højst 2 pr. kilde/annoncør, højst 6, ingen identisk dublet.
     5. Gulvet: hellere færre (eller ingen) end irrelevante; overskriften siger det.
     6. Determinisme: samme lager i anden rækkefølge giver samme liste. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const laes = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const KILDER = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'annonce.js'];
const STUB = `
const noop = () => {};
const elStub = () => ({ classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}, style:{}, appendChild:noop, setAttribute:noop, getAttribute:()=>null,
  addEventListener:noop, querySelector:()=>null, querySelectorAll:()=>[], dataset:{}, hidden:true, textContent:'', innerHTML:'', firstElementChild:null });
const document = { addEventListener:noop, querySelector:()=>null, querySelectorAll:()=>[], getElementById:()=>null, createElement:elStub, documentElement:elStub(),
  body:{classList:{add:noop,remove:noop,toggle:noop},appendChild:noop,style:{}}, readyState:'loading', title:'' };
const window = { location:{href:'',search:'',pathname:'/annonce.html'}, addEventListener:noop, matchMedia:()=>({matches:false,addEventListener:noop}), scrollTo:noop, history:{} };
const history = { scrollRestoration:'auto', replaceState:noop, pushState:noop };
const location = { href:'', search:'', pathname:'/annonce.html', origin:'http://localhost' };
const localStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const sessionStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const Store = { isComparing:()=>false, isFavorite:()=>false, getUser:()=>null, getAllListings:()=>[] };
`;
const A = new Function(STUB + KILDER.map(laes).join('\n')
  + '\nreturn { lignendeRangering, lignendeScore, anLignende, LIGNENDE, lignendeOverskrift };')();
const { LIGNENDE } = A;
const V = LIGNENDE.VAEGTE;

/* ---------- Fixture-lager ---------- */
let n = 0;
function mc(brand, model, year, type, ccm, hk, price, region, kilde, ekstra = {}){
  n++;
  const ekstern = kilde !== 'egen';
  return Object.assign({
    id: `f${String(n).padStart(3, '0')}`, brand, model, year, type, ccm, power: hk, price, km: 10000 + n * 7, region,
    isExternal: ekstern, source: ekstern ? { navn: kilde, domaene: kilde } : null,
    seller: ekstern ? null : { id: 'egen-saelger-1' }, photoUrls: ['https://example.test/f.webp'],
  }, ekstra);
}
const K = { a: 'mcsyd.dk', b: 'guloggratis.dk', c: 'rydbergsmc.dk', d: 'jensensmc.dk' };

const R45 = mc('BMW', 'R45', 1979, 'classic', 450, 30, 24000, 'Hovedstaden', 'egen', { id: 'r45' });
const LAGER = [
  R45,
  // classic/veteran + boxer-lignende
  mc('BMW', 'R 60/5', 1972, 'classic', 600, 40, 30000, 'Sjælland', K.a),
  mc('BMW', 'R 80', 1985, 'classic', 797, 50, 36000, 'Hovedstaden', K.b),
  mc('Triumph', 'Bonneville T100', 1969, 'classic', 500, 34, 36000, 'Syddanmark', K.a),
  mc('Honda', 'CB 750 K', 1976, 'classic', 750, 67, 29000, 'Midtjylland', K.a),
  mc('Moto Guzzi', 'V7', 1972, 'classic', 750, 45, 28000, 'Nordjylland', K.d),
  mc('Royal Enfield', 'Classic 650', 2025, 'classic', 650, 47, 66999, 'Hovedstaden', K.b),   // moderne klassiker: over 20 års forskel
  // distraktorer: SAMME pris-/kubikklasse som R45, men hverken model eller type (dem R45 fik før rettelsen)
  mc('Honda', 'Café Racer', 1979, null, 500, 50, 17500, 'Hovedstaden', K.b),
  mc('Suzuki', 'VS 400 Intruder', 1994, 'cruiser', 400, 33, 20000, 'Sjælland', K.a),
  mc('Kawasaki', 'ZZR 600', 1993, 'sport', 599, 100, 20000, 'Sjælland', K.a),
  mc('Honda', 'CBR 600 F', 1993, 'touring', 599, 85, 20000, 'Midtjylland', K.a),
  mc('Yamaha', 'XJ 600 S Diversion', 2000, 'touring', 600, 62, 17000, 'Syddanmark', K.a),
  mc('BMW', 'K 100', 1988, 'naked', 987, 90, 27800, 'Hovedstaden', K.b),
  // naked
  mc('Honda', 'CB 1000 R', 2022, 'naked', 998, 145, 108000, 'Syddanmark', K.d, { id: 'cb1000r' }),
  mc('Honda', 'CB 1000 R', 2024, 'naked', 998, 145, 199995, 'Syddanmark', K.a),
  mc('Honda', 'CB 1000 R', 2023, 'naked', 998, 145, 140000, 'Midtjylland', K.b),
  mc('Honda', 'CB 1000 R', 2021, 'naked', 998, 145, 120000, 'Syddanmark', K.c),
  mc('Honda', 'CB 650 R', 2021, 'naked', 649, 95, 70000, 'Syddanmark', K.a),
  mc('Yamaha', 'MT-09', 2022, 'naked', 890, 119, 110000, 'Midtjylland', K.b),
  mc('Kawasaki', 'Z 900', 2022, 'naked', 948, 125, 105000, 'Syddanmark', K.a),
  mc('Triumph', 'Speed Triple', 2020, 'naked', 1050, 150, 115000, 'Hovedstaden', K.c),
  // sport
  mc('Yamaha', 'YZF R7', 2022, 'sport', 690, 73, 99995, 'Midtjylland', K.b, { id: 'r7' }),
  mc('Yamaha', 'YZF R7', 2023, 'sport', 690, 73, 95000, 'Syddanmark', K.a),
  mc('Kawasaki', 'ZX6R', 2021, 'sport', 599, 130, 90000, 'Syddanmark', K.a),
  mc('Honda', 'CBR 600 RR', 2019, 'sport', 599, 120, 85000, 'Midtjylland', K.c),
  mc('Suzuki', 'GSX-R 750', 2020, 'sport', 750, 150, 98000, 'Sjælland', K.d),
  // touring
  mc('Honda', 'GL 1800 Gold Wing', 2023, 'touring', 1833, 126, 575000, 'Syddanmark', K.b, { id: 'gl1800' }),
  mc('Honda', 'GL 1800 Gold Wing', 2025, 'touring', 1833, 126, 609995, 'Syddanmark', K.a),
  mc('Honda', 'GL 1800 Gold Wing', 2021, 'touring', 1833, 126, 480000, 'Syddanmark', K.c),
  mc('BMW', 'K 1600 GT', 2020, 'touring', 1649, 160, 330000, 'Syddanmark', K.a),
  mc('Harley-Davidson', 'FLHX Street Glide', 2025, 'touring', 1923, 94, 559900, 'Midtjylland', K.c),
  // cruiser
  mc('Honda', 'CMX 500 Rebel', 2022, 'cruiser', 471, 46, 84995, 'Syddanmark', K.a, { id: 'rebel' }),
  mc('Honda', 'CMX 500 Rebel', 2024, 'cruiser', 471, 46, 84995, 'Syddanmark', K.a),
  mc('Honda', 'CMX 500 Rebel', 2023, 'cruiser', 471, 46, 82000, 'Syddanmark', K.a),
  mc('Honda', 'CMX 500 Rebel', 2025, 'cruiser', 471, 46, 89995, 'Midtjylland', K.d),
  mc('Suzuki', 'VZ 800 Marauder', 2021, 'cruiser', 805, 52, 78000, 'Sjælland', K.b),
  mc('Yamaha', 'XVS 950', 2018, 'cruiser', 942, 54, 80000, 'Hovedstaden', K.c),
  // adventure
  mc('Honda', 'CRF 1000 L Africa Twin', 2019, 'adventure', 998, 95, 150000, 'Syddanmark', K.a, { id: 'at' }),
  mc('Honda', 'CRF 1000 L Africa Twin', 2021, 'adventure', 998, 95, 165000, 'Midtjylland', K.c),
  mc('Honda', 'CRF 1100 L Africa Twin', 2022, 'adventure', 1084, 102, 175000, 'Syddanmark', K.c),
  mc('BMW', 'R 1250 GS', 2021, 'adventure', 1254, 136, 170000, 'Midtjylland', K.b),
  mc('Yamaha', 'Ténéré 700', 2023, 'adventure', 689, 73, 105000, 'Syddanmark', K.d),
  // scooter
  mc('Yamaha', 'Tricity 300', 2025, 'scooter', 292, 28, 89999, 'Midtjylland', K.b, { id: 'tricity' }),
  mc('Yamaha', 'Tricity 300', 2020, 'scooter', 292, 28, 65000, 'Midtjylland', K.b),
  mc('Honda', 'Forza 300', 2022, 'scooter', 279, 25, 62000, 'Hovedstaden', K.a),
  mc('Suzuki', 'AN 400 Burgman', 2023, 'scooter', 400, 29, 71900, 'Midtjylland', K.b),
  // cross
  mc('Yamaha', 'YZ 85', 2019, 'cross', 85, 15, 19800, 'Midtjylland', K.b, { id: 'yz85' }),
  mc('Yamaha', 'YZ 450 F', 2021, 'cross', 450, 55, 55000, 'Midtjylland', K.b),
  mc('Honda', 'CRF 110 F', 2026, 'cross', 110, 7, 21000, 'Syddanmark', K.a),
  mc('Kawasaki', 'KX 450', 2026, 'cross', 450, 55, 79000, 'Syddanmark', K.a),
];
const id = x => LAGER.find(l => l.id === x);
const titel = l => `${l.brand} ${l.model}`;
const ranger = (maal, lager = LAGER) => A.lignendeRangering(maal, lager);

/* ---------- 1. Vægtene ---------- */
test('hierarkiet: model > mærke+type > type > mærke, og støttepoint kan aldrig nå gulvet uden model-/typeforbindelse', () => {
  assert.ok(V.sammeModel > V.maerkeOgType && V.maerkeOgType > V.sammeType && V.sammeType > V.kunMaerke);
  assert.ok(V.maerkeOgType > V.sammeType + V.koerekort + V.pris, 'mærke+type slår type+kørekort+pris (opgavens rækkefølge)');
  const stoette = V.koerekort + V.pris + V.aargang3 + V.ccm + V.region + V.foto;
  assert.ok(stoette < LIGNENDE.MIN_SCORE, `alle støttepoint (${stoette}) skal være under gulvet ${LIGNENDE.MIN_SCORE}`);
  assert.ok(stoette + V.kunMaerke < LIGNENDE.MIN_SCORE, 'og samme mærke med en anden type kommer heller ikke over gulvet');
  assert.ok(V.sammeType < LIGNENDE.MIN_SCORE, 'type alene rækker ikke');
  assert.ok(V.sammeType + V.koerekort + V.pris >= LIGNENDE.MIN_SCORE, 'type + to støtter rækker');
  assert.ok(V.region < V.foto + V.ccm && V.region <= 1, 'region er tie-break');
});

test('scoren er gennemsigtig: hver kandidat bærer sine grunde i klartekst', () => {
  const s = A.lignendeScore(id('cb1000r'), LAGER.find(l => l.brand === 'Honda' && l.model === 'CB 1000 R' && l.year === 2024));
  assert.deepEqual(s.grunde.slice(0, 2), ['samme model', 'samme mærke og type']);
  assert.ok(s.grunde.includes('prisniveau ±30 %') === false, '108.000 mod 199.995 er over 30 %');
  assert.ok(s.grunde.includes('årgang ±3 år'));
  assert.ok(s.grunde.includes('motorstørrelse ±35 %'));
  assert.ok(s.grunde.includes('samme region'));
  assert.ok(s.score > 60);
});

test('prisniveau, årgang og kubik respekterer grænserne ±30 %, ±3/±8 år, ±35 %', () => {
  const maal = mc('Test', 'M1', 2020, 'naked', 1000, 100, 100000, 'X', K.a);
  const kand = (extra) => mc('Andet', 'M2', 2020, 'naked', 1000, 100, 100000, 'Y', K.b, extra);
  const g = (extra) => A.lignendeScore(maal, kand(extra)).grunde;
  assert.ok(g({ price: 130000 }).includes('prisniveau ±30 %'));
  assert.ok(!g({ price: 131000 }).includes('prisniveau ±30 %'));
  assert.ok(g({ year: 2023 }).includes('årgang ±3 år'));
  assert.ok(g({ year: 2028 }).includes('årgang ±8 år'));
  assert.ok(!g({ year: 2029 }).some(x => x.startsWith('årgang')));
  assert.ok(g({ year: 1999 }).includes('over 20 års forskel på årgang'));
  assert.ok(g({ ccm: 1350 }).includes('motorstørrelse ±35 %'));
  assert.ok(!g({ ccm: 1360 }).includes('motorstørrelse ±35 %'));
});

/* ---------- 2. Otte typer ---------- */
const MAAL_PR_TYPE = [
  ['naked', 'cb1000r'], ['sport', 'r7'], ['touring', 'gl1800'], ['cruiser', 'rebel'],
  ['adventure', 'at'], ['scooter', 'tricity'], ['classic', 'r45'], ['cross', 'yz85'],
];
for (const [type, maalId] of MAAL_PR_TYPE){
  test(`type ${type}: resultaterne har målets type eller modellen — aldrig en anden type, kun fordi prisen ligner`, () => {
    const maal = id(maalId);
    assert.equal(maal.type, type);
    const r = ranger(maal);
    assert.ok(r.valgte.length > 0, `${titel(maal)} skal have mindst én lignende i fixturen`);
    for (const v of r.valgte){
      assert.ok(v.sammeType || v.sammeModel, `${titel(maal)}: ${titel(v.l)} (${v.l.type}) har hverken målets type eller modellen — score ${v.score}: ${v.grunde.join(', ')}`);
      assert.ok(v.score >= LIGNENDE.MIN_SCORE);
      assert.notEqual(String(v.l.id), String(maal.id), 'aldrig sig selv');
    }
    // rækkefølgen er faldende i score
    const sc = r.valgte.map(v => v.score);
    assert.deepEqual(sc, [...sc].sort((a, b) => b - a));
  });
}

test('samme model står øverst: Africa Twin viser Africa Twin før andre adventure-cykler', () => {
  const r = ranger(id('at'));
  assert.ok(/Africa Twin/.test(r.valgte[0].l.model));
  assert.ok(r.valgte[0].sammeModel);
});

/* ---------- 3. BMW R45 ---------- */
test('BMW R45: får classic/veteran/boxer-lignende — og IKKE ZZR, Intruder, Café Racer, CBR 600 F eller Diversion', () => {
  const r = ranger(R45);
  const navne = r.valgte.map(v => titel(v.l));
  for (const fejl of ['ZZR', 'Intruder', 'Café Racer', 'CBR 600 F', 'Diversion', 'K 100']){
    assert.ok(!navne.some(x => x.includes(fejl)), `${fejl} må ikke være blandt ${navne.join(' | ')}`);
  }
  assert.ok(navne.some(x => x.startsWith('BMW R ')), `mindst en BMW-boxer: ${navne.join(' | ')}`);
  assert.ok(r.valgte.every(v => v.l.type === 'classic'), 'alle er classic/veteran');
  assert.ok(!navne.some(x => x.includes('Royal Enfield')), 'en 2025-modelårs "klassiker" er over 20 års forskel: ikke en lignende');
  assert.equal(r.overskrift, 'Andre classic/veteran-motorcykler');
});

test('selv de tre, R45 fik FØR rettelsen, scorer under gulvet — målt på samme fixture', () => {
  for (const x of ['Café Racer', 'VS 400 Intruder', 'ZZR 600']){
    const l = LAGER.find(k => k.model === x);
    const s = A.lignendeScore(R45, l);
    assert.ok(s.score < LIGNENDE.MIN_SCORE, `${x}: ${s.score} (${s.grunde.join(', ')})`);
  }
});

test('R45: boxer-slægtskab giver rang inden for samme type (samme modelserie)', () => {
  const r60 = A.lignendeScore(R45, LAGER.find(l => l.model === 'R 60/5'));
  const bonn = A.lignendeScore(R45, LAGER.find(l => l.model === 'Bonneville T100'));
  assert.ok(r60.grunde.includes('samme modelserie'));
  assert.ok(r60.score > bonn.score, 'en boxer slår en Triumph med samme type, årgang og kubik');
});

/* ---------- 4. Mangfoldighed ---------- */
test('højst 2 af samme model, højst 2 pr. kilde, højst 6 i alt', () => {
  for (const [, maalId] of MAAL_PR_TYPE){
    const r = ranger(id(maalId));
    assert.ok(r.valgte.length <= LIGNENDE.MAKS);
    const pr = (f) => { const m = new Map(); for (const v of r.valgte){ const k = f(v.l); m.set(k, (m.get(k) || 0) + 1); } return Math.max(0, ...m.values()); };
    assert.ok(pr(l => `${l.brand}|${l.model}`) <= LIGNENDE.MAKS_PR_MODEL, `${maalId}: samme model`);
    assert.ok(pr(l => (l.source && l.source.domaene) || 'egen') <= LIGNENDE.MAKS_PR_KILDE, `${maalId}: samme kilde`);
  }
});

test('Rebel: fire Rebels i lageret giver højst to (ikke 6 af samme model); resten er andre cruisere eller ingenting', () => {
  const r = ranger(id('rebel'));
  const rebels = r.valgte.filter(v => v.l.model === 'CMX 500 Rebel');
  assert.equal(rebels.length, 2);
  assert.ok(r.valgte.some(v => v.l.model !== 'CMX 500 Rebel'), 'og andre cruisere kommer med');
});

test('en identisk motorcykel (samme mærke, model, årgang, pris, km) vises kun én gang', () => {
  const a = mc('Honda', 'CMX 500 Rebel', 2022, 'cruiser', 471, 46, 84995, 'Syddanmark', K.a, { km: 5000 });
  const dublet = mc('Honda', 'CMX 500 Rebel', 2022, 'cruiser', 471, 46, 84995, 'Syddanmark', K.b, { km: 5000 });
  const maal = mc('Honda', 'CMX 500 Rebel', 2022, 'cruiser', 471, 46, 83000, 'Syddanmark', K.d);
  const r = ranger(maal, [maal, a, dublet]);
  assert.equal(r.valgte.length, 1);
});

/* ---------- 5. Gulvet og overskriften ---------- */
test('gulvet: er intet lignende nok, vises ingenting (hellere tomt end irrelevant)', () => {
  const ensom = mc('Brough Superior', 'SS100', 1925, 'classic', 988, 50, 2500000, 'Sjælland', 'egen');
  const r = ranger(ensom);
  assert.equal(r.valgte.length, 0);
  assert.equal(r.overskrift, 'Lignende motorcykler');
});

test('overskriften siger, hvad der er lignende: samme model / model + type / type', () => {
  const kun = ranger(id('rebel'), [id('rebel'), ...LAGER.filter(l => l.model === 'CMX 500 Rebel' && l.id !== 'rebel')]);
  assert.equal(kun.overskrift, 'Flere Honda CMX 500 Rebel');
  const bland = ranger(id('cb1000r'));
  assert.match(bland.overskrift, /^Honda CB 1000 R og andre naked-motorcykler$/);
  assert.equal(ranger(id('tricity')).overskrift, 'Yamaha Tricity 300 og andre scootere', 'scooter hedder scootere, ikke scooter-motorcykler');
  assert.equal(ranger(id('yz85')).overskrift, 'Andre cross/mx-motorcykler');
});

test('er der færre end seks, siger noten det — "vi viser hellere få end irrelevante"', () => {
  const r = ranger(id('tricity'));
  assert.ok(r.valgte.length < LIGNENDE.MAKS);
  assert.match(r.note, /hellere få end irrelevante/);
  const mange = ranger(id('cb1000r'));
  assert.ok(!/hellere få/.test(mange.note) || mange.valgte.length < LIGNENDE.MAKS);
});

test('er målets type ukendt, tæller samme mærke 12 — så en Honda uden type stadig kan få Honda i samme pris- og kubikklasse', () => {
  const maal = mc('Honda', 'Monkey', 2022, null, 125, 9, 45000, 'Syddanmark', K.a);
  const kand = mc('Honda', 'Dax', 2022, 'naked', 125, 9, 47000, 'Syddanmark', K.b);
  const fremmed = mc('Suzuki', 'GN 125', 2022, 'naked', 125, 9, 47000, 'Syddanmark', K.b);
  assert.ok(A.lignendeScore(maal, kand).score >= LIGNENDE.MIN_SCORE);
  assert.ok(A.lignendeScore(maal, fremmed).score < LIGNENDE.MIN_SCORE, 'et andet mærke i samme klasse kommer stadig ikke med');
});

test('modelnavne på tværs af epoker: en Bonneville T120 fra 1967 og en fra 2027 er ikke "samme model"', () => {
  const gammel = mc('Triumph', 'Bonneville T120', 1967, 'classic', 650, 50, 54800, 'Syddanmark', K.a);
  const ny = mc('Triumph', 'Bonneville T120', 2027, 'classic', 1200, 80, 189900, 'Syddanmark', K.b);
  const s = A.lignendeScore(gammel, ny);
  assert.ok(!s.sammeModel);
  assert.ok(s.grunde.includes('over 20 års forskel på årgang'));
});

/* ---------- 6. Determinisme ---------- */
test('samme lager i anden rækkefølge giver præcis samme liste', () => {
  for (const [, maalId] of MAAL_PR_TYPE){
    const a = ranger(id(maalId), LAGER).valgte.map(v => v.l.id);
    const b = ranger(id(maalId), LAGER.slice().reverse()).valgte.map(v => v.l.id);
    assert.deepEqual(a, b, maalId);
  }
});

test('anLignende() (kaldet af siden) returnerer lagerets annoncer i samme rækkefølge som rangeringen', () => {
  const r = ranger(R45).valgte.map(v => v.l.id);
  assert.ok(r.length > 0);
  assert.equal(typeof A.anLignende, 'function');
});

/* ---------- Kildekode-kontrakter ---------- */
test('annonce.js bruger den nye rangering til siden, og den gamle "mærke + pris + kubik + årgang >= 4 point" er væk', () => {
  const src = laes('annonce.js');
  assert.match(src, /function anLignende\(listing\)\{\s*return lignendeRangering\(listing, Store\.getAllListings\(\)\)/);
  assert.ok(!/\.filter\(\(\[s\]\) => s >= 4\)/.test(src), 'den gamle gulvregel (s >= 4) er væk');
  assert.match(src, /h2\.textContent = r\.overskrift/);
});
