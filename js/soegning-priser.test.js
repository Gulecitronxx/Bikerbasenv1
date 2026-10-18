/* Søgesidens hurtigknapper til pris (billede 2) og søgekortets spejling.
   Kør: npm test  (eller: node --test js/soegning-priser.test.js)

   Samme greb som js/soegeoverskrift.test.js: js/search.js hænger på document og
   Store og kan ikke evalueres som helhed, så PRIS_INTERVALLER klippes ud af
   kildeteksten og køres for sig. Det er den RIGTIGE konstant, ikke en kopi. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'soegning.html'), 'utf8');

function konstant(navn){
  const start = src.indexOf(`const ${navn} = [`);
  assert.notEqual(start, -1, `${navn} findes ikke længere i js/search.js`);
  const slut = src.indexOf('\n];', start);
  return new Function(`${src.slice(start, slut + 3)}\nreturn ${navn};`)();
}

const PRIS = konstant('PRIS_INTERVALLER');

test('billedets fire prisbånd: under 25.000, 25–50.000, 50–100.000, over 100.000', () => {
  assert.deepEqual(PRIS.map(p => [p.min, p.max]),
    [[null, 25000], [25001, 50000], [50001, 100000], [100001, null]]);
});

test('båndene er sammenhængende og har unikke id\'er', () => {
  for (let i = 1; i < PRIS.length; i++) assert.equal(PRIS[i].min, PRIS[i - 1].max + 1, `hul/overlap ved bånd ${i}`);
  assert.equal(new Set(PRIS.map(p => p.id)).size, PRIS.length);
  PRIS.forEach(p => assert.ok(p.label && !/\d{4,}/.test(p.label), `etiketten bruger punktum som tusindtalsskilletegn: ${p.label}`));
});

test('V3: hero og søgekort er fjernet — kun brødkrumme og ét kompakt søgefelt står tilbage', () => {
  assert.doesNotMatch(html, /so-hero|class="so-card|id="so-price"|id="so-type"|name="so-koerekort"/);
  assert.match(html, /<form class="so-q" id="srp-search"/);
  // Type, pris og kørekort findes stadig som sidebar-filtre.
  assert.match(html, /id="filter-types"/);
  assert.match(html, /id="range-price"/);
  assert.match(html, /id="filter-koerekort"/);
});

test('søgefeltet øverst er stadig #filter-q og bruger .input (kantkontrast, NF-3)', () => {
  assert.match(html, /<input type="search" id="filter-q" class="input"/);
  assert.match(html, /id="brand-search"|<\/main>/);   // brand-search bygges af js/search.js
  assert.match(src, /<input type="text" id="brand-search" class="input"/, '#brand-search skal bruge .input (NF-5)');
});

test('der er præcis én h1, og den er den dynamiske overskrift', () => {
  assert.equal((html.replace(/<!--[\s\S]*?-->/g, '').match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1 class="search-heading so-h1 visually-hidden">/);
  assert.match(html, /id="so-h1-text"/);
});
