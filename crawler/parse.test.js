/* Tests for kortet -> annonce.

   Alt her kører uden browser og uden netværk. De rå strenge er dem, MC Syds
   DOM faktisk leverer: tal med dansk tusindtalsseparator, URL'er med store
   begyndelsesbogstaver og et m=-parameter til sidst. */

const test = require('node:test');
const assert = require('node:assert');
const { tilAnnonce, delTitel } = require('./parse');
const { byggeRegex, validerKilde } = require('./config');

const KILDE = {
  navn: 'MC Syd',
  domaene: 'mcsyd.dk',
  detalje_url_moenster: '(?i)/produkter/motorcykel/[^/]+/[^/]+/(\\d+)',
  id_gruppe: 1,
  faste_felter: { saelgertype: 'forhandler', by: 'Rødding', postnr: '6630' },
};

const KORT = {
  url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Harley-Davidson%20XL883%20Standard%20Cruiser/178201?p=178201&m=1528',
  titel: 'Harley-Davidson XL883 Standard Cruiser',
  pris: '99.800',
  aargang: '2007',
  km: '31.000',
  ccm: '883',
  hk: '53',
  thumbnail: 'https://images.danbase.dk/Content/Resellers/321/178201.jpg',
};

test('URL-mønsteret klarer store bogstaver i stien', () => {
  const r = byggeRegex(KILDE.detalje_url_moenster);
  assert.equal(KORT.url.match(r)[1], '178201');
  // Søgeresultater viser den med små bogstaver — begge skal give samme id.
  assert.equal('https://mcsyd.dk/produkter/motorcykel/brugt/noget/178201?p=178201'.match(r)[1], '178201');
});

test('m=-parameteren efter p= vælter ikke mønsteret', () => {
  const r = tilAnnonce(KORT, KILDE, 'Harley-Davidson');
  assert.ok(r.ok);
  assert.equal(r.annonce.kilde_annonce_id, '178201');
});

test('Danbase-tal læses som tusindtal, ikke decimaler', () => {
  const { annonce } = tilAnnonce(KORT, KILDE, 'Harley-Davidson');
  assert.equal(annonce.pris_dkk, 99800);    // ikke 99,8
  assert.equal(annonce.km, 31000);          // ikke 31
  assert.equal(annonce.aargang, 2007);
  assert.equal(annonce.ccm, 883);
});

test('faste felter fra YAML kommer med og normaliseres', () => {
  const { annonce } = tilAnnonce(KORT, KILDE, 'Harley-Davidson');
  assert.equal(annonce.saelgertype, 'forhandler');
  assert.equal(annonce.by, 'Rødding');
  assert.equal(annonce.postnr, '6630');
});

test('mærke fra liste-URL slår mærke gættet ud fra titlen', () => {
  const forkert = { ...KORT, titel: 'XL883 Standard Cruiser' };   // titlen mangler mærket
  const { annonce } = tilAnnonce(forkert, KILDE, 'Harley-Davidson');
  assert.equal(annonce.maerke, 'Harley-Davidson');
  assert.equal(annonce.model, 'XL883 Standard Cruiser');
});

test('uden mærke fra URL genkendes det i titlen', () => {
  const { annonce } = tilAnnonce(KORT, KILDE, null);
  assert.equal(annonce.maerke, 'Harley-Davidson');
  assert.equal(annonce.model, 'XL883 Standard Cruiser');
});

test('mærket klippes af modellen — ellers matcher fingerprint aldrig', () => {
  const { annonce } = tilAnnonce(KORT, KILDE, 'Harley-Davidson');
  assert.ok(!/harley/i.test(annonce.model), `model indeholder stadig mærket: ${annonce.model}`);
});

test('tocifrede mærkenavne deles ikke midt over', () => {
  assert.deepEqual(delTitel('Moto Guzzi V7 Stone', null), { maerke: 'Moto Guzzi', model: 'V7 Stone' });
  assert.deepEqual(delTitel('Royal Enfield Himalayan', null), { maerke: 'Royal Enfield', model: 'Himalayan' });
  assert.deepEqual(delTitel('Harley Davidson Fat Boy', null), { maerke: 'Harley-Davidson', model: 'Fat Boy' });
});

test('ukendt mærke i titlen kastes ikke væk', () => {
  const { maerke, model } = delTitel('Zündapp KS 601', null);
  assert.equal(maerke, 'Zündapp');
  assert.equal(model, 'KS 601');
});

test('kort uden produktlink kasseres med en grund', () => {
  const r = tilAnnonce({ ...KORT, url: null }, KILDE, null);
  assert.equal(r.ok, false);
  assert.match(r.grund, /produktlink/);
});

test('link der ikke er en annonce kasseres', () => {
  const r = tilAnnonce({ ...KORT, url: 'https://mcsyd.dk/kontakt/' }, KILDE, null);
  assert.equal(r.ok, false);
  assert.match(r.grund, /detalje_url_moenster/);
});

test('"Ring for pris" bliver null, ikke nul kroner', () => {
  const { annonce } = tilAnnonce({ ...KORT, pris: 'Ring for pris' }, KILDE, 'Honda');
  assert.equal(annonce.pris_dkk, null);
});

test('uddraget begrænses til 200 tegn — databasen afviser mere', () => {
  const lang = { ...KORT, titel: 'Harley-Davidson ' + 'Super Glide Custom Anniversary '.repeat(20) };
  const { annonce } = tilAnnonce(lang, KILDE, 'Harley-Davidson');
  assert.ok(annonce.titel.length <= 200, `titel var ${annonce.titel.length} tegn`);
});

test('samme cykel fra to liste-URL\'er giver samme fingerprint', () => {
  const a = tilAnnonce(KORT, KILDE, 'Harley-Davidson').annonce;
  const b = tilAnnonce(KORT, KILDE, null).annonce;   // fra /alle-motorcykler/
  assert.equal(a.fingerprint, b.fingerprint);
});

/* ---------- Konfigurationen ---------- */
test('konfiguration uden tilladelse afvises', () => {
  const uden = {
    navn: 'X', domaene: 'x.dk', konfig_fil: 'sources/x.yaml',
    liste_urler: [{ url: 'https://x.dk/a' }],
    detalje_url_moenster: '/(\\d+)', crawl_delay_ms: 2000,
    selectors: { kort: '.k', url: 'a', titel: 'h2', pris: '.p', aargang: '.a', km: '.km' },
    robots_tjekket: '2026-08-16',
  };
  assert.throws(() => validerKilde(uden), /tilladelse/);
});

test('crawl_delay under 2000 afvises — databasen afviser den også', () => {
  const hurtig = {
    navn: 'X', domaene: 'x.dk', konfig_fil: 'sources/x.yaml',
    liste_urler: [{ url: 'https://x.dk/a' }],
    detalje_url_moenster: '/(\\d+)', crawl_delay_ms: 500,
    selectors: { kort: '.k', url: 'a', titel: 'h2', pris: '.p', aargang: '.a', km: '.km' },
    robots_tjekket: '2026-08-16', tilladelse_modtaget: '2026-08-16',
  };
  assert.throws(() => validerKilde(hurtig), /crawl_delay_ms/);
});

test('den rigtige mcsyd.yaml er gyldig', () => {
  const { laesKilde } = require('./config');
  const k = laesKilde('mcsyd');
  assert.equal(k.domaene, 'mcsyd.dk');
  assert.ok(k.crawl_delay_ms >= 2000);
  assert.ok(k.liste_urler.length > 0);
});
