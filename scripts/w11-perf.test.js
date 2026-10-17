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
