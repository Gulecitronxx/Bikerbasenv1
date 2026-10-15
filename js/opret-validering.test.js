const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('./opret-validering.js');

const AAR = 2026;
const ok = (id, v) => assert.equal(V.validerTal(id, v, AAR), null, `${id}=${v} skal accepteres`);
const afvist = (id, v) => {
  const m = V.validerTal(id, v, AAR);
  assert.ok(typeof m === 'string' && m.length > 10, `${id}=${v} skal afvises med tekst`);
  return m;
};

test('årgang: 1900 til næste år (modelår), ikke 1899 og ikke 2028', () => {
  ok('f-year', '1900'); ok('f-year', '2026'); ok('f-year', '2027');
  afvist('f-year', '1899'); afvist('f-year', '2028'); afvist('f-year', '0');
  assert.match(afvist('f-year', '1850'), /1900 og 2027/);
});

test('årgang følger indeværende år', () => {
  assert.equal(V.validerTal('f-year', '2031', 2030), null);
  assert.ok(V.validerTal('f-year', '2032', 2030));
});

test('effekt: negative og urealistiske værdier afvises, tom er tilladt', () => {
  ok('f-power', ''); ok('f-power', '1'); ok('f-power', '72'); ok('f-power', '300');
  afvist('f-power', '-3'); afvist('f-power', '0'); afvist('f-power', '9999'); afvist('f-power', '301');
  assert.match(afvist('f-power', '9999'), /hk/);
});

test('pris: 1 til 5.000.000, ingen negative eller nul', () => {
  ok('f-price', '1'); ok('f-price', '69900'); ok('f-price', '5000000');
  afvist('f-price', '-100'); afvist('f-price', '0'); afvist('f-price', '5000001');
});

test('ccm: heltal 1 til 3000 (knallert 45 er 49 ccm), afviser 0 og 500,5', () => {
  ok('f-ccm', '1'); ok('f-ccm', '49'); ok('f-ccm', '50'); ok('f-ccm', '689'); ok('f-ccm', '3000');
  afvist('f-ccm', '0'); afvist('f-ccm', '3001'); afvist('f-ccm', '500.5'); afvist('f-ccm', '-1');
});

test('km: 0 til 500.000', () => {
  ok('f-km', '0'); ok('f-km', '12500'); ok('f-km', '500000');
  afvist('f-km', '-1'); afvist('f-km', '500001'); afvist('f-km', '12.5');
});

test('ikke-tal og videnskabelig notation afvises', () => {
  afvist('f-price', 'abc'); afvist('f-price', '1e3'); afvist('f-km', 'Infinity'); afvist('f-km', '--5');
});

test('valgfri historik: ejere, syn og dæk', () => {
  ok('f-ejere', ''); ok('f-ejere', '1'); afvist('f-ejere', '0'); afvist('f-ejere', '100');
  ok('f-synsaar', '2025'); afvist('f-synsaar', '1979'); afvist('f-synsaar', '2027');
  ok('f-daek', '1990'); afvist('f-daek', '1989'); afvist('f-daek', '2027');
});

test('ukendt felt giver ingen fejl', () => {
  assert.equal(V.validerTal('f-findes-ikke', '-5', AAR), null);
});

test('graenser() deler tallene med min/max-attributterne', () => {
  assert.deepEqual(V.graenser('f-ccm', AAR), { min: 1, max: 3000 });
  assert.deepEqual(V.graenser('f-power', AAR), { min: 1, max: 300 });
  assert.deepEqual(V.graenser('f-year', AAR), { min: 1900, max: 2027 });
  assert.equal(V.graenser('f-findes-ikke', AAR), null);
});

test('beskrivelse: loft på 4.000 tegn', () => {
  assert.equal(V.validerBeskrivelse('a'.repeat(4000)), null);
  assert.match(V.validerBeskrivelse('a'.repeat(4005)), /5 tegn for lang/);
});

test('validerTrin: samler fejl i feltrækkefølge pr. trin', () => {
  const vaerdier = { 'f-year': '1850', 'f-km': '100', 'f-ccm': '689', 'f-power': '9999', 'f-ejere': '', 'f-synsaar': '', 'f-daek': '' };
  const fejl = V.validerTrin(1, id => vaerdier[id], AAR);
  assert.deepEqual(fejl.map(f => f.id), ['f-year', 'f-power']);
  const t2 = V.validerTrin(2, id => ({ 'f-price': '-100', 'f-desc': 'ok' })[id], AAR);
  assert.deepEqual(t2.map(f => f.id), ['f-price']);
  assert.deepEqual(V.validerTrin(3, () => '', AAR), []);
});

test('validerData: ugyldige tal i en kladde fanges (F-1)', () => {
  const kladde = { brand: 'Yamaha', model: 'MT-07', type: 'naked', year: 1850, km: -5, ccm: 99999, power: 9999, price: 99999999, description: 'ok', videreTilTrin: 3 };
  const fejl = V.validerData(kladde, AAR);
  assert.deepEqual(fejl.map(f => f.id).sort(), ['f-ccm', 'f-km', 'f-power', 'f-price', 'f-year']);
  fejl.forEach(f => assert.ok(f.besked.length > 10));
});

test('validerData: gyldigt sæt giver ingen fejl; tom kladde kun "mangler"', () => {
  const ok = { brand: 'Honda', model: 'CB500F', year: 2019, km: 20000, ccm: 471, power: 47, price: 59900, description: 'Pæn.', antalEjere: 1, sidsteSyn: 2025, daekAar: 2024 };
  assert.deepEqual(V.validerData(ok, AAR), []);
  const tom = V.validerData({}, AAR);
  assert.ok(tom.length >= 6 && tom.every(f => f.besked === 'Feltet skal udfyldes.'));
  assert.deepEqual(V.validerData({}, AAR, { kunUgyldige: true }), []);
});

test('validerData: ugyldig valgfri historik (fold) fanges, tom historik ikke', () => {
  const base = { brand: 'a', model: 'b', year: 2020, km: 1, ccm: 100, price: 1, description: 'x' };
  assert.deepEqual(V.validerData(Object.assign({}, base, { antalEjere: 0 }), AAR).map(f => f.id), ['f-ejere']);
  assert.deepEqual(V.validerData(Object.assign({}, base, { antalEjere: null, sidsteSyn: null }), AAR), []);
});

test('validerData: for lang beskrivelse', () => {
  const d = { brand: 'a', model: 'b', year: 2020, km: 1, ccm: 100, price: 1, description: 'x'.repeat(4001) };
  assert.deepEqual(V.validerData(d, AAR).map(f => f.id), ['f-desc']);
});
