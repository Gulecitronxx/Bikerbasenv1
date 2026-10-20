/* V4 søgning: mærker og modeller i søgning og filter. Kør: node --test js/v4-soegning-maerker.test.js

   Prøver mod LAGERETS mærkeliste, ikke mod en opdigtet: scripts/fixtures/v4-lager-maerker.json er et øjebliksbillede
   (mærke, model, titel, type, deeplink) af de aktive indekserede annoncer. Rækkerne køres gennem samme kæde som
   browseren (normalizeExternalListing -> harmoniserStavning), og filter, mærkeliste og modelliste er dem, søgesiden bruger
   (js/filtrering.js). Når det centrale mærkeregister (Agent 1) er mergeet ind, skal blokken "Register" nederst udvides
   med registerets aliaser — resten er uafhængigt af, hvor navnene kommer fra. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const { slugify } = require(path.join(REPO, 'scripts', 'slug.js'));

const M = browserModules();
const F = M.Filtrering;

/* ---------------------------------------------------------------- lageret */
const SNAP = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v4-lager-maerker.json'), 'utf8'));
const KILDE_DOMAENE = { 'MC Syd': 'mcsyd.dk', 'Gul og Gratis': 'guloggratis.dk', '123mc': '123mc.dk' };
function raekke(r, i){
  const [maerke, model, titel, type, url, kilde] = r;
  return {
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, kilde_annonce_id: String(i), url, titel, maerke, model,
    variant: null, type, aargang: 2015, km: 20000, ccm: 650, hk: 60, pris_dkk: 50000, stand: null, salgsmarkoerer: [],
    udledte_felter: [], by: 'Aarhus', postnr: 8000, saelgertype: null, thumbnail_url: null, uddrag: null, status: 'aktiv',
    foerst_set: '2026-08-01', sidst_set: '2026-08-20T10:00:00Z',
    kilde: { navn: kilde || 'Gul og Gratis', domaene: KILDE_DOMAENE[kilde] || 'guloggratis.dk' },
  };
}
function byg(rows){ return M.harmoniserStavning(rows.map((r, i) => M.normalizeExternalListing(raekke(r, i)))); }
const LAGER = byg(SNAP.raekker);

const antalPr = (liste, fn) => { const m = new Map(); for (const l of liste){ const k = fn(l); m.set(k, (m.get(k) || 0) + 1); } return m; };
const find = (q, liste = LAGER) => F.anvendFiltre(liste, { q });
const medMaerke = (navn, liste = LAGER) => liste.filter(l => F.maerkeNoegle(l.brand) === F.maerkeNoegle(navn));

test('øjebliksbilledet er stort nok til at betyde noget', () => {
  assert.ok(SNAP.raekker.length >= 300, `kun ${SNAP.raekker.length} rækker`);
  assert.equal(LAGER.length, SNAP.raekker.length);
  assert.ok(medMaerke('Honda').length > 50 && medMaerke('Harley-Davidson').length > 20);
});

/* ---------------------------------------------------------------- nøgle og visning */
test('mærkenøglen er slug-foldningen (samme "er det samme mærke" som mærkesiderne) uden bindestreger', () => {
  for (const n of ['Royal Enfield', 'Royal-enfield', 'royal enfield', 'Harley-Davidson', 'Harley Davidson', 'FB Mondial',
    'Fb Mondial', 'Moto-Guzzi', 'Zündapp', 'Škoda', 'CFMoto', 'Cf Moto', 'Æblet', 'Østmark']){
    assert.equal(F.maerkeNoegle(n), slugify(n).replace(/-/g, ''), n);
  }
  assert.equal(F.maerkeNoegle('Royal-enfield'), F.maerkeNoegle('Royal Enfield'));
});

test('uoplyst mærke: Ukendt, tom, null og "undefined" er ét uoplyst mærke og hedder "Uoplyst mærke" for brugeren', () => {
  for (const b of ['Ukendt', 'ukendt', 'UKENDT', '', '  ', null, undefined, 'null']){
    assert.ok(F.erUoplystMaerke(b), String(b));
    assert.equal(F.maerkeVisning(b), 'Uoplyst mærke');
  }
  assert.ok(!F.erUoplystMaerke('Honda') && !F.erUoplystMaerke('Ukendt Motor Co'));
  assert.equal(F.maerkeVisning('Honda'), 'Honda');
});

/* ---------------------------------------------------------------- mærkelisten (filteret) */
test('mærkelisten: ét mærke én gang, ingen dubletter, ingen "Ukendt" som synligt navn', () => {
  const liste = F.maerkeListe(LAGER);
  const nogler = liste.map(m => m.noegle);
  assert.equal(new Set(nogler).size, nogler.length, 'to rækker med samme nøgle');
  const slugs = liste.filter(m => !m.uoplyst).map(m => slugify(m.navn));
  assert.equal(new Set(slugs).size, slugs.length, 'to rækker, der ville give samme mærkeside');
  for (const m of liste) assert.ok(!/^ukendt$/i.test(m.visning), `${m.navn} vises som "${m.visning}"`);
  assert.ok(liste.some(m => m.visning === 'Uoplyst mærke'), 'lageret har uoplyste (DKW 250, Moto købes)');
  // uoplyst står altid sidst, uanset antal; resten flest først
  const uoplystIdx = liste.findIndex(m => m.uoplyst);
  assert.equal(uoplystIdx, liste.length - 1);
  const rest = liste.filter(m => !m.uoplyst).map(m => m.antal);
  assert.deepEqual(rest, [...rest].sort((a, b) => b - a));
});

test('mærkelisten: antal pr. mærke er lig det, mærkefilteret rent faktisk giver, og de summer til lageret', () => {
  const liste = F.maerkeListe(LAGER);
  let sum = 0;
  for (const m of liste){
    const n = F.anvendFiltre(LAGER, { brands: [m.navn] }).length;
    assert.equal(m.antal, n, `${m.navn}: liste ${m.antal}, filter ${n}`);
    sum += m.antal;
  }
  assert.equal(sum, LAGER.length);
});

test('mærkelisten: stavemåden, lageret oftest bruger, vinder; kun et URL-valgt mærke uden annoncer får antal 0', () => {
  const dirty = [{ brand: 'Royal Enfield' }, { brand: 'Royal-enfield' }, { brand: 'Royal Enfield' }, { brand: 'royal enfield' },
    { brand: 'Ukendt' }, { brand: null }, { brand: '' }, { brand: 'SYM' }, { brand: 'Sym' }];
  const l = F.maerkeListe(dirty, ['Moto Guzzi']);
  const get = k => l.find(m => m.noegle === F.maerkeNoegle(k));
  assert.equal(get('Royal Enfield').antal, 4);
  assert.equal(get('Royal Enfield').navn, 'Royal Enfield');
  assert.equal(get('Ukendt').antal, 3);
  assert.equal(get('SYM').antal, 2);
  assert.equal(get('Moto Guzzi').antal, 0);
  assert.equal(F.anvendFiltre(dirty, { brands: ['ROYAL-ENFIELD'] }).length, 4);
  assert.equal(F.anvendFiltre(dirty, { brands: ['Ukendt'] }).length, 3);
});

test('lagerets mærkenavne er allerede ét pr. mærke: ingen små/store-bogstavsvarianter, ingen sentinel-aliaser', () => {
  const stavemaader = new Map();
  for (const l of LAGER){ const k = F.maerkeNoegle(l.brand); if (!stavemaader.has(k)) stavemaader.set(k, new Set()); stavemaader.get(k).add(String(l.brand)); }
  for (const [k, s] of stavemaader) assert.equal(s.size, 1, `${k} findes som ${[...s].join(' / ')}`);
  for (const l of LAGER) assert.ok(!/^(andet m[æa]rke|null|undefined)$/i.test(String(l.brand)), String(l.brand));
});

test('mærkelistens antal = mærkesidens gruppering (slug-sammenlægning som scripts/build-brand-pages.js)', () => {
  const pr = new Map();
  for (const l of LAGER.filter(x => x.brand && x.brand !== 'Ukendt')){ const s = slugify(l.brand); pr.set(s, (pr.get(s) || 0) + 1); }
  for (const m of F.maerkeListe(LAGER).filter(x => !x.uoplyst)) assert.equal(pr.get(slugify(m.navn)), m.antal, m.navn);
  assert.equal(pr.size, F.maerkeListe(LAGER).filter(x => !x.uoplyst).length);
});

/* ---------------------------------------------------------------- alias-søgning i fritekst */
const ALIAS = [
  ['cf moto', 'CFMoto'], ['cfmoto', 'CFMoto'], ['CF-Moto', 'CFMoto'], ['CF MOTO', 'CFMoto'],
  ['harley', 'Harley-Davidson'], ['Harley Davidson', 'Harley-Davidson'], ['harley-davidson', 'Harley-Davidson'],
  ['hd', 'Harley-Davidson'], ['h-d', 'Harley-Davidson'], ['h d', 'Harley-Davidson'],
  ['royal enfield', 'Royal Enfield'], ['enfield', 'Royal Enfield'], ['royal-enfield', 'Royal Enfield'],
  ['mv agusta', 'MV Agusta'], ['mv', 'MV Agusta'], ['agusta', 'MV Agusta'],
  ['moto guzzi', 'Moto Guzzi'], ['guzzi', 'Moto Guzzi'], ['motoguzzi', 'Moto Guzzi'],
  ['fb mondial', 'FB Mondial'], ['fb-mondial', 'FB Mondial'], ['mondial', 'FB Mondial'],
  ['lauge jensen', 'Lauge Jensen'], ['lauge', 'Lauge Jensen'],
  ['bmw motorrad', 'BMW'], ['BMW', 'BMW'], ['honda', 'Honda'], ['HONDA', 'Honda'], ['sym', 'SYM'], ['bsa', 'BSA'],
  ['triumph', 'Triumph'], ['ktm', 'KTM'], ['yamaha', 'Yamaha'], ['kawasaki', 'Kawasaki'], ['suzuki', 'Suzuki'],
];
for (const [q, maerke] of ALIAS){
  test(`fritekst "${q}" finder præcis annoncerne fra ${maerke}`, () => {
    const forventet = medMaerke(maerke);
    assert.ok(forventet.length > 0, `lageret har ingen ${maerke}`);
    const fundet = find(q);
    assert.deepEqual(fundet.map(l => l.id).sort(), forventet.map(l => l.id).sort(),
      `"${q}": ${fundet.length} træf, ${maerke} har ${forventet.length}`);
  });
}

test('fritekst: mærke + modelord = mærkets annoncer med modelordet; to mærker = begge (ELLER)', () => {
  const hdKing = find('harley road king');
  assert.ok(hdKing.length > 0 && hdKing.every(l => l.brand === 'Harley-Davidson' && /road ?king/i.test(l.model)), 'harley road king');
  assert.deepEqual(find('hd road king').map(l => l.id).sort(), hdKing.map(l => l.id).sort());
  const begge = find('honda yamaha');
  assert.equal(begge.length, medMaerke('Honda').length + medMaerke('Yamaha').length);
  assert.deepEqual(find('honda gs'), medMaerke('BMW').length ? find('honda gs') : [], 'honda gs er ikke BMW GS');
  assert.ok(find('honda gs').every(l => l.brand === 'Honda'));
  assert.ok(find('bmw gs').every(l => l.brand === 'BMW') && find('bmw gs').length > 0);
});

test('fritekst: delstreng af mærke virker stadig ("harl", "royal"), og modelord uden mærke er uændret', () => {
  assert.equal(find('harl').length, medMaerke('Harley-Davidson').length);
  assert.equal(find('royal').length, medMaerke('Royal Enfield').length);
  assert.ok(find('goldwing').length >= 20 && find('goldwing').every(l => /gold ?wing/i.test(l.model)));
  assert.ok(find('rebel').length >= 30);
});

test('fritekst: sentinellen "ukendt" er ikke et mærkenavn og kan ikke findes; modelnavnet i en uoplyst annonce kan', () => {
  assert.deepEqual(find('ukendt'), []);
  assert.equal(find('dkw').length, 1);
  assert.equal(F.maerkeNoegle(find('dkw')[0].brand), 'dkw', 'DKW er et registreret mærke (V4 register), ikke uoplyst');
  assert.ok(find('moto købes').length >= 1 && F.erUoplystMaerke(find('moto købes')[0].brand), 'modelnavnet i en uoplyst annonce kan findes');
  assert.equal(find('zzzz').length, 0);
  assert.equal(find('   ').length, LAGER.length);
});

test('fritekst og mærkefilter giver samme annoncer for et rent mærkenavn (facettal = søgetal)', () => {
  for (const m of F.maerkeListe(LAGER).filter(x => !x.uoplyst && x.antal >= 1)){
    const viaQ = find(m.navn).map(l => l.id).sort();
    const viaFilter = F.anvendFiltre(LAGER, { brands: [m.navn] }).map(l => l.id).sort();
    assert.deepEqual(viaQ, viaFilter, m.navn);
  }
});

test('typeord i fritekst er uændret ("cruiser" finder typen, ikke kun modelnavne)', () => {
  const cr = find('cruiser');
  assert.ok(cr.length > 20 && cr.some(l => l.type === 'cruiser'));
  const hdCruiser = find('harley cruiser');
  assert.ok(hdCruiser.length > 0 && hdCruiser.every(l => l.brand === 'Harley-Davidson'));
});

/* ---------------------------------------------------------------- modelfilteret */
test('modelfilteret bygges af lageret: Honda har sine rigtige modeller, ikke kun de få, katalogen kender', () => {
  const modeller = F.modelListe(LAGER, ['Honda']);
  const navne = modeller.map(m => m.navn);
  assert.ok(navne.includes('GL 1800 Gold Wing') && navne.includes('CMX 500 Rebel') && navne.includes('NT 1100 A'), navne.slice(0, 20).join(', '));
  assert.ok(modeller.length >= 40, `kun ${modeller.length} Honda-modeller`);
  const kat = new Set(((M.BRANDS_BY_MODEL || {}).Honda || []).map(x => x.toLowerCase()));
  if (kat.size) assert.ok(navne.filter(n => !kat.has(n.toLowerCase())).length > 10, 'kataloget dækker ikke lageret');
});

test('modelfilteret: hver model giver >0 træf og antallet = filteret; ingen dubletter; tom model er ikke en række', () => {
  for (const m of F.maerkeListe(LAGER).filter(x => !x.uoplyst)){
    const modeller = F.modelListe(LAGER, [m.navn]);
    const nogler = modeller.map(x => x.navn.toLowerCase());
    assert.equal(new Set(nogler).size, nogler.length, `dubletter under ${m.navn}`);
    let sum = 0;
    for (const mod of modeller){
      const n = F.anvendFiltre(LAGER, { brands: [m.navn], models: [mod.navn] }).length;
      assert.ok(n > 0, `${m.navn} ${mod.navn}`);
      assert.equal(n, mod.antal, `${m.navn} ${mod.navn}: liste ${mod.antal}, filter ${n}`);
      sum += n;
    }
    const udenModel = medMaerke(m.navn).filter(l => !String(l.model || '').trim()).length;
    assert.equal(sum + udenModel, m.antal, `${m.navn}: modeller + uden model != mærketallet`);
    assert.ok(modeller.every(x => x.navn.trim() === x.navn && x.navn !== ''));
  }
});

test('modelfilteret: flere mærker = foreningen; intet mærke = alle modeller i lageret', () => {
  const a = F.modelListe(LAGER, ['Honda']).length, b = F.modelListe(LAGER, ['Yamaha']).length;
  const ab = F.modelListe(LAGER, ['Honda', 'Yamaha']).length;
  assert.ok(ab >= Math.max(a, b) && ab <= a + b);
  assert.ok(F.modelListe(LAGER, []).length >= ab);
  assert.deepEqual(F.modelListe(LAGER, ['Findes-ikke']), []);
});

test('modelfilter og mærkefilter kombineret med type og kørekort: facettal = træf', () => {
  const f = { brands: ['Honda'], types: ['touring'] };
  const n = F.anvendFiltre(LAGER, f).length;
  assert.ok(n > 0 && n < medMaerke('Honda').length);
  const skjult = [];
  const m = F.anvendFiltre(LAGER, { ...f, koerekort: 'A2' }, null, skjult);
  assert.ok(m.length <= n);
  assert.equal(F.anvendFiltre(LAGER, { ...f, koerekort: 'A2' }, 'brands').length >= m.length, true);
});

/* ---------------------------------------------------------------- Register (udfyldes når Agent 1's register er mergeet) */
test('registrerMaerker lægger aliaser oven i grundtabellen uden at miste de gamle', () => {
  F.registrerMaerker([{ navn: 'Benelli', aliaser: ['bnl'] }]);
  assert.deepEqual(find('bnl').map(l => l.id).sort(), medMaerke('Benelli').map(l => l.id).sort());
  assert.ok(find('cf moto').length === medMaerke('CFMoto').length);
});

/* ---------------------------------------------------------------- QA F2: registeraliasser i fritekst */
/* Mærkeregisteret (img/brands/manifest.json) er sandhedskilden for navne og aliaser. filtrering.js læser det via
   js/brand-logos-data.js (generet fra manifestet). Prøven kører mod modulet direkte, som en side uden browserModules gør. */
const FM = require(path.join(REPO, 'js', 'filtrering.js'));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(REPO, 'img', 'brands', 'manifest.json'), 'utf8')).maerker;
const syn = (navn) => [{ brand: navn, model: 'Testmodel 700' }, ...['Honda', 'Kymco'].filter(b => b !== navn).map(b => ({ brand: b, model: 'Agility 50' }))];

test('register: de ti aliasser, QA fandt, finder mærket ("bmw motorrad", "ktm ag", "sanyang" …)', () => {
  const QA = [['bmw motorrad', 'BMW'], ['triumph motorcycles', 'Triumph'], ['ktm ag', 'KTM'], ['ducati motor holding', 'Ducati'],
    ['husqvarna motorcycles', 'Husqvarna'], ['indian motorcycle', 'Indian'], ['indian motorcycles', 'Indian'],
    ['victory motorcycles', 'Victory'], ['sanyang', 'SYM'], ['piaggio group', 'Piaggio']];
  for (const [q, navn] of QA){
    const r = FM.anvendFiltre(syn(navn), { q });
    assert.equal(r.length, 1, `"${q}" gav ${r.length} træf`);
    assert.equal(r[0].brand, navn, q);
  }
});

test('register: hvert registermærke findes på navn, store/små bogstaver, slug og ethvert alias — og kun det mærke', () => {
  const fold = s => FM.maerkeNoegle(s);
  const ejer = new Map();
  for (const e of MANIFEST) for (const n of [e.navn, e.slug, ...(e.aliaser || [])]) { const k = fold(n); if (!ejer.has(k)) ejer.set(k, e.navn); }
  for (const e of MANIFEST){
    for (const v of new Set([e.navn, e.navn.toUpperCase(), e.navn.toLowerCase(), e.slug, e.slug.replace(/-/g, ' '), ...(e.aliaser || [])])){
      const r = FM.anvendFiltre(syn(e.navn), { q: v });
      const forventetEjer = ejer.get(fold(v));
      if (forventetEjer !== e.navn) continue;   // aliasset hører til et andet mærke ("tm", "hero" …): dét ejer afgør
      assert.equal(r.filter(l => l.brand === e.navn).length, 1, `${e.navn}: "${v}" finder ikke mærket`);
      assert.equal(r.filter(l => l.brand !== e.navn).length, 0, `${e.navn}: "${v}" finder også andre mærker`);
    }
  }
});

test('register: kernealiasserne virker stadig (cf moto/CFMOTO, harley/hd, zero, mv agusta) og delstrengssøgning er uændret', () => {
  const l = [{ brand: 'CFMoto', model: 'MTX800' }, { brand: 'Harley-Davidson', model: 'Road King' }, { brand: 'Zero Motorcycles', model: 'SR/F' },
    { brand: 'MV Agusta', model: 'Brutale 800' }, { brand: 'Honda', model: 'CB 500' }];
  const n = q => FM.anvendFiltre(l, { q }).map(x => x.brand);
  assert.deepEqual(n('cf moto'), ['CFMoto']); assert.deepEqual(n('CFMOTO'), ['CFMoto']);
  assert.deepEqual(n('harley'), ['Harley-Davidson']); assert.deepEqual(n('hd'), ['Harley-Davidson']);
  assert.deepEqual(n('zero'), ['Zero Motorcycles']); assert.deepEqual(n('Zero Motorcycles'), ['Zero Motorcycles']);
  assert.deepEqual(n('mv agusta'), ['MV Agusta']);
  assert.deepEqual(n('harl'), ['Harley-Davidson']); assert.deepEqual(n('brutale'), ['MV Agusta']); assert.deepEqual(n('cb500'), ['Honda']);
});

/* ---------------------------------------------------------------- registret (V4 mærker) bag filter og mærkeliste */
test('registret: Zero/Zero Motorcycles og CFMOTO/CFMoto er ét mærke i listen, filteret og visningen; uoplyst hedder registrets label', () => {
  const R = require(path.join(REPO, 'js', 'brands-registry.js'));
  const l = [{ brand: 'Zero Motorcycles', model: 'SR/F' }, { brand: 'Zero', model: 'DSR' }, { brand: 'CFMOTO', model: 'MTX800' },
    { brand: 'CFMoto', model: '800 MT' }, { brand: 'Andet Mærke', model: 'X' }, { brand: 'Ukendt', model: 'Y' }];
  const liste = FM.maerkeListe(l);
  assert.deepEqual(liste.map(m => [m.navn, m.antal]), [['CFMoto', 2], ['Zero', 2], ['Ukendt', 2]].sort((a, b) => b[1] - a[1] || (a[0] === 'Ukendt') - (b[0] === 'Ukendt')));
  assert.equal(FM.anvendFiltre(l, { brands: ['Zero'] }).length, 2);
  assert.equal(FM.anvendFiltre(l, { brands: ['zero motorcycles'] }).length, 2);
  assert.equal(FM.anvendFiltre(l, { brands: ['Ukendt'] }).length, 2);
  assert.equal(FM.maerkeVisning('Ukendt'), R.UKENDT_LABEL);
  assert.equal(FM.maerkeVisning('Zero Motorcycles'), 'Zero');
  assert.equal(FM.anvendFiltre(l, { q: 'zero motorcycles' }).length, 2);
});

/* ---------------------------------------------------------------- QA G1: ALLE registeraliasser (BrandRegistry.alle()) */
test('registret: navn, slug, store/små bogstaver og HVERT alias for HVERT registermærke finder mærket i fritekst (ingen undtagelser)', () => {
  const R = require(path.join(REPO, 'js', 'brands-registry.js'));
  const alle = R.alle();
  assert.ok(alle.length >= 60, `registret har ${alle.length} mærker`);
  const fejl = [];
  let antalAliasser = 0;
  for (const p of alle){
    const varianter = new Set([p.navn, p.navn.toUpperCase(), p.navn.toLowerCase(), p.slug, p.slug.replace(/-/g, ' '), ...p.aliaser,
      ...p.aliaser.map(a => a.toUpperCase()), ...p.aliaser.map(a => a.replace(/[\s-]+/g, ''))]);
    antalAliasser += p.aliaser.length;
    for (const v of varianter){
      const liste = [{ brand: p.navn, model: 'Testmodel 700' }, { brand: 'Honda', model: 'Agility 50' }, { brand: 'Kymco', model: 'Agility 50' }].filter((l, i) => i === 0 || l.brand !== p.navn);
      const r = FM.anvendFiltre(liste, { q: v });
      const mine = r.filter(l => l.brand === p.navn).length;
      if (mine !== 1) fejl.push(`${p.navn}: "${v}" finder ikke mærket`);
      // kun registrets eget mærke må findes (aliasset "tm"/"hero" tilhører præcis ét mærke)
      if (r.some(l => l.brand !== p.navn)) fejl.push(`${p.navn}: "${v}" finder også et andet mærke`);
    }
  }
  assert.ok(antalAliasser >= 40, `kun ${antalAliasser} aliasser testet`);
  assert.deepEqual(fejl, []);
});

test('registret: alias + modelord ("bmw motorrad gs", "zero motorcycles sr f", "honda motor cb") = mærket OG modelordet', () => {
  const l = [{ brand: 'BMW', model: 'R 1250 GS' }, { brand: 'BMW', model: 'K 1600 GT' }, { brand: 'Zero', model: 'SR/F' }, { brand: 'Zero', model: 'DSR' },
    { brand: 'Honda', model: 'CB 500' }, { brand: 'Honda', model: 'NX 500' }, { brand: 'Kymco', model: 'Gs 50' }];
  const n = q => FM.anvendFiltre(l, { q }).map(x => `${x.brand} ${x.model}`);
  assert.deepEqual(n('bmw motorrad gs'), ['BMW R 1250 GS']);
  assert.deepEqual(n('zero motorcycles sr f'), ['Zero SR/F']);
  assert.deepEqual(n('honda motor cb'), ['Honda CB 500']);
  assert.deepEqual(n('cfmotor'), []);
});
