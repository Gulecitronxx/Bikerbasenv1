/* V5: favorit-hjerte på ALLE kort (D-008 revideret). Indekserede annoncer kan ikke gemmes i databasen (favorites.listing_id har fremmednøgle til listings),
   så deres favoritter ligger KUN i browseren (localStorage bb_favorites_ext) og når aldrig databasen eller backend-broens favoritsynk.
   Browsertest mod lagerfixturen (scripts/fixtures/v5-soegning-lager.js), intet netværk; springes over uden Playwright.
   Kør: node --test js/v5-favoritter.test.js */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { lagerRaekker } = require(path.join(REPO, 'scripts', 'fixtures', 'v5-soegning-lager.js'));
const ID1 = lagerRaekker()[1].id;   // en indekseret annonce (BMW K 1200)

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v5-favoritter.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

/* En kontekst, der tæller ALLE skrivende kald mod Supabase (alt andet end GET/OPTIONS) — de skal være 0. */
async function ctx(w = 1440, { tema = 'light', logget = false, lokal = false } = {}){
  const c = await H.browser.newContext({ viewport: { width: w, height: 1300 }, locale: 'da-DK', colorScheme: tema, serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  /* logget = en database-session (remote); lokal = en lokal session uden database (Mine annoncer kræver en bruger). */
  if (logget || lokal) await c.addInitScript(r => { try { localStorage.setItem('bb_user', JSON.stringify({ id: 'aaaaaaaa-0000-4000-8000-000000000001', name: 'Test', email: 't@example.test', plan: 'private', remote: r })); } catch (e) {} }, !!logget);
  await sb.installerMock(c, H.port, {}, { restSvar: sb.lagerSvar });
  const skriv = [];
  c.on('request', r => { try { const u = new URL(r.url()); if (/supabase\.co$/.test(u.hostname) && !/^(GET|OPTIONS|HEAD)$/.test(r.method())) skriv.push(`${r.method()} ${u.pathname}`); } catch (e) {} });
  return { c, skriv };
}
async function aabn(c, url){
  const p = await c.newPage();
  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'load' });
  await p.waitForFunction(() => document.documentElement.classList.contains('so-klar') || document.getElementById('fav-grid'), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(500);
  return { p, fejl };
}
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);

test('hjerte på ALLE kort i gitteret: indekserede og egne, kun-lokal tooltip på de indekserede, ingen vandret overflow', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const w of [375, 768, 1440]) {
    const { c } = await ctx(w);
    try {
      const { p } = await aabn(c, 'soegning.html');
      const m = await p.evaluate(() => {
        const kort = [...document.querySelectorAll('#results-grid .card-rich')];
        const udenHjerte = kort.filter(k => !k.querySelector('.fav-btn')).map(k => k.querySelector('.rk-titel').textContent);
        const ext = kort.filter(k => k.dataset.external === '1');
        return { n: kort.length, udenHjerte, extN: ext.length, extFlag: ext.filter(k => k.querySelector('.fav-btn[data-fav-ext]')).length,
          tooltip: ext.every(k => k.querySelector('.fav-btn').title === 'Gemmes i denne browser'), pressed: kort.every(k => k.querySelector('.fav-btn').getAttribute('aria-pressed') === 'false'),
          label: kort.every(k => k.querySelector('.fav-btn').getAttribute('aria-label') === 'Gem annonce'), vandret: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      assert.ok(m.n >= 12, `${w}: kort ${m.n}`);
      assert.deepStrictEqual(m.udenHjerte, [], `${w}: kort uden hjerte`);
      assert.ok(m.extN >= 10 && m.extFlag === m.extN, `${w}: alle indekserede kort har data-fav-ext (${m.extFlag}/${m.extN})`);
      assert.ok(m.tooltip && m.pressed && m.label);
      assert.strictEqual(m.vandret, 0);
    } finally { await c.close(); }
  }
});

test('tryk på et indekseret hjerte: gemt lokalt, tæller 1, ærlig besked første gang, intet skrives til Supabase — også logget ind', { timeout: 90000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const logget of [false, true]) {
    const { c, skriv } = await ctx(1440, { logget });
    try {
      const { p, fejl } = await aabn(c, 'soegning.html');
      const kort = p.locator('#results-grid .card-rich[data-external="1"]').first();
      const id = await kort.getAttribute('data-listing-id');
      const knap = kort.locator('.fav-btn');
      await knap.click();
      await p.waitForTimeout(300);
      assert.strictEqual(await knap.getAttribute('aria-pressed'), 'true');
      assert.strictEqual(await knap.getAttribute('aria-label'), 'Fjern fra gemte');
      assert.match(await knap.getAttribute('class'), /active/);
      assert.deepStrictEqual(JSON.parse(await ls(p, 'bb_favorites_ext')), [id]);
      assert.ok(!(JSON.parse((await ls(p, 'bb_favorites')) || '[]')).includes(id), 'ikke i databasens favoritliste');
      assert.strictEqual(await p.evaluate(i => Store.getFavorites().includes(i), id), false);
      assert.strictEqual(await p.evaluate(() => Store.getAllFavorites().length), 1);
      const tal = await p.evaluate(() => [...document.querySelectorAll('[data-fav-count]')].map(e => e.textContent.trim()));
      assert.ok(tal.length && tal.every(x => x === '1'), `header-tæller ${JSON.stringify(tal)}`);
      const toast = await p.evaluate(() => (document.querySelector('.toast, [role="status"].toast, #toast-region')?.textContent || document.body.innerText));
      assert.match(toast, /Gemt i denne browser/, 'ærlig besked ved første tryk');
      if (logget) assert.match(toast, /følger ikke med til dine andre enheder/, 'indloggede får at vide, at de ikke synkes');
      /* anden annonce: ingen gentagelse af den lange besked, men stadig gemt */
      const k2 = p.locator('#results-grid .card-rich[data-external="1"]').nth(2);
      await k2.locator('.fav-btn').click(); await p.waitForTimeout(200);
      assert.strictEqual(await p.evaluate(() => Store.getExternalFavorites().length), 2);
      /* fjern igen */
      await knap.click(); await p.waitForTimeout(200);
      assert.strictEqual(await p.evaluate(() => Store.getExternalFavorites().length), 1);
      assert.deepStrictEqual(skriv, [], `skrivende kald mod Supabase: ${skriv.join(', ')}`);
      assert.deepStrictEqual(fejl, []);
    } finally { await c.close(); }
  }
});

test('favoritten består efter genindlæsning (hjertet er tændt, tælleren står) og i listevisningen', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, skriv } = await ctx(1440);
  try {
    const { p } = await aabn(c, 'soegning.html');
    const id = await p.locator('#results-grid .card-rich[data-external="1"]').first().getAttribute('data-listing-id');
    await p.locator(`#results-grid [data-listing-id="${id}"] .fav-btn`).click();
    await p.reload({ waitUntil: 'load' });
    await p.waitForFunction(() => document.documentElement.classList.contains('so-klar'), null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400);
    assert.strictEqual(await p.locator(`#results-grid [data-listing-id="${id}"] .fav-btn`).getAttribute('aria-pressed'), 'true');
    assert.strictEqual(await p.evaluate(() => document.querySelector('[data-fav-count]').textContent.trim()), '1');
    await p.click('#view-list'); await p.waitForTimeout(400);
    const række = p.locator(`#results-grid .listing-row[data-listing-id="${id}"]`);
    assert.strictEqual(await række.locator('.row-fav').getAttribute('aria-pressed'), 'true', 'listevisningen viser den samme favorit');
    /* alle rækker har hjerte */
    assert.strictEqual(await p.evaluate(() => [...document.querySelectorAll('#results-grid .listing-row')].filter(r => !r.querySelector('.row-fav')).length), 0);
    await række.locator('.row-fav').click(); await p.waitForTimeout(200);
    assert.strictEqual(await p.evaluate(() => Store.getExternalFavorites().length), 0);
    assert.deepStrictEqual(skriv, []);
  } finally { await c.close(); }
});

test('annoncesiden: indekseret annonce har "Gem som favorit" (kun lokalt)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, skriv } = await ctx(1440);
  try {
    const p = await c.newPage();
    await p.goto(`http://127.0.0.1:${H.port}/annonce.html?id=${ID1}`, { waitUntil: 'load' });
    await p.waitForSelector('#an-actions .an-fav', { timeout: 8000 });
    const knap = p.locator('#an-actions .an-fav');
    assert.strictEqual(await knap.getAttribute('data-fav-ext'), '1');
    await knap.click(); await p.waitForTimeout(300);
    assert.strictEqual(await knap.getAttribute('aria-pressed'), 'true');
    assert.deepStrictEqual(JSON.parse(await ls(p, 'bb_favorites_ext')), [ID1]);
    assert.deepStrictEqual(skriv, []);
  } finally { await c.close(); }
});

test('"Gemte annoncer": egne og indekserede favoritter står sammen; indekserede linker til annoncesiden og kilden', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, skriv } = await ctx(1440, { lokal: true });
  try {
    await c.addInitScript(id => { try { localStorage.setItem('bb_favorites_ext', JSON.stringify([id])); } catch (e) {} }, ID1);
    const { p, fejl } = await aabn(c, 'mine-annoncer.html?tab=favoritter');
    await p.waitForSelector('#fav-grid .db-row', { timeout: 8000 });
    const rk = await p.evaluate(() => [...document.querySelectorAll('#fav-grid .db-row')].map(r => ({ ext: r.dataset.external, gone: r.dataset.gone || '', tekst: r.textContent.replace(/\s+/g, ' ').trim(),
      links: [...r.querySelectorAll('a')].map(a => ({ h: a.getAttribute('href'), t: a.target, rel: a.rel })) })));
    assert.strictEqual(rk.length, 1);
    assert.strictEqual(rk[0].ext, '1'); assert.strictEqual(rk[0].gone, '');
    assert.match(rk[0].tekst, /BMW K 1200/);
    assert.match(rk[0].tekst, /Gemt i denne browser/); assert.match(rk[0].tekst, /Hos MC Syd/);
    assert.ok(rk[0].links.some(l => l.h === `annonce.html?id=${ID1}`), 'link til annoncesiden');
    const kilde = rk[0].links.find(l => /^https:\/\/mcsyd\.dk\//.test(l.h || ''));
    assert.ok(kilde && kilde.t === '_blank' && /noopener/.test(kilde.rel) && /nofollow/.test(kilde.rel), 'link til kilden, sikkert');
    assert.strictEqual(await p.evaluate(() => document.getElementById('stat-fav').textContent.trim()), '1');
    /* fjern fra fanen */
    await p.locator('#fav-grid [data-fav-toggle]').first().click(); await p.waitForTimeout(400);
    assert.strictEqual(await p.evaluate(() => Store.getExternalFavorites().length), 0);
    assert.strictEqual(await p.evaluate(() => getComputedStyle(document.getElementById('fav-empty')).display), 'block');
    assert.deepStrictEqual(skriv, []);
    assert.deepStrictEqual(fejl, []);
  } finally { await c.close(); }
});

test('en gemt indekseret annonce, der ikke længere findes i indekset, står som ærlig række med Fjern (forsvinder ikke stille)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, skriv } = await ctx(1440, { lokal: true });
  try {
    const vaek = '99999999-0000-4000-8000-000000000999';
    await c.addInitScript(id => { try {
      localStorage.setItem('bb_favorites_ext', JSON.stringify([id]));
      localStorage.setItem('bb_favorites_ext_meta', JSON.stringify({ [id]: { t: 'Honda CB 1000 R', k: 'mcsyd.dk' } }));
    } catch (e) {} }, vaek);
    const { p } = await aabn(c, 'mine-annoncer.html?tab=favoritter');
    await p.waitForSelector('#fav-grid .db-row', { timeout: 8000 });
    const tekst = await p.evaluate(() => document.querySelector('#fav-grid .db-row').textContent.replace(/\s+/g, ' ').trim());
    assert.match(tekst, /Honda CB 1000 R/);
    assert.match(tekst, /Annoncen er ikke længere i vores indeks/);
    assert.strictEqual(await p.evaluate(() => document.getElementById('stat-fav').textContent.trim()), '1', 'tælles stadig');
    assert.strictEqual(await p.evaluate(() => document.querySelector('[data-fav-count]').textContent.trim()), '1');
    await p.locator('#fav-grid .db-row .btn').click(); await p.waitForTimeout(400);
    assert.deepStrictEqual(JSON.parse(await ls(p, 'bb_favorites_ext')), []);
    assert.strictEqual(await ls(p, 'bb_favorites_ext_meta'), '{}');
    assert.deepStrictEqual(skriv, []);
  } finally { await c.close(); }
});

test('backend-broens favoritsynk ser aldrig de indekserede: Store.getFavorites() er kun egne, og "ryd data" rydder begge', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c } = await ctx(1440);
  try {
    const { p } = await aabn(c, 'soegning.html');
    const r = await p.evaluate(() => {
      const ext = EXTERNAL_LISTINGS[0].id; Store.toggleFavorite(ext, { ext: true });
      const ud = { egne: Store.getFavorites(), ekstern: Store.getExternalFavorites(), alle: Store.getAllFavorites() };
      Store.deleteAllData();
      ud.efter = [localStorage.getItem('bb_favorites_ext'), localStorage.getItem('bb_favorites_ext_meta')];
      return ud;
    });
    assert.deepStrictEqual(r.egne, []);
    assert.strictEqual(r.ekstern.length, 1); assert.deepStrictEqual(r.alle, r.ekstern);
    assert.deepStrictEqual(r.efter, [null, null]);
  } finally { await c.close(); }
});
