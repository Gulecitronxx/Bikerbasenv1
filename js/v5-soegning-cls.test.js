/* V5 søgning: CLS på dybe søge-links, chip-række/titel/foto i resultatkortene og smoke-browser.js' genforsøg (ERR_NO_BUFFER_SPACE).
   Kør: node --test js/v5-soegning-cls.test.js  — browsertestene springes over uden Playwright/Chromium (med en tydelig besked).

   Baggrund (V4 Critic P2-2/P2-3/P2-6): `soegning.html?types=cruiser` og `?q=cf+moto` flyttede siden 41 px ved 768 px (CLS 0,076 > målet 0,05), fordi
   filterpillerne tegnes af js/search.js efter første maling; smoke åbnede kun soegning.html uden query og så det ikke. Chip-rækken i søgekortene løb over ved
   768 px. Og smoke-browser.js kunne ikke genmåle en side, der ramte Windows' net::ERR_NO_BUFFER_SPACE.
   Alle forespørgsler mod Supabase besvares af scripts/fixtures/v5-soegning-lager.js (735 rækker med lagerets rigtige titler/mærker/modeller). Intet netværk. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { lagerRaekker } = require(path.join(REPO, 'scripts', 'fixtures', 'v5-soegning-lager.js'));

/* ---------------- uden browser ---------------- */

test('SOEGE_LINKS dækker hver parameterfamilie, en adresse uden pille, en uden træf og kombinationer', () => {
  const l = sb.SOEGE_LINKS;
  const har = re => l.some(x => re.test(x));
  assert.ok(har(/^\?types=/), 'types');
  assert.ok(har(/^\?q=/), 'q');
  assert.ok(har(/^\?brands=/), 'brands');
  assert.ok(har(/koerekort=/), 'koerekort');
  assert.ok(har(/^\?sort=/), 'sort (ingen pille)');
  assert.ok(har(/^\?page=/), 'page (ingen pille)');
  assert.ok(har(/^\?q=xyzzy/), 'ingen træf');
  assert.ok(l.some(x => (x.match(/&/g) || []).length >= 2), 'kombination med mindst tre parametre');
  assert.ok(har(/priceMax=.*yearMin=|yearMin=.*priceMax=/), 'tal-filtre');
  assert.strictEqual(new Set(l).size, l.length, 'ingen dubletter');
});

test('laegJobs: en side med query i --sider giver præcis den adresse; --soeg-links tilføjer sættet', () => {
  const a = sb.laegJobs(REPO, { sider: ['soegning.html?types=cruiser&koerekort=A2'] }, false);
  assert.deepStrictEqual(a, [{ side: 'soegning.html', query: '?types=cruiser&koerekort=A2' }]);
  const b = sb.laegJobs(REPO, { sider: ['soegning'], soegLinks: true }, false);
  assert.strictEqual(b.length, sb.SOEGE_LINKS.length + 1);
  assert.deepStrictEqual(b[0], { side: 'soegning.html', query: '' });
  const c = sb.laegJobs(REPO, { sider: ['index'], soegLinks: true }, false);
  assert.ok(c.some(j => j.side === 'index.html') && c.filter(j => j.side === 'soegning.html').length === sb.SOEGE_LINKS.length + 1);
});

test('kunBufferFejl: kun når ALLE fund er ERR_NO_BUFFER_SPACE (konsolfejl eller indlæsning)', () => {
  const f = (tjek, detalje) => ({ tjek, detalje });
  const buf = 'Failed to load resource: net::ERR_NO_BUFFER_SPACE';
  assert.strictEqual(sb.kunBufferFejl({ fund: [f('konsolfejl', buf)] }), true);
  assert.strictEqual(sb.kunBufferFejl({ fund: [f('indlæsning', 'page.goto: net::ERR_NO_BUFFER_SPACE at http://x')] }), true);
  assert.strictEqual(sb.kunBufferFejl({ fund: [f('konsolfejl', buf), f('sidefejl', 'boom')] }), false);
  assert.strictEqual(sb.kunBufferFejl({ fund: [f('konsolfejl', 'Failed to load resource: net::ERR_CONNECTION_REFUSED')] }), false);
  assert.strictEqual(sb.kunBufferFejl({ fund: [] }), false);
});

test('serveren holder forbindelser åbne (keep-alive) og svarer med cache kun når det bedes om', async () => {
  const http = require('node:http');
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'v5-ka-'));
  fs.writeFileSync(path.join(rod, 'a.html'), '<!doctype html><title>a</title>');
  try {
    for (const [cache, forventet] of [[false, 'no-store'], [true, 'public, max-age=600']]) {
      const { server, port } = await sb.startServer(rod, { cache });
      try {
        assert.ok(server.keepAliveTimeout >= 30000, 'keepAliveTimeout');
        const h = await new Promise((ok, fejl) => http.get({ host: '127.0.0.1', port, path: '/a.html' }, r => { r.resume(); r.on('end', () => ok(r.headers)); }).on('error', fejl));
        assert.strictEqual(h['cache-control'], forventet);
        assert.match(String(h.connection), /keep-alive/i);
      } finally { server.close(); }
    }
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});

/* ---------------- genforsøg i smoke-browser.js (browser) ---------------- */

const side = body => `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>T</title></head><body><main><h1>Overskrift</h1>${body}</main></body></html>`;
const BUF = `console.error("Failed to load resource: net::ERR_NO_BUFFER_SPACE")`;
let kan = { ok: false, grund: 'ikke undersøgt' };
let H = null;   // server + delt Chromium til layouttestene nedenfor
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v5-soegning-cls.test: SKIPPER browsertestene (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(process.env.V5_ROD || REPO);   // V5_ROD: mål en anden kopi af sitet (fx før-versionen) med samme test
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

async function koerSider(sider, opt = {}){
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'v5-retry-'));
  try {
    for (const [f, html] of Object.entries(sider)) fs.writeFileSync(path.join(rod, f), html);
    return await sb.koer({ rod, sider: Object.keys(sider).map(s => s.replace(/\.html$/, '')), viewports: [390], temaer: ['lys'], stille: true, pw: kan.pw, ...opt });
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
}

test('genforsøg: en måling, hvis ENESTE fund er ERR_NO_BUFFER_SPACE, tages om og gemmes som transient (ingen fejl)', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  /* Første indlæsning melder fejlen, den anden (samme kontekst, så localStorage lever) er ren. */
  const r = await koerSider({ 'flaky.html': side(`<script>if(!localStorage.getItem("v5_buf")){localStorage.setItem("v5_buf","1");${BUF};}</script>`) });
  assert.strictEqual(r.sammenfatning.fejl, 0, JSON.stringify(r.fund));
  assert.strictEqual(r.transient.length, 1);
  assert.strictEqual(r.transient[0].transient, true);
  assert.match(r.transient[0].detalje, /ERR_NO_BUFFER_SPACE/);
  assert.strictEqual(r.sammenfatning.transient, 1);
  assert.strictEqual(r.maalinger.length, 1);
  assert.strictEqual(r.maalinger[0].genmaalt, true);
  assert.match(sb.tabel(r), /TRANSIENT flaky\.html/);
});

test('genforsøg: kommer fejlen igen, er den ægte (fejl), og et andet fund skjules aldrig af genforsøget', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const igen = await koerSider({ 'altid.html': side(`<script>${BUF};</script>`) });
  assert.strictEqual(igen.transient.length, 1);
  assert.ok(igen.sammenfatning.fejl >= 1, 'samme fejl to gange tæller som fejl');
  const blandet = await koerSider({ 'blandet.html': side(`<script>${BUF};setTimeout(function(){ throw new Error("bevidst"); }, 5);</script>`) });
  assert.strictEqual(blandet.transient.length, 0, 'sidefejl ved siden af: ingen genmåling');
  assert.ok(blandet.fund.some(f => f.tjek === 'sidefejl') && blandet.sammenfatning.fejl >= 1);
});

/* ---------------- søgesiden: CLS på dybe links, kold og varm cache ---------------- */

/* V7 QA: ÉN test pr. viewport (var én test på 420 s, målt 297 s under npm test og dermed tæt på loftet), og GENMÅLING VED RØD: en måling over 0,05 tages om
   med præcis samme adresse/viewport/tema (kold og varm cache), og kun hvis den OGSÅ er over i genmålingen tæller den. Grænsen 0,05 er uændret. */
for (const vp of [375, 430, 768, 1440]) {
  test(`CLS under 0,05 på søgesidens dybe links ved ${vp} px, lys og mørk, kold og varm cache (og 0 fejl)`, { timeout: 420000 }, async t => {
    if (!kan.ok) return t.skip(kan.grund);
    const r = await sb.koer({ sider: ['soegning'], soegLinks: true, varm: true, viewports: [vp], temaer: ['lys', 'mørk'], cls: 0.05, stille: true, pw: kan.pw });
    const udenTransient = r.fund.filter(f => !f.transient);
    const rod = r.maalinger.filter(m => m.cls > 0.05);
    const ende = [];
    for (const m of rod) {   // genmåling ved rød: samme adresse, viewport, tema
      const igen = await sb.koer({ sider: [`soegning.html${m.query || ''}`], varm: true, viewports: [vp], temaer: [m.tema === 'mørk' ? 'mørk' : 'lys'], cls: 0.05, stille: true, pw: kan.pw });
      const same = igen.maalinger.find(x => x.cache === m.cache && x.query === m.query);
      if (!same || same.cls > 0.05) ende.push(`${m.query || '(ingen)'} ${m.viewport} ${m.tema} ${m.cache}: ${m.cls} (genmåling ${same ? same.cls : 'mangler'})`);
    }
    const fejlUdenCls = udenTransient.filter(f => f.tjek !== 'cls' && sb.TJEK[f.tjek] === 'fejl');
    assert.strictEqual(fejlUdenCls.length, 0, 'fejl: ' + JSON.stringify(fejlUdenCls.slice(0, 5)));
    assert.deepStrictEqual(ende, [], 'CLS over 0,05 (også i genmåling): ' + ende.join('; '));
    assert.strictEqual(r.maalinger.length, (sb.SOEGE_LINKS.length + 1) * 2 * 2, 'hver adresse x tema x kold/varm');
    assert.ok(r.maalinger.some(m => m.cache === 'varm') && r.maalinger.some(m => m.cache === 'kold'));
    assert.ok(r.maalinger.every(m => m.annoncekort > 0 || /xyzzy/.test(m.query)), 'kortene blev tegnet (siden hydrerede)');
    const vaerst = r.maalinger.reduce((a, b) => (b.cls > a.cls ? b : a));
    console.log(`# v5-soegning-cls ${vp}: ${r.maalinger.length} målinger, værste CLS ${vaerst.cls} (${vaerst.query || '(ingen)'} ${vaerst.viewport} ${vaerst.tema} ${vaerst.cache}), ${r.sammenfatning.transient} transient, ${rod.length} rød(e) før genmåling`);
  });
}

/* ---------------- søgesiden: layout i kortene ---------------- */

async function aabn(w, url, { tema = 'light', blokerJs = false, hoejde = 1100 } = {}){
  const c = await H.browser.newContext({ viewport: { width: w, height: hoejde }, locale: 'da-DK', colorScheme: tema, serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  await sb.installerMock(c, H.port, {}, { restSvar: sb.lagerSvar });
  if (blokerJs) await c.route(/\/js\/search\.js/, r => r.abort());
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'load' });
  if (!blokerJs) {
    await p.waitForFunction(() => document.documentElement.classList.contains('so-klar') || document.getElementById('empty-state')?.style.display === 'block', null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
  }
  return { c, p };
}

for (const w of [375, 430, 768, 1024, 1440, 1920]) {
  test(`kortene ved ${w} px: chips, titel, kilde og sted klippes ikke og overlapper ikke`, { timeout: 60000 }, async t => {
    if (!H) return t.skip('Playwright mangler');
    const { c, p } = await aabn(w, 'soegning.html');
    try {
      const m = await p.evaluate(() => {
        const ud = { kort: 0, chipsOverflow: [], chipKlip: [], overlap: [], vandret: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        const skær = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        for (const k of document.querySelectorAll('#results-grid .card-rich')) {
          ud.kort++;
          const navn = (k.querySelector('.rk-titel') || {}).textContent;
          const chips = [...k.querySelectorAll('.rk-chips .rk-chip')];
          const raekke = k.querySelector('.rk-chips');
          if (raekke && raekke.scrollWidth > raekke.clientWidth + 1) ud.chipsOverflow.push(navn);
          for (const ch of chips) if (ch.scrollWidth > ch.clientWidth + 1 || ch.scrollHeight > ch.clientHeight + 1) ud.chipKlip.push(`${navn}: ${ch.textContent.trim().slice(0, 30)}`);
          const bokse = chips.map(ch => ch.getBoundingClientRect());
          for (let i = 0; i < bokse.length; i++) for (let j = i + 1; j < bokse.length; j++) if (skær(bokse[i], bokse[j])) ud.overlap.push(`${navn}: chip ${i}/${j}`);
          const kr = k.getBoundingClientRect();
          for (const ch of chips) { const b = ch.getBoundingClientRect(); if (b.right > kr.right + 1 || b.left < kr.left - 1) ud.overlap.push(`${navn}: chip uden for kortet`); }
          /* Sammenlign-knappen må ikke dække en chip (fra 760 px bor den i foden; under det ligger den på fotoet). */
          const sam = k.querySelector('.card-compare');
          if (sam) { const sb = sam.getBoundingClientRect(); for (const ch of chips) if (skær(sb, ch.getBoundingClientRect())) ud.overlap.push(`${navn}: sammenlign dækker chip ${ch.textContent.trim().slice(0, 12)}`); }
          /* Foden: sted og kilde må ikke ligge oven i hinanden eller under knappen. */
          const sted = k.querySelector('.rk-sted'), kilde = k.querySelector('.rk-kilde');
          if (sted && kilde && skær(sted.getBoundingClientRect(), kilde.getBoundingClientRect())) ud.overlap.push(`${navn}: sted dækker kilde`);
          if (sam && kilde && skær(sam.getBoundingClientRect(), kilde.getBoundingClientRect())) ud.overlap.push(`${navn}: sammenlign dækker kilden`);
        }
        return ud;
      });
      assert.ok(m.kort >= 12, `kortene er tegnet (${m.kort})`);
      assert.deepStrictEqual(m.chipsOverflow, [], 'chip-række løber over');
      assert.deepStrictEqual(m.chipKlip, [], 'chip klippet');
      assert.deepStrictEqual(m.overlap, [], 'chips overlapper/ligger uden for kortet');
      assert.strictEqual(m.vandret, 0, 'vandret overflow');
    } finally { await c.close(); }
  });
}

test('titler: "Mærke (model ikke oplyst)" og titler op til 40 tegn står fuldt (højst to linjer, aldrig klippet med ellipse)', { timeout: 90000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  /* Brug lagerets egne titler: "Honda (model ikke oplyst)" findes (rækker uden model). */
  assert.ok(lagerRaekker().some(r => !r.model), 'fixturen har en række uden model');
  for (const w of [768, 1440, 1920]) {
    let set = 0, udenModel = 0;
    for (const url of ['soegning.html', 'soegning.html?brands=Honda', 'soegning.html?brands=BMW']) {
      const { c, p } = await aabn(w, url, { hoejde: 1200 });
      try {
        const m = await p.evaluate(() => [...document.querySelectorAll('#results-grid .card-rich .rk-titel')].map(e => ({ t: e.textContent.trim(), klip: e.scrollHeight > e.clientHeight + 1, h: e.clientHeight, lh: parseFloat(getComputedStyle(e).lineHeight) })));
        set += m.length; udenModel += m.filter(x => /model ikke oplyst/.test(x.t)).length;
        const kort = m.filter(x => x.t.length <= 40);
        assert.deepStrictEqual(kort.filter(x => x.klip).map(x => x.t), [], `${w} ${url}: korte titler klippet`);
        assert.ok(m.every(x => x.h <= x.lh * 2 + 2), `${w} ${url}: titel højst to linjer`);
      } finally { await c.close(); }
    }
    assert.ok(set >= 36, `${w}: nok titler at måle (${set})`);
    assert.ok(udenModel >= 1, `${w}: "model ikke oplyst"-titlen indgår i målingen`);
  }
});

test('fotoet i søgekortene er 16:10 fra 760 px (ikke 2,3:1 der skar hjul og forgaffel)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const w of [768, 1440]) {
    const { c, p } = await aabn(w, 'soegning.html');
    try {
      const r = await p.evaluate(() => { const e = document.querySelector('#results-grid .card-rich .card-media').getBoundingClientRect(); return e.width / e.height; });
      assert.ok(Math.abs(r - 1.6) < 0.03, `${w}: forhold ${r.toFixed(3)}`);
    } finally { await c.close(); }
  }
});

test('infobåndet: ingen løsrevet lodret streg foran "De fleste annoncer ..." på linjen under (under 1100 px)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const w of [375, 768, 1024]) {
    const { c, p } = await aabn(w, 'soegning.html');
    try {
      const r = await p.evaluate(() => { const e = document.getElementById('frisk-note'); const s = getComputedStyle(e); return { b: s.borderLeftWidth, ml: s.marginLeft, tekst: e.textContent.trim().length }; });
      assert.strictEqual(r.b, '0px', `${w}: border-left ${r.b}`);
      assert.strictEqual(r.ml, '0px', `${w}: margin-left ${r.ml}`);
    } finally { await c.close(); }
  }
});

/* ---------------- pladsen til piller og note står i første maling ---------------- */

test('første maling (uden JavaScript): pillerækken og noten har deres endelige plads, når adressen siger, de kommer', { timeout: 90000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const maal = async (w, url) => {
    const { c, p } = await aabn(w, url, { blokerJs: true });
    try {
      await p.waitForTimeout(300);
      return await p.evaluate(() => {
        const r = s => { const e = document.querySelector(s); if (!e) return 0; const cs = getComputedStyle(e); return cs.display === 'none' ? 0 : Math.round(e.getBoundingClientRect().height); };
        return { klasse: document.documentElement.className, chiprow: r('#so-chiprow'), pille: r('.so-chips-area'), note: r('#uoplyst-note') };
      });
    } finally { await c.close(); }
  };
  for (const w of [375, 768, 1440]) {
    const med = await maal(w, 'soegning.html?types=cruiser&koerekort=A2');
    assert.match(med.klasse, /so-pille/, `${w}: so-pille`);
    assert.match(med.klasse, /so-note/, `${w}: so-note`);
    assert.ok(med.pille >= 40, `${w}: pillerækken er reserveret (${med.pille})`);
    assert.ok(med.chiprow > 0, `${w}: rækken vises`);
    assert.ok(med.note >= 42, `${w}: noten har plads (${med.note})`);
    const uden = await maal(w, 'soegning.html?page=2');
    assert.doesNotMatch(uden.klasse, /so-pille|so-note/, `${w}: ?page= giver ingen pille`);
    assert.ok(uden.pille < 10 && uden.note === 0, `${w}: ingen plads reserveret uden pille (${JSON.stringify(uden)})`);
    const brand = await maal(w, 'soegning.html?brands=Honda');
    assert.match(brand.klasse, /so-pille/); assert.doesNotMatch(brand.klasse, /so-note/, 'et mærke fravælger ingen uoplyste annoncer');
  }
});

test('pillerne står på én række, der kan rulles sideværts (under 1280 px): højden er den samme med 1 og 5 filtre', { timeout: 90000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const w of [375, 768]) {
    const en = await aabn(w, 'soegning.html?types=cruiser');
    const fem = await aabn(w, 'soegning.html?types=cruiser,sport,touring&koerekort=A2&priceMax=100000&yearMin=2005');
    try {
      const h = async p => p.evaluate(() => ({ h: Math.round(document.getElementById('active-filters').getBoundingClientRect().height), antal: document.querySelectorAll('.active-filter-pill').length, vandret: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
      const a = await h(en.p), b = await h(fem.p);
      assert.ok(a.antal === 1 && b.antal >= 5, `piller ${a.antal}/${b.antal}`);
      assert.strictEqual(a.h, b.h, `${w}: rækkehøjde ${a.h} mod ${b.h}`);
      assert.strictEqual(a.vandret + b.vandret, 0, 'siden får ikke vandret scroll');
    } finally { await en.c.close(); await fem.c.close(); }
  }
});
