/* F2-009/F2-011/F2-014: aldrig "null", "undefined" eller "NaN" i brugerrettet tekst. Kør: node --test js/w5-null.test.js

   Kort, listerække, swipekort, sammenlign-dialogen og annoncesidens byggeklodser renderes for annoncer, hvor
   ALLE felter er null — egne og indekserede. Teksten (uden tags og attributter) må ikke indeholde de tre ord.
   Annoncer uden model / med ukendt mærke siger det ærligt ("Model ikke oplyst" / "Ukendt mærke"); der
   opfindes ingen model. */

const test = require('node:test');
const assert = require('node:assert');
const { indlaes, MED_ANNONCE, læs } = require('./w5-hjaelp.js');

const SOEG = [...MED_ANNONCE.filter(f => f !== 'annonce.js'), 'sortering.js', 'search.js'];
const F = indlaes(SOEG, ['listingCardHTML', 'listingRowHTML', 'swipeCardHTML', 'sammenlignRaekker', 'sammenlignHoved', 'annonceNavn',
  'typeLabel', 'koerekortMaerkat', 'formatPrice', 'formatKm', 'formatCcm', 'formatPower']);
const A = indlaes(MED_ANNONCE, ['saelgerKortHTML', 'anKoerekortKort', 'anNoegletal', 'koerekortMaerkat']);

const NULLER = {
  brand: null, model: null, type: null, year: null, km: null, ccm: null, power: null, price: null, city: null,
  postnr: null, region: null, createdAt: null, condition: null, photoUrls: [], photos: 0, description: null,
  salgsmarkoerer: null, variant: null, seller: null, source: null,
};
const NUL_EGEN = Object.assign({ id: 'n1', isDealer: false, isExternal: false }, NULLER, { seller: { name: null, city: null, isDealer: false } });
const NUL_EKSTERN = Object.assign({ id: 'n2', isDealer: false, isExternal: true, externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/x/1' },
  NULLER, { source: { navn: null, domaene: null }, saelgertype: null });

const tekst = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const ingenNul = (html, hvad) => {
  const t = tekst(html);
  const m = t.match(/\b(null|undefined|NaN)\b/);
  assert.ok(!m, `${hvad}: "${m && m[0]}" i teksten: …${m ? t.slice(Math.max(0, m.index - 40), m.index + 40) : ''}…`);
};

test('kort (egen og indekseret) med alle felter null', () => {
  for (const l of [NUL_EGEN, NUL_EKSTERN]) ingenNul(F.listingCardHTML(l, 1), 'listingCardHTML ' + (l.isExternal ? 'ekstern' : 'egen'));
});

test('listerække med alle felter null', () => {
  for (const l of [NUL_EGEN, NUL_EKSTERN]) ingenNul(F.listingRowHTML(l, 1), 'listingRowHTML ' + (l.isExternal ? 'ekstern' : 'egen'));
});

test('swipekort med alle felter null', () => {
  for (const l of [NUL_EGEN, NUL_EKSTERN]) ingenNul(F.swipeCardHTML(l, 0), 'swipeCardHTML ' + (l.isExternal ? 'ekstern' : 'egen'));
});

test('sammenlign-dialogen (hoved + rækker) med alle felter null, alene og blandet', () => {
  const sæt = [[NUL_EGEN, NUL_EKSTERN], [NUL_EKSTERN, Object.assign({}, NUL_EKSTERN, { id: 'n3' })], [NUL_EGEN, Object.assign({}, NUL_EGEN, { id: 'n4' })]];
  for (const bikes of sæt){
    ingenNul(F.sammenlignHoved(bikes), 'sammenlignHoved');
    ingenNul(F.sammenlignRaekker(bikes), 'sammenlignRaekker');
  }
});

test('sammenlign: Type og Årgang uden værdi siger "Ikke oplyst" (ikke "null"); Stand viser den indekserede stand', () => {
  const ext = Object.assign({}, NUL_EKSTERN, { brand: 'Honda', model: 'CX 650 E', condition: 'Brugt' });
  const andet = Object.assign({}, ext, { id: 'n9', condition: 'Ny', type: 'naked', year: 1983 });
  const rk = F.sammenlignRaekker([ext, andet]);
  const raekke = navn => (rk.match(new RegExp(`<th scope="row">${navn}</th>([\\s\\S]*?)</tr>`)) || [, ''])[1];
  assert.match(tekst(raekke('Type')), /Ikke oplyst/);
  assert.match(tekst(raekke('Årgang')), /Ikke oplyst/);
  assert.match(tekst(raekke('Stand')), /Brugt/, 'indekseret stand står i rækken');
  assert.doesNotMatch(tekst(raekke('Stand')), /Se hos kilden/);
});

test('annoncesidens byggeklodser med alle felter null', () => {
  const ingen = A.koerekortMaerkat(NUL_EGEN);
  ingenNul(A.anKoerekortKort(NUL_EGEN, ingen, false), 'anKoerekortKort');
  ingenNul(A.saelgerKortHTML(NUL_EGEN, { loggedIn: true, avgRating: null, reviewCount: 0, telefon: '', telefonMulig: false }), 'saelgerKort (indlogget)');
  ingenNul(A.saelgerKortHTML(NUL_EGEN, { loggedIn: false, avgRating: null, reviewCount: 0, telefon: '', telefonMulig: false }), 'saelgerKort (udlogget)');
  ingenNul(A.anNoegletal(NUL_EKSTERN, null), 'anNoegletal');
});

/* ---------- F2-014: uden model / ukendt mærke ---------- */

test('annonceNavn: ærligt, ingen opfundet model', () => {
  assert.equal(F.annonceNavn({ brand: 'Honda', model: 'CB 500' }), 'Honda CB 500');
  assert.match(F.annonceNavn({ brand: 'Honda', model: '' }), /^Honda .*model ikke oplyst/i);
  assert.match(F.annonceNavn({ brand: 'Honda', model: null }), /model ikke oplyst/i);
  assert.match(F.annonceNavn({ brand: 'Ukendt', model: 'MTX800' }), /Ukendt mærke.*MTX800/);
  assert.match(F.annonceNavn({ brand: null, model: 'MTX800' }), /Ukendt mærke/);
  assert.match(F.annonceNavn({ brand: 'ukendt', model: '' }), /ikke oplyst/i);
  assert.equal(F.annonceNavn({ brand: 'Honda', model: 'Honda' }).includes('Honda Honda'), false);
});

test('kort uden model siger "model ikke oplyst"; ukendt mærke siger "Ukendt mærke"', () => {
  const udenModel = Object.assign({}, NUL_EKSTERN, { brand: 'Honda', model: '', year: 2025, price: 609995, ccm: 1833, power: 126, postnr: 6630, city: 'Rødding',
    source: { navn: 'MC Syd', domaene: 'mcsyd.dk' } });
  assert.match(tekst(F.listingCardHTML(udenModel, 1)), /model ikke oplyst/i);
  assert.match(tekst(F.listingRowHTML(udenModel, 1)), /model ikke oplyst/i);
  const ukendt = Object.assign({}, udenModel, { brand: 'Ukendt', model: 'MTX800' });
  assert.match(tekst(F.listingCardHTML(ukendt, 1)), /Ukendt mærke/);
  assert.doesNotMatch(tekst(F.listingCardHTML(ukendt, 1)), /Ukendt MTX800/);
  assert.match(tekst(F.swipeCardHTML(udenModel, 0)), /model ikke oplyst/i);
});

test('compare-hoved: link-teksten er ærlig, ikke "Honda null"', () => {
  const udenModel = Object.assign({}, NUL_EKSTERN, { brand: 'Honda', model: null });
  assert.match(tekst(F.sammenlignHoved([udenModel, NUL_EKSTERN])), /Honda.*model ikke oplyst/i);
});

/* ---------- F2-009 ---------- */

test('typeLabel(null) siger Ikke oplyst', () => {
  assert.equal(F.typeLabel(null), 'Ikke oplyst');
  assert.equal(F.typeLabel(undefined), 'Ikke oplyst');
  assert.equal(F.typeLabel('naked'), 'Naked');
});

/* ---------- F2-014: bro — mærket læses af titlen, når den starter med et kendt mærke ---------- */

const { broModuler } = require('./w5-hjaelp.js');
const B = broModuler(['normalizeExternalListing']);
const raa = o => Object.assign({
  id: 'x', kilde_annonce_id: '1', url: 'https://www.guloggratis.dk/annonce/1', titel: 'x', maerke: 'Ukendt', model: null, variant: null, type: null,
  aargang: 2022, km: 1000, ccm: 800, hk: 95, pris_dkk: 90000, stand: 'brugt', salgsmarkoerer: [], udledte_felter: [], by: 'Odense', postnr: 5000,
  saelgertype: null, thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-08-01', sidst_set: '2026-08-24T10:00:00Z',
  kilde: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' },
}, o);

test('bro: "Ukendt" + titel "CFMOTO MTX800" -> mærket CFMoto, modellen MTX800 (ingen opfundet model)', () => {
  const l = B.normalizeExternalListing(raa({ titel: 'CFMOTO MTX800', model: 'MTX800' }));
  assert.equal(l.brand, 'CFMoto');
  assert.equal(l.model, 'MTX800');
  assert.equal(F.annonceNavn(l), 'CFMoto MTX800');
});

test('bro: ukendt mærke uden læsbar titel forbliver Ukendt (og vises som "Ukendt mærke")', () => {
  const l = B.normalizeExternalListing(raa({ titel: 'Zork XYZ 500', model: 'XYZ 500' }));
  assert.equal(l.brand, 'Ukendt');
  assert.match(F.annonceNavn(l), /^Ukendt mærke /);
});

test('bro: titel kun mærket giver ingen model (ikke "Honda Honda")', () => {
  const l = B.normalizeExternalListing(raa({ maerke: 'Honda', titel: 'Honda', model: null, url: 'https://www.guloggratis.dk/annonce/2' }));
  assert.equal(l.brand, 'Honda');
  assert.equal(l.model, '');
  assert.match(F.annonceNavn(l), /^Honda \(model ikke oplyst\)$/);
});

/* ---------- F2-009: søgning ---------- */

const Filtrering = require('./filtrering.js');
test('søgning: typeord finder typen; "null" matcher aldrig en annonce uden felter', () => {
  const liste = [
    { id: 1, brand: 'Honda', model: 'CMX 500 Rebel', type: 'cruiser' },
    { id: 2, brand: 'Yamaha', model: 'MT-07', type: 'naked' },
    { id: 3, brand: 'Honda', model: 'NT 1100', type: 'touring' },
    { id: 4, brand: null, model: null, type: null },
  ];
  const find = q => Filtrering.anvendFiltre(liste, { q }).map(l => l.id).sort();
  assert.deepEqual(find('cruiser'), [1]);
  assert.deepEqual(find('naked'), [2]);
  assert.deepEqual(find('honda touring'), [3]);
  assert.deepEqual(find('honda cruiser'), [1]);
  assert.deepEqual(find('null'), [], 'ordet null findes ikke i nogen annonce');
  assert.deepEqual(find('undefined'), []);
  assert.deepEqual(find('mt07'), [2], 'eksisterende fuzzy-hjælp uændret');
});
