/* Tests for det indekserede korts ENE link. Kør: npm test

   Hvorfor lige linket har tests, når resten af markup'en ikke har: fordi det
   har været forkert i drift, og fordi fejlen var usynlig. Hele kortet var ÉT
   <a> direkte til kilden — 357×605 px, 99,3 % af kortets areal,
   target="_blank" — og annonce.html?id=<uuid> kunne dermed ikke nås for 332
   af 383 annoncer. I drift, hvor vi har 0 egne annoncer, kunne den slet ikke
   nås. Siden findes, den virker, og den er det ENESTE sted vi skriver
   kørekortdommen ud med sit regnestykke.

   Første rettelse vendte kortfladen indad og lod kildelinket blive som en
   lille række i bunden. Anden rettelse fjernede den række: den var stadig en
   genvej uden om vores egen side, og vejen ud skal gå igennem den. Vejen ud
   findes ét sted — knappen på annoncesiden — og annoncen vises ikke uden en
   brugbar kilde-URL, så der er altid en vej videre til forhandleren.

   Begge retninger er låst her: kortet må ikke samles til ét link ud igen
   (det ser ud som en forenkling og er et tab af 87 % af trafikken), og der
   må ikke snige sig et nyt link ud af sitet ind på kortet.

   Mønstret er det samme som js/koerekort.test.js: browserscripts uden
   module.exports evalueres i en funktion, der giver navnene tilbage. Det
   kræver ingen ombygning af sitet, og det tester den kode, browseren kører.
   Stubbene herunder er kun til det, filerne rører ved INDLÆSNING (håndtere,
   der bindes i toppen) — ingen af dem er i spil inde i de to funktioner. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const KILDER = ['icons.js', 'data.js', 'components.js', 'search.js'];

const STUB = `
const noop = () => {};
const elStub = () => ({
  classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}, style:{},
  appendChild:noop, setAttribute:noop, getAttribute:()=>null, addEventListener:noop,
  querySelector:()=>null, querySelectorAll:()=>[], dataset:{}, hidden:true,
  textContent:'', innerHTML:'', firstElementChild:null,
});
const document = {
  addEventListener:noop, querySelector:()=>null, querySelectorAll:()=>[],
  getElementById:()=>null, createElement:elStub, documentElement:elStub(),
  body:{classList:{add:noop,remove:noop,toggle:noop},appendChild:noop,style:{}},
  readyState:'loading', title:'',
};
const window = { location:{href:'',search:'',pathname:'/soegning.html'}, addEventListener:noop,
  matchMedia:()=>({matches:false,addEventListener:noop}), scrollTo:noop, history:{} };
const history = { scrollRestoration:'auto', replaceState:noop, pushState:noop };
const location = { href:'', search:'', pathname:'/soegning.html', origin:'http://localhost' };
const localStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const sessionStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const Store = { isComparing:()=>false, isFavorite:()=>false, getUser:()=>null };
`;

const { externalCardHTML, externalRowHTML, listingCardHTML } = new Function(
  STUB + KILDER.map(læs).join('\n') +
  '\nreturn { externalCardHTML, externalRowHTML, listingCardHTML };')();

const KILDE_URL = 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=180898&m=1489';

function eksternAnnonce(extra){
  return Object.assign({
    id: '42410d86-c150-4ce9-8e0f-8ca744bb4e0c',
    isExternal: true,
    brand: 'Honda', model: 'CB 1000 Hornet Street',
    price: 124800, year: 2024, km: 8100, ccm: 1000, power: 150,
    city: 'Rødding', postnr: 6630, isDealer: true,
    externalUrl: KILDE_URL,
    source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
  }, extra || {});
}

/* Hjælper i stedet for en DOM-parser: der er ingen jsdom i dette repo (nul
   devDependencies, og det er et låst valg), så attributterne læses ud af
   strengen for den ene tag med den ene klasse. */
function attrFor(html, klasse){
  const tags = html.match(/<a\b[^>]*>/g) || [];
  const tag = tags.find(t => new RegExp(`class="[^"]*\\b${klasse}\\b`).test(t));
  if (!tag) return null;
  const attr = {};
  for (const m of tag.matchAll(/([a-z-]+)="([^"]*)"/g)) attr[m[1]] = m[2];
  return attr;
}

test('kortfladen på et indekseret kort peger på VORES annonceside', () => {
  const l = eksternAnnonce();
  const link = attrFor(externalCardHTML(l, 1), 'card-link');
  assert.ok(link, 'kortet skal stadig have en .card-link');
  assert.equal(link.href, `annonce.html?id=${l.id}`);
  // Ny fane hører til et link, der forlader sitet. Vores egen side gør ikke.
  assert.equal(link.target, undefined, 'vores egen side må ikke åbne i ny fane');
  assert.equal(link.rel, undefined, 'nofollow på et internt link ville bede Google droppe vores egen side');
});

/* Kortet må have ÉN destination, og det er vores egen annonceside.
   Kildelinket lå en overgang som sin egen 304×24 px-række i bunden af kortet
   — 3,8 % af arealet, men en genvej der sprang vores side over. Ejerens krav
   er, at vejen ud går IGENNEM annoncesiden. Testen er skrevet som en tælling
   frem for som "findes klassen ikke": kommer der en dag et andet link ud af
   sitet på kortet, skal den også fange det. */
test('kortet har ingen vej ud af sitet — hverken CTA eller anden ekstern URL', () => {
  const html = externalCardHTML(eksternAnnonce(), 1);
  const links = html.match(/<a\b[^>]*>/g) || [];
  assert.equal(links.length, 1, 'der må kun være ét <a> på kortet');
  assert.match(links[0], /class="card-link"/);
  assert.equal(attrFor(html, 'card-external-cta'), null, 'kilde-CTA\'en skal være væk');
  assert.ok(!/href="https?:/.test(html), 'ingen absolut URL i kortets markup');
  assert.ok(!/target="_blank"/.test(html), 'intet på kortet må åbne en ny fane');
});

/* Kilden skal stadig NÆVNES. Det er ikke pynt: en køber, der lander på en
   annonceside, som sender ham videre til en forhandler, må kunne se det på
   kortet først. Det er kun det klikbare link ud, der skulle væk. */
test('kilden nævnes stadig på kortet — stribe, sælgerlinje og navn i kortlinket', () => {
  const html = externalCardHTML(eksternAnnonce(), 1);
  assert.match(html, /class="card-kilde"[^>]*>[\s\S]*?Annonce fra MC Syd/);
  assert.match(html, /class="card-kildelinje"[\s\S]*?mcsyd\.dk/);
  assert.match(attrFor(html, 'card-link')['aria-label'], /hos MC Syd/);
});

test('listerækken følger kortet: ét link, og det peger indad', () => {
  const l = eksternAnnonce();
  const html = externalRowHTML(l, 1);
  const links = html.match(/<a\b[^>]*>/g) || [];
  assert.equal(links.length, 1, 'der må kun være ét <a> på rækken');
  const række = attrFor(html, 'row-link');
  assert.equal(række.href, `annonce.html?id=${l.id}`);
  assert.equal(række.target, undefined);
  assert.equal(attrFor(html, 'row-cta'), null, 'kilde-CTA\'en skal være væk fra rækken');
  assert.ok(!/target="_blank"/.test(html), 'intet på rækken må åbne en ny fane');
  // Kilden nævnes stadig: mærkatet og domænet i .row-origin.
  assert.match(html, /badge-external[\s\S]*?Hos MC Syd/);
  assert.match(html, /row-origin[\s\S]*?mcsyd\.dk/);
});

/* Prisen er det, købet træffes på, og den skal derfor stå først og størst.
   Den stod sidst og lige så stor som titlen: `.card-external .card-price` var
   sat ned til 17px — samme størrelse og vægt som `.card-title-main` — og
   prisrækken kom efter titlen i DOM'en. Målt på 1440 lå prisen 56px UNDER
   titlen. Rækkefølgen låses her, fordi den ikke kan ses i en CSS-fil: en
   senere oprydning, der "samler titlen øverst som på vores egne kort", ville
   vende hierarkiet om igen uden at nogen opdagede det. */
test('prisen står FØR titlen på det indekserede kort', () => {
  const html = externalCardHTML(eksternAnnonce(), 1);
  const pris = html.indexOf('card-prisrække');
  const titel = html.indexOf('card-title-main');
  assert.ok(pris > -1 && titel > -1, 'begge felter skal findes');
  assert.ok(pris < titel, 'prisrækken skal stå før titlen i DOM-rækkefølgen');
});

test('uden en brugbar kilde-URL vises den indekserede annonce slet ikke', () => {
  // Guarden er ældre end denne rettelse, men den betyder noget andet nu:
  // kortet VILLE virke uden kildens URL, fordi fladen peger på vores side.
  // En annonce, man ikke kan handle på, skal alligevel ikke stå i listen.
  for (const url of [null, '', 'javascript:alert(1)', 'ikke-en-url']){
    assert.equal(externalCardHTML(eksternAnnonce({ externalUrl: url }), 1), '',
      `externalUrl=${JSON.stringify(url)} skal give et tomt kort`);
    assert.equal(externalRowHTML(eksternAnnonce({ externalUrl: url }), 1), '',
      `externalUrl=${JSON.stringify(url)} skal give en tom række`);
  }
});

test('vores egne kort er urørte: ét internt link, ingen ny fane', () => {
  const link = attrFor(listingCardHTML({
    id: 1021, brand: 'KTM', model: 'RC 390', price: 44900, year: 2021,
    km: 9100, ccm: 373, power: 44, city: 'Aarhus',
  }, 1), 'card-link');
  assert.equal(link.href, 'annonce.html?id=1021');
  assert.equal(link.target, undefined);
});

/* ---------- D-011: én rytme i listen ----------
   De to korttyper i den samme liste var 118px fra hinanden ved 390px (579 mod
   461), og størstedelen sad i specblokken: fire chips i et 2×2-gitter mod det
   egne korts ene linje. Testene her låser DET, der ikke kan ses i en
   CSS-fil — hvilke felter linjen bærer, og hvad der sker med de huller, der
   er i data (163 af 332 mangler km). */

test('speclinjen bærer de samme tre felter som vores eget kort', () => {
  const html = externalCardHTML(eksternAnnonce(), 1);
  const felter = [...html.matchAll(/<dt>([^<]+)<\/dt><dd>([^<]*)<\/dd>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(felter, [['Årgang', '2024'], ['Kilometer', '8.100 km'], ['Kubik', '1.000 ccm']]);
  /* Fire værdier kan ikke stå på én linje: den bredeste måler 266px, og
     kortets krop er nede på 241px i drift. Effekt blev det felt, der gik —
     kørekortchippen lige nedenunder ER udledt af den. */
  assert.ok(!/<dt>Effekt<\/dt>/.test(html), 'hk hører ikke til på kortets speclinje');
  assert.match(html, /card-koerekort/, 'kørekortkategorien skal blive — den er hk\'s konklusion');
});

test('manglende felter samles i ét led, der siger HVILKE', () => {
  const kun = l => (l.match(/<div class="card-spec[^"]*">[\s\S]*?<\/div>/g) || []).join('');
  // Ét hul.
  let html = externalCardHTML(eksternAnnonce({ km: null }), 1);
  assert.match(html, /<div class="card-spec spec-tom"><dt>Ikke oplyst af kilden<\/dt><dd>km<\/dd><\/div>/);
  assert.ok(!/<dd>Ikke oplyst<\/dd>/.test(html), 'et bart "Ikke oplyst" siger ikke hvad der mangler');
  // To huller — dansk opremsning med "og".
  html = externalCardHTML(eksternAnnonce({ km: null, ccm: null }), 1);
  assert.match(html, /<dd>km og kubik<\/dd>/);
  // Ingen huller: intet led.
  html = externalCardHTML(eksternAnnonce(), 1);
  assert.ok(!/spec-tom/.test(html), 'uden huller skal der ikke stå noget om manglende felter');
  assert.ok(kun(html).length > 0);
});

test('kilden nævnes stadig i bunden, nu på samme linje som stedet', () => {
  /* Fodlinjen gik fra to rækker til én. Begge oplysninger skal blive:
     stedet er det eneste geografiske på kortet, og domænet er det eneste,
     køberen selv kan slå op, før han klikker. */
  const html = externalCardHTML(eksternAnnonce(), 1);
  assert.match(html, /class="card-sted"[\s\S]*?Rødding/);
  assert.match(html, /class="card-kildelinje"[\s\S]*?Forhandler · mcsyd\.dk/);
});

/* ---------- D-008: favoritten, der ikke kan gemmes ----------
   `favorites.listing_id` er `uuid not null references public.listings(id)`.
   Indekserede annoncer ligger i `eksterne_annoncer`, så en favorit på dem
   bliver afvist af fremmednøglen — og et hjerte, der ser ud som om det
   virkede, er værre end intet hjerte. Hele afvisningen med tallene står i
   docs/review/DECISIONS.md. Testen ligger her, fordi det er den slags, en
   senere "konsistens-oprydning" retter uden at kende grunden. */

test('det indekserede kort har intet gem-hjerte — og vores eget har ét', () => {
  const ekstern = externalCardHTML(eksternAnnonce(), 1);
  assert.ok(!/fav-btn/.test(ekstern), 'en favorit, databasen afviser, må ikke se ud som om den virker');
  assert.ok(!/data-fav-toggle/.test(ekstern));
  assert.match(ekstern, /data-compare-toggle/,
    'sammenlign SKAL blive: den er ærligt og udelukkende lokal og har ingen konto at svigte');

  const eget = listingCardHTML({
    id: 1021, brand: 'KTM', model: 'RC 390', price: 44900, year: 2021,
    km: 9100, ccm: 373, power: 44, city: 'Aarhus',
  }, 1);
  assert.match(eget, /class="fav-btn [^"]*" aria-pressed="false" aria-label="Gem annonce" data-fav-toggle="1021"/);
});

test('rækken følger kortet: heller ikke dér et hjerte', () => {
  assert.ok(!/fav-btn|data-fav-toggle/.test(externalRowHTML(eksternAnnonce(), 1)));
});
