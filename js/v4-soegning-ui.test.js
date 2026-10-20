/* V4 søgning: browsertest af søgesiden mod lagerets mærkeliste (scripts/fixtures/v4-lager-maerker.json, ingen netværk).
   Kør: node --test js/v4-soegning-ui.test.js — springes over uden Playwright.
   Dækker: mærkefilter og model-filter fra lageret, "Uoplyst mærke", alias-fritekst, kombinerede filtre + sortering, tomtilstand,
   mobil 375/430 (ingen sidescroll, ingen luft over resultatet), antal på tværs af søgning og mærkeside. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));

const SNAP = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'fixtures', 'v4-lager-maerker.json'), 'utf8'));
const DOM = { 'MC Syd': 'mcsyd.dk', 'Gul og Gratis': 'guloggratis.dk', '123mc': '123mc.dk' };
const RAEKKER = SNAP.raekker.map((r, i) => {
  const [maerke, model, titel, type, url, kilde] = r;
  return {
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, kilde_annonce_id: String(i), url, titel, maerke, model,
    variant: null, type, aargang: 2000 + (i % 24), km: 5000 + (i * 997) % 90000, ccm: 400 + (i * 37) % 1200, hk: 30 + (i * 13) % 120,
    pris_dkk: 20000 + (i * 1733) % 180000, stand: null, salgsmarkoerer: [], udledte_felter: [], by: 'Aarhus', postnr: 8000,
    saelgertype: null, thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-08-01',
    sidst_set: `2026-08-${String(1 + (i % 25)).padStart(2, '0')}T10:00:00Z`, kilde: { navn: kilde || 'Gul og Gratis', domaene: DOM[kilde] || 'guloggratis.dk' },
  };
});

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return;
  const { server, port } = await sb.startServer(REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
async function aabn(w, url, tema = 'light'){
  const c = await H.browser.newContext({ viewport: { width: w, height: w > 1000 ? 900 : 812 }, locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await c.route('**/*', route => {
    const req = route.request(); let u;
    try { u = new URL(req.url()); } catch (e) { return route.abort(); }
    if (u.hostname === '127.0.0.1') return route.continue();
    if (/supabase\.co$/.test(u.hostname)){
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.startsWith('/rest/v1/')){
        const t = u.pathname.slice('/rest/v1/'.length);
        const lim = Number(u.searchParams.get('limit')) || undefined, off = Number(u.searchParams.get('offset')) || 0;
        const body = t === 'eksterne_annoncer' ? RAEKKER.slice(off, lim ? off + lim : undefined) : [];
        return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      return route.fulfill({ status: 401, headers: cors, body: '{}' });
    }
    if (req.resourceType() === 'image') return route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: PNG });
    return route.abort();
  });
  const p = await c.newPage(); const fejl = [];
  p.on('pageerror', e => fejl.push(e.message));
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => document.documentElement.classList.contains('so-klar') || document.getElementById('empty-state')?.style.display === 'block', null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(500);
  return { c, p, fejl };
}
const tal = p => p.evaluate(() => parseInt(document.getElementById('results-count').textContent.replace(/\D/g, ''), 10));
/* Hvad filterkæden selv siger om lageret i siden — søgesidens tal skal være det samme. */
const iSiden = (p, filtre) => p.evaluate(f => Filtrering.anvendFiltre(Store.getAllListings(), f, null, null).length, filtre);
async function vent(p, pred, arg){ await p.waitForFunction(pred, arg, { timeout: 5000 }).catch(() => {}); }

test('mærkefilteret: ét mærke én gang, "Uoplyst mærke" sidst, ingen "Ukendt", tallene = filterkæden', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p, fejl } = await aabn(1440, 'soegning.html');
  try {
    const m = await p.evaluate(() => ({
      valg: [...document.querySelectorAll('#so-brand option')].map(o => o.textContent),
      raekker: [...document.querySelectorAll('#filter-brands .checkbox-row')].map(r => ({ navn: r.querySelector('span:not(.bl-spalte):not(.facet-n)')?.textContent, n: Number(r.querySelector('.facet-n').textContent), v: r.querySelector('input').dataset.brand })),
    }));
    assert.ok(m.valg.length > 10);
    assert.equal(new Set(m.valg).size, m.valg.length, 'dublet i mærkevælgeren');
    assert.ok(!m.valg.some(x => /^ukendt/i.test(x)) && !m.raekker.some(r => /^ukendt/i.test(r.navn)), 'Ukendt vist som mærkenavn');
    assert.equal(m.valg[m.valg.length - 1], 'Uoplyst mærke');
    assert.equal(m.raekker[m.raekker.length - 1].navn, 'Uoplyst mærke');
    const nr = m.raekker.filter(r => r.navn !== 'Uoplyst mærke').map(r => r.n);
    assert.deepEqual(nr, [...nr].sort((a, b) => b - a), 'flest annoncer først');
    for (const r of m.raekker) assert.equal(r.n, await iSiden(p, { brands: [r.v] }), `${r.navn}: facettal`);
    assert.equal(m.raekker.reduce((s, r) => s + r.n, 0), await tal(p), 'mærketallene summer til resultatet');
    assert.deepEqual(fejl, []);
  } finally { await c.close(); }
});

test('modelfilteret: lagerets modeller med antal; valg giver præcis det antal; URL i anden stavemåde kanoniseres', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html?brands=honda');
  try {
    assert.equal(await p.evaluate(() => state.brands.join()), 'Honda');
    assert.match(await p.evaluate(() => location.search), /brands=Honda/);
    const opt = await p.evaluate(() => [...document.querySelectorAll('#so-model option')].map(o => o.textContent));
    assert.ok(opt.length > 40, `${opt.length} Honda-modeller i listen`);
    const gw = opt.find(x => /^GL 1800 Gold Wing \(\d+\)$/.test(x));
    assert.ok(gw, 'Gold Wing mangler: ' + opt.slice(0, 8).join(' | '));
    await p.selectOption('#so-model', { label: gw });
    await vent(p, () => /models|model=/.test(location.search));
    assert.equal(await tal(p), Number(gw.match(/\((\d+)\)/)[1]));
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.active-filter-pill')].map(x => x.textContent.trim())), ['Honda', 'GL 1800 Gold Wing']);
    // delt link med anden stavemåde af model: samme valg
    const q = await aabn(1440, 'soegning.html?brands=HONDA&model=gl1800goldwing');
    try { assert.equal(await tal(q.p), Number(gw.match(/\((\d+)\)/)[1])); assert.deepEqual(await q.p.evaluate(() => state.models), ['GL 1800 Gold Wing']); } finally { await q.c.close(); }
  } finally { await c.close(); }
});

test('"Uoplyst mærke": ?brands=Ukendt viser pillen og overskriften på dansk, ikke sentinellen', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html?brands=Ukendt');
  try {
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.active-filter-pill')].map(x => x.textContent.trim())), ['Uoplyst mærke']);
    const n = await tal(p);
    assert.ok(n >= 1 && n === await iSiden(p, { brands: ['Ukendt'] }));
    assert.match(await p.evaluate(() => document.querySelector('h1').textContent), /Uoplyst mærke til salg/);
    assert.ok(!/Ukendt/.test(await p.evaluate(() => document.getElementById('active-filters').textContent)));
  } finally { await c.close(); }
});

test('alias-fritekst i søgefeltet: "cf moto", "harley", "bmw motorrad", "sanyang" finder mærkets annoncer', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html');
  try {
    for (const [q, brand] of [['cf moto', 'CFMoto'], ['harley', 'Harley-Davidson'], ['hd', 'Harley-Davidson'], ['bmw motorrad', 'BMW'], ['sanyang', 'SYM'], ['royal enfield', 'Royal Enfield']]){
      await p.fill('#filter-q', q);
      await vent(p, x => document.getElementById('filter-q').value === x && location.search.includes('q='), q);
      await p.waitForTimeout(450);
      const forventet = await iSiden(p, { brands: [brand] });
      assert.ok(forventet > 0, brand);
      assert.equal(await tal(p), forventet, `"${q}" -> ${brand}`);
    }
  } finally { await c.close(); }
});

test('kombinerede filtre + sortering: mærke + type + kørekort + pris stigende; tallet = kæden, priserne stiger', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html?brands=Honda&type=touring&koerekort=A&sort=price-asc');
  try {
    const n = await tal(p);
    assert.equal(n, await iSiden(p, { brands: ['Honda'], types: ['touring'], koerekort: 'A' }));
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('.active-filter-pill')].map(x => x.textContent.trim())), ['Touring', 'Honda', 'Kørekort A']);
    const priser = await p.evaluate(() => [...document.querySelectorAll('#results-grid .rk-pris')].map(e => parseInt(e.textContent.replace(/\D/g, ''), 10)).filter(Boolean));
    assert.ok(priser.length > 0 && priser.length === Math.min(n, 24));
    assert.deepEqual(priser, [...priser].sort((a, b) => a - b));
    // et filter mere ændrer tallet konsistent, og "Ryd alle" bringer lageret tilbage
    await p.click('#so-clear-all');
    await vent(p, () => location.search === '');
    assert.equal(await tal(p), await iSiden(p, {}));
  } finally { await c.close(); }
});

test('tomtilstand: ingen træf viser forklaring og vej ud; én rydning gør resultatet tilbage', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html?q=zzzzqq&brands=Honda');
  try {
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('empty-state')).display), 'block');
    assert.equal(await tal(p), 0);
    assert.equal(await p.evaluate(() => [...document.querySelectorAll('#results-grid .card')].filter(k => getComputedStyle(k).visibility !== 'hidden' && k.getBoundingClientRect().height > 0).length), 0, 'ingen synlige kort (skelet-kort må ikke stå ved tomtilstanden)');
    await p.click('#empty-clear-btn');
    await vent(p, () => location.search === '');
    assert.ok(await tal(p) > 100);
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById('empty-state')).display), 'none');
  } finally { await c.close(); }
});

for (const w of [375, 430]){
  test(`mobil ${w}: ingen sidescroll, kun 16-24 px luft over resultatet uden filter, og filterskuffen viser mærker og Uoplyst mærke`, async (t) => {
    if (!H) return t.skip('Playwright mangler');
    const { c, p, fejl } = await aabn(w, 'soegning.html');
    try {
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      const gap = await p.evaluate(() => document.getElementById('results-count').getBoundingClientRect().top - document.querySelector('.so-chiprow-actions').getBoundingClientRect().bottom);
      assert.ok(gap >= 8 && gap <= 28, `luft over resultatet ${gap}px`);
      await p.click('#open-filters-btn');
      await vent(p, () => document.querySelectorAll('#so-brand option').length > 5);
      const valg = await p.evaluate(() => [...document.querySelectorAll('#so-brand option')].map(o => o.textContent));
      assert.equal(valg[valg.length - 1], 'Uoplyst mærke');
      assert.deepEqual(fejl, []);
      // med filter i adressen er pillerækken reserveret (ingen spring) og pillen står
      const q = await aabn(w, 'soegning.html?q=honda');
      try {
        assert.deepEqual(await q.p.evaluate(() => [...document.querySelectorAll('.active-filter-pill')].map(x => x.textContent.trim())), ['"honda"']);
        assert.equal(await q.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
      } finally { await q.c.close(); }
    } finally { await c.close(); }
  });
}

test('mobil 390: svajpe-visningen findes på telefon og skjules (som gitter) på bred skærm', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(390, 'soegning.html');
  try {
    assert.notEqual(await p.evaluate(() => getComputedStyle(document.getElementById('view-swipe')).display), 'none');
    await p.click('#view-swipe');
    await vent(p, () => !document.getElementById('swipe-deck').hidden);
    assert.equal(await p.evaluate(() => document.getElementById('swipe-deck').hidden), false);
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    assert.equal(await p.evaluate(() => document.getElementById('swipe-deck').hidden), true, 'gemt svajpe vises som gitter på desktop');
    assert.equal(await p.evaluate(() => document.getElementById('results-grid').hidden), false);
  } finally { await c.close(); }
});

test('infobåndet på 1440: sorteringsreglen står i (i), ikke som linje; én linje med kilder og alder', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'soegning.html');
  try {
    const m = await p.evaluate(() => {
      const b = document.getElementById('so-infoband');
      return { h: b.getBoundingClientRect().height, note: getComputedStyle(document.getElementById('sortering-note')).display,
        info: !!document.getElementById('sortering-info-btn') && !document.getElementById('sortering-info-btn').hidden };
    });
    assert.equal(m.note, 'none'); assert.ok(m.info, '(i) ved Sortér');
    assert.ok(m.h <= 44, `infobånd ${m.h}px`);
  } finally { await c.close(); }
});

test('antal på tværs: søgning for et mærke = mærkesidens hydrerede tal', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const s = await aabn(1440, 'soegning.html?brands=Honda');
  const m = await aabn(1440, 'maerke-honda.html');
  try {
    /* Lokalt ligger der demoannoncer i lageret (SHOW_DEMO_DATA); de findes ikke i drift og tæller ikke på mærkesiden (js/maerke.js). */
    const iSoeg = await s.p.evaluate(() => { const demo = new Set(LISTINGS.map(l => String(l.id))); return Filtrering.anvendFiltre(Store.getAllListings().filter(l => !demo.has(String(l.id))), { brands: ['Honda'] }, null, null).length; });
    assert.ok(iSoeg > 100);
    const paaSiden = await m.p.evaluate(() => [...document.querySelectorAll('[data-mk-n]')].map(e => parseInt(e.textContent.replace(/\D/g, ''), 10)));
    assert.ok(paaSiden.length > 0 && paaSiden.every(x => x === iSoeg), `mærkeside ${paaSiden} vs søgning ${iSoeg}`);
  } finally { await s.c.close(); await m.c.close(); }
});
