/* Tests for de indekserede annoncers TO links. Kør: npm test

   Hvorfor lige de to links har tests, når resten af markup'en ikke har:
   fordi de har været forkerte i drift, og fordi fejlen var usynlig. Hele
   kortet var ÉT <a> direkte til kilden — 357×605 px, 99,3 % af kortets areal,
   target="_blank" — og annonce.html?id=<uuid> kunne dermed ikke nås for 332
   af 383 annoncer. I drift, hvor vi har 0 egne annoncer, kunne den slet ikke
   nås. Siden findes, den virker, og den er det ENESTE sted vi skriver
   kørekortdommen ud med sit regnestykke.

   Rettelsen er to linjer HTML, og det er præcis derfor den skal låses: en
   senere oprydning, der "samler kortet til ét link igen", ser ud som en
   forenkling og er et tab af 87 % af trafikken. Omvendt må kildelinket ikke
   forsvinde i den anden retning — vi må ikke vise en forhandlers annonce uden
   en vej til forhandleren.

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

test('kildelinket findes stadig — i ny fane, med noopener og nofollow', () => {
  const cta = attrFor(externalCardHTML(eksternAnnonce(), 1), 'card-external-cta');
  assert.ok(cta, 'kortet skal have et link til kilden — en annonce uden vej til forhandleren er en blindgyde');
  assert.equal(cta.href, KILDE_URL.replace(/&/g, '&amp;'));
  assert.equal(cta.target, '_blank');
  for (const r of ['noopener', 'noreferrer', 'nofollow']){
    assert.ok(cta.rel.includes(r), `rel skal indeholde ${r}`);
  }
  // Kilden skal nævnes i det tilgængelige navn: en skærmlæser skal kunne
  // høre forskel på de to links, når de ligger på samme kort.
  assert.match(cta['aria-label'], /MC Syd/);
  assert.match(cta['aria-label'], /åbner i ny fane/);
});

test('de to links på samme kort har forskellige tilgængelige navne', () => {
  const html = externalCardHTML(eksternAnnonce(), 1);
  const kort = attrFor(html, 'card-link'), cta = attrFor(html, 'card-external-cta');
  assert.notEqual(kort['aria-label'], cta['aria-label']);
});

test('listerækken følger kortet: rækkefladen ind, kildelinket ud', () => {
  const l = eksternAnnonce();
  const række = attrFor(externalRowHTML(l, 1), 'row-link');
  const cta = attrFor(externalRowHTML(l, 1), 'row-cta');
  assert.equal(række.href, `annonce.html?id=${l.id}`);
  assert.equal(række.target, undefined);
  assert.ok(cta, 'rækken skal stadig have et link til kilden');
  assert.equal(cta.target, '_blank');
  assert.ok(cta.rel.includes('nofollow'));
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
