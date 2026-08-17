/* Søgesidens TOMTILSTAND — hvad siden signalerer til en crawler, når svaret
   er nul.
   Kør: npm test

   js/search.js er 2.100 linjer og hænger på document, Store og en halv snes
   globale. Filen kan derfor ikke evalueres i node som helhed, sådan som
   js/koerekort.test.js gør med js/data.js. I stedet klippes funktionen
   ud af kildeteksten og køres for sig med præcis de globale, den bruger. Det
   er stadig den RIGTIGE kode, der prøves — ikke en kopi af den, og heller
   ikke et tekstmatch på en streng, der lige så godt kunne stå i en
   kommentar. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');

/* Klipper `function navn(...){ ... }` ud ved at tælle krøller. Skabelon-
   strengenes ${...} er balancerede og forstyrrer derfor ikke tællingen. */
function udklip(navn){
  const start = src.indexOf(`function ${navn}(`);
  assert.notEqual(start, -1, `${navn}() findes ikke længere i js/search.js`);
  let i = src.indexOf('{', start), dybde = 0;
  for (; i < src.length; i++){
    if (src[i] === '{') dybde++;
    else if (src[i] === '}' && --dybde === 0) return src.slice(start, i + 1);
  }
  throw new Error(`kunne ikke finde slutningen på ${navn}()`);
}

const kode = udklip('seoRobots');
const lav = (state, Seo) => new Function('state', 'Seo',
  kode + '\nreturn { seoRobots };')(state, Seo);

const tomState = () => ({ q: '', priceMin: null, priceMax: null });

/* ---------- C-019 ---------- */

test('nul træf sætter noindex — og et resultat tager den af igen', () => {
  /* Begge retninger, fordi siden skifter tilstand uden en ny indlæsning:
     sætter man kun noindex ved nul træf, bliver den hængende, når brugeren
     fjerner filteret, og et fuldt resultat ville stå med noindex. */
  const sat = [];
  const Seo = { setMeta: (sel, an, av, indhold) => sat.push({ sel, indhold }) };
  const { seoRobots } = lav(tomState(), Seo);

  seoRobots(0);
  assert.deepEqual(sat.at(-1), { sel: 'meta[name="robots"]', indhold: 'noindex, follow' });

  seoRobots(24);
  assert.deepEqual(sat.at(-1), { sel: 'meta[name="robots"]', indhold: 'index, follow' });

  seoRobots(1);
  assert.equal(sat.at(-1).indhold, 'index, follow', 'ét træf er også et træf');
});

test('seoRobots kaldes af renderSecondary med resultatets TOTAL', () => {
  /* Ikke med pageItems: en side 3 uden kort på et resultat med 24 træf er
     ikke en tom facet. Kaldet skal derfor bære `total`, og det er dét, der
     ikke kan læses ud af funktionen selv. */
  assert.match(src, /function renderSecondary\(pills, pageItems, heading, total, totalPages\)\{?[\s\S]{0,400}?seoRobots\(total\)/,
    'renderSecondary skal kalde seoRobots(total) — ikke seoRobots(pageItems.length)');
});
