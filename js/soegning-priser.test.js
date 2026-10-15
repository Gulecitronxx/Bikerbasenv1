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
    [[null, 25000], [25000, 50000], [50000, 100000], [100000, null]]);
});

test('båndene er sammenhængende og har unikke id\'er', () => {
  for (let i = 1; i < PRIS.length; i++) assert.equal(PRIS[i].min, PRIS[i - 1].max, `hul/overlap ved bånd ${i}`);
  assert.equal(new Set(PRIS.map(p => p.id)).size, PRIS.length);
  PRIS.forEach(p => assert.ok(p.label && !/\d{4,}/.test(p.label), `etiketten bruger punktum som tusindtalsskilletegn: ${p.label}`));
});

test('søgekortets Maks. pris-valg er tal, der også kan stå i URL\'en (?maxPrice=)', () => {
  const valg = [...html.matchAll(/<select class="input" id="so-price">([\s\S]*?)<\/select>/g)][0][1];
  const vaerdier = [...valg.matchAll(/value="(\d*)"/g)].map(m => m[1]);
  assert.equal(vaerdier[0], '', 'første valg er "Alle priser"');
  vaerdier.slice(1).forEach(v => assert.ok(Number(v) > 0 && Number.isFinite(Number(v)), `ugyldigt prisvalg: ${v}`));
});

test('søgekortets kørekortvalg er de samme som lagerets (Alle, A1, A2, A)', () => {
  const ids = [...html.matchAll(/name="so-koerekort" id="so-kk-[^"]*" value="([^"]*)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['', 'A1', 'A2', 'A']);
});

test('søgefeltet i hero\'en er stadig #filter-q og bruger .input (kantkontrast, NF-3)', () => {
  assert.match(html, /<input type="search" id="filter-q" class="input"/);
  assert.match(html, /id="brand-search"|<\/main>/);   // brand-search bygges af js/search.js
  assert.match(src, /<input type="text" id="brand-search" class="input"/, '#brand-search skal bruge .input (NF-5)');
});

test('der er præcis én h1, og den er den dynamiske overskrift', () => {
  assert.equal((html.replace(/<!--[\s\S]*?-->/g, '').match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1 class="search-heading so-h1">/);
  assert.match(html, /id="so-h1-text"/);
});
