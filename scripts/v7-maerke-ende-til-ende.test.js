/* V7 mærke: mærker ende til ende (registret -> lageret -> filter/søgning -> mærkeside/oversigt -> logo -> opret-annonce).
   Dækker: (1) stavemåder af mærket direkte i lagerets rå brand-felt, (2) hvert registreret mærke kan bruges overalt, (3) ÉN registerpost er nok
   (bevis med injiceret post), (4) modelnavne og ukendte navne bliver aldrig mærker, (5) mærker uden annoncer og historiske mærker.
   Kør: node --test scripts/v7-maerke-ende-til-ende.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const BR = require(path.join(REPO, 'js', 'brands-registry.js'));
const BL = require(path.join(REPO, 'js', 'brand-logos.js'));
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const M = browserModules();
const F = M.Filtrering;

const raa = (i, maerke, model, titel, o = {}) => ({
  id: `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`, kilde_annonce_id: String(i), url: o.url || `https://eksempel.test/a/${i}`, titel: titel || `${maerke} ${model}`, maerke, model,
  variant: null, type: null, aargang: 2015, km: 20000, ccm: 650, hk: null, pris_dkk: 40000 + i, stand: null, salgsmarkoerer: [], udledte_felter: [], by: null, postnr: 8000,
  saelgertype: null, thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-10-01', sidst_set: '2026-10-20T10:00:00Z', kilde: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' },
});
const lager = rows => M.markerTvaerkildeDubletter(rows.map(M.normalizeExternalListing)).beholdt;

test('(1) stavemåder i lagerets rå brand-felt ender på ét kanonisk mærke, ét filter, ét logo og én slug', () => {
  const T = [
    ['Harley Davidson', 'Harley-Davidson'], ['Harley-Davidson', 'Harley-Davidson'], ['harley davidson', 'Harley-Davidson'], ['HARLEY-DAVIDSON', 'Harley-Davidson'], ['Harley', 'Harley-Davidson'], ['HD', 'Harley-Davidson'], ['H-D', 'Harley-Davidson'],
    ['Moto-Guzzi', 'Moto Guzzi'], ['Moto Guzzi', 'Moto Guzzi'], ['MOTO GUZZI', 'Moto Guzzi'], ['Motoguzzi', 'Moto Guzzi'],
    ['Mv Agusta', 'MV Agusta'], ['MV AGUSTA', 'MV Agusta'], ['Mv-agusta', 'MV Agusta'], ['MVAgusta', 'MV Agusta'],
    ['GAS GAS', 'GasGas'], ['Gas Gas', 'GasGas'], ['Gas-gas', 'GasGas'], ['GASGAS', 'GasGas'],
    ['Cf moto', 'CFMoto'], ['CF MOTO', 'CFMoto'], ['CF-Moto', 'CFMoto'], ['CFMOTO', 'CFMoto'], ['Cfmoto', 'CFMoto'],
    ['Royal-enfield', 'Royal Enfield'], ['Royal Enfield', 'Royal Enfield'], ['ROYAL ENFIELD', 'Royal Enfield'],
    ['Fb Mondial', 'FB Mondial'], ['FB-Mondial', 'FB Mondial'], ['F.B. Mondial', 'FB Mondial'], ['Mondial', 'FB Mondial'],
    ['Bsa', 'BSA'], ['Sym', 'SYM'], ['Ktm', 'KTM'], ['Bmw', 'BMW'], ['bmw motorrad', 'BMW'], ['Lauge', 'Lauge Jensen'],
    ['Can Am', 'Can-Am'], ['Sur Ron', 'Sur-Ron'], ['Qj Motor', 'QJMotor'], ['Hero', 'Hero MotoCorp'], ['Zero Motorcycles', 'Zero'], ['Mz', 'MZ'], ['Zundapp', 'Zündapp'],
    ['  Honda  ', 'Honda'], ['honda', 'Honda'], ['HONDA', 'Honda'], ['Triumph Motorcycles', 'Triumph'],
  ];
  const fejl = [];
  T.forEach(([rawBrand, kanonisk], i) => {
    const l = M.normalizeExternalListing(raa(i + 1, rawBrand, 'Testmodel 1'));
    if (l.brand !== kanonisk) fejl.push(`${JSON.stringify(rawBrand)} -> ${l.brand} (forventet ${kanonisk})`);
    if (BL.logoFor(rawBrand).slug !== BL.logoFor(kanonisk).slug) fejl.push(`logo: ${rawBrand} -> ${BL.logoFor(rawBrand).slug}, ${kanonisk} -> ${BL.logoFor(kanonisk).slug}`);
    if (BR.slug(rawBrand) !== BR.slug(kanonisk)) fejl.push(`slug: ${rawBrand}`);
  });
  assert.deepStrictEqual(fejl, []);
  // Alle stavemåder af ét mærke bliver ÉN række i mærkelisten, med samme antal som mærkefilteret.
  const rows = T.map(([b], i) => raa(100 + i, b, 'Testmodel ' + i));
  const L = lager(rows);
  const liste = F.maerkeListe(L);
  assert.strictEqual(new Set(liste.map(m => m.noegle)).size, liste.length, 'ingen dublet-rækker');
  assert.strictEqual(liste.reduce((s, m) => s + m.antal, 0), L.length);
  for (const k of new Set(T.map(t => t[1]))) assert.strictEqual(liste.filter(m => m.navn === k).length, 1, k);
  assert.strictEqual(F.anvendFiltre(L, { brands: ['Harley Davidson'] }).length, T.filter(t => t[1] === 'Harley-Davidson').length);
  assert.strictEqual(F.anvendFiltre(L, { q: 'moto-guzzi' }).length, T.filter(t => t[1] === 'Moto Guzzi').length);
});

test('(2) hvert registreret mærke kan bruges overalt: valg i opret-annonce, rå brand, filter, søgning, slug, logo', () => {
  const alle = BR.alle();
  assert.ok(alle.length >= 105);
  const valg = new Set(BR.valgbare());
  const fejl = [];
  alle.forEach((p, i) => {
    if (!valg.has(p.navn)) fejl.push(`${p.navn}: ikke valgbar i opret-annonce`);
    if (BR.normalise(p.navn) !== p.navn) fejl.push(`${p.navn}: normalise`);
    if (BR.fraSlug(p.slug)?.navn !== p.navn) fejl.push(`${p.navn}: fraSlug`);
    const l = M.normalizeExternalListing(raa(i + 1, p.navn, 'Testmodel 1'));
    if (l.brand !== p.navn) fejl.push(`${p.navn}: bro-annonce brand=${l.brand}`);
    const logo = BL.logoFor(p.navn);
    if (logo.navn !== p.navn) fejl.push(`${p.navn}: logo-navn ${logo.navn}`);
    if (!/\bbl\b/.test(BL.logoHTML(p.navn, { storrelse: 'md' }))) fejl.push(`${p.navn}: ingen logomarkup`);
    const L = [l];
    if (F.anvendFiltre(L, { brands: [p.navn] }).length !== 1) fejl.push(`${p.navn}: mærkefilter`);
    if (F.anvendFiltre(L, { q: p.navn }).length !== 1) fejl.push(`${p.navn}: fritekst`);
    for (const a of p.aliaser) if (F.anvendFiltre(L, { q: a }).length !== 1) fejl.push(`${p.navn}: alias "${a}" finder ikke`);
    const liste = F.maerkeListe(L);
    if (liste.length !== 1 || liste[0].navn !== p.navn) fejl.push(`${p.navn}: mærkeliste ${JSON.stringify(liste.map(x => x.navn))}`);
  });
  assert.deepStrictEqual(fejl, []);
  // opret-annonce-siden selv (106 valg i DOM) kontrolleres af scripts/v4-maerke-dakning.js gruppe 4 og js/v5-maerke.test.js.
});

test('(3) ÉN registerpost er nok: et nyt mærke virker i normalisering, opret-valg, slug, filter, søgning, logo, Flere mærker og sideregler', () => {
  const kilde = fs.readFileSync(path.join(REPO, 'js', 'brands-registry.js'), 'utf8');
  const anker = 'const MAERKER = [';
  assert.ok(kilde.includes(anker));
  const medNy = kilde.replace(anker, anker + "\n    ['Testmaerke X', 'SE', 'aktuel', ['tmx', 'test maerke'], ['wp'], { note: 'kun test' }],");
  const NY = new Function('module', medNy + '\nreturn BrandRegistry;')({});
  assert.strictEqual(NY.MAERKER_ANTAL, BR.MAERKER_ANTAL + 1);
  assert.deepStrictEqual(NY.dubletter, []);
  // registret
  assert.strictEqual(NY.normalise('tmx'), 'Testmaerke X');
  assert.strictEqual(NY.normalise('TESTMAERKE-X'), 'Testmaerke X');
  assert.strictEqual(NY.slug('Testmaerke X'), 'testmaerke-x');
  assert.strictEqual(NY.fraSlug('testmaerke-x').navn, 'Testmaerke X');
  assert.ok(NY.valgbare().includes('Testmaerke X'), 'kan vælges i opret-annonce');
  assert.ok(!BR.valgbare().includes('Testmaerke X'), 'og findes ikke i det rigtige register (testen ændrer intet)');
  assert.strictEqual(NY.validerFriMaerke('testmaerke x').registreret, true, 'fritekst "Andet mærke" lander på det registrerede mærke');
  assert.strictEqual(NY.fraTekst('Testmaerke X Foo 1200'), 'Testmaerke X');
  // uden annoncer: nævnt under Flere mærker, men ingen side
  const o0 = NY.opgoer([]);
  assert.ok(o0.udenAnnoncer.aktuelle.includes('Testmaerke X'));
  assert.deepStrictEqual(NY.sideRegel(0), { side: false, indekserbar: false, tekstpakke: false });
  // med én annonce: har en side (men noindex), og kommer ikke som uregistreret
  const o1 = NY.opgoer(['Testmaerke X']);
  assert.strictEqual(o1.iLager.find(x => x.navn === 'Testmaerke X').antal, 1);
  assert.deepStrictEqual(o1.uregistreret, []);
  assert.strictEqual(NY.sideRegel(1).side, true);
  assert.strictEqual(NY.sideRegel(1).indekserbar, false);
  assert.strictEqual(NY.sideRegel(NY.MIN_ANNONCER_INDEKS).indekserbar, true);
  // filter og søgning med det nye registers aliaser (frisk Filtrering-instans bundet til det nye register)
  const filtreringSrc = fs.readFileSync(path.join(REPO, 'js', 'filtrering.js'), 'utf8');
  const F2 = new Function('BrandRegistry', 'module', filtreringSrc + '\nreturn Filtrering;')(NY, {});
  const L = [{ brand: 'Testmaerke X', model: 'Foo 1200' }, { brand: 'Honda', model: 'CB 500' }];
  assert.strictEqual(F2.maerkeListe(L).find(m => m.navn === 'Testmaerke X').antal, 1);
  assert.strictEqual(F2.anvendFiltre(L, { q: 'tmx' }).length, 1);
  assert.strictEqual(F2.anvendFiltre(L, { q: 'test maerke foo' }).length, 1);
  assert.strictEqual(F2.anvendFiltre(L, { brands: ['TMX'] }).length, 1);
  // logo: ingen manifestpost nødvendig, monogram/ordmærke er fallback
  const logo = BL.logoFor('Testmaerke X');
  assert.strictEqual(logo.harLogo, false);
  assert.ok(BL.logoHTML('Testmaerke X', { storrelse: 'md' }).includes('Testmaerke X') || BL.monogramFor('Testmaerke X'));
  // og uden posten bliver samme navn IKKE et mærke af sig selv
  assert.strictEqual(BR.normalise('Testmaerke X'), null);
  const l = M.normalizeExternalListing(raa(1, 'Testmaerke X', 'Foo 1200'));
  assert.strictEqual(l.brand, 'Ukendt');
});

test('(4) modelnavne og ukendte navne bliver aldrig mærker: rå brand = modelnavn giver titlens mærke eller Uoplyst, ikke en ny mærkerække', () => {
  for (const [raaMaerke, titel, forventet] of [
    ['CB 500', 'Honda CB 500 F', 'Honda'], ['Hornet', 'Honda Hornet 600', 'Honda'], ['Gold Wing', 'Honda Gold Wing GL 1800', 'Honda'], ['Rebel', 'Honda Rebel 500', 'Honda'],
    ['Sportster', 'Harley-Davidson Sportster 883', 'Harley-Davidson'], ['Hanway', 'Hanway Raw 125', 'Ukendt'], ['xyz', 'Noget helt andet', 'Ukendt'], ['Andet Mærke', 'CFMOTO MTX800', 'CFMoto'],
    [null, 'Honda CB 500', 'Honda'], ['', 'Zero SR/F', 'Zero'], ['undefined', 'Intet', 'Ukendt'],
  ]) {
    const l = M.normalizeExternalListing(raa(1, raaMaerke, null, titel));
    assert.strictEqual(l.brand, forventet, `${raaMaerke} / ${titel}`);
  }
  const L = lager([raa(1, 'CB 500', null, 'Honda CB 500 F'), raa(2, 'Hanway', 'Raw 125'), raa(3, 'Honda', 'CB 500')]);
  const liste = F.maerkeListe(L);
  assert.ok(!liste.some(m => /cb 500|hanway/i.test(m.navn)), 'ingen ny mærkerække: ' + liste.map(m => m.navn).join());
  // kandidatvurdering afviser kendte modelnavne som mærker
  const modelNoegler = new Set(['cb500', 'hornet', 'goldwing', 'rebel', 'sportster']);
  for (const n of ['CB500', 'Hornet', 'Gold Wing', 'Rebel', 'Sportster'])
    assert.strictEqual(BR.vurderKandidat(n, 9, { modelNoegler }).tilstand, 'afvist', n);
});

test('(5) mærker uden annoncer og historiske mærker: valgbare, ikke tomme sider, hver sit sted i Flere mærker', () => {
  const lagerMaerker = ['Honda', 'Yamaha'];
  const o = BR.opgoer(lagerMaerker);
  assert.ok(o.udenAnnoncer.aktuelle.length > 30 && o.udenAnnoncer.historiske.length > 10);
  assert.ok(!o.udenAnnoncer.aktuelle.includes('Honda'));
  for (const h of ['Buell', 'Victory', 'AJS', 'Velocette', 'Zündapp']) {
    assert.ok(BR.valgbare().includes(h), h + ' kan vælges');
    assert.strictEqual(BR.status(h, 0), 'historisk');
    assert.strictEqual(BR.sideRegel(0).side, false, 'ingen tom side for ' + h);
  }
  assert.ok(o.udenAnnoncer.historiske.includes('Velocette') && !o.udenAnnoncer.aktuelle.includes('Velocette'));
  // et mærke uden belæg (Daelim) er gyldigt men ikke offentligt nævnt
  assert.ok(BR.valgbare().includes('Daelim'));
  assert.ok(![...o.udenAnnoncer.aktuelle, ...o.udenAnnoncer.historiske].includes('Daelim'));
  // et historisk mærke med en annonce får side og tæller som i lager
  const ol = BR.opgoer(['Victory']);
  assert.strictEqual(ol.iLager[0].navn, 'Victory');
  assert.ok(!ol.udenAnnoncer.historiske.includes('Victory'));
});
