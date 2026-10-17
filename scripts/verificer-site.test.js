/* Låser scripts/verificer-site.js: hvert trin skal kunne FEJLE (fixtures i temp-mapper) og kunne bestå.
   Rører hverken netværk, build eller repoets egne filer. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const v = require('./verificer-site');

const SYNK = fs.readFileSync(path.join(__dirname, 'synk-header.js'), 'utf8');
const SKRIV = (root, rel, txt) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), txt); };

/* Header/footer i det format synk-header.js udtrækker (skip-link … menuskuffens lukning; footer-grid … footer-bottom). */
const HF = t => `<a class="skip-link" href="#m">Spring</a><header class="site-header"><nav class="main-nav">${t}</nav>\n<div>\n</div>\n</div></header>\n` +
  '<footer class="site-footer"><div class="footer-grid">G</div><div class="footer-bottom">b</div></footer>';
const side = ({ titel = 'Titel', besk = 'x'.repeat(100), noindex = false, h1 = 'Overskrift', body = '', nav = HF('A') } = {}) =>
  `<!doctype html><html><head><title>${titel}</title><meta name="description" content="${besk}">` +
  (noindex ? '<meta name="robots" content="noindex">' : '') +
  `</head><body>${nav}<main><h1>${h1}</h1>${body}</main></body></html>`;

/* Et minimalt, grønt site. */
function lavSite(){
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verificer-'));
  SKRIV(root, 'js/seo.js', "const SITE_URL = 'https://eksempel.dk';\n");
  SKRIV(root, 'js/a.js', 'const a = 1;\n');
  SKRIV(root, 'js/a.test.js', '// test\n');
  SKRIV(root, 'package.json', JSON.stringify({ scripts: { test: 'node --test js/a.test.js' } }));
  SKRIV(root, 'index.html', side({ titel: 'Forside', besk: 'f'.repeat(100), h1: 'Forside', body: '<a href="om.html">Om</a> <a href="https://andet.dk/x">ud</a> <a href="#top">top</a> <a href="/">hjem</a>' }));
  SKRIV(root, 'om.html', side({ titel: 'Om', besk: 'o'.repeat(100), h1: 'Om', body: '<a href="om?x=1#y">selv</a> <a href="mailto:a@b.dk">mail</a>' }));
  SKRIV(root, 'sitemap.xml', '<urlset><url><loc>https://eksempel.dk</loc></url><url><loc>https://eksempel.dk/om</loc></url></urlset>');
  // synk-header kører på den rod, det ligger i; header/footer-fixtures er ikke nødvendige for en grøn kørsel
  // hvis ingen side har site-header, så det springes sider over.
  SKRIV(root, 'scripts/synk-header.js', SYNK);
  SKRIV(root, 'scripts/site-url.js', fs.readFileSync(path.join(__dirname, 'site-url.js'), 'utf8'));
  return root;
}
const medSite = fn => { const r = lavSite(); try { return fn(r); } finally { fs.rmSync(r, { recursive: true, force: true }); } };

test('(1) syntaks: grøn site består, en syntaksfejl fanges', () => medSite(root => {
  assert.strictEqual(v.tjekSyntaks(root).ok, true);
  SKRIV(root, 'js/daarlig.js', 'const = ;\n');
  const r = v.tjekSyntaks(root);
  assert.strictEqual(r.ok, false);
  assert.match(r.fund[0], /js\/daarlig\.js/);
}));

test('(3) synk-header: afvigende header fanges', () => medSite(root => {
  const r0 = v.tjekHeader(root);
  assert.strictEqual(r0.ok, true, r0.fund.join('\n'));
  SKRIV(root, 'om.html', side({ titel: 'Om', besk: 'o'.repeat(100), h1: 'Om', nav: HF('ANDEN') }));
  const r = v.tjekHeader(root);
  assert.strictEqual(r.ok, false);
  assert.match(r.fund[0], /om\.html/);
}));

test('(3) synk-header: manglende script giver fejl', () => medSite(root => {
  fs.rmSync(path.join(root, 'scripts/synk-header.js'));
  assert.strictEqual(v.tjekHeader(root).ok, false);
}));

test('(4) seo-audit: grøn site består, dubleret title fanges', () => medSite(root => {
  assert.strictEqual(v.tjekSeoAudit(root).ok, true);
  SKRIV(root, 'om.html', side({ titel: 'Forside', besk: 'o'.repeat(100), h1: 'Om' }));
  const r = v.tjekSeoAudit(root);
  assert.strictEqual(r.ok, false);
  assert.ok(r.fund.some(f => f.startsWith('dubletTitel')));
}));

test('(4) seo-audit: manglende h1 fanges', () => medSite(root => {
  SKRIV(root, 'om.html', side({ h1: '' }).replace('<h1></h1>', ''));
  assert.strictEqual(v.tjekSeoAudit(root).ok, false);
}));

test('(5) sitemap: grøn site består', () => medSite(root => {
  assert.strictEqual(v.tjekSitemap(root).ok, true);
}));

test('(5) sitemap: URL uden fil, noindex-side, dublet og fremmed domæne fanges', () => medSite(root => {
  SKRIV(root, 'skjult.html', side({ titel: 'Skjult', noindex: true, h1: 'Skjult' }));
  SKRIV(root, 'sitemap.xml', '<urlset>' + [
    'https://eksempel.dk', 'https://eksempel.dk/findes-ikke', 'https://eksempel.dk/skjult',
    'https://eksempel.dk/om', 'https://eksempel.dk/om', 'https://andet.dk/x',
  ].map(u => `<url><loc>${u}</loc></url>`).join('') + '</urlset>');
  const f = v.tjekSitemap(root).fund.join('\n');
  assert.match(f, /findes-ikke\.html findes ikke/);
  assert.match(f, /skjult\.html er noindex/);
  assert.match(f, /om: står to gange/);
  assert.match(f, /andet\.dk\/x: uden for/);
}));

test('(5) sitemap: manglende sitemap.xml fanges', () => medSite(root => {
  fs.rmSync(path.join(root, 'sitemap.xml'));
  assert.strictEqual(v.tjekSitemap(root).ok, false);
}));

test('(6) døde links: grøn site består (eksterne, mailto, #anker, ?query og rene adresser er ok)', () => medSite(root => {
  assert.strictEqual(v.tjekDoedeLinks(root).ok, true);
}));

test('(6) døde links: link til manglende fil på indekserbar side fanges, men ikke på noindex-side', () => medSite(root => {
  SKRIV(root, 'om.html', side({ titel: 'Om', besk: 'o'.repeat(100), h1: 'Om', body: '<a href="doed.html">x</a><a href="/doed2">y</a><!-- <a href="kommentar.html"> -->' }));
  SKRIV(root, 'intern.html', side({ titel: 'Int', noindex: true, body: '<a href="ogsaa-doed.html">z</a>' }));
  const r = v.tjekDoedeLinks(root);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.fund.sort(), ['om.html → /doed2', 'om.html → doed.html']);
}));

test('(6) interneLinks ignorerer scripts, kommentarer og eksterne skemaer', () => {
  const s = v.interneLinks('<a href="a.html#x">1</a><a href=\'b?q=1\'>2</a><a href="tel:1">3</a><a href="//cdn.x/y">4</a><script>"<a href=\\"nej.html\\">"</script>');
  assert.deepStrictEqual([...s].sort(), ['a.html', 'b']);
});

test('(7) testliste: grøn site består, glemt test i js/, scripts/ og crawler/ listes', () => medSite(root => {
  assert.strictEqual(v.tjekTestListe(root).ok, true);
  SKRIV(root, 'js/glemt.test.js', '');
  SKRIV(root, 'scripts/glemt2.test.js', '');
  SKRIV(root, 'crawler/glemt3.test.js', '');
  SKRIV(root, 'work/ignoreret.test.js', '');
  const r = v.tjekTestListe(root);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(v.manglendeTests(root), ['js/glemt.test.js', 'crawler/glemt3.test.js', 'scripts/glemt2.test.js'].sort((a, b) => ['js', 'crawler', 'scripts'].indexOf(a.split('/')[0]) - ['js', 'crawler', 'scripts'].indexOf(b.split('/')[0])));
}));

test('(2) npm test: kører rodens test, fejler når den fejler', () => medSite(root => {
  SKRIV(root, 'package.json', JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }));
  assert.strictEqual(v.tjekTests(root).ok, true);
  SKRIV(root, 'package.json', JSON.stringify({ scripts: { test: 'node -e "process.exit(3)"' } }));
  const r = v.tjekTests(root);
  assert.strictEqual(r.ok, false);
  assert.match(r.fund[0], /exit 3/);
}));

test('koer: --hurtig springer npm test over, og rapporten giver fejl-antal', () => medSite(root => {
  const res = v.koer(root, { hurtig: true });
  assert.strictEqual(res.length, 7);
  assert.ok(res[1].sprunget);
  const gront = v.rapport(res);
  assert.strictEqual(gront.fejl, 0, gront.tekst);
  SKRIV(root, 'js/glemt.test.js', '');
  const roed = v.rapport(v.koer(root, { hurtig: true }));
  assert.strictEqual(roed.fejl, 1);
  assert.match(roed.tekst, /FEJL .*package\.json/);
}));

test('CLI: exit 0 på grønt site, exit 1 når et trin fejler', () => {
  // Kører scriptet som proces mod en kopi, hvor __dirname/.. er fixture-roden.
  const root = lavSite();
  try {
    SKRIV(root, 'scripts/verificer-site.js', fs.readFileSync(path.join(__dirname, 'verificer-site.js'), 'utf8'));
    SKRIV(root, 'scripts/seo-audit.js', fs.readFileSync(path.join(__dirname, 'seo-audit.js'), 'utf8'));
    SKRIV(root, 'scripts/seo-vagt.js', fs.readFileSync(path.join(__dirname, 'seo-vagt.js'), 'utf8'));
    const koer = () => spawnSync(process.execPath, [path.join(root, 'scripts/verificer-site.js'), '--hurtig'], { encoding: 'utf8' });
    const a = koer();
    assert.strictEqual(a.status, 0, a.stdout + a.stderr);
    SKRIV(root, 'js/glemt.test.js', '');
    const b = koer();
    assert.strictEqual(b.status, 1);
    assert.match(b.stdout, /FEJLEDE/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('(8) valgfrit smoke-trin: ikke med som standard; --med-browser tilføjer det og kan fejle', () => medSite(root => {
  const standard = v.koer(root, { hurtig: true });
  assert.strictEqual(standard.length, 7, 'standardadfærden er uændret: 7 trin');
  assert.ok(!standard.some(r => /smoke/.test(r.navn)));
  const r = v.tjekBrowserSmoke(path.join(root, 'findes-ikke'));
  assert.strictEqual(r.ok, false, 'en rod uden sider (eller uden Playwright) giver FEJL, ikke grøn');
  assert.match(r.navn, /smoke/);
  assert.ok(r.fund.length);
}));

test('(9) valgfrit visuelt trin: ikke med som standard; --med-visuel tilføjer det og fejler uden baseline', () => medSite(root => {
  const standard = v.koer(root, { hurtig: true });
  assert.strictEqual(standard.length, 7, 'standardadfærden er uændret: 7 trin');
  assert.ok(!standard.some(r => /visuel/.test(r.navn)));
  const r = v.tjekVisuel(root, path.join(root, 'findes-ikke'));
  assert.strictEqual(r.ok, false, 'manglende baseline giver FEJL, ikke grøn');
  assert.match(r.navn, /visuel/);
  assert.match(r.fund[0], /baseline/);
  assert.strictEqual(v.tjekVisuel(root, null).ok, false);
}));

test('(10) valgfrit udgiv-trin: ikke med som standard; --med-udgiv tilføjer det og fejler når udgiv.js fejler', () => medSite(root => {
  const standard = v.koer(root, { hurtig: true });
  assert.strictEqual(standard.length, 7, 'standardadfærden er uændret: 7 trin');
  assert.ok(!standard.some(r => /udgiv/.test(r.navn)));
  const mangler = v.tjekUdgiv(root);
  assert.strictEqual(mangler.ok, false, 'uden scripts/udgiv.js er trinnet FEJL, ikke grøn');
  SKRIV(root, 'scripts/udgiv.js', 'console.log("ok");\n');
  assert.strictEqual(v.tjekUdgiv(root).ok, true, 'udgiv.js med exit 0 er grøn');
  SKRIV(root, 'scripts/udgiv.js', 'console.error("AFBRUDT: 1 reference(r) peger paa filer"); console.error("  index.html -> falsk.js"); process.exit(1);\n');
  const r = v.tjekUdgiv(root);
  assert.strictEqual(r.ok, false);
  assert.match(r.fund.join('\n'), /exit 1/);
  assert.match(r.fund.join('\n'), /falsk\.js/, 'udgiv.js-fejlen vises i fund');
  const med = v.koer(root, { hurtig: true, medUdgiv: true });
  assert.strictEqual(med.length, 8);
  assert.strictEqual(med.filter(x => !x.ok).length, 1);
}));
