/* Tests for detaljetrinet og for kilden guloggratis.

   Hvert tilfælde her er noget, Gul og Gratis faktisk skriver, aflæst i
   renderet DOM 16.08.2026. Det er ikke opfundne kanttilfælde.

   Kør: npm test */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const { berigMedDetalje, tilAnnonce, DETALJE_NORMALISERING } = require('./parse');
const { laesKilde, validerKilde } = require('./config');

const YAML_FIL = path.join(__dirname, '..', 'sources', 'guloggratis.yaml');
const raaKilde = () => {
  const k = YAML.parse(fs.readFileSync(YAML_FIL, 'utf8'));
  k.slug = 'guloggratis';
  k.konfig_fil = 'sources/guloggratis.yaml';
  return k;
};

/* Specfelterne fra en rigtig annonce:
   https://www.guloggratis.dk/annonce/db098ee8-…/2005-bmw-r1150rt-saerdeles-flot */
const SPECS_BMW = {
  'Mærke': 'BMW',
  'Modelårgang': '2005',
  'Brændstof': 'Benzin',
  'Farve': 'Koksmetal',
  'Hestekræfter': '95 HK',
  'Motor (ccm)': '1.150 ccm',
  'Kilometer': '92.600',
  'Sidst synet': '22.1.2026',
  'Varens stand': 'God, men brugt',
};

// ---------------------------------------------------------------
// Tilladelsen
// ---------------------------------------------------------------

test('guloggratis kan IKKE crawles: den skriftlige tilladelse mangler', () => {
  // Det her er ikke en fejl i filen — det er filens vigtigste linje.
  // robots.txt siger Allow: /, men config.js kræver også et skriftligt ja.
  assert.throws(() => laesKilde('guloggratis'), /tilladelse/i);
});

test('alt ANDET i guloggratis.yaml er gyldigt — der mangler kun ja\'et', () => {
  const k = raaKilde();
  assert.equal(k.tilladelse_modtaget, false, 'filen skal stå med tilladelse: false');
  k.tilladelse_modtaget = true;
  // Må ikke kaste: er tilladelsen der, er kilden klar til at køre.
  const valideret = validerKilde(k);
  assert.equal(valideret.domaene, 'guloggratis.dk');
  assert.equal(valideret.detalje.hent, true);
});

test('kilden er også sat inaktiv, så et ja alene ikke starter en kørsel', () => {
  assert.equal(raaKilde().aktiv, false);
});

// ---------------------------------------------------------------
// Validering: årgang og km må komme fra detaljesiden
// ---------------------------------------------------------------

test('aargang og km må komme fra detaljesiden i stedet for kortet', () => {
  const k = raaKilde();
  k.tilladelse_modtaget = true;
  assert.equal(k.selectors.aargang, undefined, 'kortet HAR ingen årgang');
  assert.equal(k.selectors.km, undefined, 'kortet HAR ingen kilometer');
  assert.doesNotThrow(() => validerKilde(k));
});

test('mangler feltet begge steder, fejler kilden ved opstart', () => {
  const k = raaKilde();
  k.tilladelse_modtaget = true;
  delete k.detalje.felter.km;
  assert.throws(() => validerKilde(k), /km:.*selectors\.km.*detalje\.felter\.km/s);
});

test('et feltnavn, der ikke findes, er en fejl ved opstart — ikke en tom kolonne', () => {
  const k = raaKilde();
  k.tilladelse_modtaget = true;
  k.detalje.felter.hestekraefter = 'Hestekræfter';   // tastefejl: feltet hedder hk
  assert.throws(() => validerKilde(k), /ukendt felt/i);
});

test('en halvt udfyldt detalje-blok afvises', () => {
  const k = raaKilde();
  k.tilladelse_modtaget = true;
  delete k.detalje.label;
  assert.throws(() => validerKilde(k), /detalje\.label/);
});

// ---------------------------------------------------------------
// berigMedDetalje
// ---------------------------------------------------------------

function bmwKort(){
  const k = raaKilde();
  k.tilladelse_modtaget = true;
  const kilde = validerKilde(k);
  const r = tilAnnonce({
    url: 'https://www.guloggratis.dk/annonce/db098ee8-c2d2-424d-8808-862fbb74d0e1/2005-bmw-r1150rt-saerdeles-flot',
    titel: '2005 bmw r1150rt - særdeles flot',
    pris: '49.500 kr.',
    by: 'Aalborg · ',
    postnr: '9000',
    thumbnail: 'https://assets.guloggratis.dk/images/de024db4/de024db4-320x240.webp',
  }, kilde);
  assert.ok(r.ok, r.grund);
  return { annonce: r.annonce, kilde };
}

test('kortet alene giver hverken ccm, hk, km eller årgang', () => {
  const { annonce } = bmwKort();
  assert.equal(annonce.hk, null);
  assert.equal(annonce.km, null);
  assert.equal(annonce.aargang, null);
  // Pris, sted og thumbnail står derimod på kortet.
  assert.equal(annonce.pris_dkk, 49500);
  assert.equal(annonce.by, 'Aalborg');
  assert.equal(annonce.postnr, '9000');
});

test('detaljesiden fylder felterne ud', () => {
  const { annonce, kilde } = bmwKort();
  const { laest } = berigMedDetalje(annonce, SPECS_BMW, kilde);

  assert.equal(annonce.hk, 95);
  assert.equal(annonce.ccm, 1150);
  assert.equal(annonce.km, 92600);
  assert.equal(annonce.aargang, 2005);
  assert.equal(annonce.stand, 'brugt');
  assert.equal(annonce.maerke, 'BMW');
  assert.deepEqual(laest.sort(), ['aargang', 'ccm', 'hk', 'km', 'maerke', 'stand']);
});

test('hk er hele pointen: kørekortet kan nu udledes', () => {
  // 95 hk er over 48, altså A — og DET er svaret, en 20-årig skal have.
  // Ingen MC Syd-annonce kan svare på det, fordi kilden ikke oplyser hk.
  const { annonce, kilde } = bmwKort();
  berigMedDetalje(annonce, SPECS_BMW, kilde);
  assert.equal(typeof annonce.hk, 'number');
  assert.ok(annonce.hk > 48);
});

test('felter, tabellen ikke har en kolonne til, hentes ikke', () => {
  const { annonce, kilde } = bmwKort();
  berigMedDetalje(annonce, SPECS_BMW, kilde);
  // "Sidst synet", "Farve" og "Brændstof" står i SPECS_BMW, men ikke i YAML'en.
  assert.equal(annonce.farve, undefined);
  assert.equal(annonce.sidst_synet, undefined);
  assert.equal(annonce.braendstof, undefined);
});

test('mærket fra detaljesiden slår gættet fra overskriften', () => {
  const { kilde } = bmwKort();
  // Overskriften er sælgerens fritekst uden mærke. delTitel() tager første
  // ord, og så hedder mærket "Perfekt".
  const r = tilAnnonce({
    url: 'https://www.guloggratis.dk/annonce/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/perfekt-veteran',
    titel: 'Perfekt veteran motorcykel til langtur',
    pris: '29.990 kr.',
  }, kilde);
  assert.equal(r.annonce.maerke, 'Perfekt', 'kortets gæt er forkert — det er hele grunden til trinet');

  berigMedDetalje(r.annonce, { 'Mærke': 'Honda', 'Modelårgang': '1978', 'Kilometer': '30.000' }, kilde);
  assert.equal(r.annonce.maerke, 'Honda');
  // Modellen er udledt igen med det rigtige mærke — "Perfekt" står ikke
  // længere som mærke og er tilbage i modellen, hvor sælgeren skrev det.
  assert.match(String(r.annonce.model), /Perfekt/);
});

test('fingerprint regnes om, når detaljesiden ændrer mærke eller model', () => {
  const { kilde } = bmwKort();
  const r = tilAnnonce({
    url: 'https://www.guloggratis.dk/annonce/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/perfekt-veteran',
    titel: 'Perfekt veteran motorcykel til langtur',
    pris: '29.990 kr.',
  }, kilde);
  const foer = r.annonce.fingerprint;
  berigMedDetalje(r.annonce, { 'Mærke': 'Honda', 'Kilometer': '30.000' }, kilde);
  assert.notEqual(r.annonce.fingerprint, foer,
    'et nyt mærke er en ny nøgle — ellers peger den gamle på en motorcykel, der ikke findes');
});

test('et oplyst tal fjerner mærkatet om, at tallet var gættet', () => {
  const { kilde } = bmwKort();
  const r = tilAnnonce({
    url: 'https://www.guloggratis.dk/annonce/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/honda-cbr-1000',
    titel: 'Honda CBR 1000 F',
    pris: '39.000 kr.',
  }, kilde);
  assert.deepEqual(r.annonce.udledte_felter, ['ccm'], 'ccm er udledt af modelnavnet');
  assert.equal(r.annonce.ccm, 1000);

  berigMedDetalje(r.annonce, { 'Motor (ccm)': '998 ccm', 'Kilometer': '10.000' }, kilde);
  assert.equal(r.annonce.ccm, 998, 'kildens tal vinder over vores gæt');
  assert.deepEqual(r.annonce.udledte_felter, [], 'og så er tallet ikke længere et gæt');
});

test('en tom detaljeside efterlader annoncen, som kortet gav den', () => {
  const { annonce, kilde } = bmwKort();
  const pris = annonce.pris_dkk, fp = annonce.fingerprint;
  const { laest } = berigMedDetalje(annonce, {}, kilde);
  assert.deepEqual(laest, []);
  assert.equal(annonce.pris_dkk, pris);
  assert.equal(annonce.fingerprint, fp);
  assert.equal(annonce.hk, null);
});

test('et felt, kilden lader stå tomt, overskriver ikke med null', () => {
  const { annonce, kilde } = bmwKort();
  berigMedDetalje(annonce, SPECS_BMW, kilde);
  berigMedDetalje(annonce, { 'Mærke': 'BMW', 'Hestekræfter': '', 'Motor (ccm)': '-' }, kilde);
  assert.equal(annonce.hk, 95, 'tom streng er ikke nul hestekræfter');
  assert.equal(annonce.ccm, 1150, '"-" er ikke nul ccm');
});

// ---------------------------------------------------------------
// MC Syd må ikke ændre opførsel
// ---------------------------------------------------------------

test('mcsyd henter ingen detaljesider og har stadig fast adresse', () => {
  const k = laesKilde('mcsyd');
  assert.ok(!k.detalje?.hent, 'MC Syd har alle felter på kortet');
  const r = tilAnnonce({
    url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20CB650R/181552?p=181552&m=1489',
    titel: 'Honda CB650R Naked', pris: '69.900', aargang: '2019', km: '12.000', ccm: '649', hk: '95',
  }, k);
  assert.ok(r.ok, r.grund);
  // by/postnr kommer fra faste_felter, som før — kortet har dem ikke.
  assert.equal(r.annonce.by, k.faste_felter.by);
  assert.equal(r.annonce.saelgertype, 'forhandler');
});

test('DETALJE_NORMALISERING dækker præcis de kolonner, tabellen har', () => {
  const { KOLONNER } = require('./db');
  for (const felt of Object.keys(DETALJE_NORMALISERING)){
    assert.ok(KOLONNER.includes(felt), `${felt} har ingen kolonne i eksterne_annoncer`);
  }
});
