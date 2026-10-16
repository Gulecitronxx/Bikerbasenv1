/* F2-001: 48-49 hk er IKKE "Kræver A". Kør: node --test js/w5-koerekort.test.js

   35 kW = 47,6 hk, og kilderne runder op til 48. Et heltal 48 eller 49 hk uden kW kan altså være en
   lovlig A2-maskine. Reglen (ÉN funktion, js/data.js):
     kW opgivet     <= 35 -> A2 (mulig), > 35 -> A
     kun hk         <= 47 -> A2 (mulig), 48-49 -> ikke afgjort (tjek kW), >= 50 -> A

   Integrationstesten holder kortbadge, filter, annoncesidens "Kan du køre denne?", rækkens/sammenlign-celler
   og tællefunktionen (Filtrering.anvendFiltre = det forside, søgning og facetsider tæller med) sammen. */

const test = require('node:test');
const assert = require('node:assert');
const { indlaes, MED_ANNONCE } = require('./w5-hjaelp.js');

const F = indlaes(MED_ANNONCE,
  ['koerekortForListing', 'passerKoerekort', 'koerekortMaerkat', 'anKoerekortKort', 'listingCardHTML',
   'anFakta', 'Filtrering', 'koerekortTvivl', 'LISTINGS', 'A2_MAX_HK']);

// Stor nok ccm til at A1 er udelukket; ccm er ikke det, der testes.
const mc = (hk, extra) => Object.assign({ id: 'x' + hk, brand: 'Honda', model: 'CMX 500 Rebel', year: 2022, km: 5000,
  ccm: 471, power: hk, price: 70000, isExternal: true, externalUrl: 'https://mcsyd.dk/x',
  source: { navn: 'MC Syd', domaene: 'mcsyd.dk' }, city: 'Rødding', postnr: 6630 }, extra || {});

const kortChip = html => (html.match(/<li class="rk-chip rk-kk[^>]*>([\s\S]*?)<\/li>/) || [, ''])[1];

test('40 hk-værdier 30-60: mulig A2 <=47, ikke afgjort 48-49, kræver A >=50', () => {
  let n = 0;
  for (let hk = 30; hk <= 60; hk++){
    n++;
    const l = mc(hk);
    const m = F.koerekortMaerkat(l);
    if (hk <= 47){
      assert.equal(m.kode, 'A2', `${hk} hk`);
      assert.equal(m.tekst, 'Mulig A2');
    } else if (hk <= 49){
      assert.equal(m.kode, null, `${hk} hk må ikke få en kode`);
      assert.match(m.tekst, /ikke afgjort/i);
      assert.match(m.tekst + m.forklaring, /tjek kW/i);
      assert.ok(!/Kræver A-kørekort/.test(m.forklaring) && m.tekst !== 'Kørekort A', `${hk} hk må ikke stå som "Kræver A"`);
    } else {
      assert.equal(m.kode, 'A', `${hk} hk`);
      assert.match(m.forklaring, /Kræver A-kørekort/);
    }
  }
  assert.ok(n >= 31);
  // Plus ti grænseværdier med decimaler / strenge (kilder skriver tal som tekst).
  for (const [hk, forventet] of [['47', 'A2'], [47.4, null], [47.6, null], ['48', null], [49.9, null], ['50', 'A'], [50.1, 'A'], [35, 'A2'], [100, 'A'], [125, 'A']]){
    assert.equal(F.koerekortMaerkat(mc(hk)).kode, forventet, `${JSON.stringify(hk)} hk`);
  }
});

test('kW opgivet vinder over hk: 35 kW mulig A2, 36 kW kræver A', () => {
  assert.equal(F.koerekortMaerkat(mc(48, { kw: 35 })).kode, 'A2');
  assert.equal(F.koerekortMaerkat(mc(48, { kw: 34.8 })).kode, 'A2');
  assert.equal(F.koerekortMaerkat(mc(48, { kw: 36 })).kode, 'A');
  assert.equal(F.koerekortMaerkat(mc(null, { kw: 35 })).kode, 'A2', 'kW alene rækker');
  assert.equal(F.koerekortMaerkat(mc(null, { kw: 36 })).kode, 'A');
  assert.equal(F.koerekortMaerkat(mc(40, { kw: 40 })).kode, 'A', 'oplyst kW slår et lavere hk-tal');
  assert.equal(F.passerKoerekort(mc(48, { kw: 36 }), 'A2'), false);
  assert.equal(F.passerKoerekort(mc(48, { kw: 35 }), 'A2'), true);
});

test('A1-grænserne er uændrede (125 ccm og 15 hk / 11 kW)', () => {
  const lille = (ccm, hk, extra) => Object.assign({ ccm, power: hk }, extra || {});
  assert.equal(F.koerekortForListing(lille(125, 15)), 'A1');
  assert.equal(F.koerekortForListing(lille(125, 16)), 'A2');
  assert.equal(F.koerekortForListing(lille(126, 15)), 'A2');
  assert.equal(F.koerekortForListing(lille(125, null)), null, 'A1 kræver kendt hk');
  assert.equal(F.koerekortForListing(lille(125, null, { kw: 11 })), 'A1');
  assert.equal(F.koerekortForListing(lille(125, null, { kw: 11.5 })), 'A2');
  assert.equal(F.passerKoerekort(lille(125, 15), 'A1'), true);
  assert.equal(F.passerKoerekort(lille(125, 16), 'A1'), false);
});

test('48-49 hk (uden kW) udelukkes IKKE af A2-filteret; 50 hk gør', () => {
  const liste = [mc(46), mc(47), mc(48), mc(49), mc(50), mc(60)].map((l, i) => Object.assign(l, { id: 'id' + i }));
  const a2 = F.Filtrering.anvendFiltre(liste, { koerekort: 'A2' }).map(l => l.power);
  assert.deepEqual(a2, [46, 47, 48, 49]);
  const a = F.Filtrering.anvendFiltre(liste, { koerekort: 'A' }).length;
  assert.equal(a, liste.length, 'A dækker alt');
});

test('ÉN funktion: badge, filter, annoncesidens kort og fakta er enige for hver hk 30-60', () => {
  for (let hk = 30; hk <= 60; hk++){
    const l = mc(hk);
    const m = F.koerekortMaerkat(l);
    const filterA2 = F.Filtrering.anvendFiltre([l], { koerekort: 'A2' }).length === 1;
    const kort = kortChip(F.listingCardHTML(l, 1));
    const side = F.anKoerekortKort(l, m, false);

    // filter <-> badge: vises den som "Kræver A", skal A2-filteret have afvist den (og omvendt).
    assert.equal(filterA2, m.kode !== 'A', `${hk} hk: A2-filter og badge uenige`);
    // kortet bruger samme tekst
    if (m.kode === 'A') assert.match(kort, /Kræver A/);
    else assert.ok(!/Kræver A/.test(kort), `${hk} hk: kortet må ikke sige Kræver A`);
    if (m.tekst.includes('ikke afgjort')) assert.match(kort, /ikke afgjort/i);
    // annoncesiden bruger samme udregning
    if (m.kode === 'A') assert.match(side, /Kræver A-kørekort/);
    else assert.ok(!/Kræver A-kørekort/.test(side), `${hk} hk: annoncesiden må ikke sige Kræver A`);
    if (hk === 48 || hk === 49) assert.match(side, /tjek kW/i);
  }
});

test('tællefunktionen (forside/søgning/facet) tæller 48-49 hk som A2-mulige', () => {
  const liste = [];
  for (let hk = 30; hk <= 60; hk++) liste.push(mc(hk, { id: 'n' + hk }));
  const a2 = F.Filtrering.anvendFiltre(liste, { koerekort: 'A2' }).length;
  // 30..49 = 20 stk. (47 hk og derunder: 18, plus 48 og 49)
  assert.equal(a2, 20);
  const raekkenKraeverA = liste.filter(l => F.koerekortMaerkat(l).kode === 'A').length;
  assert.equal(raekkenKraeverA, liste.length - a2, 'alle der ikke er A2-mulige, kræver A — ingen i mellem');
});

test('annoncesidens fakta-række skriver ikke "Kan ikke afgøres" uden at nævne kW ved 48-49 hk', () => {
  const m = F.koerekortMaerkat(mc(48));
  assert.equal(m.graense, true);
  assert.match(m.forklaring, /35 kW/);
  assert.match(m.forklaring, /47,6 hk/);
});
