/* Tests for kortet -> annonce.

   Alt her kører uden browser og uden netværk. De rå strenge er dem, MC Syds
   DOM faktisk leverer: tal med dansk tusindtalsseparator, URL'er med store
   begyndelsesbogstaver og et m=-parameter til sidst. */

const test = require('node:test');
const assert = require('node:assert');
const { tilAnnonce, delTitel, udledStand } = require('./parse');
const { byggeRegex, validerKilde } = require('./config');

const KILDE = {
  navn: 'MC Syd',
  domaene: 'mcsyd.dk',
  detalje_url_moenster: '(?i)/produkter/motorcykel/[^/]+/[^/]+/(\\d+)',
  id_gruppe: 1,
  stand_url_moenster: '(?i)/produkter/[^/]+/(ny|brugt)/',
  // Kildens egen facetliste, aflæst i DOM'en. "Magna" er udeladt med vilje:
  // det er en Honda-model, nogen har tastet i typefeltet.
  type_vokabular: ['Classic Cruiser', 'Sportstouring', 'Adventure', 'Offroader',
    'Klassiker', 'Touring', 'Cruiser', 'Scooter', 'Street', 'Motard', 'Sport'],
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

/* ---------- Hestekræfter (nyt i supabase/015) ----------
   De rå strenge her er MC Syds egne: kortet skriver tallet uformateret, og
   "-" når feltet er tomt. Målt på hele kataloget har 225 af 343 et tal. */
test('hk kommer med i annoncen — den blev kastet væk før 015', () => {
  const { annonce } = tilAnnonce(KORT, KILDE, 'Harley-Davidson');
  assert.equal(annonce.hk, 53);
});

test('hk: "-" er ikke nul hestekræfter', () => {
  // Danbase renderer "-" i feltet, når forhandleren ikke har oplyst effekten.
  const { annonce } = tilAnnonce({ ...KORT, hk: '-' }, KILDE, 'Harley-Davidson');
  assert.equal(annonce.hk, null);
  const uden = tilAnnonce({ ...KORT, hk: null }, KILDE, 'Harley-Davidson');
  assert.equal(uden.annonce.hk, null);
});

test('hk: et sammenløbet felt afvises frem for at blive vist', () => {
  // 883 er cyklens ccm. Havner den i hk-feltet, er det en fejlparsning —
  // og en motorcykel med 883 hk ville stå øverst i ethvert A-filter.
  const { annonce } = tilAnnonce({ ...KORT, hk: '883' }, KILDE, 'Harley-Davidson');
  assert.equal(annonce.hk, null);
  assert.equal(tilAnnonce({ ...KORT, hk: '0' }, KILDE, null).annonce.hk, null);
});

test('hk og ccm sammen — det, kørekortfilteret skal kunne svare på', () => {
  // A2 kræver højst 35 kW (~47,5 hk). Uden hk kan spørgsmålet ikke stilles.
  const a2 = tilAnnonce({ ...KORT, titel: 'Kawasaki Ninja 400 Sport', hk: '45', ccm: '399' }, KILDE, 'Kawasaki');
  assert.equal(a2.annonce.hk, 45);
  assert.equal(a2.annonce.ccm, 399);
});

/* ---------- Type (nyt i supabase/015) ----------
   Typen har ingen selector. Den står i titlen, fordi kildens template skriver
   ModelDescription = mærke + model + variant + type. */
test('type læses ud af titlen mod kildens egen ordliste', () => {
  assert.equal(tilAnnonce(KORT, KILDE, 'Harley-Davidson').annonce.type, 'Cruiser');
  const t = (titel) => tilAnnonce({ ...KORT, titel }, KILDE, null).annonce.type;
  assert.equal(t('Honda CBR 250 R Sport'), 'Sport');
  assert.equal(t('Suzuki DL 650 V-Strom Offroader'), 'Offroader');
  assert.equal(t('Honda NSC 110 Vision Scooter'), 'Scooter');
});

test('type: længste træf vinder — ellers bliver hver sportstourer en sportscykel', () => {
  const t = (titel) => tilAnnonce({ ...KORT, titel }, KILDE, null).annonce.type;
  assert.equal(t('Honda CBR 1000 F Sportstouring'), 'Sportstouring');
  assert.equal(t('Yamaha XVS 950 Classic Cruiser'), 'Classic Cruiser');
});

test('type: findes også når forhandleren har skrevet den midt i titlen', () => {
  // Rigtige titler fra MC Syd. Typen står ikke altid sidst.
  const t = (titel) => tilAnnonce({ ...KORT, titel }, KILDE, null).annonce.type;
  assert.equal(t('Yamaha XV 750 Cruiser Virago ENGROS/UDEN KLARGØRING'), 'Cruiser');
  assert.equal(t('Yamaha XVZ 1200 ENGROS/UDEN KLARGØRING Touring'), 'Touring');
});

test('type: ingen type er null, ikke et gæt', () => {
  const t = (titel) => tilAnnonce({ ...KORT, titel }, KILDE, null).annonce.type;
  assert.equal(t('Sym XS 125'), null);
  assert.equal(t('Suzuki GSX 750 F'), null);
  // "Magna" er en Honda-model, ikke en type. Den står ikke i vokabularet.
  assert.equal(t('Honda VF 700 Magna'), null);
});

test('type: et delord i et modelnavn er ikke en type', () => {
  const t = (titel) => tilAnnonce({ ...KORT, titel }, KILDE, null).annonce.type;
  // "Streetfighter" er én model, ikke typen "Street".
  assert.equal(t('Ducati Streetfighter V4'), null);
  // Men står ordet for sig selv, tæller det.
  assert.equal(t('Triumph Street Triple Street'), 'Street');
});

test('type: uden vokabular i YAML\'en gættes der ikke', () => {
  const uden = { ...KILDE, type_vokabular: undefined };
  assert.equal(tilAnnonce(KORT, uden, null).annonce.type, null);
});

test('typen klippes IKKE af modellen — fingerprint skal overleve migrationen', () => {
  /* Fristelsen er at rydde op i modelnavnet, når typen alligevel er udledt.
     Lad være: model indgår i fingerprint(), og en beskæring ville give alle
     343 eksisterende annoncer en ny nøgle på én kørsel. Samme motorcykel
     ville stå som to. Nøglen her er regnet på det uændrede modelnavn. */
  const a = tilAnnonce(KORT, KILDE, 'Harley-Davidson').annonce;
  assert.equal(a.type, 'Cruiser');
  assert.equal(a.model, 'XL883 Standard Cruiser');
  const uden = require('./normalize').fingerprint({ ...a, type: undefined, hk: undefined, stand: undefined });
  assert.equal(a.fingerprint, uden, 'de nye felter må ikke indgå i fingerprint');
});

/* ---------- Ny eller brugt (nyt i supabase/015) ----------
   Kategorien står som eget segment i produktlinkets sti. 343 af 343
   produkter har den; 169 af dem er fabriksnye. */
test('stand læses af produktlinkets sti', () => {
  assert.equal(tilAnnonce(KORT, KILDE, 'Harley-Davidson').annonce.stand, 'brugt');
  const ny = { ...KORT, url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20CB%20750%20Hornet/165596?p=165596&m=1483' };
  assert.equal(tilAnnonce(ny, KILDE, 'Honda').annonce.stand, 'ny');
});

test('stand: stien skrives med store bogstaver — mønsteret skal være case-insensitivt', () => {
  assert.equal(udledStand('https://mcsyd.dk/Produkter/Motorcykel/Brugt/X/1', KILDE), 'brugt');
  assert.equal(udledStand('https://mcsyd.dk/produkter/motorcykel/brugt/x/1', KILDE), 'brugt');
  assert.equal(udledStand('https://mcsyd.dk/Produkter/45-Scooter-knallert/Ny/X/1', KILDE), 'ny');
});

test('stand: ukendt sti giver null — vi gætter ikke ud fra kilometerstanden', () => {
  // 0 km betyder ikke "ny". En brugt udstillingsmodel kan også have 0.
  const nul = { ...KORT, km: '0', url: 'https://mcsyd.dk/Produkter/Motorcykel/Demo/X/178201' };
  assert.equal(tilAnnonce(nul, KILDE, null).annonce.stand, null);
  assert.equal(udledStand(null, KILDE), null);
  assert.equal(udledStand(KORT.url, { ...KILDE, stand_url_moenster: undefined }), null);
});

/* ---------- Ccm udledt af modelnavnet (nyt i supabase/015) ----------
   109 af 332 annoncer havde ingen ccm, og uden ccm OG hk forsvinder
   A1/A2/A-mærkatet fra kortet. Titlerne herunder er MC Syds egne. */
const udenCcm = (titel, ekstra = {}) =>
  tilAnnonce({ ...KORT, ccm: '-', titel, ...ekstra }, KILDE, null).annonce;

test('ccm udledes af modelnavnet, når kortet ikke oplyser den', () => {
  assert.equal(udenCcm('Honda MSX 125 Street').ccm, 125);
  assert.equal(udenCcm('Yamaha XV 750').ccm, 750);
  assert.equal(udenCcm('Suzuki GSX 750 F').ccm, 750);
  assert.equal(udenCcm('Honda CBR 1000 F Sportstouring').ccm, 1000);
});

test('ccm: tallet står midt i modelnavnet', () => {
  assert.equal(udenCcm('BMW K 1200 GT Touring').ccm, 1200);
  assert.equal(udenCcm('Honda ST 1100 Pan European').ccm, 1100);
  assert.equal(udenCcm('Yamaha XJ 900 S Sportstouring').ccm, 900);
  assert.equal(udenCcm('Honda CMX 1100 D').ccm, 1100);
  assert.equal(udenCcm('Honda ST 125 DAX').ccm, 125);
});

test('ccm: tallet klistrer til bogstaverne', () => {
  // Harley skriver XL883, ikke XL 883. Et \b omkring cifrene ville misse den.
  assert.equal(udenCcm('Harley-Davidson XL883 Standard Cruiser').ccm, 883);
  assert.equal(udenCcm('Harley-Davidson XL1200N Nightster').ccm, 1200);
});

test('ccm: bindestreg og små tal er IKKE kubik', () => {
  // Kawasaki ZR-7 er 738 ccm. Honda CB72 er 247. Yamaha MT-07 er 689.
  assert.equal(udenCcm('Kawasaki ZR-7').ccm, null);
  assert.equal(udenCcm('Honda CB 72 Klassiker').ccm, null);
  assert.equal(udenCcm('Yamaha MT-07').ccm, null);
  assert.equal(udenCcm('Moto Guzzi V7 Stone').ccm, null);
});

test('ccm: modelnavne uden tal giver null, ikke et gæt', () => {
  assert.equal(udenCcm('Harley-Davidson FLSTC Heritage Softail Classic').ccm, null);
  assert.equal(udenCcm('Triumph Thruxton Street').ccm, null);
});

test('ccm: et årstal i modelnavnet er ikke slagvolumen', () => {
  const a = udenCcm('Harley-Davidson Softail 2007 Cruiser', { aargang: '2007' });
  assert.equal(a.ccm, null, 'årgangen blev læst som kubik');
});

test('ccm: en oplyst kubik vinder altid over gættet', () => {
  // Kilden siger 883, modelnavnet siger 1200. Kilden har målt; vi har gættet.
  const a = tilAnnonce({ ...KORT, ccm: '883', titel: 'Harley-Davidson XL1200N Nightster' }, KILDE, null).annonce;
  assert.equal(a.ccm, 883);
  assert.deepEqual(a.udledte_felter, [], 'et oplyst felt må ikke stå som udledt');
});

test('et udledt ccm siger selv, at det er udledt', () => {
  const a = udenCcm('Honda MSX 125 Street');
  assert.equal(a.ccm, 125);
  assert.deepEqual(a.udledte_felter, ['ccm']);
  // Og et kort med oplyst ccm bærer en tom liste — ikke null.
  assert.deepEqual(tilAnnonce(KORT, KILDE, null).annonce.udledte_felter, []);
});

test('et udledt ccm flytter ikke fingerprintet', () => {
  /* Fingerprint bygger på mærke, model, årgang, prisniveau og postnummer —
     ikke på ccm. Ellers ville 109 annoncer skifte nøgle den dag udledningen
     blev slået til, og samme motorcykel stå som to. */
  const uden = tilAnnonce({ ...KORT, ccm: '-' }, KILDE, 'Harley-Davidson').annonce;
  const med = tilAnnonce(KORT, KILDE, 'Harley-Davidson').annonce;
  assert.equal(uden.fingerprint, med.fingerprint);
});

test('udledt ccm redder kørekortmærkatet på et kort, der ellers stod tomt', () => {
  // "Honda MSX 125 Street 2024" — verificeret uden kørekortmærkat i dag,
  // fordi både hk og ccm manglede. 125 ccm alene er nok til A1.
  const a = udenCcm('Honda MSX 125 Street', { hk: '-' });
  assert.equal(a.hk, null);
  assert.equal(a.ccm, 125);
  assert.ok(a.ccm != null || a.hk != null, 'kørekortet kan stadig ikke udledes');
});

/* ---------- Parserens felter mod tabellens kolonner ----------
   Den her test er grunden til, at hk kunne forsvinde i månedsvis uden at
   noget fejlede: intet holdt parserens output op mod skemaet. */
test('hvert felt parseren laver har en kolonne i databasen', () => {
  const { KOLONNER } = require('./db');
  const { annonce } = tilAnnonce(KORT, KILDE, 'Harley-Davidson');
  const hjemloese = Object.keys(annonce).filter(k => !KOLONNER.includes(k));
  assert.deepEqual(hjemloese, [],
    `parses, men kastes væk ved skrivning: ${hjemloese.join(', ')}`);
});

test('db-laget sender kun kolonner, tabellen har', () => {
  const { tilRaekke, KOLONNER } = require('./db');
  const ukendte = new Set();
  const raekke = tilRaekke({ hk: 53, type: 'Cruiser', stand: 'brugt', vaegt_kg: 260 }, ukendte);
  assert.deepEqual(raekke, { hk: 53, type: 'Cruiser', stand: 'brugt' });
  // Og det frasorterede skal kunne rapporteres — ikke forsvinde i stilhed.
  assert.deepEqual([...ukendte], ['vaegt_kg']);
  for (const k of ['hk', 'type', 'stand', 'variant', 'salgsmarkoerer', 'udledte_felter']){
    assert.ok(KOLONNER.includes(k), `${k} mangler i KOLONNER`);
  }
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
