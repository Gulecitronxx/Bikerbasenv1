/* V7 mærke: "købes"-annoncer er efterspørgsel, ikke salg. Lageret 26.10.2026 havde to: "moto cross købes" (stod som "Uoplyst mærke") og
   "BSA / Triumph / Norton købes" (stod som BSA-annonce uden pris). Slut-reglen i erEfterspoergsel() (js/data.js) fjerner dem fra lageret,
   mens et ægte salg ("Honda kan også købes", "Honda CB 500 (kan købes)") beholdes. Kør: node --test js/v7-maerke-efterspoergsel.test.js */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const M = browserModules();
const F = M.Filtrering;
const LAGER = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v7-lager-maerke.json'), 'utf8')).raekker;

test('slut-"købes" er efterspørgsel (titlerne fra lageret + varianter)', () => {
  for (const t of ['moto cross købes', 'BSA / Triumph / Norton købes', 'Honda Gold Wing købes!', 'Triumph Bonneville købes.', 'Honda CB 750 ønskes købt', 'Yamaha XJ / XS / XV købes',
                   'MOTO CROSS KØBES', '  moto cross købes  '])
    assert.strictEqual(M.erEfterspoergsel(t), true, t);
});

test('et salg beholdes: "kan købes", "hurtig handel købes", salgsord, spørgsmål, for lange titler og ord, der bare ligner', () => {
  for (const t of ['Honda kan også købes', 'Honda CB 500 (kan købes)', 'Honda CB 500 – hurtig handel købes', 'Triumph Bonneville kan købes', 'Honda NC 750 X kan købes nu',
                   'Suzuki Bandit – købesum', 'Honda købes?', 'Mc købes kontant 30000 kr', 'Triumph og Norton købes til høj pris', 'Honda sælges, kan købes', 'Honda til salg, købes af mig',
                   'Honda Hornet købes - kan hentes', 'Yamaha XJ 600 bytter, købes gerne', 'En meget lang titel med mange ord om en Honda der købes af alle',
                   'Honda CB 500', 'Ny ejer søges', 'Søges: kærlig ejer', 'Søger MT-07', 'Vil købe? Her er min Honda'])
    assert.strictEqual(M.erEfterspoergsel(t), false, t);
});

test('start-reglerne er uændrede (købes:, ønskes købt, efterlyses, vil købe)', () => {
  for (const t of ['Købes: Honda CBR', 'Købes Yamaha MT-07', 'Ønskes købt: CB 500', 'Efterlyses: Honda Monkey', 'Vil købe Honda Hornet', 'KØBES KONTANT'])
    assert.strictEqual(M.erEfterspoergsel(t), true, t);
});

test('lageret: slut-reglen rammer præcis lagerets to efterspørgsels-titler og intet salg', () => {
  const ramt = LAGER.filter(o => M.erEfterspoergsel(o.t) || M.erEfterspoergsel(o.mo));
  assert.deepStrictEqual([...new Set(ramt.map(o => o.t))].sort(), ['BSA / Triumph / Norton købes', 'moto cross købes']);
  // Ingen anden titel i lageret indeholder "købes" i en form, reglen skulle have set: tæl dem.
  const alle = LAGER.filter(o => /købes|ønskes købt/i.test(o.t || ''));
  assert.strictEqual(new Set(alle.map(o => o.t)).size, 2);
});

function lager() {
  const raa = o => ({
    id: o.i, kilde_annonce_id: '1', url: o.u, titel: o.t, maerke: o.m, model: o.mo, variant: null, type: o.ty || null, aargang: o.a, km: o.km, ccm: o.c, hk: null, pris_dkk: o.p,
    stand: o.s || null, salgsmarkoerer: [], udledte_felter: [], by: null, postnr: o.pn, saelgertype: o.st || null, thumbnail_url: null, uddrag: null, status: 'aktiv',
    foerst_set: '2026-10-01', sidst_set: o.ss || '2026-10-20T10:00:00Z', kilde: { navn: o.kn || 'Gul og Gratis', domaene: o.k || 'guloggratis.dk' },
  });
  return M.markerTvaerkildeDubletter(LAGER.map(o => M.normalizeExternalListing(raa(o))));
}

test('lageret: de to efterspørgsler er ude af lageret, men ligger i dubletter (direkte adresse virker), og mærketællerne følger med', () => {
  const r = lager();
  assert.strictEqual(r.efterspoergsler.length, 2);
  assert.ok(r.dubletter.some(l => /moto cross købes/.test(l.kildeTitel)), 'direkte adresse annonce.html?id=… virker via EXTERNAL_DUBLETTER');
  assert.ok(!r.beholdt.some(l => /købes/.test(l.kildeTitel)));
  const m = F.maerkeListe(r.beholdt);
  assert.strictEqual(m.filter(x => x.uoplyst).length, 0, 'ingen "Uoplyst mærke"-række: lageret har ikke længere annoncer uden mærke');
  assert.strictEqual(m.find(x => x.navn === 'BSA').antal, 7, 'BSA: 8 -> 7 (efterspørgslen er ikke et BSA-udbud)');
  assert.strictEqual(m.reduce((s, x) => s + x.antal, 0), r.beholdt.length);
});

test('søgning: "norton", "triumph norton" og "moto cross" finder ikke efterspørgslen', () => {
  const l = lager().beholdt;
  assert.strictEqual(F.anvendFiltre(l, { q: 'norton' }).length, 0);
  assert.ok(!F.anvendFiltre(l, { q: 'bsa' }).some(x => /købes/.test(x.kildeTitel)));
  assert.ok(!F.anvendFiltre(l, { brands: ['Ukendt'] }).length);
});
