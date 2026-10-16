/* F2-010: fejlet/tom hentning er ikke "Bikerbasen er helt nyt". Kør: node --test js/w5-tomt.test.js

   Tomtilstanden for et helt tomt lager (500 fra backend, eller [] fra begge kilder) skal være en ærlig
   hentefejl med "prøv igen". Netværksdelen (mock der svarer 500 / []) måles i browseren, se builder-w5-funktion.md. */

const test = require('node:test');
const assert = require('node:assert');
const { indlaes, MED_SOEGNING } = require('./w5-hjaelp.js');

const S = indlaes(MED_SOEGNING, ['tomtilstandsIndhold']);

test('tomt lager (500 eller []): ærlig hentefejl med "prøv igen", ingen "helt nyt"', () => {
  const t = S.tomtilstandsIndhold(true, []);
  assert.equal(t.fejl, true);
  assert.match(t.titel, /Vi kunne ikke hente annoncerne lige nu — prøv igen/);
  assert.doesNotMatch(t.titel + ' ' + t.tekst, /helt nyt|ingen annoncer endnu|Bliv den første/i);
});

test('lager findes, men filtrene giver 0: den normale "ingen matcher"-tilstand', () => {
  const t = S.tomtilstandsIndhold(false, [{ label: 'Honda' }, { label: 'Under 10.000 kr.' }]);
  assert.equal(t.fejl, false);
  assert.match(t.titel, /Ingen annoncer matcher/);
  assert.doesNotMatch(t.titel + t.tekst, /kunne ikke hente/);
});
