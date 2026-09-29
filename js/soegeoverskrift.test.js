/* Søgesidens H1 — hvad overskriften siger ud fra de aktive filtre.
   Kør: npm test

   Samme greb som js/soegning-tom.test.js: js/search.js hænger på document og
   Store og kan ikke evalueres som helhed, så soegeoverskrift() klippes ud af
   kildeteksten og køres for sig. Det er den RIGTIGE kode, ikke en kopi. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');

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

const soegeoverskrift = new Function(udklip('soegeoverskrift') + '\nreturn soegeoverskrift;')();

const state = (over = {}) => ({ brands: [], regions: [], kilde: '', ...over });
const fraMcSyd = [{ source: { domaene: 'mcsyd.dk', navn: 'MC Syd' } }];

test('ingen filtre: "i Danmark"', () => {
  assert.equal(soegeoverskrift(state(), []), 'Motorcykler til salg i Danmark');
});

test('én region erstatter "i Danmark" i stedet for at blive hængt på', () => {
  const h = soegeoverskrift(state({ regions: ['Syddanmark'] }), []);
  assert.equal(h, 'Motorcykler til salg i Syddanmark');
  assert.ok(!/Danmark i /.test(h), 'må ikke sige "i Danmark i <region>": ' + h);
});

test('flere regioner: ingen region i overskriften, stadig "i Danmark"', () => {
  assert.equal(soegeoverskrift(state({ regions: ['Syddanmark', 'Sjælland'] }), []),
    'Motorcykler til salg i Danmark');
});

test('mærker: de tre første, og "i Danmark" tilføjes ikke', () => {
  assert.equal(soegeoverskrift(state({ brands: ['Honda'] }), []), 'Honda til salg');
  assert.equal(soegeoverskrift(state({ brands: ['A', 'B', 'C', 'D'] }), []), 'A, B, C til salg');
});

test('mærke og region: "Honda til salg i Syddanmark"', () => {
  assert.equal(soegeoverskrift(state({ brands: ['Honda'], regions: ['Syddanmark'] }), []),
    'Honda til salg i Syddanmark');
});

test('kildeside: kildens navn slås op fra annoncerne', () => {
  assert.equal(soegeoverskrift(state({ kilde: 'mcsyd.dk' }), fraMcSyd), 'Motorcykler hos MC Syd');
});

test('kildeside uden kendte annoncer: domænet står, ikke "undefined"', () => {
  assert.equal(soegeoverskrift(state({ kilde: 'mcsyd.dk' }), []), 'Motorcykler hos mcsyd.dk');
});

test('kilde OG mærke: mærket vinder, kildechippen viser resten', () => {
  assert.equal(soegeoverskrift(state({ kilde: 'mcsyd.dk', brands: ['Honda'] }), fraMcSyd),
    'Honda til salg');
});
