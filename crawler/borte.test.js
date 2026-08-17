/* Tests for værnet på bortemarkeringen. Kør: npm test

   Det her er den betingelse, der står mellem et kosmetisk skift hos kilden og
   et tomt katalog. `markerBorte()` kørte engang på hver fuld kørsel uden nogen
   betingelse på, hvor meget kørslen havde fundet — og fem linjer tidligere
   logges "ingen annoncer fundet. Selectors eller sidestruktur bør efterses".
   Tre kørsler med nul kort, og alle 332 rækker fik status 'borte', hvorefter
   politikken "ekstern: offentlig laesning" (status <> 'borte') skjulte dem.
   332 annoncer til 0, udløst af et omdøbt CSS-navn.

   ANDEN RUNDE. Første udgave af værnet lukkede den vej, men åbnede en omvej,
   og DEN HER FIL ASSERTEREDE OMVEJEN SOM ØNSKET ADFÆRD:

       test('en helt ny kilde uden tidligere fund må markere', () => {
         const dom = bortemarkeringVurdering(48, [0, 0, 0]);
         assert.equal(dom.tilladt, true);

   Begrundelsen var reel — en ny kilde skal kunne komme videre — men [0,0,0] er
   ikke kun en ny kildes historik. Det er også MC Syds historik tre kørsler
   efter et DOM-skift, fordi en blokeret kørsel stadig afsluttes med `fundet:
   0`. Testen låste altså hullet fast, og det er værre end ingen test: den
   næste, der retter fejlen, får en rød suite og tror, han har ødelagt noget.

   Testene nedenfor holder derfor de to tilfælde op mod hinanden med det ene
   tal, der kan skelne dem — antallet af aktive rækker for kilden.

   Selve markeringen kræver en database. Vurderingen gør ikke, og det er med
   vilje. Men efter C-011 er den rene funktion ikke nok alene: hullet lå i,
   hvad `markerBorte()` FODREDE den med, ikke i funktionen selv. Derfor kører
   den nederste halvdel af filen den rigtige `markerBorte()` mod en
   attrap-klient og spørger om ét: blev der overhovedet sendt et UPDATE. */

const test = require('node:test');
const assert = require('node:assert');
const {
  bortemarkeringVurdering, markerBorte,
  BORTE_MIN_ANDEL, REFERENCE_KOERSLER, KOERSLER_FOER_BORTE,
} = require('./db');

// Driftlageret ved audit: 332 aktive annoncer fra MC Syd.
const TIDLIGERE = [332, 330, 331];
const AKTIVE = 332;

/* ---------- Vurderingen ---------- */

test('nul fundet markerer INGENTING — heller ikke tre gange i træk', () => {
  // Tre kørsler er den tærskel, markeringen bruger. Et DOM-skift er ikke et
  // hikke: det gentager sig hver gang, så alle tre skal afvises hver for sig.
  for (let koersel = 1; koersel <= 3; koersel++){
    const dom = bortemarkeringVurdering(0, TIDLIGERE, AKTIVE);
    assert.equal(dom.tilladt, false, `kørsel ${koersel} med nul fund skal afvises`);
    assert.match(dom.grund, /nul annoncer/);
  }
});

test('et fald på mere end 40 % holdes tilbage', () => {
  // 132 af 332 er 40 % — under grænsen på 60 %.
  const dom = bortemarkeringVurdering(132, TIDLIGERE, AKTIVE);
  assert.equal(dom.tilladt, false);
  // Begrundelsen skal bære tallene. En log, der bare siger "sprunget over",
  // efterlader operatøren med at gætte, om kilden er tom eller vi er brækkede.
  assert.match(dom.grund, /132/);
  assert.match(dom.grund, /332/);
});

test('et normalt lager markerer som før', () => {
  const dom = bortemarkeringVurdering(325, TIDLIGERE, AKTIVE);
  assert.equal(dom.tilladt, true);
});

test('grænsen ligger præcis hvor den er skrevet, i begge retninger', () => {
  const reference = 332;
  const graense = reference * BORTE_MIN_ANDEL;   // 199,2
  assert.equal(bortemarkeringVurdering(Math.ceil(graense), [reference], reference).tilladt, true,
    'lige på eller over grænsen skal markere');
  assert.equal(bortemarkeringVurdering(Math.floor(graense), [reference], reference).tilladt, false,
    'under grænsen skal holdes tilbage');
});

test('procenten rundes NED, så en afvisning ikke ser ud som en grænsesag', () => {
  /* 199 af 332 er 59,9 %. Med afrunding til nærmeste skrev loggen "(60 % —
     grænsen er 60 %)", og en operatør læser det som "den var på grænsen og
     blev afvist alligevel". */
  const dom = bortemarkeringVurdering(199, [332], 332);
  assert.equal(dom.tilladt, false);
  assert.match(dom.grund, /59 %/);
});

test('referencen er det HØJESTE af de tidligere, ikke medianen', () => {
  /* Uden maksimum glider en gradvis udhuling igennem: 55 % tre gange i træk
     er 17 % af udgangspunktet, og hver enkelt kørsel ville se lovlig ud målt
     mod sin nærmeste nabo. Med maksimum måles der mod toppen af vinduet. */
  assert.equal(bortemarkeringVurdering(190, [332, 200, 195], 190).tilladt, false,
    '190 mod et maksimum på 332 er 57 % og skal afvises');
  assert.equal(bortemarkeringVurdering(190, [200, 195, 198], 190).tilladt, true,
    '190 mod et maksimum på 200 er 95 % og er i orden');
});

/* ---------- C-011: ny kilde ER IKKE det samme som en brækket parser ----------
   De to har samme kørselshistorik. De har ikke samme rækketal, og det er hele
   forskellen. Den gamle udgave af denne test asserterede det modsatte. */

test('en helt ny kilde uden fund OG uden rækker må markere', () => {
  // En kilde, hvis tre første kørsler alle stod på 0, skal kunne komme videre.
  // Der er intet fald at beskytte imod: markeringen kan ikke ramme en række,
  // for der ER ingen.
  const dom = bortemarkeringVurdering(48, [0, 0, 0], 0);
  assert.equal(dom.tilladt, true);
  assert.match(dom.grund, /ny kilde/);
});

test('SAMME historik, men 332 aktive rækker: markering NÆGTES', () => {
  /* Omvejen fra runde 1, ordret. Tre kørsler med nul fund blev afvist af
     værnet — og hver af dem blev stadig afsluttet i crawl_koersler med
     `fundet: 0`. Historikken var derefter [0,0,0], nullerne blev filtreret
     fra, og den tomme mængde blev læst som "ny kilde". Fjerde kørsel behøvede
     at finde ÉN annonce, og 327 af 332 rækker gik til 'borte'.

     Værnet producerede selv den historik, der åbnede omvejen. Rækketallet er
     det, historikken ikke kunne sige. */
  for (const fundet of [1, 5, 48, 199]){
    const dom = bortemarkeringVurdering(fundet, [0, 0, 0], 332);
    assert.equal(dom.tilladt, false, `fundet=${fundet} efter tre nul-kørsler skal afvises`);
    assert.match(dom.grund, /332/);
  }
  // Og når parseren er tilbage for alvor, må markeringen køre igen.
  assert.equal(bortemarkeringVurdering(330, [0, 0, 0], 332).tilladt, true);
});

test('rækketallet kan ikke glemmes — funktionen nægter at dømme uden det', () => {
  /* Et værn, man kan slå fra ved at udelade et argument, er ikke et værn.
     Uden dette kast ville et fremtidigt kald med to argumenter falde tilbage
     til præcis den adfærd, C-011 blev genåbnet for. */
  assert.throws(() => bortemarkeringVurdering(300, [332, 332, 332]), /aktiveRaekker/);
  for (const skrald of [null, '332', NaN, Infinity, -1]){
    assert.throws(() => bortemarkeringVurdering(300, [332], skrald), /aktiveRaekker/,
      `aktiveRaekker=${String(skrald)} skal kastes, ikke gættes`);
  }
});

test('rod i tallene læses som nul, ikke som uendeligt', () => {
  // crawl_koersler.fundet er `int not null default 0`, men vurderingen får
  // sit tal fra kørslen i hukommelsen. Et undefined dér må aldrig blive en
  // godkendelse ved et uheld.
  for (const skrald of [null, undefined, '', NaN, 'mange', -5]){
    assert.equal(bortemarkeringVurdering(skrald, TIDLIGERE, AKTIVE).tilladt, false,
      `fundet=${JSON.stringify(skrald)} skal afvises`);
  }
  // Og skrald blandt de TIDLIGERE tal må ikke løfte referencen.
  assert.equal(bortemarkeringVurdering(300, [null, undefined, 'x'], 300).tilladt, true);
});

/* ---------- Den gradvise udhuling: hvor hurtigt må et fald gå? ----------
   Værnet er en hastighedsbegrænser, ikke et gulv. Hvert fald på under 40 %
   slipper igennem, og bagefter er både rækketallet og historikken faldet med.
   Spørgsmålet er kun, hvor mange kørsler et trin koster. Se DECISIONS.md. */

/* Værste tilfælde: hver kørsel finder det ALLERLAVESTE, værnet vil tillade,
   og alt det, den ikke fandt, bliver markeret. Hurtigere kan et fald ikke gå.
   Returnerer rækketallet efter hver kørsel. */
function udhulingsforloeb(vindue, antalKoersler){
  let aktive = 332;
  let historik = new Array(vindue).fill(332);
  const spor = [];
  for (let i = 0; i < antalKoersler; i++){
    let fundet = null;
    for (let n = 1; n <= aktive; n++){
      if (bortemarkeringVurdering(n, historik, aktive).tilladt){ fundet = n; break; }
    }
    if (fundet === null) break;   // værnet lukkede helt i
    aktive = fundet;
    historik = [fundet, ...historik].slice(0, vindue);
    spor.push(aktive);
  }
  return spor;
}

test('et referencevindue på tre kørsler lader 332 blive til 27 på tretten kørsler', () => {
  /* Critic's måling fra runde 1, låst her som det, der IKKE er godt nok:
     332 -> 200 -> 120 -> 72 -> 44 -> 27, tre kørsler pr. trin. */
  const spor = udhulingsforloeb(3, 20);
  assert.equal(spor[13], 27);
  assert.equal(spor.indexOf(27) + 1, 13, 'bunden nås på trettende kørsel');
});

test('vinduet på tolv kørsler koster hvert 40 %-trin tolv kørsler i stedet for tre', () => {
  assert.equal(REFERENCE_KOERSLER, 12);
  const spor = udhulingsforloeb(REFERENCE_KOERSLER, 60);
  assert.equal(spor[13], 120, 'de samme fjorten kørsler skal ende på 120, ikke 27');
  assert.equal(spor.indexOf(27) + 1, 49,
    'samme fem trin, men de koster nu niogfyrre kørsler i stedet for tretten');
  // Stadig ikke et gulv — og det skal det ikke lade som om, det er.
  assert.equal(spor[59], 27);
});

/* ---------- markerBorte() mod en attrap-klient ----------
   Hullet lå ikke i vurderingen, men i hvad markerBorte() gav den. Derfor
   køres den RIGTIGE funktion her, mod en attrap der noterer ét: blev der
   sendt et UPDATE. Ingen database røres. */

function attrapKlient({ fundetPrKoersel = [], aktive = 0, kandidater = 0 } = {}){
  const sendteOpdateringer = [];
  const koersler = fundetPrKoersel.map((fundet, i) => ({
    // Nyeste først, som forespørgslen i markerBorte() beder om.
    startet: new Date(Date.UTC(2026, 7, 20 - i)).toISOString(),
    fundet,
  }));

  function byg(tabel){
    const kald = { opdatering: null, hoved: false, limit: null };
    async function svar(){
      if (kald.opdatering){
        sendteOpdateringer.push({ tabel, felter: kald.opdatering });
        return { data: Array.from({ length: kandidater }, (_, i) => ({ id: i + 1 })), error: null };
      }
      if (tabel === 'crawl_koersler'){
        return { data: koersler.slice(0, kald.limit || koersler.length), error: null };
      }
      if (kald.hoved) return { data: null, count: aktive, error: null };
      return { data: [], error: null };
    }
    const b = {
      select(_kolonner, muligheder){ if (muligheder && muligheder.head) kald.hoved = true; return b; },
      update(felter){ kald.opdatering = felter; return b; },
      eq(){ return b; }, not(){ return b; }, lt(){ return b; }, order(){ return b; },
      limit(n){ kald.limit = n; return b; },
      then(ok, fejl){ return svar().then(ok, fejl); },
    };
    return b;
  }

  return { from: byg, sendteOpdateringer };
}

test('attrappen læser det vindue, koden faktisk beder om', () => {
  // Selvkontrol: er attrappen forkert, siger de øvrige prøver ingenting.
  const sb = attrapKlient({ fundetPrKoersel: new Array(20).fill(332), aktive: 332 });
  const b = sb.from('crawl_koersler').select('startet, fundet').limit(REFERENCE_KOERSLER);
  return b.then(({ data }) => assert.equal(data.length, REFERENCE_KOERSLER));
});

test('fundet=0: der sendes IKKE et UPDATE', async () => {
  const sb = attrapKlient({ fundetPrKoersel: [332, 332, 332], aktive: 332, kandidater: 332 });
  const r = await markerBorte(sb, 1, 0);
  assert.deepEqual(sb.sendteOpdateringer, []);
  assert.equal(r.antal, 0);
  assert.equal(r.sprunget_over, true);
  assert.match(r.grund, /nul annoncer/);
});

test('tre nul-kørsler og så fundet=1: der sendes IKKE et UPDATE', async () => {
  /* C-011's omvej, kørt gennem den rigtige markerBorte(). Hver af de tre
     blokerede kørsler er afsluttet med fundet: 0 — som de skal — så
     historikken ER [0,0,0]. Uden rækketallet blev det læst som "ny kilde"
     og 327 rækker gik til 'borte'. */
  for (const [historik, fundet] of [
    [[0, 332, 332], 0],
    [[0, 0, 332], 0],
    [[0, 0, 0], 1],
    [[0, 0, 0], 5],
  ]){
    const sb = attrapKlient({ fundetPrKoersel: historik, aktive: 332, kandidater: 327 });
    const r = await markerBorte(sb, 1, fundet);
    assert.deepEqual(sb.sendteOpdateringer, [],
      `historik=[${historik}] fundet=${fundet} må ikke sende et UPDATE`);
    assert.equal(r.antal, 0);
    assert.equal(r.sprunget_over, true);
  }
});

test('et langsomt fald over mange kørsler: trinet under grænsen sendes IKKE', async () => {
  /* Fjerde trin i critic's forløb: kilden er allerede nede på 200, og en
     kørsel finder 120. Med tre kørslers hukommelse var det tilladt. Med tolv
     står 332 stadig i vinduet, og 120 af 332 er 36 %. */
  const historik = [200, 200, 200, 332, 332, 332, 332, 332, 332, 332, 332, 332];
  const sb = attrapKlient({ fundetPrKoersel: historik, aktive: 200, kandidater: 80 });
  const r = await markerBorte(sb, 1, 120);
  assert.deepEqual(sb.sendteOpdateringer, []);
  assert.equal(r.sprunget_over, true);
  assert.match(r.grund, /332/);
});

test('en kørsel, der svarer normalt, markerer STADIG', async () => {
  // 330 af 332. Det er den kørsel, hele mekanikken findes for at betjene:
  // to annoncer er solgt, og de skal forsvinde fra kataloget.
  const sb = attrapKlient({ fundetPrKoersel: [332, 331, 332], aktive: 332, kandidater: 2 });
  const r = await markerBorte(sb, 1, 330);
  assert.equal(sb.sendteOpdateringer.length, 1);
  assert.deepEqual(sb.sendteOpdateringer[0], { tabel: 'eksterne_annoncer', felter: { status: 'borte' } });
  assert.equal(r.antal, 2);
  assert.equal(r.sprunget_over, false);
});

test('færre end tre afsluttede kørsler markerer ikke — og tæller ikke rækker', async () => {
  // Ingen annonce KAN have manglet i tre kørsler, når der kun har været to.
  const sb = attrapKlient({ fundetPrKoersel: [332, 332], aktive: 332, kandidater: 332 });
  const r = await markerBorte(sb, 1, 330);
  assert.deepEqual(sb.sendteOpdateringer, []);
  assert.equal(r.sprunget_over, false);
  assert.match(r.grund, new RegExp(`færre end ${KOERSLER_FOER_BORTE === 3 ? 'tre' : KOERSLER_FOER_BORTE}`));
});

test('kan rækkerne ikke tælles, markeres der ikke — værnet fejler lukket', async () => {
  /* Uden rækketallet kan en ny kilde ikke skelnes fra en brækket parser.
     Så hellere lade kataloget stå end at gætte. */
  const sb = attrapKlient({ fundetPrKoersel: [332, 332, 332], aktive: null, kandidater: 332 });
  const r = await markerBorte(sb, 1, 330);
  assert.deepEqual(sb.sendteOpdateringer, []);
  assert.equal(r.sprunget_over, true);
  assert.match(r.grund, /tælle/);
});

test('en ægte ny kilde blokeres ikke af værnet', async () => {
  // Nul aktive rækker, tre kørsler uden fund, og så kommer de første 48.
  // Markeringen må gerne køre; den kan ikke ramme noget.
  const sb = attrapKlient({ fundetPrKoersel: [0, 0, 0], aktive: 0, kandidater: 0 });
  const r = await markerBorte(sb, 2, 48);
  assert.equal(r.sprunget_over, false);
  assert.equal(r.antal, 0);
});
