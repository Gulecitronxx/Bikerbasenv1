/* Title- og description-kvalitet (W7 SEO): længde, dubletter og søgeintention på alle indekserbare sider.

   Kør: node --test scripts/seo-meta-laengde.test.js
   Title ≤ 60 tegn, description 120-160 tegn, ingen dubletter af title/description/h1. Siderne læses fra
   disken (ingen netværk). Tekstsiderne (vilkaar.html m.fl.) ejes af en anden strøm og er undtaget fra
   længdekravet til description; de må ikke blive dubletter. */

const test = require('node:test');
const assert = require('node:assert');
const { analyser, TITEL_MAX } = require('./seo-audit');

const r = analyser();
const idx = r.sider.filter(s => !s.noindex);
const TEKSTSIDER = new Set(['vilkaar.html']);

test('title er højst 60 tegn og description 120-160 på alle indekserbare sider', () => {
  assert.strictEqual(TITEL_MAX, 60);
  const fejl = [];
  for (const s of idx){
    if (s.titel.length > 60) fejl.push(`${s.fil}: title ${s.titel.length}`);
    if (TEKSTSIDER.has(s.fil)) continue;
    if (s.beskrivelse.length < 120 || s.beskrivelse.length > 160) fejl.push(`${s.fil}: description ${s.beskrivelse.length}`);
  }
  assert.deepStrictEqual(fejl, []);
});

test('ingen dubletter af title, description eller h1 på tværs af indekserbare sider', () => {
  assert.deepStrictEqual(r.fund.dubletTitel, []);
  assert.deepStrictEqual(r.fund.dubletBeskrivelse, []);
  assert.deepStrictEqual(r.fund.dubletH1, []);
  assert.deepStrictEqual(r.fund.h1Forkert, []);
});

test('medSlut vælger den lange slutning kun når totalen er højst 160 tegn', () => {
  const { medSlut, BESK_MAX } = require('./build-facet-pages');
  assert.strictEqual(BESK_MAX, 160);
  assert.strictEqual(medSlut('A', ' kort', ' lang'), 'A lang');
  const base = 'x'.repeat(150);
  assert.strictEqual(medSlut(base, ' kort', ' meget lang slutning'), base + ' kort');
  for (const base2 of ['Se 43 brugte motorcykler til salg i Horsens (Midtjylland). Priser fra 24.995 kr.', 'Se 5 Honda XL 750 Transalp til salg i Danmark.']){
    const d = medSlut(base2, ' Sammenlign årgang, km og type på Bikerbasen.', ' Sammenlign årgang, km, type og kilde, og gå videre til annoncen hos sælger.');
    assert.ok(d.length <= 160);
  }
});

test('søgeintention: titlen på facet- og mærkesider indeholder det, siden handler om', () => {
  const kraev = [
    [/^budget-under-(\d+)\.html$/, (m, s) => s.titel.includes(Number(m[1]).toLocaleString('da-DK')) || s.titel.includes(String(m[1]).replace(/\B(?=(\d{3})+(?!\d))/g, '.'))],
    [/^region-(.+)\.html$/, (m, s) => /motorcykler til salg i/i.test(s.titel)],
    [/^type-(.+)\.html$/, (m, s) => /motorcykler/i.test(s.titel)],
    [/^maerke-(.+)\.html$/, (m, s) => /motorcykler|brugte/i.test(s.titel)],
    [/^model-(.+)\.html$/, (m, s) => /til salg|^(Brugte|Fabriksnye) /i.test(s.titel)],   // meget lange modelnavne dropper "til salg" (titelMedMaerke), men beholder mærke + model
  ];
  for (const s of idx){
    for (const [re, ok] of kraev){
      const m = s.fil.match(re);
      if (m) assert.ok(ok(m, s), `${s.fil}: title "${s.titel}" matcher ikke sidens emne`);
    }
  }
});
