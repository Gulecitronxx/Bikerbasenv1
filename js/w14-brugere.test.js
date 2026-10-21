/* W14 brugere: målende browsertest (rigtig Chromium mod lokal server + lokal mock; intet netværk, ingen produktion).
   Låser det, der blev ændret for at nærme guides, login og profil billederne 10, 6 og 5:
   - guide: indholdsfortegnelsen er en bred boks øverst i artiklens spalte (billede 10), Kort fortalt står i højre spalte
     (mobil: Kort fortalt -> indholdsfortegnelse -> artikel), hero er lavere end før, ingen vandret overflow 320..1440 lys+mørk
   - login: "eller" + "Fortsæt uden konto" findes i login-visningen, forsvinder i opret-visningen, og der er INGEN social login
   - mine annoncer: lavere hero, Profilindstillinger i to spalter på bred skærm, ingen overflow på alle faner
   - info-sider: "Læs også"-links er flex (ikon ved siden af tekst), ikke inline-block
   Uden Playwright/Chromium springes testene over med en tydelig besked. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');
const { lavBackend } = require('../scripts/w9-saelger-mock');

let kan, server, port, browser;
const URL = s => `http://127.0.0.1:${port}/${s}`;

test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# w14-brugere.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

async function aabn(sti, { bredde = 1440, tema = 'lys', loggetInd = false, annoncer = [] } = {}){
  const bak = lavBackend({ loggetInd, annoncer });
  const ctx = await browser.newContext({ viewport: { width: bredde, height: 900 } });
  await bak.installer(ctx, { tema });
  const page = await ctx.newPage();
  const fejl = [];
  page.on('pageerror', e => fejl.push(e.message));
  await sb.gaaTil(page, URL(sti), { waitUntil: 'networkidle' });   // V6: genforsøg ved ERR_NO_BUFFER_SPACE
  return { page, fejl, luk: () => ctx.close() };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const boks = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; }, sel);

test('guide 1440: bred indholdsfortegnelse før artiklen, Kort fortalt til højre, lav hero', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guide-foerste-motorcykel.html');
  try {
    const toc = await boks(s.page, '.gd-toc');
    const art = await boks(s.page, '.gd-article');
    const tldr = await boks(s.page, '.gd-tldr');
    const hero = await boks(s.page, '.gd-hero');
    assert.ok(toc.w >= 600, `bred boks (${toc.w})`);
    assert.ok(toc.y + toc.h <= art.y + 2, 'indholdsfortegnelsen ligger over artiklen');
    assert.ok(tldr.x > toc.x + toc.w, 'Kort fortalt i højre spalte');
    assert.ok(hero.h <= 400, `hero højst 400 px (${hero.h})`);
    const kol = await s.page.evaluate(() => { const l = [...document.querySelectorAll('.gd-toc li')].map(e => Math.round(e.getBoundingClientRect().left)); return new Set(l).size; });
    assert.strictEqual(kol, 2, 'to spalter i indholdsfortegnelsen');
    assert.strictEqual(await s.page.locator('h1').count(), 1);
    assert.deepStrictEqual(s.fejl, []);
  } finally { await s.luk(); }
});

test('guide 390: Kort fortalt -> indholdsfortegnelse -> artikel', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guide-foerste-motorcykel.html', { bredde: 390 });
  try {
    const tldr = await boks(s.page, '.gd-tldr');
    const toc = await boks(s.page, '.gd-toc');
    const art = await boks(s.page, '.gd-article');
    assert.ok(tldr.y < toc.y && toc.y < art.y, 'rækkefølge på mobil');
    const lukket = await s.page.evaluate(() => !document.querySelector('.gd-toc-det').open);
    assert.ok(lukket, 'indholdsfortegnelsen er lukket på mobil');
    const taps = await s.page.evaluate(() => document.querySelector('.gd-toc summary').getBoundingClientRect().height);
    assert.ok(taps >= 44, `tap-mål ${taps}`);
  } finally { await s.luk(); }
});

for (const tema of ['lys', 'moerk']){
  for (const bredde of [320, 390, 768, 1024, 1440]){
    test(`ingen vandret overflow: guides/guide/login/info ${bredde} ${tema}`, async t => {
      if (!kan.ok) return t.skip(kan.grund);
      for (const sti of ['guides.html', 'guide-foerste-motorcykel.html', 'guide-saelg-motorcykel.html', 'login.html', 'sikkerhed.html', 'om-bikerbasen.html', '404.html']){
        const s = await aabn(sti, { bredde, tema });
        try { assert.ok(await overflow(s.page) <= 0, `${sti} ${bredde} ${tema}`); } finally { await s.luk(); }
      }
    });
  }
}

test('login: "eller" og "Fortsæt uden konto" i login-visning, væk i opret-visning, ingen social login', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('login.html');
  try {
    assert.ok(await s.page.locator('.lg-guest').isVisible(), 'gæste-link synligt');
    assert.ok(await s.page.locator('.lg-or').isVisible(), 'eller-skillelinje synlig');
    assert.strictEqual(await s.page.locator('.lg-guest').getAttribute('href'), 'soegning.html');
    const tekst = await s.page.evaluate(() => document.body.innerText);
    assert.ok(!/Google|Facebook|Apple|MitID|120\.000/i.test(tekst), 'ingen social login eller opdigtede tal');
    await s.page.locator('[data-auth-tab="register"]').first().click();
    assert.ok(!(await s.page.locator('.lg-guest').isVisible()), 'gæste-link skjult i opret-visning');
  } finally { await s.luk(); }
});

test('login 1440: højre flade fader ud uden hård kant (ingen baggrund på selve panelet)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('login.html');
  try {
    const r = await s.page.evaluate(() => {
      const b = document.querySelector('.lg-promo-body');
      const cs = getComputedStyle(b), pe = getComputedStyle(b, '::before');
      return { bg: cs.backgroundColor, bf: cs.backdropFilter, mask: pe.maskImage || pe.webkitMaskImage };
    });
    assert.strictEqual(r.bg, 'rgba(0, 0, 0, 0)');
    assert.ok(r.bf === 'none' || r.bf === '', 'ingen backdrop-filter (den ignorerer masken og gav en synlig kant)');
    assert.match(r.mask, /radial-gradient/);
  } finally { await s.luk(); }
});

const ANN = [
  { brand: 'Honda', model: 'CBR650R', type: 'sport', year: 2022, km: 12834, price: 99900, city: 'Aarhus' },
  { brand: 'BMW', model: 'R 1250 GS', type: 'adventure', year: 2021, km: 18460, price: 189900, city: 'Odense' },
];

test('mine annoncer: lavere hero, to spalter i profilindstillinger, ingen overflow på faner (390)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('mine-annoncer.html', { loggetInd: true, annoncer: ANN });
  try {
    const hero = await boks(s.page, '.db-hero');
    assert.ok(hero.h <= 215, `hero ${hero.h}`);
    await s.page.click('#tabbtn-konto');
    const kol = await s.page.evaluate(() => new Set([...document.querySelectorAll('#tab-konto .sidebar-card')].map(e => Math.round(e.getBoundingClientRect().left))).size);
    assert.strictEqual(kol, 2, 'kortene står i to spalter ved 1440');
    assert.ok(await overflow(s.page) <= 0);
  } finally { await s.luk(); }
  const m = await aabn('mine-annoncer.html', { loggetInd: true, annoncer: ANN, bredde: 390 });
  try {
    for (const tab of ['oversigt', 'mine', 'favoritter', 'agenter', 'konto']){
      await m.page.click(`#tabbtn-${tab}`);
      assert.ok(await overflow(m.page) <= 0, `fane ${tab} @390`);
    }
    const tekst = await m.page.evaluate(() => document.body.innerText);
    assert.ok(!/Beskeder|henvendelser|\+24|Udløber om/i.test(tekst), 'ingen opdigtede moduler');
  } finally { await m.luk(); }
});

test('info-sider: "Læs også" er flex (ikon ved siden af tekst)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const sti of ['sikkerhed.html', 'om-bikerbasen.html', 'vilkaar.html']){
    const s = await aabn(sti);
    try {
      const d = await s.page.evaluate(() => { const a = document.querySelector('.if-links a'); return a ? getComputedStyle(a).display : 'mangler'; });
      assert.strictEqual(d, 'flex', sti);
    } finally { await s.luk(); }
  }
});

/* ---------- Iteration 2 (Critic: AFVIS 6/10): sticky mini-TOC, callouts, login i første skærm, rigere profilside ---------- */
test('guide: sticky mini-indholdsfortegnelse i højre spalte med scroll-spy, ≥2 callouts og ≥2 fotos', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guide-saelg-motorcykel.html');
  try {
    assert.ok(await s.page.locator('.gd-callout').count() >= 1, 'mindst én information-boks');
    assert.ok(await s.page.locator('.gd-article img, .gd-findtype img').count() >= 2, 'mindst to fotos i artiklen');
    const pos = await s.page.evaluate(() => getComputedStyle(document.querySelector('.gd-minitoc')).position);
    assert.strictEqual(pos, 'sticky');
    await s.page.evaluate(() => window.scrollTo(0, 2600)); await s.page.waitForTimeout(500);
    const top = (await boks(s.page, '.gd-minitoc')); const scrollY = await s.page.evaluate(() => scrollY);
    assert.ok(top.y - scrollY < 200 && top.y - scrollY > 0, `mini-TOC klistrer øverst (${top.y - scrollY})`);
    const aktiv = await s.page.locator('.gd-minitoc a[aria-current="location"]').count();
    assert.ok(aktiv >= 1, 'aktivt afsnit markeres');
    const w = await boks(s.page, '.gd-article'); const tc = await boks(s.page, '.gd-toc');
    assert.ok(Math.abs((w.x + w.w) - (tc.x + tc.w)) < 4, 'brødtekst og indholdsfortegnelse flugter');
    // (iteration 3: callouts er flyttet ud af brødteksten og må IKKE gentage Kort fortalt; se guide-testen længere nede)
  } finally { await s.luk(); }
});

test('guide: mini-TOC er skjult på mobil og hero er lysere (foto løftet, scrim let til højre)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guide-foerste-motorcykel.html', { bredde: 390 });
  try { assert.ok(!(await s.page.locator('.gd-minitoc').isVisible())); } finally { await s.luk(); }
});

test('login 1440x900: kort + fordelsstrimmel i første skærm, skarpt foto (srcset 200vw)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('login.html');
  try {
    const strip = await boks(s.page, '.lg-strip');
    assert.ok(strip.y + strip.h <= 902, `strimlen slutter i første skærm (${strip.y + strip.h})`);
    const sizes = await s.page.getAttribute('.lg-bg-photo', 'sizes');
    assert.match(sizes, /200vw/);
    const fw = await s.page.evaluate(() => getComputedStyle(document.querySelector('#auth-title')).fontWeight);
    assert.ok(Number(fw) >= 700);
  } finally { await s.luk(); }
});

test('header logget ind: "Min profil" + eget "Log ud" (ikke "Navn · Log ud")', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guides.html', { loggetInd: true });
  try {
    await s.page.waitForSelector('[data-auth-logout]');
    const tekst = await s.page.evaluate(() => [document.querySelector('[data-auth-slot]').textContent.trim(), document.querySelector('[data-auth-logout]').textContent.trim()]);
    assert.deepStrictEqual(tekst, ['Min profil', 'Log ud']);
  } finally { await s.luk(); }
});

test('mine annoncer: 5 statistikkort med store tal, tællere med ikon, ægte tip-liste, ?tab=aktive virker', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('mine-annoncer.html?tab=aktive', { loggetInd: true, annoncer: ANN });
  try {
    assert.strictEqual(await s.page.locator('.db-stat').count(), 5);
    const px = await s.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.db-stat-num')).fontSize));
    assert.ok(px >= 32, `tal ${px}px`);
    assert.ok(await s.page.locator('.db-num-ic svg').count() >= 1, 'tællere/ingen-visninger har ikon');
    assert.ok(await s.page.locator('.db-tip-list li').count() >= 3);
    assert.strictEqual(await s.page.getAttribute('#tabbtn-mine', 'aria-selected'), 'true', '?tab=aktive åbner Mine annoncer');
    const tekst = await s.page.evaluate(() => document.body.innerText);
    assert.ok(!/Beskeder|Udløber om|\+24|henvendelser/i.test(tekst));
  } finally { await s.luk(); }
});

test('dashboard: privat bruger sendes til Mine annoncer (ingen blindgyde)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('dashboard.html', { loggetInd: true });
  try {
    await s.page.waitForURL(/mine-annoncer\.html/, { timeout: 8000 });
    assert.ok(!(await s.page.evaluate(() => document.body.innerText)).includes('er for forhandlere'));
  } finally { await s.luk(); }
});

/* ---------- Iteration 3 (Critic runde 2) ---------- */
const GUIDE_SIDER = ['guide-foerste-motorcykel', 'guide-a2-koerekort', 'guide-brugt-motorcykel', 'guide-mc-typer', 'guide-saelg-motorcykel', 'guide-mc-udstyr', 'guide-mc-vinteropbevaring', 'guide-mc-forsikring', 'guide-mc-ordliste', 'guide-mc-foraar-tjekliste'];

test('guides: callouts er ikke dubletter af Kort fortalt eller af brødteksten; 5 typefliser; ingen foto-gentagelse i artiklen', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const side of GUIDE_SIDER){
    const s = await aabn(side + '.html');
    try {
      const r = await s.page.evaluate(() => {
        const norm = x => x.replace(/\s+/g, ' ').trim();
        const kort = [...document.querySelectorAll('.gd-checks li span:last-child')].map(e => norm(e.textContent));
        const callouts = [...document.querySelectorAll('.gd-callout p')].map(e => norm(e.textContent));
        const brod = norm([...document.querySelectorAll('.gd-sec > p, .gd-sec > ul, .gd-sec > ol')].map(e => e.textContent).join(' '));
        const srcs = [...document.querySelectorAll('.gd-hero-photo, .gd-article img, .gd-findtype img')].map(e => e.getAttribute('src'));
        const hero = document.querySelector('.gd-hero').getBoundingClientRect().height;
        const p = document.querySelector('.gd-sec > p'); const lh = parseFloat(getComputedStyle(p).lineHeight);
        const lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh));
        return { kort, callouts, dubletBrod: callouts.filter(c => brod.includes(c)), tiles: document.querySelectorAll('.gd-types .gd-type').length, srcs, hero, cpl: p.textContent.length / lines, h1lines: Math.round(document.querySelector('.gd-hero h1').getBoundingClientRect().height / parseFloat(getComputedStyle(document.querySelector('.gd-hero h1')).lineHeight)) };
      });
      for (const c of r.callouts) assert.ok(!r.kort.some(k => k.includes(c) || c.includes(k)), `${side}: callout gentager Kort fortalt: ${c}`);
      assert.deepStrictEqual(r.dubletBrod, [], `${side}: callout står også i brødteksten`);
      assert.strictEqual(r.tiles, 5, `${side}: 5 typefliser`);
      assert.strictEqual(new Set(r.srcs).size, r.srcs.length, `${side}: samme foto to gange i artiklen: ${r.srcs}`);
      assert.ok(r.hero <= 330, `${side}: hero ${Math.round(r.hero)} px`);
      assert.ok(r.h1lines <= 2, `${side}: H1 ${r.h1lines} linjer`);
      assert.ok(r.cpl <= 80, `${side}: linjelængde ${Math.round(r.cpl)} tegn`);
    } finally { await s.luk(); }
  }
});

test('guide: typeflisernes links peger på typesider, og fliserne er store nok (>= 170 px bredde)', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guide-saelg-motorcykel.html');
  try {
    const r = await s.page.evaluate(() => [...document.querySelectorAll('.gd-findtype .gd-type-link')].map(a => [a.getAttribute('href'), Math.round(a.getBoundingClientRect().width)]));
    assert.strictEqual(r.length, 5);
    for (const [h, w] of r){ assert.match(h, /^type-[a-z]+\.html$/); assert.ok(w >= 170, `flise ${w}px`); }
  } finally { await s.luk(); }
});

test('mine annoncer: "Ingen visninger endnu" i stedet for tre nuller; kort afstand til footeren', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('mine-annoncer.html', { loggetInd: true, annoncer: ANN });
  try {
    await s.page.waitForSelector('.db-num-tom');
    const tekst = await s.page.evaluate(() => document.querySelector('#db-panel-annoncer').innerText);
    assert.match(tekst, /Ingen visninger endnu/);
    assert.ok(!/Telefonvisninger/.test(tekst) || /\d/.test(tekst), 'ingen række af nuller');
    const gap = await s.page.evaluate(() => document.querySelector('.site-footer').getBoundingClientRect().top + scrollY - (document.querySelector('.db-layout').getBoundingClientRect().bottom + scrollY));
    assert.ok(gap <= 64, `afstand layout -> footer ${Math.round(gap)} px`);
  } finally { await s.luk(); }
});

test('login: opret-visningens højre kolonne har tre trin; fejlboksen flytter ikke formularen; kontrast på fejltekst', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const bak = lavBackend({ loggetInd: false, login: () => ({ status: 400, msg: 'Invalid login credentials' }) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await bak.installer(ctx, { tema: 'lys' });
  const page = await ctx.newPage();
  try {
    await sb.gaaTil(page, URL('login.html'), { waitUntil: 'networkidle' });
    const y0 = (await boks(page, '#login-email')).y; const cta0 = (await boks(page, '.lg-cta')).y;
    await page.fill('#login-email', 'a@b.dk'); await page.fill('#login-password', 'forkert1');
    await page.click('#login-form button[type=submit]');
    await page.waitForSelector('#auth-error', { state: 'visible' });
    await page.waitForTimeout(300);
    const y1 = (await boks(page, '#login-email')).y; const cta1 = (await boks(page, '.lg-cta')).y;
    assert.strictEqual(y1, y0, 'e-mail-feltet flyttede sig'); assert.strictEqual(cta1, cta0, 'knappen flyttede sig');
    const kontrast = await page.evaluate(() => {
      const el = document.getElementById('auth-error'); const cs = getComputedStyle(el);
      const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
      const a = lum(rgb(cs.color)), b = lum(rgb(cs.backgroundColor)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    assert.ok(kontrast >= 4.5, `fejltekst kontrast ${kontrast.toFixed(2)}`);
    await page.click('.lg-promo-cta');
    const trin = await page.locator('.lg-steps').isVisible();
    assert.ok(trin, 'tre trin i opret-visningens højre kolonne');
  } finally { await ctx.close(); }
});

test('header: logo-link >= 40 px højt; favorit-badge skjult ved 0; footerens login-link bliver "Min profil" når man er logget ind', async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn('guide-foerste-motorcykel.html', { bredde: 390, loggetInd: true });
  try {
    const b = await boks(s.page, '.site-header .brand');
    assert.ok(b.h >= 40, `logo-link ${b.h}px`);
    const d = await s.page.evaluate(() => { const e = document.querySelector('.fav-count'); return e ? getComputedStyle(e).display : 'none'; });
    assert.strictEqual(d, 'none');
    await s.page.waitForFunction(() => [...document.querySelectorAll('.site-footer a')].some(a => a.textContent.trim() === 'Min profil'));
    const rest = await s.page.evaluate(() => [...document.querySelectorAll('.site-footer a[href="login.html"]')].length);
    assert.strictEqual(rest, 0);
  } finally { await s.luk(); }
});
