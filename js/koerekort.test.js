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

/* GRÆNSEN ER SKREVET I KILOWATT, IKKE I HESTEKRÆFTER.

   A2 er 35 kW. Omregnet: 35 / 0,7355 = 47,59 hk. Her stod grænsen på 48,
   fordi nogen rundede op — men 48 hk ER 35,30 kW, altså over loftet. En
   Harley-Davidson Iron 883 med 48 hk oplyst fik derfor "Kørekort A2" på
   kortet, og det er ikke lovligt for en tyveårig.

   Testen regner i kW frem for at gentage tallet 47. Ændrer nogen grænsen
   tilbage til 48 — eller flytter loven sig til 40 kW — fejler den her, og
   den fejler med en begrundelse, ikke bare med "forventede 47". */
const KW_PR_HK = 0.7355;
const A2_KW = 35, A1_KW = 11;

test('effektgrænserne holder i kilowatt, som loven er skrevet i', () => {
  const grænser = new Function(
    src + '\nreturn { A1_MAX_HK, A2_MAX_HK, A1_MAX_CCM };')();

  const a2kW = grænser.A2_MAX_HK * KW_PR_HK;
  assert.ok(a2kW <= A2_KW,
    `A2-grænsen er ${grænser.A2_MAX_HK} hk = ${a2kW.toFixed(2)} kW, og loftet er ${A2_KW} kW`);
  // ... men den skal også ligge så tæt på loftet som et helt hk tillader,
  // ellers udelukker vi lovlige motorcykler.
  assert.ok((grænser.A2_MAX_HK + 1) * KW_PR_HK > A2_KW,
    `A2-grænsen er sat unødigt lavt: ${grænser.A2_MAX_HK + 1} hk ville stadig være under ${A2_KW} kW`);

  const a1kW = grænser.A1_MAX_HK * KW_PR_HK;
  assert.ok(Math.abs(a1kW - A1_KW) < 0.1,
    `A1-grænsen er ${grænser.A1_MAX_HK} hk = ${a1kW.toFixed(2)} kW, og loftet er ${A1_KW} kW`);
});

test('kendt effekt afgør kategorien', () => {
  assert.equal(koerekortForListing({ power: 14, ccm: 125 }), 'A1');
  assert.equal(koerekortForListing({ power: 44, ccm: 650 }), 'A2');
  assert.equal(koerekortForListing({ power: 47, ccm: 750 }), 'A2');  // 34,57 kW
  assert.equal(koerekortForListing({ power: 48, ccm: 883 }), 'A');   // 35,30 kW — Iron 883
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

   js/filtrering.js er et klassisk <script> uden module.exports, ligesom
   js/data.js: alt ligger i en IIFE, der lægger ét globalt objekt, Filtrering,
   i scope. Den rører ikke DOM'en, så den behøver ingen stubbe — kun
   js/data.js foran sig, hvor den henter passerKoerekort og hkEllerNull. */
const filtreringSrc = fs.readFileSync(path.join(__dirname, 'filtrering.js'), 'utf8');
const docStub = {
  readyState: 'loading',
  addEventListener(){}, getElementById(){ return null; },
  querySelector(){ return null; }, querySelectorAll(){ return []; },
};
const { koerekortSvar, UOPLYST } = new Function(
  src + ';' + filtreringSrc + 'return Filtrering;')();

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

/* ============ Mærkatet: koerekortMaerkat() i js/components.js ============

   HVORFOR DE HER TESTS FINDES.

   Runde 2's kritiker fandt fire fejl på det samme felt, og det er det ene
   felt på sitet, hvor et forkert svar kan koste køberen kørekortet:

     1. Honda GL 1100 Gold Wing, 1.100 ccm, effekt ukendt, bar mærkatet
        "Kørekort mindst A2" — mens den SAMME annonce blev sorteret FRA
        under Kørekort A2-filteret. Målt: 99 kort bar mærkatet, og alle 99
        var filtreret ud. Mærkat og filter var uenige.
     2. Harley-Davidson Iron 883 stod med "Kørekort A2" på 48 hk oplyst.
        48 hk er 35,30 kW, og A2-loftet er 35 kW.
     3. KTM RC 390, 373 ccm, stod med "Kørekort A" på 56 hk i fixturen.
     4. Den samme 373 ccm-motor fik A på RC 390 og A2 på Husqvarna
        Svartpilen 401.

   Fejl 2-4 var fejl i TALLENE (A2-grænsen og demofixturen) og er rettet i
   js/data.js. Fejl 1 var en fejl i MÆRKATET: en anden udregning end
   filterets. Testene her låser begge dele fast — grænseværdierne længere
   oppe, og herunder at mærkatet aldrig kan nævne en kategori, filteret ikke
   vil lukke ind.

   koerekortMaerkat() lever i js/components.js, som er et browserscript uden
   module.exports. Samme mønster som resten af filen: kilderne evalueres i
   én funktion, der giver navnene tilbage. Kun de globale, filen rører ved
   INDLÆSNING, skal stubbes — formatCcm/formatPower kommer fra js/data.js,
   der allerede er evalueret ind i den samme funktion. */
const komponentSrc = fs.readFileSync(path.join(__dirname, 'components.js'), 'utf8');
const { koerekortMaerkat, eksternErNy, cvrKontrolOK } = new Function(
  'document', 'window', 'Store', 'localStorage',
  src + '\n;\n' + komponentSrc + '\nreturn { koerekortMaerkat, eksternErNy, cvrKontrolOK };'
)(docStub, {}, { getFavorites: () => [], getCompare: () => [], getUser: () => null }, undefined);

/* De fem motorcykler, kritikeren navngav. Tallene er dem, der står i
   lageret i dag — de tre første i js/data.js, de to sidste i basen. */
const RC390      = { brand:'KTM', model:'RC 390', ccm:373, power:44 };
const IRON883    = { brand:'Harley-Davidson', model:'Iron 883', ccm:883, power:52 };
const SVARTPILEN = { brand:'Husqvarna', model:'Svartpilen 401', ccm:373, power:44 };
const GOLDWING   = { brand:'Honda', model:'GL 1100 Gold Wing', ccm:1100, power:null, isExternal:true };
const BREAKOUT   = { brand:'Harley-Davidson', model:'FXBR Breakout', ccm:1868, power:94, isExternal:true };

test('Gold Wing: mærkatet nævner ingen kategori, når effekten mangler', () => {
  const m = koerekortMaerkat(GOLDWING);
  assert.equal(m.kode, null, 'en 1.100 ccm uden hk må ikke få en kategori');
  assert.equal(m.tekst, 'Kørekort ikke afgjort');
  assert.ok(!/A2/.test(m.tekst), `mærkatet må ikke nævne A2: "${m.tekst}"`);
  /* Den ærlige sætning skal blive stående. Den er hele grunden til, at vi
     tør lade være med at gætte — og kritikeren fremhævede den. */
  assert.equal(m.forklaring,
    'Over 125 ccm kræver mindst A2. Effekten står ikke i annoncen hos kilden, så vi kan ikke afgøre, om den også kan køres på A2.');
});

test('Iron 883: 48 hk er over A2-loftet, 47 er under', () => {
  // Kritikerens tal: 48 hk = 35,30 kW, og loftet er 35 kW.
  assert.equal(koerekortMaerkat({ ...IRON883, power:48 }).kode, 'A');
  assert.equal(koerekortMaerkat({ ...IRON883, power:47 }).kode, 'A2');
  // Og tallet, der står i lageret i dag:
  assert.equal(koerekortMaerkat(IRON883).kode, 'A');
});

test('RC 390 og Svartpilen 401: samme motor, samme svar', () => {
  // Fixturen påstod 56 hk på RC 390 og gav den A, mens Svartpilen fik A2 —
  // to forskellige svar om den samme 373 ccm-motor.
  assert.equal(RC390.ccm, SVARTPILEN.ccm, 'testen er kun gyldig på samme slagvolumen');
  assert.equal(RC390.power, SVARTPILEN.power, 'testen er kun gyldig på samme effekt');
  assert.equal(koerekortMaerkat(RC390).kode, koerekortMaerkat(SVARTPILEN).kode);
  assert.equal(koerekortMaerkat(RC390).kode, 'A2');
});

test('Breakout: 1.868 ccm og 94 hk er A, og det tør vi godt sige', () => {
  assert.equal(koerekortMaerkat(BREAKOUT).kode, 'A');
  assert.equal(koerekortMaerkat(BREAKOUT).tekst, 'Kørekort A');
});

test('MÆRKAT OG FILTER MÅ ALDRIG VÆRE UENIGE', () => {
  /* Den egentlige regel, og den, der var brudt. Nævner mærkatet en
     kategori, SKAL passerKoerekort() lukke annoncen ind under netop den
     kategori — ellers står der ét svar på kortet og et andet i filteret,
     og køberen kan ikke se hvilket der gælder.

     Prøven køres over hele krydsproduktet af de slagvolumener og effekter,
     der findes i lageret, plus alle stavemåder for "ukendt". */
  const ccmListe = [null, 0, 50, 125, 126, 373, 400, 650, 883, 1100, 1254, 1833, 1868];
  const hkListe  = [...UKENDT_HK, 5, 11, 14, 15, 20, 34, 44, 47, 48, 52, 56, 94, 100, 310];
  let naevnt = 0;
  for (const ccm of ccmListe){
    for (const power of hkListe){
      const l = { ccm, power };
      const m = koerekortMaerkat(l);
      if (!m.kode) continue;
      naevnt++;
      assert.ok(passerKoerekort(l, m.kode),
        `mærkatet siger ${m.kode} på ${ccm} ccm / ${JSON.stringify(power)} hk, men filteret sorterer den fra`);
    }
  }
  assert.ok(naevnt > 50, `testen skal faktisk nævne kategorier — den nævnte kun ${naevnt}`);
});

test('mærkatet siger aldrig "mindst" om en kategori', () => {
  /* "Kørekort mindst A2" er isoleret set sandt om alt over 125 ccm, men
     læses som "A2 er nok". Det er præcis den forveksling, der stod på 99
     kort. Ordet må ikke komme tilbage — og mærkatet må heller ikke nævne en
     kategori med en anden ordlyd, når vi ikke har udledt den. */
  for (const ccm of [126, 400, 883, 1100, 1868]){
    for (const power of UKENDT_HK){
      const t = koerekortMaerkat({ ccm, power }).tekst;
      assert.ok(!/mindst/i.test(t), `mærkatet siger "mindst" på ${ccm} ccm: "${t}"`);
      assert.ok(!/A1|A2|A\b/.test(t.replace('Kørekort ', '')),
        `mærkatet nævner en kategori uden dækning på ${ccm} ccm: "${t}"`);
    }
  }
});

test('selvmodsigende tal giver ingen kategori', () => {
  /* Et sammenløbet felt hos kilden — fx ccm læst ind i hk-feltet — gav før
     en kategori regnet på et tal, ingen tror på. 125 ccm med 300 hk findes
     ikke. Grænsen ligger langt over alt virkeligt (Kawasaki H2R er
     0,31 hk/cm³), så den fanger kun umuligheder, ikke kraftige mc'er. */
  assert.equal(koerekortMaerkat({ ccm:125, power:300 }).kode, null);
  assert.equal(koerekortMaerkat({ ccm:50, power:125 }).kode, null);
  assert.equal(koerekortMaerkat({ ccm:998, power:310 }).kode, 'A');  // H2R, 0,31
  assert.equal(koerekortMaerkat({ ccm:1103, power:215 }).kode, 'A'); // Panigale V4
  assert.equal(koerekortMaerkat({ ccm:250, power:45 }).kode, 'A2');  // 250 SX-F, 0,18
});

test('hverken kubik eller effekt: "Kørekort ukendt", ikke en kategori', () => {
  const m = koerekortMaerkat({ ccm:null, power:null });
  assert.equal(m.kode, null);
  assert.equal(m.tekst, 'Kørekort ukendt');
});

/* ============ De to andre ærlighedsregler i den samme fil ============ */

test('CVR: modulus 11 afviser kritikerens nummer og godtager et rigtigt', () => {
  /* 95854101 er demoforhandlerens nummer. Kritikeren regnede efter i hånden:
     9·2+5·7+8·6+5·5+4·4+1·3+0·2+1·1 = 146, og 146 mod 11 = 3, ikke 0.
     Annoncesiden tilbød alligevel at slå det op i CVR-registret. */
  assert.equal(cvrKontrolOK('95854101'), false);
  /* Og det andet demonummer, kritikeren så på annonce 1017 — 37063717 —
     fejler også: 6+49+0+30+12+21+2+7 = 127, og 127 mod 11 = 6.
     Begge numre i demolageret er altså opdigtede, og annoncesiden tilbød at
     slå dem op. */
  assert.equal(cvrKontrolOK('37063717'), false);
  // Erhvervsstyrelsens eget nummer, som kontrol på at reglen ikke bare
  // siger nej til alt: 2+0+6+25+0+24+2+7 = 66, og 66 mod 11 = 0.
  assert.equal(cvrKontrolOK('10150817'), true);
  assert.equal(cvrKontrolOK('1015081'), false);        // syv cifre
  assert.equal(cvrKontrolOK(''), false);
  assert.equal(cvrKontrolOK(null), false);
  assert.equal(cvrKontrolOK('DK 10 15 08 17'), true);  // mellemrum og landekode
});

test('Ny eller brugt læses af kildens egen adresse — eller slet ikke', () => {
  // 162 af de 332 indekserede ligger under /Produkter/Motorcykel/Ny/.
  assert.equal(eksternErNy({ externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20MSX%20125/124206' }), true);
  assert.equal(eksternErNy({ externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Sym%20XS%20125/181552' }), false);
  // En kilde uden segmentet må ikke få et gæt.
  assert.equal(eksternErNy({ externalUrl: 'https://www.guloggratis.dk/annonce/abc/en-flot-mc' }), null);
  assert.equal(eksternErNy({}), null);
});
