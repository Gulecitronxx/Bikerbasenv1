/* Tests for scripts/csp-hashes.js — hashen skal vaere den, browseren regner ud,
   'unsafe-inline' skal vaek, vaertskilder skal blive, og farlige moenstre skal
   stoppe byggekaeden i stedet for at give en CSP, der ser rigtig ud men ikke er. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { hash, inlineScripts, nyScriptSrc, opdaterCsp, behandlSide } = require('./csp-hashes');

test('hash: sha256 base64 over noejagtigt scriptindhold, som CSP Level 2 kraever', () => {
  const body = "try{var t=localStorage.getItem('bb_theme');}catch(e){}";
  const forventet = "'sha256-" + crypto.createHash('sha256').update(body, 'utf8').digest('base64') + "'";
  assert.equal(hash(body), forventet);
  assert.notEqual(hash(body), hash(body + '\n'), 'en enkelt byte mere giver en anden hash');
});

test('hash: CRLF og CR hashes som LF — saadan ser browseren scriptet efter HTML-parsning', () => {
  const lf = 'var a = 1;\nvar b = 2;\n';
  assert.equal(hash(lf.replace(/\n/g, '\r\n')), hash(lf));
  assert.equal(hash(lf.replace(/\n/g, '\r')), hash(lf));
});

test('inlineScripts: tager inline, springer src og JSON-LD over', () => {
  const html = `<script>a()</script>
<script src="js/x.js"></script>
<script type="application/ld+json">{"@type":"WebSite"}</script>
<script id="ga4" defer>b()</script>
<script type="text/template">ikke kode</script>`;
  const s = inlineScripts(html);
  assert.deepEqual(s.map(x => x.body), ['a()', 'b()']);
});

test("nyScriptSrc: 'self' foerst, hashes, vaertskilder bevares, 'unsafe-inline' og gamle hashes ryger", () => {
  const ud = nyScriptSrc("'self' 'unsafe-inline' 'sha256-GAMMEL=' https://www.googletagmanager.com", ["'sha256-NY='"]);
  assert.equal(ud, "'self' 'sha256-NY=' https://www.googletagmanager.com");
});

test('opdaterCsp: kun script-src aendres, de andre direktiver staar uroert', () => {
  const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; object-src 'none'";
  const ud = opdaterCsp(csp, ["'sha256-A='"]);
  assert.equal(ud, "default-src 'self'; script-src 'self' 'sha256-A=' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; object-src 'none'");
  assert.equal(opdaterCsp("default-src 'self'", ["'sha256-A='"]), null, 'ingen script-src = intet at skrive');
});

test('behandlSide: idempotent — anden koersel aendrer intet', () => {
  const html = `<head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'">
<script>x()</script><script>y()</script><script>x()</script></head>`;
  const r1 = behandlSide(html, 't');
  assert.equal(r1.aendret, true);
  assert.equal(r1.hashes.length, 2, 'ens scripts giver én hash');
  assert.ok(!/unsafe-inline'; style/.test(r1.html) || /style-src 'self' 'unsafe-inline'/.test(r1.html));
  assert.match(r1.html, /script-src 'self' 'sha256-[^']+' 'sha256-[^']+'; style-src 'self' 'unsafe-inline'/);
  const r2 = behandlSide(r1.html, 't');
  assert.equal(r2.aendret, false);
  assert.equal(r2.html, r1.html);
});

test('behandlSide: inline event-handler og javascript:-URL afbryder byggekaeden', () => {
  const csp = `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'">`;
  assert.throws(() => behandlSide(`${csp}<button onclick="x()">k</button>`, 'a.html'), /event-handler/);
  assert.throws(() => behandlSide(`${csp}<a href="javascript:void(0)">k</a>`, 'b.html'), /javascript:/);
  // ... men ikke naar moenstret kun staar i en kommentar eller inde i et script
  assert.doesNotThrow(() => behandlSide(`${csp}<!-- onclick="gammelt" --><script>el.onclick = f; s = "javascript:";</script>`, 'c.html'));
});

test('behandlSide: side uden CSP lades vaere', () => {
  const r = behandlSide('<html><script>a()</script></html>', '404.html');
  assert.equal(r.ingenCsp, true);
  assert.equal(r.aendret, false);
});
