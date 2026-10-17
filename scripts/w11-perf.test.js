/* w11-perf: laaser de ydelsesaendringer i byggekaeden.
   stamp-version.js koeres i en midlertidig kopi, saa repoets egne sider aldrig roeres. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..');

function lavRod(html){
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'w11perf-'));
  for (const d of ['scripts', 'js', 'css', 'fonts']) fs.mkdirSync(path.join(rod, d));
  fs.copyFileSync(path.join(REPO, 'scripts', 'stamp-version.js'), path.join(rod, 'scripts', 'stamp-version.js'));
  fs.writeFileSync(path.join(rod, 'js', 'a.js'), 'var a=1;');
  fs.writeFileSync(path.join(rod, 'css', 'a.css'), 'a{b:c}');
  fs.writeFileSync(path.join(rod, 'fonts', 'x.woff2'), 'FONT-BYTES-1');
  fs.writeFileSync(path.join(rod, 'index.html'), html);
  return rod;
}
const koer = rod => spawnSync(process.execPath, [path.join(rod, 'scripts', 'stamp-version.js')], { encoding: 'utf8' });
const sha8 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

const SIDE = '<link rel="preload" href="fonts/x.woff2?v=1" as="font" crossorigin>\n'
  + '<style>@font-face{src:url(fonts/x.woff2?v=1) format(\'woff2\')}</style>\n'
  + '<link rel="preload" href="fonts/mangler.woff2?v=1" as="font" crossorigin>\n';

test('stamp-version: fonte faar indholdshash i baade preload og @font-face', () => {
  const rod = lavRod(SIDE);
  assert.strictEqual(koer(rod).status, 0);
  const html = fs.readFileSync(path.join(rod, 'index.html'), 'utf8');
  const v = sha8('FONT-BYTES-1');
  assert.ok(html.includes(`href="fonts/x.woff2?v=${v}"`), html);
  assert.ok(html.includes(`url(fonts/x.woff2?v=${v})`), html);
  assert.ok(html.includes('fonts/mangler.woff2?v=1'), 'ukendt fil roeres ikke');
});

test('stamp-version: idempotent, og hashen skifter kun naar fonten goer', () => {
  const rod = lavRod(SIDE);
  koer(rod);
  const foerste = fs.readFileSync(path.join(rod, 'index.html'), 'utf8');
  koer(rod);
  assert.strictEqual(fs.readFileSync(path.join(rod, 'index.html'), 'utf8'), foerste);
  fs.writeFileSync(path.join(rod, 'fonts', 'x.woff2'), 'FONT-BYTES-2');
  koer(rod);
  const efter = fs.readFileSync(path.join(rod, 'index.html'), 'utf8');
  assert.ok(efter.includes(`woff2?v=${sha8('FONT-BYTES-2')}`));
  assert.ok(!efter.includes(sha8('FONT-BYTES-1')));
});

const { fjernFontPreload, traekWhitespace, optimerHead } = require('./udgiv-head');

test('udgiv-head: fjerner kun font-preloads', () => {
  const h = '<link rel="preload" href="fonts/x.woff2?v=1" as="font" type="font/woff2" crossorigin>\n'
    + '<link rel="preload" as="image" href="img/hero-800.webp" fetchpriority="high">\n<link rel="stylesheet" href="css/styles.css">';
  const u = fjernFontPreload(h);
  assert.ok(!/as="font"/.test(u));
  assert.ok(u.includes('as="image"') && u.includes('rel="stylesheet"'));
});

test('udgiv-head: inline-scripts, style og pre er byte-identiske (CSP-hash)', () => {
  const script = '<script id="ga4">\n  var a = 1;\n\n\n    var b = 2;\n</script>';
  const h = `<head>\n    <meta charset="UTF-8">\n\n\n    ${script}\n    <style>\n  a{b:c}\n\n  d{e:f}\n</style>\n<pre>\n  x\n\n  y</pre>\n</head>`;
  const u = optimerHead(h);
  for (const blok of [script, '<style>\n  a{b:c}\n\n  d{e:f}\n</style>', '<pre>\n  x\n\n  y</pre>']) assert.ok(u.includes(blok), blok);
  assert.ok(u.includes('<meta charset="UTF-8">\n<script id="ga4">'), u);
  assert.ok(u.length < h.length);
});

test('udgiv-head: beholdFontPreload slaar fjernelsen fra', () => {
  const h = '<link rel="preload" href="fonts/x.woff2" as="font" crossorigin>\n';
  assert.strictEqual(optimerHead(h, { beholdFontPreload: true }), h);
});

test('udgiv-head: tekst med < i indholdet overlever', () => {
  assert.strictEqual(traekWhitespace('<p>a < b\n   c</p>'), '<p>a < b\nc</p>');
});
