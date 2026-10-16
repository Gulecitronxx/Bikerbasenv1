/* Tests for fjernHtmlKommentarer() (F-019). Kør: node --test scripts/udgiv-kommentarer.test.js

   Interne udviklernoter ("RUNDE 12: overskriften var ...") lå som HTML-kommentarer i
   den offentlige HTML, også på bikerbasen.dk. scripts/udgiv.js fjerner dem nu fra
   de udgivne _site-sider. Kilde-HTML i repoet røres ikke: byggescripts bruger
   markører som <!--cookie:start--> dér.

   Funktionen bor i scripts/shared.js, fordi udgiv.js kører top-niveau og ikke kan
   require()s uden at bygge _site. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { fjernHtmlKommentarer } = require('./shared.js');

test('kommentarer på egen linje forsvinder uden at efterlade tomme linjer', () => {
  const ind = '<h1>Yamaha</h1>\n  <!-- RUNDE 12: overskriften var "276 annoncer" -->\n<p>x</p>\n';
  assert.equal(fjernHtmlKommentarer(ind), '<h1>Yamaha</h1>\n<p>x</p>\n');
});

test('flerlinjede og inline-kommentarer forsvinder', () => {
  const ind = '<div><!-- inline --><span>a</span></div>\n<!--\n  RUNDE 14\n  flere linjer\n-->\n<p>b</p>';
  assert.equal(fjernHtmlKommentarer(ind), '<div><span>a</span></div>\n<p>b</p>');
});

test('CRLF bevares', () => {
  assert.equal(fjernHtmlKommentarer('<p>a</p>\r\n<!-- x -->\r\n<p>b</p>\r\n'), '<p>a</p>\r\n<p>b</p>\r\n');
});

test('script, style, pre og textarea røres ikke — heller ikke hvis de indeholder <!--', () => {
  const ind = '<script>var s = "<!-- ikke en kommentar -->";</script>\n<style>/* <!-- x --> */</style>\n<pre><!-- bevares --></pre>\n<textarea><!-- bevares --></textarea>\n<!-- væk -->\n';
  const ud = fjernHtmlKommentarer(ind);
  assert.ok(ud.includes('var s = "<!-- ikke en kommentar -->";'));
  assert.ok(ud.includes('/* <!-- x --> */'));
  assert.ok(ud.includes('<pre><!-- bevares --></pre>'));
  assert.ok(ud.includes('<textarea><!-- bevares --></textarea>'));
  assert.ok(!ud.includes('væk'));
});

test('en kommentar med udkommenteret <script> fjernes som helhed', () => {
  const ind = '<p>a</p>\n<!-- <script>alert(1)</script> -->\n<p>b</p>';
  assert.equal(fjernHtmlKommentarer(ind), '<p>a</p>\n<p>b</p>');
});

test('betingede kommentarer og ulukkede kommentarer bevares (forsigtighed)', () => {
  assert.equal(fjernHtmlKommentarer('<!--[if IE]><p>ie</p><![endif]-->'), '<!--[if IE]><p>ie</p><![endif]-->');
  assert.equal(fjernHtmlKommentarer('<p>a</p><!-- aldrig lukket'), '<p>a</p><!-- aldrig lukket');
});

test('indhold uden kommentarer er uændret, og inline-scripts er byte-ens (CSP-hash)', () => {
  const html = '<!doctype html><html><head><script>window.x=1;</script></head><body><!-- n --><p>æøå</p></body></html>';
  const ud = fjernHtmlKommentarer(html);
  assert.ok(ud.includes('<script>window.x=1;</script>'));
  assert.equal(fjernHtmlKommentarer(ud), ud, 'idempotent');
  assert.equal(fjernHtmlKommentarer('<p>æøå</p>'), '<p>æøå</p>');
});

test('fixture: en mærkeside med RUNDE-noter mister dem alle, men beholder titel, h1, canonical og JSON-LD', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'maerke-yamaha.html'), 'utf8');
  assert.match(src, /RUNDE/, 'kilde-fixturen indeholder noterne');
  const ud = fjernHtmlKommentarer(src);
  assert.ok(!/RUNDE \d+/.test(ud));
  assert.ok(!/<!--/.test(ud.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')), 'ingen kommentarer uden for script/style');
  assert.equal((ud.match(/<h1\b/g) || []).length, (src.match(/<h1\b/g) || []).length);
  assert.ok(/<title>[^<]+<\/title>/.test(ud));
  assert.ok(/<link rel="canonical"/.test(ud));
  assert.equal((ud.match(/application\/ld\+json/g) || []).length, (src.match(/application\/ld\+json/g) || []).length);
});

test('udgiv.js bruger funktionen på rod-HTML og har ellers ikke ændret adfærd', () => {
  const src = fs.readFileSync(path.join(__dirname, 'udgiv.js'), 'utf8');
  assert.match(src, /fjernHtmlKommentarer/);
  assert.match(src, /require\('\.\/shared'\)/);
});
