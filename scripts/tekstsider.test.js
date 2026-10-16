'use strict';
/* Ærlighedsinvarianter for de håndskrevne tekstsider (acceptkriterier i
   docs/review/gauntlet/builder-w6-tekst.md). Kun indholdsdelen (<main>) læses. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SIDER = ['privatlivspolitik', 'vilkaar', 'om-bikerbasen', 'om-indeksering', 'sikkerhed'];
function indhold(navn) {
  const h = fs.readFileSync(path.join(__dirname, '..', navn + '.html'), 'utf8');
  const m = h.match(/<main[\s\S]*?<\/main>/);
  assert.ok(m, navn + ' mangler <main>');
  return m[0].replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
const TEKST = Object.fromEntries(SIDER.map((s) => [s, indhold(s)]));

test('ingen løfter om betaling, beskedlevering eller "helt nyt"', () => {
  const forbudt = [
    /skriv via bikerbasen/i, /send (en )?besked/i, /skriv til s[æe]lger(en)? her/i,
    /helt nyt/i, /f[øo]rste (af sin art|i danmark)/i,
    /verificeret (s[æe]lger|forhandler) (badge|-?m[æe]rkat)? ?(f[åa]s|kan du)/i,
  ];
  for (const [side, t] of Object.entries(TEKST)) {
    for (const re of forbudt) assert.ok(!re.test(t), `${side}: matcher ${re}`);
  }
});

test('"sikker betaling" og escrow nævnes kun som noget, der IKKE findes', () => {
  for (const [side, t] of Object.entries(TEKST)) {
    for (const m of t.matchAll(/sikker betaling|escrow/gi)) {
      const ctx = t.slice(Math.max(0, m.index - 140), m.index + 160).toLowerCase();
      assert.match(ctx, /intet|ingen|findes ikke|ikke |advarsel/, `${side}: "${m[0]}" uden negation`);
    }
  }
});

test('privatlivssiden: localStorage, Supabase, kontaktvej, GA-samtykke, rettigheder, opt-out, claim', () => {
  const t = TEKST.privatlivspolitik;
  for (const ord of ['localStorage', 'sessionStorage', 'Supabase', 'kontakt@bikerbasen.dk', 'Datatilsynet',
    'Google Analytics', 'samtykke', 'databehandler', 'Dataansvarlig', 'bb_cookie_consent', 'indeksering']) {
    assert.ok(t.toLowerCase().includes(ord.toLowerCase()), 'mangler: ' + ord);
  }
  assert.match(t, /verificeret ejerskab/i);
  assert.match(t, /ret til at (få indsigt|slette)|indsigt i, rette/i);
  const html = fs.readFileSync(path.join(__dirname, '..', 'privatlivspolitik.html'), 'utf8');
  assert.match(html, /href="mailto:kontakt@bikerbasen\.dk"/);
  assert.match(html, /href="om-indeksering\.html"/);
});

test('privatlivssidens localStorage-liste dækker alle nøgler i js/store.js', () => {
  const store = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
  const blok = store.match(/KEYS:\s*\{([\s\S]*?)\}/)[1];
  const nøgler = [...blok.matchAll(/'(bb_[a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(nøgler.length >= 10);
  for (const n of nøgler) assert.ok(TEKST.privatlivspolitik.includes(n), 'privatlivspolitik mangler ' + n);
});

test('claim kræver verificeret ejerskab og manuel godkendelse (vilkår)', () => {
  assert.match(TEKST.vilkaar, /verificeret ejerskab/i);
  assert.match(TEKST.vilkaar, /manuelt/i);
});

test('indeksering: kontaktvej og opt-out beskrevet', () => {
  const t = TEKST['om-indeksering'];
  assert.match(t, /kontakt@bikerbasen\.dk/);
  assert.match(t, /robots\.txt/);
  assert.match(t, /holde op|stopper/);
});

test('ingen opdigtede virksomhedsoplysninger (CVR/adresse) på tekstsiderne', () => {
  for (const [side, t] of Object.entries(TEKST)) {
    assert.ok(!/CVR[- ]?(nr\.?|nummer)?:? ?\d{8}/i.test(t), side + ': hardcodet CVR');
    const mails = t.match(/[\w.+-]+@[\w-]+\.[a-z.]+/gi) || [];
    for (const m of mails) assert.strictEqual(m.toLowerCase(), 'kontakt@bikerbasen.dk', side + ': ukendt mail ' + m);
  }
});
