/* V6 (P2-1): cookie-dialogen skal kunne besvares UDEN js/components.js.
   Før: <dialog>.showModal() blev åbnet af et inline script, men knapperne blev kun koblet af js/components.js. Blev den blokeret
   eller fejlede et tidligere script, stod dialogen åben med døde knapper og siden var inert.
   Nu kobler det inline script (scripts/inline-cookie.js) selv de to knapper og gemmer samtykket (samme nøgle/format som
   Store.setCookieConsent); js/components.js kobler ikke igen (data-bound). Ingen sporing før samtykke. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const smoke = require('./smoke-browser');
const rod = path.join(__dirname, '..');
const NOEGLE = 'bb_cookie_consent';

test('kilde: inline-scriptet binder knapperne og components.js kobler ikke igen', () => {
  const inl = fs.readFileSync(path.join(rod, 'scripts/inline-cookie.js'), 'utf8');
  assert.match(inl, /cookie-accept-all/);
  assert.match(inl, /addEventListener\("click",sv\("all"\)\)/);
  assert.match(inl, /addEventListener\("click",sv\("necessary"\)\)/);
  assert.match(inl, /data-bound/);
  const comp = fs.readFileSync(path.join(rod, 'js/components.js'), 'utf8');
  assert.match(comp, /getAttribute\('data-bound'\) === 'inline'/);
  const store = fs.readFileSync(path.join(rod, 'js/store.js'), 'utf8');
  assert.match(store, /cookieConsent:\s*'bb_cookie_consent'/, 'nøglen i inline-scriptet er udledt af store.js');
});

test('kilde: bygget HTML har det nye inline script (kør node scripts/build.js ved fejl), og scriptet er gyldig ES5-JS', () => {
  for (const f of ['index.html', 'soegning.html', 'annonce.html', 'login.html', 'opret-annonce.html']) {
    const html = fs.readFileSync(path.join(rod, f), 'utf8');
    const blok = html.match(/<!--cookie:start-->[\s\S]*?<!--cookie:end-->/);
    assert.ok(blok, `${f}: cookieblok mangler`);
    const kode = blok[0].match(/<script>([\s\S]*?)<\/script>/)[1];
    new Function(kode);   // kaster ved syntaksfejl
    assert.match(kode, /data-bound/, `${f}: inline script er ikke bygget efter V6 (kør build)`);
    assert.doesNotMatch(kode, /=>|\blet\b|\bconst\b/, `${f}: inline script holdes ES5`);
  }
});

async function start(t) {
  const kan = await smoke.playwrightTilgaengelig();
  if (!kan.ok) { t.skip(kan.grund); return null; }
  const html = fs.readFileSync(path.join(rod, 'index.html'), 'utf8');
  if (!/data-bound/.test(html.match(/<!--cookie:start-->[\s\S]*?<!--cookie:end-->/)[0])) { t.skip('index.html er ikke bygget efter V6'); return null; }
  const { server, port } = await smoke.startServer(rod);
  const b = await kan.pw.chromium.launch({ headless: true });
  return { b, server, port };
}

/* Tæller skrivninger af samtykkenøglen og alle forsøg på at hente statistik (googletagmanager). */
async function nyKontekst(env, { blokerJs = [], forsinkJs = {}, vp = { width: 1440, height: 900 } } = {}) {
  const ctx = await env.b.newContext({ viewport: vp, serviceWorkers: 'block' });
  const blokeret = {};
  await smoke.installerMock(ctx, env.port, blokeret, {});
  await ctx.addInitScript(key => {
    window.__skriv = [];
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === key) window.__skriv.push(v); return orig.call(this, k, v); };
  }, NOEGLE);
  for (const navn of blokerJs) await ctx.route(new RegExp('/js/' + navn.replace('.', '\\.') + '(\\?|$)'), r => r.abort('blockedbyclient'));
  for (const [navn, ms] of Object.entries(forsinkJs)) {
    await ctx.route(new RegExp('/js/' + navn.replace('.', '\\.') + '(\\?|$)'), async r => { await new Promise(ok => setTimeout(ok, ms)); r.fallback(); });
  }
  return { ctx, blokeret };
}

const tilstand = p => p.evaluate(key => {
  const d = document.getElementById('cookie-banner');
  const gemt = (() => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return 'fejl'; } })();
  return {
    findes: !!d, modal: !!(d && d.matches(':modal')), skrevet: window.__skriv.length, gemt,
    gtm: document.querySelectorAll('script[src*="googletagmanager"]').length, gtag: typeof window.gtag,
  };
}, NOEGLE);

for (const [navn, blokerJs] of [['components.js blokeret', ['components.js']], ['components.js + data.js blokeret', ['components.js', 'data.js']]]) {
  for (const valg of ['necessary', 'all']) {
    test(`${navn}: dialogen kan besvares (${valg}), samtykket gemmes én gang, siden bliver brugbar`, { timeout: 90000 }, async t => {
      const env = await start(t); if (!env) return;
      try {
        const { ctx, blokeret } = await nyKontekst(env, { blokerJs });
        const p = await ctx.newPage();
        await smoke.gaaTil(p, `http://127.0.0.1:${env.port}/index.html`, { waitUntil: 'load' });
        await p.waitForTimeout(800);
        let s = await tilstand(p);
        assert.equal(s.modal, true, 'dialogen skal være åben (modal) uden components.js');
        assert.equal(s.skrevet, 0, 'intet samtykke før svar');
        assert.equal(s.gtm, 0, 'ingen sporing før samtykke');
        assert.equal(blokeret['www.googletagmanager.com'], undefined, 'ingen forespørgsel til googletagmanager før samtykke');
        assert.equal(await p.evaluate(() => document.getElementById('cookie-banner').getAttribute('data-bound')), 'inline');
        await p.click(valg === 'all' ? '#cookie-accept-all' : '#cookie-necessary-only', { timeout: 4000 });
        await p.waitForTimeout(600);
        s = await tilstand(p);
        assert.equal(s.findes, false, 'dialogen skal være fjernet efter svar');
        assert.equal(s.skrevet, 1, 'samtykket skrives præcis én gang');
        assert.equal(s.gemt && s.gemt.level, valg);
        assert.ok(s.gemt && !isNaN(Date.parse(s.gemt.date)), 'format {level, date}');
        if (valg === 'necessary') { assert.equal(s.gtm, 0); assert.equal(blokeret['www.googletagmanager.com'], undefined, 'Kun nødvendige må ikke starte statistik'); }
        else { assert.equal(s.gtm, 1, 'Accepter alle starter statistik én gang'); }
        // siden er ikke inert: et ægte klik på et link navigerer
        await p.locator('a[href*="soegning"]').first().click({ timeout: 4000 });
        await p.waitForURL(/soegning/, { timeout: 5000 });
        await p.waitForTimeout(500);
        assert.equal(await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!(d && d.open); }), false, 'dialogen åbnes ikke igen på næste side (samtykket er gemt)');
        await ctx.close();
      } finally { await env.b.close(); env.server.close(); }
    });
  }
}

test('almindelig indlæsning (components.js kører): ét klik = ét gemt samtykke og ét statistik-script; ingen sporing før', { timeout: 90000 }, async t => {
  const env = await start(t); if (!env) return;
  try {
    const { ctx, blokeret } = await nyKontekst(env);
    const p = await ctx.newPage();
    await smoke.gaaTil(p, `http://127.0.0.1:${env.port}/index.html`, { waitUntil: 'load' });
    await p.waitForFunction(() => document.getElementById('cookie-banner').getAttribute('data-bound') === 'components', null, { timeout: 15000 });   // components.js har kørt uden at koble igen
    let s = await tilstand(p);
    assert.equal(s.modal, true); assert.equal(s.skrevet, 0); assert.equal(s.gtm, 0);
    assert.equal(blokeret['www.googletagmanager.com'], undefined);
    await p.click('#cookie-accept-all');
    await p.waitForTimeout(600);
    s = await tilstand(p);
    assert.equal(s.skrevet, 1, 'ingen dobbeltbinding: samtykket skrives én gang');
    assert.equal(s.gtm, 1, 'statistik startes én gang');
    assert.equal(s.gemt.level, 'all');
    await ctx.close();
  } finally { await env.b.close(); env.server.close(); }
});

test('svar FØR components.js er indlæst (forsinket 2,5 s): ingen dobbeltbinding, ingen ny dialog bagefter', { timeout: 90000 }, async t => {
  const env = await start(t); if (!env) return;
  try {
    const { ctx, blokeret } = await nyKontekst(env, { forsinkJs: { 'components.js': 2500 } });
    const p = await ctx.newPage();
    await smoke.gaaTil(p, `http://127.0.0.1:${env.port}/index.html`, { waitUntil: 'commit' });
    await p.waitForSelector('#cookie-banner[open]', { timeout: 8000 });
    await p.click('#cookie-necessary-only', { timeout: 4000 });
    await p.waitForLoadState('load', { timeout: 15000 });
    await p.waitForTimeout(3500);   // components.js er nu kørt
    const s = await tilstand(p);
    assert.equal(s.findes, false, 'dialogen må ikke dukke op igen, når components.js kommer');
    assert.equal(s.skrevet, 1);
    assert.equal(s.gemt.level, 'necessary');
    assert.equal(blokeret['www.googletagmanager.com'], undefined);
    await ctx.close();
  } finally { await env.b.close(); env.server.close(); }
});

test('privatlivspolitik, vilkår og om-indeksering åbner ikke dialogen (heller ikke uden components.js)', { timeout: 90000 }, async t => {
  const env = await start(t); if (!env) return;
  try {
    for (const side of ['privatlivspolitik.html', 'vilkaar.html', 'om-indeksering.html']) {
      const { ctx } = await nyKontekst(env, { blokerJs: ['components.js'] });
      const p = await ctx.newPage();
      await smoke.gaaTil(p, `http://127.0.0.1:${env.port}/${side}`, { waitUntil: 'load' });
      await p.waitForTimeout(500);
      const s = await tilstand(p);
      assert.equal(s.modal, false, `${side}: dialogen må ikke være modal`);
      assert.equal(await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!(d && d.open); }), false, `${side}: dialogen må ikke være åben`);
      assert.equal(s.skrevet, 0);
      await ctx.close();
    }
  } finally { await env.b.close(); env.server.close(); }
});

test('allerede svaret: dialogen åbnes ikke (tilbagevendende besøgende), heller ikke uden components.js', { timeout: 60000 }, async t => {
  const env = await start(t); if (!env) return;
  try {
    const { ctx } = await nyKontekst(env, { blokerJs: ['components.js'] });
    await ctx.addInitScript(() => { try { localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary', date: new Date().toISOString() })); } catch (e) { /* ingen lagring */ } });
    const p = await ctx.newPage();
    await smoke.gaaTil(p, `http://127.0.0.1:${env.port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(500);
    assert.equal(await p.evaluate(() => { const d = document.getElementById('cookie-banner'); return !!(d && d.open); }), false);
    await ctx.close();
  } finally { await env.b.close(); env.server.close(); }
});
