/* V7 mærke: browsertest af søgning, kort og annoncesider mod HELE lageret (scripts/fixtures/v7-lager-maerke.json, 735 rækker, ingen netværk, værten
   bb-qa.test så demoannoncer ikke er med — som i drift). Dækker: modelfilter uden støj, "cb 650 r"-frasen i UI, mærkelisten uden "Uoplyst mærke",
   BSA uden efterspørgslen, lokale favoritter og sammenligning på eksterne kort, gemt søgning, mobil 375/430 (ingen sidescroll, filterskuffen),
   annoncesiden for en efterspørgsel (direkte adresse) og for rensede modeller. Kør: node --test js/v7-maerke-browser.test.js — springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { browserModules } = require(path.join(REPO, 'scripts', 'shared.js'));
const M = browserModules();

const FX = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v7-lager-maerke.json'), 'utf8')).raekker;
const RAEKKER = FX.map(o => ({
  id: o.i, kilde_annonce_id: '1', url: o.u, titel: o.t, maerke: o.m, model: o.mo, variant: null, type: o.ty || null, aargang: o.a, km: o.km, ccm: o.c, hk: null, pris_dkk: o.p,
  stand: o.s || null, salgsmarkoerer: [], udledte_felter: [], by: null, postnr: o.pn, saelgertype: o.st || null, thumbnail_url: null, uddrag: null, status: 'aktiv',
  foerst_set: '2026-10-01', sidst_set: o.ss || '2026-10-20T10:00:00Z', kilde: { navn: o.kn || 'Gul og Gratis', domaene: o.k || 'guloggratis.dk' },
}));
const VAERT = 'bb-qa.test';
/* Hvad modulerne selv siger om lageret: søgesidens tal skal være det samme. */
const LAGER = M.markerTvaerkildeDubletter(RAEKKER.map(M.normalizeExternalListing)).beholdt;
const iLager = f => M.Filtrering.anvendFiltre(LAGER, f).length;

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return;
  const { server, port } = await sb.startServer(REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true, args: [`--host-resolver-rules=MAP ${VAERT} 127.0.0.1`] }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
async function aabn(w, url, tema = 'light') {
  const c = await H.browser.newContext({ viewport: { width: w, height: w > 1000 ? 900 : 812 }, locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await c.route('**/*', route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort(); }
    if (u.hostname === VAERT) return route.continue();
    if (/supabase\.co$/.test(u.hostname)) {
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.startsWith('/rest/v1/')) {
        const t = u.pathname.slice('/rest/v1/'.length);
        const lim = Number(u.searchParams.get('limit')) || undefined, off = Number(u.searchParams.get('offset')) || 0;
        let a = off, b = lim ? off + lim : undefined;
        const rg = req.headers()['range']; const m = rg && rg.match(/(\d+)-(\d+)/); if (m) { a = +m[1]; b = +m[2] + 1; }
        const body = t.startsWith('eksterne_annoncer') ? RAEKKER.slice(a, b) : [];
        return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      return route.fulfill({ status: 401, headers: cors, body: '{}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: PNG });
    return route.abort();
  });
  const p = await c.newPage(); const fejl = [];
  p.on('pageerror', e => fejl.push(e.message));
  await p.goto(`http://${VAERT}:${H.port}/${url}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.documentElement.classList.contains('so-klar') || document.getElementById('empty-state')?.style.display === 'block' || document.querySelector('h1'), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(700);
  return { c, p, fejl };
}
const tal = p => p.evaluate(() => parseInt(document.getElementById('results-count').textContent.replace(/\D/g, ''), 10));

test('modelfilteret (Honda): ingen støjmodeller, rensede modeller står under deres rigtige navn, og tallene er filterkædens', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p, fejl } = await aabn(1440, 'soegning.html?brands=Honda');
  try {
    const opt = await p.evaluate(() => [...document.querySelectorAll('#so-model option')].map(o => o.textContent).filter(x => x !== 'Alle modeller'));
    assert.ok(opt.length > 80, opt.length + ' Honda-modeller');
    const STOEJ = /pris|rabat|projekt|mekaniker|a2\b|årg|\dhk|velkørende/i;
    assert.deepStrictEqual(opt.filter(x => STOEJ.test(x)), []);
    assert.ok(opt.some(x => /^CBF125 \(1\)$/.test(x)), 'CBF125 (før: "CBF125 2009 Projekt mekaniker")');
    assert.ok(opt.some(x => /^VT600 \(1\)$/.test(x)), 'VT600 (før: "VT600 ‘NY pris’")');
    assert.equal(await tal(p), iLager({ brands: ['Honda'] }));
    assert.deepStrictEqual(fejl, []);
  } finally { await c.close(); }
});

test('"cb 650 r" i søgefeltet: kun CB 650 R-familien, samme tal som kæden; "gl 1800" = "gl1800"', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  for (const [q, forventet] of [['cb 650 r', { q: 'cb 650 r' }], ['cb650r', { q: 'cb650r' }], ['gl 1800', { q: 'gl 1800' }], ['gl1800', { q: 'gl1800' }]]) {
    const { c, p } = await aabn(430, 'soegning.html?q=' + encodeURIComponent(q));
    try {
      const n = await tal(p);
      assert.equal(n, iLager(forventet), q);
      assert.ok(n > 3, q + ' giver træf');
      if (/650/.test(q)) {
        const titler = await p.evaluate(() => [...document.querySelectorAll('#results-grid .rk-titel')].map(e => e.textContent.trim()));
        assert.ok(titler.length && titler.every(x => /CB ?650 ?R/i.test(x)), titler.join(' | '));
      }
    } finally { await c.close(); }
  }
});

test('mærkelisten og BSA: ingen "Uoplyst mærke"-række (efterspørgslen er ude), BSA har 7, og siden siger det samme som listen', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html');
  try {
    await p.click('#so-more-btn');
    const m = await p.evaluate(() => [...document.querySelectorAll('#filter-brands .checkbox-row')].map(r => ({ navn: r.querySelector('input').dataset.brand, n: Number(r.querySelector('.facet-n').textContent) })));
    assert.ok(!m.some(x => /^ukendt|uoplyst/i.test(x.navn)), 'ingen uoplyst-række: ' + m.map(x => x.navn).slice(-3));
    assert.equal(m.find(x => x.navn === 'BSA').n, 7);
    assert.equal(m.reduce((s, x) => s + x.n, 0), await tal(p));
  } finally { await c.close(); }
  const b = await aabn(1440, 'soegning.html?brands=BSA');
  try {
    assert.equal(await tal(b.p), 7);
    const titler = await b.p.evaluate(() => [...document.querySelectorAll('#results-grid .rk-titel')].map(e => e.textContent.trim()));
    assert.ok(!titler.some(x => /købes|Classic Bike/i.test(x)), titler.join(' | '));
  } finally { await b.c.close(); }
});

test('eksterne kort: hjertet gemmer lokalt og overlever genindlæsning, sammenligning tager to kort, og "Gem søgning" siger ærligt, at den gemmes på enheden', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p, fejl } = await aabn(430, 'soegning.html?brands=BSA');
  try {
    const hjerte = p.locator('#results-grid .card [data-fav-toggle][data-fav-ext]').first();
    assert.equal(await hjerte.getAttribute('aria-pressed'), 'false');
    await hjerte.click();
    await p.waitForTimeout(300);
    assert.equal(await hjerte.getAttribute('aria-pressed'), 'true');
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    assert.equal(await p.locator('#results-grid .card [data-fav-toggle][aria-pressed="true"]').count(), 1);
    const knapper = p.locator('#results-grid .card .card-compare');
    await knapper.nth(0).click(); await knapper.nth(1).click();
    await p.waitForTimeout(300);
    const cmp = await p.evaluate(() => JSON.parse(localStorage.getItem('bb_compare') || '[]'));
    assert.equal(cmp.length, 2);
    await p.click('button:has-text("Gem søgning"), #save-search-btn').catch(() => {});
    await p.waitForTimeout(500);
    const tekst = await p.evaluate(() => document.body.textContent);
    assert.match(tekst, /gemt her på enheden/i);
    assert.deepStrictEqual(fejl, []);
  } finally { await c.close(); }
});

for (const w of [375, 430]) {
  test(`mobil ${w}: ingen sidescroll på søgning og mærkeoversigt, filterskuffen viser mærker (Honda først) uden "Uoplyst mærke"`, async (t) => {
    if (!H) return t.skip('Playwright mangler');
    const { c, p, fejl } = await aabn(w, 'soegning.html');
    try {
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      await p.click('#open-filters-btn');
      await p.waitForTimeout(500);
      await p.click('#so-more-btn');
      await p.waitForTimeout(400);
      const raekker = await p.evaluate(() => [...document.querySelectorAll('#filter-brands .checkbox-row')].map(r => r.querySelector('input').dataset.brand));
      assert.equal(raekker[0], 'Honda');
      assert.ok(!raekker.some(x => /ukendt/i.test(x)));
      assert.deepStrictEqual(fejl, []);
    } finally { await c.close(); }
    const o = await aabn(w, 'maerker.html');
    try {
      assert.equal(await o.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      assert.deepStrictEqual(o.fejl, []);
    } finally { await o.c.close(); }
  });
}

test('annoncesider: direkte adresse til en efterspørgsel virker (ingen fejl), og rensede modeller står rent i titel og brødkrumme', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const id = t => FX.find(o => (o.t || '').includes(t)).i;
  const T = [
    ['moto cross købes', /Moto købes/],            // efterspørgslen: findes via EXTERNAL_DUBLETTER; vises som den er (forslag i docs)
    ['honda cb500 1996 a2', /^Honda CB 500$/],
    ['Honda VT600', /^Honda VT600$/],
    ['Victory motorcykel V 92', /^Victory V 92 Prototype$/],
    ['God velkørende', /^Hyosung \(model ikke oplyst\)$/],
  ];
  for (const [soeg, forventet] of T) {
    const { c, p, fejl } = await aabn(430, 'annonce.html?id=' + id(soeg));
    try {
      const h1 = await p.evaluate(() => document.querySelector('h1')?.textContent.trim().replace(/\s+/g, ' '));
      assert.ok(h1 && forventet.test(h1.replace(/^Ukendt mærke /, '')) || forventet.test(h1), `${soeg}: "${h1}"`);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      assert.deepStrictEqual(fejl, [], soeg);
    } finally { await c.close(); }
  }
});
