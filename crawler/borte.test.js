/* Tests for værnet på bortemarkeringen. Kør: npm test

   Det her er den betingelse, der står mellem et kosmetisk skift hos kilden og
   et tomt katalog. `markerBorte()` kørte før på hver fuld kørsel uden nogen
   betingelse på, hvor meget kørslen havde fundet — og fem linjer tidligere
   logges "ingen annoncer fundet. Selectors eller sidestruktur bør efterses".
   Tre kørsler med nul kort, og alle 332 rækker fik status 'borte', hvorefter
   politikken "ekstern: offentlig laesning" (status <> 'borte') skjulte dem.
   332 annoncer til 0, udløst af et omdøbt CSS-navn.

   Selve markeringen kræver en database. Vurderingen gør ikke, og det er med
   vilje: den er en ren funktion netop for at kunne stå her. */

const test = require('node:test');
const assert = require('node:assert');
const { bortemarkeringVurdering, BORTE_MIN_ANDEL } = require('./db');

// Driftlageret ved audit: 332 aktive annoncer fra MC Syd.
const TIDLIGERE = [332, 330, 331];

test('nul fundet markerer INGENTING — heller ikke tre gange i træk', () => {
  // Tre kørsler er den tærskel, markeringen bruger. Et DOM-skift er ikke et
  // hikke: det gentager sig hver gang, så alle tre skal afvises hver for sig.
  for (let koersel = 1; koersel <= 3; koersel++){
    const dom = bortemarkeringVurdering(0, TIDLIGERE);
    assert.equal(dom.tilladt, false, `kørsel ${koersel} med nul fund skal afvises`);
    assert.match(dom.grund, /nul annoncer/);
  }
});

test('et fald på mere end 40 % holdes tilbage', () => {
  // 132 af 332 er 40 % — under grænsen på 60 %.
  const dom = bortemarkeringVurdering(132, TIDLIGERE);
  assert.equal(dom.tilladt, false);
  // Begrundelsen skal bære tallene. En log, der bare siger "sprunget over",
  // efterlader operatøren med at gætte, om kilden er tom eller vi er brækkede.
  assert.match(dom.grund, /132/);
  assert.match(dom.grund, /332/);
});

test('et normalt lager markerer som før', () => {
  const dom = bortemarkeringVurdering(325, TIDLIGERE);
  assert.equal(dom.tilladt, true);
});

test('grænsen ligger præcis hvor den er skrevet, i begge retninger', () => {
  const reference = 332;
  const graense = reference * BORTE_MIN_ANDEL;   // 199,2
  assert.equal(bortemarkeringVurdering(Math.ceil(graense), [reference]).tilladt, true,
    'lige på eller over grænsen skal markere');
  assert.equal(bortemarkeringVurdering(Math.floor(graense) - 1, [reference]).tilladt, false,
    'under grænsen skal holdes tilbage');
});

test('referencen er det HØJESTE af de tidligere, ikke medianen', () => {
  /* Uden maksimum glider en gradvis udhuling igennem: 55 % tre gange i træk
     er 17 % af udgangspunktet, og hver enkelt kørsel ville se lovlig ud målt
     mod sin nærmeste nabo. Med maksimum måles der mod toppen af vinduet. */
  assert.equal(bortemarkeringVurdering(190, [332, 200, 195]).tilladt, false,
    '190 mod et maksimum på 332 er 57 % og skal afvises');
  assert.equal(bortemarkeringVurdering(190, [200, 195, 198]).tilladt, true,
    '190 mod et maksimum på 200 er 95 % og er i orden');
});

test('en helt ny kilde uden tidligere fund må markere', () => {
  // Ellers kunne en kilde, hvis tre første kørsler alle stod på 0 fundet,
  // aldrig komme videre. Der er intet fald at beskytte imod, når der ikke
  // har været noget at falde fra.
  const dom = bortemarkeringVurdering(48, [0, 0, 0]);
  assert.equal(dom.tilladt, true);
  assert.match(dom.grund, /ingen tidligere kørsel/);
});

test('rod i tallene læses som nul, ikke som uendeligt', () => {
  // crawl_koersler.fundet er `int not null default 0`, men vurderingen får
  // sit tal fra kørslen i hukommelsen. Et undefined dér må aldrig blive en
  // godkendelse ved et uheld.
  for (const skrald of [null, undefined, '', NaN, 'mange', -5]){
    assert.equal(bortemarkeringVurdering(skrald, TIDLIGERE).tilladt, false,
      `fundet=${JSON.stringify(skrald)} skal afvises`);
  }
  // Og skrald blandt de TIDLIGERE tal må ikke løfte referencen.
  assert.equal(bortemarkeringVurdering(300, [null, undefined, 'x']).tilladt, true);
});
