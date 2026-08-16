/* Tests for sælgerbedømmelsen — Store.getAverageRating() i js/store.js og
   demoanmeldelserne i js/data.js. Kør: npm test

   HVORFOR DEN HER FIL FINDES

   En forkert bedømmelse giver ingen fejlmeddelelse. Den giver bare et tal,
   der ser rigtigt ud. Siden viste i tre runder i træk "4,5 af 1 anmeldelse"
   og "3,8 af 2 anmeldelser" uden at noget som helst brokkede sig — og en
   køber, der opdager, at et tal ikke kan passe, holder op med at tro på
   resten af siden. Det er præcis den fejltype, der skal fanges af en test i
   stedet for af en kritiker.

   Testene håndhæver ÉN regel: alt hvad siden viser om en bedømmelse, skal
   kunne udledes af de anmeldelser, siden selv viser.

   js/store.js og js/data.js er browserscripts uden module.exports — samme
   mønster som js/koerekort.test.js: filen evalueres i en funktion, der giver
   navnene tilbage. localStorage og SEED_REVIEWS sendes ind som parametre, så
   `typeof SEED_REVIEWS !== 'undefined'` i getReviews() virker uændret. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const storeSrc = fs.readFileSync(path.join(__dirname, 'store.js'), 'utf8');
const dataSrc = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');

/* Bygger en frisk Store med et tomt localStorage og de seedede anmeldelser,
   testen selv bestemmer. */
function lavStore(seedReviews){
  const lager = {};
  const localStorage = {
    getItem: (k) => (k in lager ? lager[k] : null),
    setItem: (k, v) => { lager[k] = String(v); },
    removeItem: (k) => { delete lager[k]; },
  };
  const document = { documentElement: { getAttribute: () => null, setAttribute: () => {} } };
  const window = { matchMedia: () => ({ matches: false }) };
  return new Function('localStorage', 'document', 'window', 'SEED_REVIEWS',
    storeSrc + '\nreturn Store;')(localStorage, document, window, seedReviews);
}

/* Demodataene bygges kun, når `location.hostname` er localhost — se
   SHOW_DEMO_DATA i js/data.js, der med vilje giver `false` i Node, så
   byggescripterne ikke kan komme til at skrive opdigtede annoncer ud i
   sitemappet. Testen skal se dem, så den låner en localhost-adresse. */
function lavData(){
  return new Function('location',
    dataSrc + '\nreturn { SEED_REVIEWS, LISTINGS };')({ hostname: 'localhost' });
}

const anm = (rating, i = 0) => ({
  author: `Tester ${i}`, rating, comment: 'x',
  date: new Date(2026, 0, 1 + i).toISOString(),
});

/* ---------- Grænsen ---------- */

test('under grænsen findes der intet gennemsnit — heller ikke et rigtigt et', () => {
  // Et snit af én mening er ikke en statistik, men ser ud som en karakter.
  // Derfor: intet tal. Ikke "–", ikke 0 — feltet findes ikke.
  const Store = lavStore({ 'En Sælger': [anm(5)] });
  assert.equal(Store.getAverageRating('En Sælger'), null);

  const Store2 = lavStore({ 'To Anmeldelser': [anm(5, 0), anm(4, 1)] });
  assert.equal(Store2.getAverageRating('To Anmeldelser'), null);
});

test('fra og med grænsen regnes tallet af de faktiske anmeldelser', () => {
  const Store = lavStore({ 'Tre Stk': [anm(5, 0), anm(3, 1), anm(3, 2)] });
  // 11/3 = 3,666… -> 3,7
  assert.equal(Store.getAverageRating('Tre Stk'), 3.7);

  const Fire = lavStore({ 'Fire Stk': [anm(5, 0), anm(5, 1), anm(3, 2), anm(4, 3)] });
  // 17/4 = 4,25 -> 4,3. Præcis det tal, kritikeren skal kunne regne efter
  // ved at lægge stjernerne på siden sammen.
  assert.equal(Fire.getAverageRating('Fire Stk'), 4.3);
});

test('grænsen er tre, og den står ét sted', () => {
  // Vagthund: flyttes grænsen, skal den flyttes bevidst. js/forhandler.js
  // læser den samme konstant, så profilen og annoncens sælgerkort ikke kan
  // komme til at sige hver sit om den samme sælger.
  const Store = lavStore({});
  assert.equal(Store.MIN_ANMELDELSER_FOR_SNIT, 3);
});

/* ---------- Ingen anmeldelser = intet tal ---------- */

test('ingen anmeldelser giver null — og et reservetal kan ikke smugles ind', () => {
  const Store = lavStore({});
  assert.equal(Store.getAverageRating('Ukendt Sælger'), null);

  /* HER OPSTOD LØGNEN. getAverageRating() tog før et `fallback`-argument, og
     js/annonce.js fodrede den med listing.seller.rating — et tal, js/data.js
     fandt på med (4 + rnd()*0.9). En sælger uden én eneste anmeldelse fik
     altså en bedømmelse. Argumentet ignoreres nu; sender en gammel kalder
     stadig et tal, må det ikke komme igennem. */
  assert.equal(Store.getAverageRating('Ukendt Sælger', 4.7), null);
  assert.equal(Store.getAverageRating('Ukendt Sælger', '5.0'), null);
});

test('et reservetal kan heller ikke overtrumfe rigtige anmeldelser', () => {
  const Store = lavStore({ 'Med Anmeldelser': [anm(3, 0), anm(3, 1), anm(3, 2)] });
  assert.equal(Store.getAverageRating('Med Anmeldelser', 4.9), 3);
});

/* ---------- Live-anmeldelser tæller med ---------- */

test('anmeldelser skrevet i sessionen indgår i det samme regnestykke', () => {
  const Store = lavStore({ 'Blandet': [anm(5, 0), anm(5, 1)] });
  assert.equal(Store.getAverageRating('Blandet'), null, 'to anmeldelser er stadig under grænsen');
  Store.addReview('Blandet', anm(2, 2));
  // 5+5+2 = 12/3 = 4
  assert.equal(Store.getAverageRating('Blandet'), 4);
  assert.equal(Store.getReviews('Blandet').length, 3);
});

/* ---------- Demodataene selv ---------- */

test('demoanmeldelser har kun hele stjerner fra 1 til 5', () => {
  /* Halve stjerner (3,5 / 4,5) var den anden halvdel af løgnen: ingen bruger
     kan afgive en halv stjerne — stjernevælgeren giver 1-5, og db.addReview()
     sender et helt tal — men stjernerækken tegnede dem som HELE og rundede
     op. To anmeldelser på 4 og 3,5 blev til fire fyldte stjerner hver, mens
     snittet stod 3,8. Tallet var rigtigt; billedet løj. En demoværdi, det
     rigtige system aldrig kan frembringe, er en løgn om systemet. */
  const { SEED_REVIEWS } = lavData();
  const alle = Object.values(SEED_REVIEWS).flat();
  assert.ok(alle.length > 0, 'der skal være demoanmeldelser at kontrollere');
  for (const r of alle){
    assert.ok(Number.isInteger(r.rating), `karakteren ${r.rating} er ikke et helt tal`);
    assert.ok(r.rating >= 1 && r.rating <= 5, `karakteren ${r.rating} er uden for 1-5`);
  }
});

test('ingen demosælger bærer et opdigtet bedømmelsestal', () => {
  /* seller.rating var (4 + rnd()*0.9).toFixed(1) og seller.reviews var
     3 + rnd()*140 — to tilfældige tal uden en eneste anmeldelse bag sig, som
     modsagde de anmeldelser, siden selv viste (samme sælger bar reviews: 120
     og havde én anmeldelse). Findes felterne igen, er reservetallet tilbage. */
  const { LISTINGS } = lavData();
  assert.ok(LISTINGS.length > 0, 'der skal være demoannoncer at kontrollere');
  for (const l of LISTINGS){
    assert.equal(l.seller.rating, undefined, `${l.seller.name} har igen et rating-felt`);
    assert.equal(l.seller.reviews, undefined, `${l.seller.name} har igen et reviews-felt`);
  }
});

test('hver demosælgers viste tal kan udledes af hans egne anmeldelser', () => {
  /* Den samlede kontrol: gå hele demolageret igennem, som en kritiker ville
     gøre med en lommeregner, og kræv at tallet enten ikke findes eller er
     nøjagtig gennemsnittet af de anmeldelser, der står på siden. */
  const { SEED_REVIEWS, LISTINGS } = lavData();
  const Store = lavStore(SEED_REVIEWS);
  const navne = [...new Set(LISTINGS.map(l => l.seller.name))];
  let medSnit = 0, udenSnit = 0;

  for (const navn of navne){
    const reviews = Store.getReviews(navn);
    const snit = Store.getAverageRating(navn);
    if (reviews.length < 3){
      assert.equal(snit, null, `${navn} har ${reviews.length} anmeldelser og må ikke have et snit`);
      udenSnit++;
      continue;
    }
    const forventet = Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
    assert.equal(snit, forventet, `${navn}: snittet kan ikke udledes af anmeldelserne`);
    medSnit++;
  }

  // Demoen skal vise BEGGE tilstande. Kunne ingen sælger nå grænsen, ville
  // grænsen aldrig blive afprøvet af et menneske, der klikker rundt.
  assert.ok(medSnit > 0, 'mindst én demosælger skal have nok anmeldelser til et snit');
  assert.ok(udenSnit > 0, 'mindst én demosælger skal ligge under grænsen');
});
