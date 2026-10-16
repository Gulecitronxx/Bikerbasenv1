/* w9-marketplace: kørekortkortet på annoncesiden skelner MULIG / KRÆVER / IKKE AFGJORT / KAN IKKE AFGØRES,
   og siger aldrig "bekræftet". Prischippet på søgesiden læser Maks./Fra. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { indlaes, MED_ANNONCE } = require('./w5-hjaelp.js');

const { anKoerekortKort } = indlaes(MED_ANNONCE, ['anKoerekortKort']);
const kk = (power, ccm) => {
  const l = { power, ccm, isExternal: true };
  return anKoerekortKort(l, koerekortMaerkatFor(l), false);
};
const { koerekortMaerkat: koerekortMaerkatFor } = indlaes(MED_ANNONCE, ['koerekortMaerkat']);

test('mulig A2 (47 hk): pille "Mulig", ikke "bekræftet"', () => {
  const h = kk(40, 600);
  assert.match(h, /an-kk-mulig/);
  assert.match(h, />Mulig</);
  assert.doesNotMatch(h, /bekræftet<|Bekræftet</);
  assert.match(h, /Ikke bekræftet/);
});

test('48 og 49 hk: Ikke afgjort, ikke A og ikke A2', () => {
  for (const hk of [48, 49]){
    const h = kk(hk, 689);
    assert.match(h, /an-kk-uafgjort/);
    assert.match(h, />Ikke afgjort</);
    assert.doesNotMatch(h, /<b>A2?<\/b>/);
  }
});

test('50+ hk: Kræver A', () => {
  const h = kk(74, 689);
  assert.match(h, /an-kk-kraever/);
  assert.match(h, /<b>A<\/b>/);
});

test('uden effekt over 125 ccm: Kan ikke afgøres', () => {
  const h = kk(null, 689);
  assert.match(h, /an-kk-ukendt/);
});

test('prischip: Maks./Fra i stedet for "0 kr. – X"', () => {
  const src = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');
  assert.match(src, /`Maks\. \$\{formatPrice\(state\.priceMax\)\}`/);
  assert.doesNotMatch(src, /:'0 kr\.'\}/);
});
