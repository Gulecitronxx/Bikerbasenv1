// F-001: fritekstsøgningen skal finde motorcyklen, selv om brugeren skriver mellemrum,
// bindestreg og accenter anderledes end annoncen. Syntetiske annoncer — kun brand/model.
const test = require('node:test');
const assert = require('node:assert');
const Filtrering = require('./filtrering.js');

const alle = [
  { brand: 'Honda', model: 'GL 1800 Gold Wing' },
  { brand: 'Honda', model: 'CB 500' },
  { brand: 'Honda', model: 'CBR650R' },
  { brand: 'Honda', model: 'CMX 500 Rebel' },
  { brand: 'BMW', model: 'R 1250 GS' },
  { brand: 'BMW', model: 'F 900 R' },
  { brand: 'Yamaha', model: 'MT-09' },
  { brand: 'Yamaha', model: 'Ténéré 700' },
  { brand: 'Harley-Davidson', model: 'Iron 883' },
];
const find = q => Filtrering.anvendFiltre(alle, { q }).map(l => `${l.brand} ${l.model}`);

const skalFinde = {
  goldwing: 'GL 1800 Gold Wing', gl1800: 'GL 1800 Gold Wing', 'gold wing': 'GL 1800 Gold Wing',
  cb500: 'Honda CB 500', 'cb 500': 'Honda CB 500', 'cbr 650 r': 'Honda CBR650R', cbr650r: 'Honda CBR650R',
  r1250gs: 'BMW R 1250 GS', 'bmw gs': 'BMW R 1250 GS', 'BMW R1250 GS': 'BMW R 1250 GS',
  mt09: 'Yamaha MT-09', 'mt 09': 'Yamaha MT-09', tenere: 'Yamaha Ténéré 700', 'Ténéré': 'Yamaha Ténéré 700',
  'harley davidson': 'Harley-Davidson Iron 883', hd: 'Harley-Davidson Iron 883', 'honda rebel': 'Honda CMX 500 Rebel',
};
for (const [q, forventet] of Object.entries(skalFinde)) {
  test(`"${q}" finder ${forventet}`, () => {
    assert.ok(find(q).some(s => s.includes(forventet)), `fik ${JSON.stringify(find(q))}`);
  });
}

test('et ord, der intet matcher, giver stadig 0 træf', () => {
  assert.deepStrictEqual(find('zzzz'), []);
});
test('alle ord skal matche (OG): "honda gs" er ikke BMW GS', () => {
  assert.deepStrictEqual(find('honda gs'), []);
});
test('tom søgning returnerer alt', () => {
  assert.strictEqual(find('  ').length, alle.length);
});
