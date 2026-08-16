/* Tests for kørekortudledningen i js/data.js. Kør: npm test

   Kørekortet er den ene beregning på siden, hvor et forkert svar kan koste
   køberen kørekortet og motorcyklen. Derfor er det også det ene sted i js/,
   der har tests.

   js/data.js er et browser-script uden module.exports — det indlæses med
   <script> og lægger sine funktioner i det globale scope. Filen evalueres
   derfor i en funktion, der giver de to navne tilbage. Alternativet var at
   bygge sitet om til moduler for at kunne teste 30 linjer; det her koster
   ingenting og tester præcis den kode, browseren kører. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const { koerekortForListing, passerKoerekort } = new Function(
  src + '\nreturn { koerekortForListing, passerKoerekort };')();

/* Ukendt effekt har mange stavemåder. Databasen skriver null, en tom
   formular skriver "", MC Syd skriver "-", og en kilde, der ikke kan finde
   tallet, kan finde på at skrive 0. De betyder alle det samme. */
const UKENDT_HK = [null, undefined, '', 0, '0', '-', 'ukendt', 'Ikke oplyst'];

test('ukendt effekt over 125 ccm giver intet svar — ikke A2', () => {
  // A2 har ingen slagvolumengrænse, så uden hk kan A2 og A ikke skelnes.
  // Svarede den A2 her, fortalte vi en 20-årig, at en Honda GL 1800 på
  // 1833 ccm var lovlig for ham.
  for (const hk of UKENDT_HK){
    assert.equal(koerekortForListing({ power: hk, ccm: 1833 }), null,
      `power=${JSON.stringify(hk)} på 1833 ccm skal give null`);
    assert.equal(koerekortForListing({ power: hk, ccm: 1254 }), null,
      `power=${JSON.stringify(hk)} på 1254 ccm skal give null`);
    assert.equal(koerekortForListing({ power: hk, ccm: 126 }), null,
      `power=${JSON.stringify(hk)} på 126 ccm skal give null`);
  }
});

test('ukendt effekt til og med 125 ccm er stadig A1', () => {
  // A1 har en ccm-grænse, og derfor kan den afgøres uden effekt: over 125
  // er A1 udelukket uanset hk, og på 125 findes der ikke en maskine med
  // over 15 hk i fri handel.
  for (const hk of UKENDT_HK){
    assert.equal(koerekortForListing({ power: hk, ccm: 125 }), 'A1',
      `power=${JSON.stringify(hk)} på 125 ccm skal give A1`);
  }
});

test('kendt effekt afgør kategorien', () => {
  assert.equal(koerekortForListing({ power: 14, ccm: 125 }), 'A1');
  assert.equal(koerekortForListing({ power: 44, ccm: 650 }), 'A2');
  assert.equal(koerekortForListing({ power: 48, ccm: 750 }), 'A2');
  assert.equal(koerekortForListing({ power: 49, ccm: 750 }), 'A');
  assert.equal(koerekortForListing({ power: 95, ccm: 900 }), 'A');
  assert.equal(koerekortForListing({ power: '44', ccm: 650 }), 'A2'); // tal som tekst fra databasen
  assert.equal(koerekortForListing({ power: '53', ccm: 650 }), 'A');
});

test('en annonce uden både ccm og hk får ingen kategori', () => {
  assert.equal(koerekortForListing({ power: null, ccm: null }), null);
  assert.equal(koerekortForListing({}), null);
});

test('A2-filteret viser ikke annoncer, hvor effekten mangler', () => {
  // Et filter er et løfte: vælger man A2, skal alt i listen kunne køres på
  // A2. En annonce, vi ikke kan svare for, hører ikke til der.
  for (const hk of UKENDT_HK){
    assert.equal(passerKoerekort({ power: hk, ccm: 1200 }, 'A2'), false,
      `power=${JSON.stringify(hk)} på 1200 ccm må ikke passere A2-filteret`);
  }
  assert.equal(passerKoerekort({ power: 44, ccm: 650 }, 'A2'), true);
  assert.equal(passerKoerekort({ power: 95, ccm: 900 }, 'A2'), false);
});

test('A2-filteret tager mc, der kan effektbegrænses, med', () => {
  assert.equal(passerKoerekort({ power: 95, ccm: 900, kanNedsaettesA2: true }, 'A2'), true);
});

test('A1-filteret kan afgøres uden effekt, fordi A1 har en ccm-grænse', () => {
  for (const hk of UKENDT_HK){
    assert.equal(passerKoerekort({ power: hk, ccm: 125 }, 'A1'), true,
      `power=${JSON.stringify(hk)} på 125 ccm skal passere A1-filteret`);
    assert.equal(passerKoerekort({ power: hk, ccm: 600 }, 'A1'), false,
      `power=${JSON.stringify(hk)} på 600 ccm må ikke passere A1-filteret`);
  }
  assert.equal(passerKoerekort({ power: 14, ccm: 125 }, 'A1'), true);
  assert.equal(passerKoerekort({ power: 20, ccm: 125 }, 'A1'), false);
});

test('A-filteret og "intet filter" dækker alt', () => {
  assert.equal(passerKoerekort({ power: null, ccm: 1833 }, 'A'), true);
  assert.equal(passerKoerekort({ power: 14, ccm: 125 }, 'A'), true);
  assert.equal(passerKoerekort({ power: null, ccm: null }, null), true);
});

/* ============ koerekortSvar() i js/search.js ============

   Søgesidens tre-svars-indpakning om passerKoerekort(). Den ligger i
   js/search.js og ikke her, men den testes HER — filen er allerede med i
   `npm test`, og de to hører uadskilleligt sammen: koerekortSvar() kender
   ikke en eneste kørekortgrænse, den stiller bare passerKoerekort() det
   samme spørgsmål to gange. Ændrer man den ene uden den anden, går det galt
   i tavshed, og det er præcis dét, testene nedenfor findes for.

   REGRESSIONEN, de er skrevet efter. Prøven satte `proeve.power = 0` som
   "gunstigst tænkelige effekt". Det virkede, indtil hkEllerNull() blev
   rettet til at læse 0 som UKENDT (den rettelse er rigtig — den lukkede et
   falsk A2-stempel på 1200-kubiks maskiner). Derefter var 0 ikke længere en
   kendt værdi: A2-grenen svarede false, prøven fejlede, og koerekortSvar()
   svarede false i stedet for UOPLYST. Ét klik på A2 skjulte 332 annoncer og
   meldte 0 skjulte.

   Ingen test fangede det, fordi ingen test rørte js/search.js. En fejl, der
   gør en ærlighedsfunktion tavs, giver ingen fejlmeddelelse — den giver bare
   et mindre tal. Så den skal fanges her.

   js/search.js evalueres med de samme stubbe som browsermoduler får i
   scripts/shared.js: filen registrerer kun en DOMContentLoaded-lytter, når
   readyState er 'loading', og rører ellers ikke DOM'en på øverste niveau. */
const searchSrc = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');
const docStub = {
  readyState: 'loading',
  addEventListener(){}, getElementById(){ return null; },
  querySelector(){ return null; }, querySelectorAll(){ return []; },
};
const { koerekortSvar, UOPLYST } = new Function(
  'document', 'window', 'Store', 'history',
  src + '\n;\n' + searchSrc + '\nreturn { koerekortSvar, UOPLYST };'
)(docStub, {}, {}, {});

test('A2 uden oplyst effekt svarer UOPLYST — ikke false', () => {
  // Det er hele pointen: annoncen vises ikke, men den TÆLLES, så linjen
  // "X annoncer er ikke vist, fordi kørekortkategori ikke er oplyst på dem"
  // kan stå over resultatet. Svarer den false, forsvinder de i tavshed.
  for (const hk of UKENDT_HK){
    assert.equal(koerekortSvar({ power: hk, ccm: 1200 }, 'A2'), UOPLYST,
      `power=${JSON.stringify(hk)} på 1200 ccm skal give UOPLYST for A2`);
    assert.equal(koerekortSvar({ power: hk, ccm: 600 }, 'A2'), UOPLYST,
      `power=${JSON.stringify(hk)} på 600 ccm skal give UOPLYST for A2`);
  }
});

test('A1 uden oplyst effekt kan stadig afgøres på slagvolumen alene', () => {
  // A1 HAR en ccm-grænse, så her er svaret kendt uden hk — og et kendt
  // svar må aldrig blive til UOPLYST, for så ville filteret skjule annoncer,
  // det udmærket kunne bedømme.
  for (const hk of UKENDT_HK){
    assert.equal(koerekortSvar({ power: hk, ccm: 125 }, 'A1'), true,
      `power=${JSON.stringify(hk)} på 125 ccm skal passere A1`);
    assert.equal(koerekortSvar({ power: hk, ccm: 600 }, 'A1'), false,
      `power=${JSON.stringify(hk)} på 600 ccm skal være et rigtigt nej for A1`);
  }
});

test('oplyst effekt giver et rigtigt ja eller nej — aldrig UOPLYST', () => {
  assert.equal(koerekortSvar({ power: 40, ccm: 600 }, 'A2'), true);
  assert.equal(koerekortSvar({ power: 120, ccm: 1000 }, 'A2'), false);
  assert.equal(koerekortSvar({ power: 14, ccm: 125 }, 'A1'), true);
  assert.equal(koerekortSvar({ power: 20, ccm: 125 }, 'A1'), false);
  assert.equal(koerekortSvar({ power: 120, ccm: 1000 }, 'A'), true);
});

test('ukendt slagvolumen svarer UOPLYST for A1', () => {
  // Uden ccm kan A1 ikke afgøres — grænsen ER slagvolumen.
  for (const ccm of [null, undefined, '', 0, '0', '-']){
    assert.equal(koerekortSvar({ power: 10, ccm }, 'A1'), UOPLYST,
      `ccm=${JSON.stringify(ccm)} skal give UOPLYST for A1`);
  }
});

test('prøveværdierne skal tælle som OPLYSTE — 0 gør ikke', () => {
  /* Vagthunden. koerekortSvar() sætter power og ccm til 1, fordi 1 er den
     mindste værdi, js/data.js læser som en oplysning. Skriver nogen 0 igen,
     fordi "det er jo det laveste", fejler den her test i stedet for at lade
     332 annoncer forsvinde uden en linje om hvorfor. */
  assert.equal(passerKoerekort({ power: 1, ccm: 1 }, 'A2'), true,
    'prøven med power=1 skal passere A2 — ellers svarer koerekortSvar false i stedet for UOPLYST');
  assert.equal(passerKoerekort({ power: 1, ccm: 1 }, 'A1'), true,
    'prøven med ccm=1 skal passere A1');
  assert.equal(passerKoerekort({ power: 0, ccm: 1 }, 'A2'), false,
    '0 hk er UKENDT effekt i hkEllerNull() og må aldrig bruges som prøveværdi');
});
