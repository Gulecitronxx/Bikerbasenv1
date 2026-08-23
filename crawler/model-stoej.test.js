/* Runde 7 (D7-S4): salgsstoej i modelfeltet klippes — seks eksempler fra
   lageret 23.08.2026. Laaser rensModelStoej() i crawler/normalize.js (samme
   funktion i js/backend-bridge.js for de raekker, der allerede ligger). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { rensModelStoej } = require('./normalize');

test('kildenavn og garanti klippes af', () => {
  assert.equal(rensModelStoej('CBR 650 R MC-SYD'), 'CBR 650 R');
  assert.equal(rensModelStoej('GL 1800 Gold Wing MC-SYD 5 ÅRS GARANTI'), 'GL 1800 Gold Wing');
  assert.equal(rensModelStoej('NT 1100 A 5 ÅRS FABRIKS GARANTI'), 'NT 1100 A');
});
test('saelges/byttes/bud klippes af', () => {
  assert.equal(rensModelStoej('ZZR600 sælges eller byttes'), 'ZZR600');
  assert.equal(rensModelStoej('Gsf 650 bandit 2008 sælges bud modtages'), 'Gsf 650 bandit 2008');
});
test('"med meget udstyr" og farver i versaler klippes af', () => {
  assert.equal(rensModelStoej('Motorcykel med meget udstyr'), null, '"Motorcykel" alene er ikke en model');
  assert.equal(rensModelStoej('Daytona 660 ALUMINIUM SILVER/SAPPHIRE BLACK'), 'Daytona 660');
});
test('rigtige modelnavne roeres ikke', () => {
  for (const m of ['CB 1000 Hornet', 'GSX-R 750', 'FXBR Breakout', 'CRF 1100 L Africa Twin', 'MT-07', 'R 1250 GS Adventure', 'Street Triple RS'])
    assert.equal(rensModelStoej(m), m);
  assert.equal(rensModelStoej(null), null);
  assert.equal(rensModelStoej(''), '');
});
