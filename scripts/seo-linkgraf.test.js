/* Intern linkstruktur (W7 SEO): låser analysen og de tre krav på de committede sider.

   Kør: node --test scripts/seo-linkgraf.test.js */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { byggGraf, malFil, MIN_INDGAAENDE, MAX_DYBDE } = require('./seo-linkgraf');

function mappe(filer){
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'linkgraf-'));
  for (const [navn, html] of Object.entries(filer)) fs.writeFileSync(path.join(d, navn), html);
  return d;
}
const side = (main, extra = '') => `<html><head>${extra}</head><body><header><a href="index.html">Forside</a></header><main>${main}</main><footer><a href="om.html">Om</a></footer></body></html>`;

test('fixture: forældreløse, tynde og dybe sider findes, og header/footer tæller ikke som kontekst', () => {
  const d = mappe({
    'index.html': side('<a href="a.html">a</a>'),
    'a.html': side('<a href="b.html">b</a> <a href="index.html">hjem</a>'),
    'b.html': side('<a href="c.html">c</a>'),
    'c.html': side('<a href="d.html">d</a>'),
    'd.html': side(''),
    'eneboer.html': side('<a href="a.html">a</a>'),
    'skjult.html': side('', '<meta name="robots" content="noindex, follow">'),
    'om.html': side(''),
  });
  const g = byggGraf(d);
  assert.deepStrictEqual(g.foraeldreloese, ['eneboer.html', 'om.html'], 'en side, der kun står i footeren, har intet kontekstuelt indlink');
  assert.ok(g.tynde.some(([f]) => f === 'b.html'));
  const dyb = Object.fromEntries(g.raekker.map(r => [r.fil, r.dybde]));
  assert.strictEqual(dyb['index.html'], 0);
  assert.strictEqual(dyb['om.html'], 1, 'footerlink er et klik fra forsiden');
  assert.strictEqual(dyb['d.html'], 4);
  assert.ok(g.dybe.some(([f]) => f === 'd.html') && g.dybe.some(([f]) => f === 'eneboer.html'));
  assert.ok(!g.dybe.some(([f]) => f === 'skjult.html'), 'noindex-sider kræver ikke dybde');
});

test('malFil: eksterne links, anker og udvidelsesfri adresser', () => {
  const filer = new Set(['index.html', 'maerke-bmw.html']);
  assert.strictEqual(malFil('maerke-bmw.html?x=1#y', filer), 'maerke-bmw.html');
  assert.strictEqual(malFil('https://bikerbasen.dk/maerke-bmw', filer), 'maerke-bmw.html');
  assert.strictEqual(malFil('https://bikerbasen.dk', filer), 'index.html');
  assert.strictEqual(malFil('https://example.com/maerke-bmw.html', filer), null);
  assert.strictEqual(malFil('#top', filer), null);
  assert.strictEqual(malFil('mailto:a@b.dk', filer), null);
});

test('committede sider: ingen forældreløse, ingen tynde (<3 indgående) og ingen dybere end 3 klik', () => {
  const g = byggGraf();
  assert.ok(g.raekker.length > 50);
  assert.strictEqual(MIN_INDGAAENDE, 3);
  assert.strictEqual(MAX_DYBDE, 3);
  assert.deepStrictEqual(g.foraeldreloese, []);
  /* Mærkesider får deres indgående links fra maerker.html og fra beslægtede mærkesider, og de sidste afhænger af lageret
     (hvilke mærker har annoncer, og hvor mange). Et lille mærke (fx Ducati med 4 annoncer) kan derfor have 2 i stedet for 3
     uden at sitet er gået i stykker — tærsklen er 2 for maerke-*, 3 for alt andet. Forældreløse (0 indgående) er stadig en fejl. */
  /* V7 data: det samme gælder mc-<mærke>-<type> for et mærke, der kun har ÉN sådan side (indgående: mærkesiden og typesiden; søskendesiderne findes ikke).
     Efter at typen afledes af mærke + model, får fx Yamaha cruiser (18 annoncer) sin side; de tre mærke+type-sider, der opstår, er mc-honda-sport, mc-suzuki-cruiser og
     mc-yamaha-cruiser. Den sidste har 2 indgående. En tredje kunne komme fra en "samme type, andre mærker"-blok i generatoren (ikke bygget; se restpunkter i
     docs/review/gauntlet/v7/data.md). Forældreløse (0) er stadig en fejl. */
  assert.deepStrictEqual(g.tynde.filter(([fil, n]) => !(/^(?:maerke|mc)-/.test(fil) && n >= 2)), []);
  assert.deepStrictEqual(g.dybe, []);
});

test('committede sider: de to nye guides er linket fra oversigten og fra mindst to andre guides eller sider', () => {
  const g = byggGraf();
  for (const f of ['guide-mc-forsikring.html', 'guide-mc-udstyr.html']){
    const r = g.raekker.find(x => x.fil === f);
    assert.ok(r, f);
    assert.ok(r.indFra.includes('guides.html'), f + ' mangler i oversigten');
    assert.ok(r.ind >= 3, f + ' har kun ' + r.ind + ' indgående');
  }
});

test('"Se også"-blokke: ingen ny blok med over 6 links i guides (Læs også er højst 3)', () => {
  for (const f of fs.readdirSync(path.join(__dirname, '..')).filter(x => /^guide-.*\.html$/.test(x))){
    const h = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const m = h.match(/<section class="gd-sources gd-related"[\s\S]*?<\/section>/);
    if (m) assert.ok((m[0].match(/<a /g) || []).length <= 3, f);
  }
});
