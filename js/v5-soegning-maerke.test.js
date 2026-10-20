/* V5 søgning: et fritekst-mærke ("Andet mærke" i opret-annonce, fx "Hanway") er IKKE et registreret mærke og må ikke blive en offentlig filterrække.
   Det grupperes under "Uoplyst mærke" i Filtrering.maerkeListe() — antal, ?brands=Ukendt, facettal og pille — mens fritekstsøgningen ("hanway") stadig
   finder annoncen, fordi q matcher annoncens brand-felt som før. Kør: node --test js/v5-soegning-maerke.test.js */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const M = browserModules();
const F = M.Filtrering;

const ekstern = (i, maerke, model) => M.normalizeExternalListing({
  id: `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`, kilde_annonce_id: String(i), url: `https://eksempel.test/a/${i}`, titel: `${maerke} ${model}`, maerke, model,
  variant: null, type: 'Naked', aargang: 2020, km: 10000, ccm: 650, hk: 60, pris_dkk: 50000, stand: null, salgsmarkoerer: [], udledte_felter: [],
  by: 'Aarhus', postnr: 8000, saelgertype: null, thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-10-01', sidst_set: '2026-10-19T10:00:00Z',
  kilde: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' },
});
/* Egne annoncer (listings) bevarer sælgerens brand-tekst uændret; det er dem, "Andet mærke" i opret-annonce skriver. */
const egen = (i, maerke, model) => M.normalizeRemoteListing({
  id: `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`, seller_id: 'aaaaaaaa-0000-4000-8000-000000000001', brand: maerke, model, type: 'naked', year: 2020, km: 10000,
  ccm: 650, power: 60, price: 50000, condition: 'God stand', postnr: 8000, city: 'Aarhus', region: 'Midtjylland', description: '', created_at: '2026-10-10T09:00:00Z',
  status: 'active', seller: { id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Mads', is_dealer: false }, photos: [],
});
const lager = () => M.harmoniserStavning([ekstern(1, 'Honda', 'CB 500'), ekstern(2, 'Honda', 'CB 650 R'), ekstern(3, 'Yamaha', 'MT-07'), ekstern(5, 'Ukendt', 'Noget')])
  .concat([egen(4, 'Hanway', 'Raw 125')]);   // fritekst fra "Andet mærke"

test('Hanway er en egen annonce med sælgerens tekst som mærke, og registret kender den ikke', () => {
  const l = lager().find(x => /Raw 125/.test(x.model));
  assert.strictEqual(l.brand, 'Hanway');
  assert.notStrictEqual(F.lagerMaerkeNoegle('Honda'), 'ukendt');
  assert.strictEqual(F.lagerMaerkeNoegle('Hanway'), 'ukendt');
});

test('mærkelisten: 0 rækker "Hanway", og annoncen tælles under "Uoplyst mærke" sammen med sentinellen', () => {
  const liste = F.maerkeListe(lager());
  assert.deepStrictEqual(liste.filter(m => /hanway/i.test(m.navn) || m.noegle === 'hanway'), [], 'ingen offentlig Hanway-række');
  const uoplyst = liste.filter(m => m.uoplyst);
  assert.strictEqual(uoplyst.length, 1);
  assert.strictEqual(uoplyst[0].antal, 2, 'Hanway (1) + Ukendt (1)');
  assert.strictEqual(uoplyst[0].visning, 'Uoplyst mærke');
  assert.strictEqual(liste[liste.length - 1].uoplyst, true, '"Uoplyst mærke" står sidst');
  assert.strictEqual(liste.reduce((s, m) => s + m.antal, 0), 5, 'summen er hele lageret');
});

test('?brands=Ukendt virker fortsat og finder både sentinellen og fritekst-mærket', () => {
  const r = F.anvendFiltre(lager(), { brands: ['Ukendt'] });
  assert.deepStrictEqual(r.map(l => l.brand).sort(), ['Hanway', 'Ukendt'].sort());
});

test('fritekst på selve navnet finder stadig annoncen (q matcher brand-feltet)', () => {
  const r = F.anvendFiltre(lager(), { q: 'hanway' });
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].brand, 'Hanway');
  assert.strictEqual(F.anvendFiltre(lager(), { q: 'hanway raw' }).length, 1);
});

test('registrerede mærker er uændrede (Honda 2, Yamaha 1) og modellisten under et mærke er uændret', () => {
  const l = lager();
  const m = F.maerkeListe(l);
  assert.strictEqual(m.find(x => x.navn === 'Honda').antal, 2);
  assert.strictEqual(m.find(x => x.navn === 'Yamaha').antal, 1);
  assert.deepStrictEqual(F.modelListe(l, ['Honda']).map(x => x.navn).sort(), ['CB 500', 'CB 650 R']);
  assert.deepStrictEqual(F.modelListe(l, ['Ukendt']).map(x => x.navn).sort(), ['Noget', 'Raw 125']);
});

test('lagerMaerkeNoegle: registrerede som før, fritekst og sentinel = "ukendt"; den VALGTE side (maerkeNoegle) er uændret', () => {
  assert.strictEqual(F.lagerMaerkeNoegle('Honda'), F.maerkeNoegle('Honda'));
  assert.strictEqual(F.lagerMaerkeNoegle('Royal-enfield'), F.maerkeNoegle('Royal Enfield'));
  assert.strictEqual(F.lagerMaerkeNoegle('Hanway'), 'ukendt');
  assert.strictEqual(F.lagerMaerkeNoegle('Andet mærke'), 'ukendt');
  assert.strictEqual(F.lagerMaerkeNoegle(null), 'ukendt');
  assert.strictEqual(F.maerkeNoegle('Hanway'), 'hanway');
});
