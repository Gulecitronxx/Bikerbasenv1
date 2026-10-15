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
// js/filtrering.js skal med og skal ligge FOER search.js: filterkaeden er
// flyttet derind (ét filterhus for forsiden og soegesiden), og search.js
// binder Filtrering.* paa topniveau. Uden den her linje falder hele filen
// over 'Filtrering is not defined', foer den naar til det, den tester.
// sortering.js EFTER components.js og FØR search.js — samme rækkefølge som soegning.html (B4).
const KILDER = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'sortering.js', 'search.js'];

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

const { externalRowHTML, listingCardHTML, markerFotoFejl, tjekFejledeFotos, fotoFejlHTML } = new Function(
  STUB + KILDER.map(læs).join('\n') +
  '\nreturn { externalRowHTML, listingCardHTML, markerFotoFejl, tjekFejledeFotos, fotoFejlHTML };')();

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
  const link = attrFor(listingCardHTML(l, 1), 'card-link');
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
  const html = listingCardHTML(eksternAnnonce(), 1);
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
test('kilden nævnes stadig på kortet — i bunden (med forklaring i title) og navn i kortlinket', () => {
  /* Kilden bor ÉT sted på kortet: bunden, med domænet, det eksterne-link-ikon og forklaringen som title.
     (Hjørne-pillen oven på fotoet og kildestriben øverst er væk — samme oplysning tre gange.) */
  const html = listingCardHTML(eksternAnnonce(), 1);
  assert.doesNotMatch(html, /class="card-kilde"/);
  assert.doesNotMatch(html, /card-source-badge/, 'ingen pille oven på fotoet: domænet står i bunden');
  assert.match(html, /class="rk-kilde" title="Annoncen ligger hos MC Syd[^"]*"[\s\S]*?mcsyd\.dk/);
  assert.match(attrFor(html, 'card-link')['aria-label'], /hos MC Syd/);
});

test('uden et oplyst domæne står kildens navn i bunden — ingen tom plads', () => {
  const l = eksternAnnonce({ source: { navn: 'Gul og Gratis', domaene: undefined } });
  const html = listingCardHTML(l, 1);
  const fod = (html.match(/class="rk-kilde"[\s\S]*?<\/span><\/span>/) || [''])[0].replace(/<[^>]+>/g, '');
  assert.match(fod, /Gul og Gratis/);
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

/* Titel og pris står på ÉN linje (.rk-top), titlen først — forsidens opstilling, nu på alle kort. Rækkefølgen
   låses her, fordi den ikke kan ses i en CSS-fil. */
test('titel og pris står på samme linje på det indekserede kort', () => {
  const html = listingCardHTML(eksternAnnonce(), 1);
  const top = (html.match(/<div class="rk-top">([\s\S]*?)<\/div>/) || [])[1] || '';
  assert.ok(top.indexOf('rk-titel') > -1 && top.indexOf('rk-pris') > top.indexOf('rk-titel'), 'titel før pris i .rk-top');
});

test('uden en brugbar kilde-URL vises den indekserede annonce slet ikke', () => {
  // Guarden er ældre end denne rettelse, men den betyder noget andet nu:
  // kortet VILLE virke uden kildens URL, fordi fladen peger på vores side.
  // En annonce, man ikke kan handle på, skal alligevel ikke stå i listen.
  for (const url of [null, '', 'javascript:alert(1)', 'ikke-en-url']){
    assert.equal(listingCardHTML(eksternAnnonce({ externalUrl: url }), 1), '',
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

/* ---------- Ét kort: linjen og chips ----------
   Før stod årgang, km og kubik som en <dl>; nu bærer .rk-linje år | km | type og chips bærer kørekort, ccm og
   hk. Huller i data (163 af 332 mangler km) siges højt — aldrig "0 km". */

test('linjen bærer år, km og type; chips bærer kørekort, ccm og hk', () => {
  const html = listingCardHTML(eksternAnnonce({ type: 'naked' }), 1);
  assert.match(html, /<p class="rk-linje"><span>2024<\/span><span>8\.100 km<\/span><span>Naked<\/span><\/p>/);
  assert.match(html, /1\.000 ccm/);
  assert.match(html, /150 hk/);
  assert.match(html, /class="rk-chip rk-kk kk-[a-z0-9]+"/, 'kørekortkategorien skal blive — den er hk\'s konklusion');
  assert.ok(!/<dl|<dt>/.test(html), 'den gamle spec-liste er væk');
});

test('manglende tal siges højt — km i linjen, ccm/hk i en dæmpet chip', () => {
  let html = listingCardHTML(eksternAnnonce({ km: null }), 1);
  assert.match(html, /Km ikke oplyst/);
  assert.ok(!/ 0 km|null|NaN/.test(html));
  html = listingCardHTML(eksternAnnonce({ ccm: null, power: null }), 1);
  assert.match(html, /ccm og hk ikke oplyst/);
  html = listingCardHTML(eksternAnnonce(), 1);
  assert.ok(!/ikke oplyst/.test(html), 'uden huller skal der ikke stå noget om manglende felter');
});

test('sted til venstre og sælgertype + kilde til højre i bunden', () => {
  const html = listingCardHTML(eksternAnnonce(), 1);
  assert.match(html, /class="rk-sted" title="Rødding, Syddanmark"[\s\S]*?<span>Rødding<\/span>/);
  const fod = (html.match(/class="rk-kilde"[\s\S]*?<\/span><\/span>/) || [''])[0].replace(/<[^>]+>/g, '');
  assert.match(fod, /Forhandler · mcsyd\.dk/);
  // Sælgertypen ligger i eget span, så smalle kort kan skjule den og lade domænet stå.
  assert.match(html, /<span class="rk-saelgertype">Forhandler · <\/span>mcsyd\.dk/);
});

/* "Mulig A2" må ikke læses som bekræftet ved et skim (R18-P1). Chippen siger "Mulig", aldrig "A2 godkendt", og
   den bekræftede "A" siger "Kræver A". Forklaringen står som title og skærmlæsertekst. */
test('"Mulig A2" er tentativ i selve ordlyden; "Kræver A" er den bekræftede udelukkelse', () => {
  // 300 ccm, 28 hk — under A2-loftet, ikke udelukket, men ikke bekræftet.
  const mulig = listingCardHTML(eksternAnnonce({ ccm: 300, power: 28 }), 1);
  const muligChip = (mulig.match(/<li class="rk-chip rk-kk kk-a2"[\s\S]*?<\/li>/) || [''])[0];
  assert.match(muligChip, /<span>Mulig A2<\/span>/);
  assert.match(muligChip, /title="[^"]*A2/);
  // Standardfixturen (150 hk) er over A2-grænsen — en bekræftet udelukkelse.
  const bekraeftet = listingCardHTML(eksternAnnonce(), 1);
  const aChip = (bekraeftet.match(/<li class="rk-chip rk-kk kk-a"[\s\S]*?<\/li>/) || [''])[0];
  assert.match(aChip, /<span>Kræver A<\/span>/);
  assert.match(aChip, /Kørekort A\./, 'skærmlæseren hører hele sætningen');
});

/* ---------- D-008: favoritten, der ikke kan gemmes ----------
   `favorites.listing_id` er `uuid not null references public.listings(id)`.
   Indekserede annoncer ligger i `eksterne_annoncer`, så en favorit på dem
   bliver afvist af fremmednøglen — og et hjerte, der ser ud som om det
   virkede, er værre end intet hjerte. Hele afvisningen med tallene står i
   docs/review/DECISIONS.md. Testen ligger her, fordi det er den slags, en
   senere "konsistens-oprydning" retter uden at kende grunden. */

test('det indekserede kort har intet gem-hjerte — og vores eget har ét', () => {
  const ekstern = listingCardHTML(eksternAnnonce(), 1);
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

/* ---------- B3: et foto, kilden ikke leverer, bliver til det aerlige felt ---------- */
function fakeImg({ src = 'https://kilde.test/x.jpg', complete = true, naturalWidth = 0, klasse = 'card-photo', iMedia = true } = {}){
  const media = { children: [] };
  const img = {
    tagName: 'IMG', dataset: {}, _src: src, _removed: false, _indsat: null,
    complete, naturalWidth,
    classList: { contains: c => c === klasse },
    getAttribute: n => (n === 'src' ? img._src : null),
    closest: sel => (sel === '.card-media' && iMedia ? media : null),
    insertAdjacentHTML: (_pos, html) => { img._indsat = html; },
    remove: () => { img._removed = true; },
  };
  return img;
}

test('markerFotoFejl: et fejlet kortfoto skiftes til feltet "Fotoet kunne ikke hentes hos kilden" — uden tegning', () => {
  const img = fakeImg();
  assert.equal(markerFotoFejl(img), true);
  assert.equal(img._removed, true);
  assert.match(img._indsat, /foto-tom foto-fejl/);
  assert.match(img._indsat, /Fotoet kunne ikke hentes hos kilden/);
  assert.doesNotMatch(img._indsat, /<svg[^>]*class="bike-art/, 'ingen silhuet — beslutningen "Uden foto tegner vi INGENTING" staar');
  assert.equal(markerFotoFejl(img), false, 'idempotent: samme billede markeres kun én gang');
});

test('markerFotoFejl: roerer kun kortfotos i .card-media — ikke logoer, ikke galleriet', () => {
  assert.equal(markerFotoFejl(fakeImg({ klasse: 'brand-logo' })), false);
  assert.equal(markerFotoFejl(fakeImg({ iMedia: false })), false);
  assert.equal(markerFotoFejl(null), false);
});

test('tjekFejledeFotos: kun billeder, der ER hentet og mislykkedes — ikke lazy-billeder, der ikke er begyndt', () => {
  const fejlet = fakeImg({ complete: true, naturalWidth: 0 });
  const lazy   = fakeImg({ complete: false, naturalWidth: 0 });
  const ok     = fakeImg({ complete: true, naturalWidth: 596 });
  const rod = { querySelectorAll: () => [fejlet, lazy, ok] };
  assert.equal(tjekFejledeFotos(rod), 1);
  assert.equal(fejlet._removed, true);
  assert.equal(lazy._removed, false);
  assert.equal(ok._removed, false);
});

test('fotoFejlHTML: samme felt som "Ingen fotos" (foto-tom), saa de to tilstande ikke ligner hinanden forskelligt', () => {
  const html = fotoFejlHTML();
  assert.match(html, /class="foto-tom foto-fejl"/);
  assert.match(html, /foto-tom-titel/);
});
