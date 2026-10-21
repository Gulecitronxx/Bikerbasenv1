/* V6 (F4): udloggede besøgende på dashboard.html og mine-annoncer.html sendes til login.html FØR dashboard-pakken hentes.
   Før hentede og parsede siden 13 deferrede scripts + 3 stylesheets (196 kB JS + 66 kB CSS gzip), og først js/dashboard.js / js/mine-annoncer.js
   omdirigerede (QA-fund F4: 40 forespørgsler for to sider). Nu står et lille inline-script (#konto-vagt, CSP-hash fra scripts/csp-hashes.js) først i <head>.
   Låst her: (1) logikken i alle tilstande (vm, uden browser), (2) i Chromium: udlogget -> login med redirect og INGEN af sidens egne filer,
   ?tab=favoritter/gemte er åben for anonyme, indlogget bliver på siden i alle faner, (3) markup og CSP. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const sb = require('../scripts/smoke-browser');
const { lavKontoBackend } = require('../scripts/fixtures/v6-konto-lager');

const ROD = path.join(__dirname, '..');
const laes = f => fs.readFileSync(path.join(ROD, f), 'utf8');
const SIDER = ['dashboard.html', 'mine-annoncer.html'];

function vagt(side){
  const m = /<script id="konto-vagt">([\s\S]*?)<\/script>/.exec(laes(side));
  assert.ok(m, `${side} mangler #konto-vagt`);
  return m[1];
}

/* Kører vagten mod en falsk localStorage/location; returnerer adressen den sendte til (eller null). */
function koerVagt(side, { lager = {}, search = '', kast = false } = {}){
  let sendt = null;
  const nogler = Object.keys(lager);
  const localStorage = kast ? { get length(){ throw new Error('blokeret'); }, key(){ throw new Error('blokeret'); }, getItem(){ throw new Error('blokeret'); } }
    : { length: nogler.length, key: i => nogler[i], getItem: k => (k in lager ? lager[k] : null) };
  vm.runInNewContext(vagt(side), { localStorage, location: { search, replace: u => { sendt = u; } }, encodeURIComponent, JSON, RegExp });
  return sendt;
}
const SESSION = { 'sb-abcdefghij-auth-token': '{"access_token":"x"}' };

test('V6 vagt: udlogget (tom storage) sendes til login med redirect; dashboard altid til dashboard.html, mine-annoncer med sin query', () => {
  assert.strictEqual(koerVagt('dashboard.html'), 'login.html?redirect=dashboard.html');
  assert.strictEqual(koerVagt('dashboard.html', { search: '?tab=krav' }), 'login.html?redirect=dashboard.html');   // som siden selv gør (js/dashboard.js)
  assert.strictEqual(koerVagt('mine-annoncer.html'), 'login.html?redirect=mine-annoncer.html');
  assert.strictEqual(koerVagt('mine-annoncer.html', { search: '?tab=konto' }), 'login.html?redirect=mine-annoncer.html%3Ftab%3Dkonto');
  assert.strictEqual(koerVagt('mine-annoncer.html', { search: '?tab=mine&x=1' }), 'login.html?redirect=mine-annoncer.html%3Ftab%3Dmine%26x%3D1');
});

test('V6 vagt: samme redirect-værdi som siden selv bruger (og som login.js accepterer)', () => {
  const login = laes('js/login.js');
  const moenster = new RegExp(/\/(\^\[\\w-\]\+\\\.html\(\\\?\[\^#\]\*\)\?\$)\//.exec(login)[1]);
  for (const [side, search] of [['dashboard.html', ''], ['mine-annoncer.html', '?tab=mine'], ['mine-annoncer.html', '']]){
    const url = koerVagt(side, { search });
    const back = decodeURIComponent(new URLSearchParams(url.split('?')[1]).get('redirect'));
    assert.match(back, moenster, `${side}${search}: ${back}`);
  }
  assert.match(laes('js/dashboard.js'), /login\.html\?redirect=' \+ encodeURIComponent\('dashboard\.html'\)/);
  assert.match(laes('js/mine-annoncer.js'), /login\.html\?redirect=' \+ encodeURIComponent\('mine-annoncer\.html' \+ window\.location\.search\)/);
});

test('V6 vagt: en gemt session (sb-<ref>-auth-token) sendes aldrig væk; kun nøglen tælles, ikke indholdet', () => {
  for (const side of SIDER){
    assert.strictEqual(koerVagt(side, { lager: SESSION }), null, side);
    assert.strictEqual(koerVagt(side, { lager: { 'sb-x-auth-token': 'ikke-json', andet: '1' } }), null, side);
    assert.strictEqual(koerVagt(side, { lager: { ...SESSION, bb_user: '{"remote":true,"id":"u"}' } }), null, side);
  }
});

test('V6 vagt: nøgler der ligner men ikke er sessionen (code-verifier, anden ramme) tæller ikke', () => {
  for (const side of SIDER){
    assert.ok(koerVagt(side, { lager: { 'sb-abc-auth-token-code-verifier': 'x' } }), side);
    assert.ok(koerVagt(side, { lager: { 'xsb-abc-auth-token': 'x' } }), side);
    assert.ok(koerVagt(side, { lager: { 'sb--auth-token': 'x' } }), side);
  }
});

test('V6 vagt: en forældet fjernbruger (bb_user.remote) uden session sendes væk; en lokal demo-bruger gør ikke (siden afgør)', () => {
  for (const side of SIDER){
    assert.ok(koerVagt(side, { lager: { bb_user: '{"remote":true,"id":"u"}' } }), side + ' forældet remote-bruger');
    assert.strictEqual(koerVagt(side, { lager: { bb_user: '{"name":"Demo"}' } }), null, side + ' lokal bruger');
    assert.ok(koerVagt(side, { lager: { bb_user: 'ikke json' } }), side + ' ødelagt bb_user = udlogget');
    assert.ok(koerVagt(side, { lager: { bb_user: 'null' } }), side);
  }
});

test('V6 vagt: ?tab=favoritter og ?tab=gemte på mine-annoncer er åbne for anonyme (V5); andre faner og dashboard er det ikke', () => {
  for (const q of ['?tab=favoritter', '?tab=gemte', '?x=1&tab=favoritter', '?tab=favoritter&x=1', '?tab=gemte&tab=mine'])
    assert.strictEqual(koerVagt('mine-annoncer.html', { search: q }), null, q);
  for (const q of ['?tab=mine', '?tab=konto', '?tab=agenter', '?tab=oversigt', '?tab=aktive', '?tab=favoritterne', '?tab=xfavoritter', '?utab=favoritter', '?tab=', ''])
    assert.ok(koerVagt('mine-annoncer.html', { search: q }), q);
  assert.ok(koerVagt('dashboard.html', { search: '?tab=favoritter' }), 'dashboard har ingen åben fane');
});

test('V6 vagt: blokeret lager (privat tilstand, cookies slået fra) kaster ikke og sender ikke væk — siden afgør selv', () => {
  for (const side of SIDER) assert.strictEqual(koerVagt(side, { kast: true }), null, side);
});

/* ---------- Statisk ---------- */

test('V6 vagt: scriptet står FØRST i <head> (før tema, boot-listings, GA og alle link/script), og CSP har dets hash', () => {
  const { inlineScripts } = (() => {
    const h = require('../scripts/csp-hashes');
    return h;
  })();
  for (const side of SIDER){
    const html = laes(side);
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    const i = head.indexOf('<script id="konto-vagt">');
    assert.ok(i > 0, side);
    assert.ok(i < head.indexOf('<link'), `${side}: før første <link> (stylesheets, preload)`);
    assert.ok(i < head.indexOf('<script', i + 1), `${side}: først af scripts`);
    assert.ok(head.indexOf('boot-listings') === -1 || i < head.indexOf('boot-listings'), `${side}: før annonce-prefetchen`);
    assert.ok(head.indexOf('http-equiv="Content-Security-Policy"') < i, `${side}: efter CSP-meta (ellers gælder CSP ikke for scriptet)`);
    const hash = `'sha256-${crypto.createHash('sha256').update(vagt(side).replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`;
    const csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
    assert.ok(csp.includes(hash), `${side}: CSP mangler ${hash}`);
    assert.ok(!/unsafe-inline'[^;]*;/.test(csp.split('style-src')[0]), `${side}: ingen unsafe-inline i script-src`);
    assert.ok(inlineScripts(html).some(s => /konto-vagt/.test(s.attrs)));
  }
});

/* ---------- Browser ---------- */

let kan, server, port, browser;
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v6-konto-vagt.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(ROD));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

const EGNE = /^(js\/(dashboard|mine-annoncer|postnumre|bekraeft-dialog)\.js|css\/(p-dashboard|p-bekraeft)\.css)$/;

/* Åbner siden udlogget (almindelig smoke-mock) og noterer alle forespørgsler til egen server + CSP-konsolfejl. */
async function abnUdlogget(sti){
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await sb.installerMock(ctx, port, {});
  const page = await ctx.newPage();
  const filer = [], csp = [], fejl = [];
  page.on('request', r => { if (r.url().startsWith(`http://127.0.0.1:${port}/`)) filer.push(r.url().slice(`http://127.0.0.1:${port}/`.length).split('?')[0]); });
  page.on('console', m => { if (/Content[- ]Security[- ]Policy/i.test(m.text())) csp.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => fejl.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const slut = page.url().slice(`http://127.0.0.1:${port}/`.length);
  return { ctx, page, filer, csp, fejl, slut };
}

test('V6 vagt (browser): udlogget -> login.html med redirect, og INGEN af sidens egne filer hentes (dashboard og mine-annoncer, alle faner)', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const adresser = ['dashboard.html', 'dashboard.html?tab=annoncer', 'dashboard.html?tab=krav', 'mine-annoncer.html', 'mine-annoncer.html?tab=oversigt',
    'mine-annoncer.html?tab=mine', 'mine-annoncer.html?tab=agenter', 'mine-annoncer.html?tab=konto'];
  for (const a of adresser){
    const s = await abnUdlogget(a);
    try {
      const [fil, q] = a.split('?');
      const forventet = `login.html?redirect=${encodeURIComponent(fil === 'dashboard.html' ? fil : fil + (q ? '?' + q : ''))}`;
      assert.strictEqual(s.slut, forventet, a);
      const egne = s.filer.filter(f => EGNE.test(f));
      assert.deepStrictEqual(egne, [], `${a}: hentede dashboard-pakken alligevel: ${egne.join(', ')}`);
      assert.ok(s.filer.includes('js/login.js'), `${a}: login.html hentet`);
      assert.deepStrictEqual(s.csp, [], `${a}: CSP-fejl: ${s.csp.join(' | ')}`);
      assert.deepStrictEqual(s.fejl, [], a);
      /* Hele målingen: to sider i stedet for fire (dashboard.html + login.html + login-pakken). Før: 40 forespørgsler, nu højst 20. */
      assert.ok(s.filer.length <= 22, `${a}: ${s.filer.length} forespørgsler`);
    } finally { await s.ctx.close(); }
  }
});

test('V6 vagt (browser): ?tab=favoritter og ?tab=gemte er åbne for anonyme — siden bliver, og mine-annoncer.js hentes', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const q of ['?tab=favoritter', '?tab=gemte']){
    const s = await abnUdlogget('mine-annoncer.html' + q);
    try {
      assert.strictEqual(s.slut.split('?')[0], 'mine-annoncer.html', q);
      assert.ok(s.filer.includes('js/mine-annoncer.js'), q);
      assert.deepStrictEqual(s.csp, [], q);
      assert.deepStrictEqual(s.fejl, [], q);
      assert.strictEqual(await s.page.locator('#db-anon-note').isVisible(), true, `${q}: anonym-noten vises`);
      assert.strictEqual(await s.page.locator('main.db-page.db-venter').count(), 0, `${q}: henter-tilstanden er fjernet`);
    } finally { await s.ctx.close(); }
  }
});

test('V6 vagt (browser): indlogget bliver på siden i alle faner (ingen fejlagtig omdirigering til login)', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const jobs = [['mine-annoncer.html', false, ['', '?tab=mine', '?tab=favoritter', '?tab=agenter', '?tab=konto', '?tab=gemte']],
    ['dashboard.html', true, ['', '?tab=annoncer', '?tab=krav']]];
  for (const [side, forhandler, faner] of jobs){
    for (const f of faner){
      const bak = lavKontoBackend({ forhandler });
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      await bak.installer(ctx, { tema: 'light' });
      const page = await ctx.newPage();
      const stier = [];
      page.on('framenavigated', fr => { if (fr === page.mainFrame()) stier.push(new URL(fr.url()).pathname.replace(/^\//, '')); });
      try {
        await page.goto(`http://127.0.0.1:${port}/${side}${f}`, { waitUntil: 'load' });
        await page.waitForSelector('main.db-page:not(.db-venter)', { state: 'attached', timeout: 15000 });
        assert.ok(stier.every(p => p === side), `${side}${f}: navigerede via ${stier.join(' -> ')}`);
        assert.ok(await page.locator('.db-tab').count() >= 3, `${side}${f}: fanebjælken er der`);
      } finally { await ctx.close(); }
    }
  }
});

test('V6 vagt (browser): stale fjernbruger uden session ender på login (siden og vagten er enige); lokal demo-bruger bliver', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const [bruger, forventLogin] of [['{"remote":true,"id":"u","email":"a@b.dk","name":"A"}', true], ['{"name":"Demo","email":"d@b.dk"}', false]]){
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    await sb.installerMock(ctx, port, {});
    await ctx.addInitScript(b => { try { localStorage.setItem('bb_user', b); } catch (e) { /* ingen */ } }, bruger);
    const page = await ctx.newPage();
    try {
      await page.goto(`http://127.0.0.1:${port}/mine-annoncer.html?tab=mine`, { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      assert.strictEqual(/^login\.html/.test(page.url().slice(`http://127.0.0.1:${port}/`.length)), forventLogin, page.url());
    } finally { await ctx.close(); }
  }
});
