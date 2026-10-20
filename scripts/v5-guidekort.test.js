/* V5 guidekort: motorcyklen skal ses HEL i guidekortene og hero-bannerne.
   Målingen er geometri, ikke smag: for hvert billede beregnes, hvilket udsnit af originalbilledet object-fit/object-position viser,
   og hvor stor en del af MOTIVETS udstrækning (motorcyklens afgrænsning i billedet) der er inden for udsnittet.
   Motiver (målt ud fra billederne, andel af bredde/højde):
     studiofotos (img/type/*.webp, 4:3) og img/sell-cruiser.webp: x 0-1, y 0,13-1 (motorcyklen fylder hele bredden og står i bunden)
     heltefotos (img/hero-*.webp, 2,4:1): x 0,59-0,94, y 0,27-0,87 (motorcyklen står til højre)
   Kort: mindst 85 % af motivets bredde OG højde. Heltebannere er smalle bånd (4,8:1 på 1440): mindst 90 % af bredden og 70 % af højden.
   Desuden: kortets tekst må ikke blive en lang tom blok mellem uddrag og "Læsetid". Springes tydeligt over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('./smoke-browser');
const { lavBackend } = require('./w9-saelger-mock');

let kan, server, port, browser;
const URL = s => `http://127.0.0.1:${port}/${s}`;

test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok){ console.log(`# v5-guidekort.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(path.join(__dirname, '..')));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

const GUIDES = ['guide-foerste-motorcykel', 'guide-a2-koerekort', 'guide-brugt-motorcykel', 'guide-mc-forsikring', 'guide-mc-udstyr', 'guide-mc-typer', 'guide-mc-ordliste', 'guide-saelg-motorcykel', 'guide-mc-vinteropbevaring', 'guide-mc-foraar-tjekliste'];

/* Kører i browseren: udsnit og dækning for billederne, der matcher vaelger. */
function maalBilleder(vaelger){
  const MOTIV = src => /hero-/.test(src) ? [0.59, 0.27, 0.94, 0.87] : /sell-cruiser/.test(src) ? [0, 0.13, 1, 1] : [0, 0.06, 1, 1];
  return [...document.querySelectorAll(vaelger)].map(img => {
    const r = img.getBoundingClientRect(), nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !r.width || !r.height) return { src: img.getAttribute('src'), fejl: 'ikke indlæst eller 0 størrelse', w: r.width, h: r.height };
    const cs = getComputedStyle(img);
    const [pxs, pys] = cs.objectPosition.split(' ');
    const del = (v, tot, vis) => v.endsWith('%') ? parseFloat(v) / 100 : (tot - vis) !== 0 ? parseFloat(v) / (tot - vis) : 0.5;
    const s = Math.max(r.width / nw, r.height / nh);
    const dw = nw * s, dh = nh * s;
    const px = del(pxs, r.width, dw), py = del(pys, r.height, dh);
    const x0 = Math.max(0, -(r.width - dw) * px / dw), y0 = Math.max(0, -(r.height - dh) * py / dh);
    const x1 = Math.min(1, x0 + r.width / dw), y1 = Math.min(1, y0 + r.height / dh);
    const [mx0, my0, mx1, my1] = MOTIV(img.getAttribute('src'));
    const dk = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / (b1 - b0);
    return { src: img.getAttribute('src'), fit: cs.objectFit, bredde: +dk(x0, x1, mx0, mx1).toFixed(3), hoejde: +dk(y0, y1, my0, my1).toFixed(3), box: [Math.round(r.width), Math.round(r.height)] };
  });
}

async function side(sti, w, tema = 'lys'){
  const bak = lavBackend({});
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  await bak.installer(ctx, { tema });
  const page = await ctx.newPage();
  /* Windows kan løbe tør for socket-buffere ved mange hurtige sideindlæsninger (ERR_NO_BUFFER_SPACE, samme OS-fejl som smoke-browser dokumenterer): prøv igen. */
  for (let forsoeg = 1; ; forsoeg++){
    try { await page.goto(URL(sti), { waitUntil: 'networkidle' }); break; }
    catch (e){ if (forsoeg >= 3 || !/ERR_NO_BUFFER_SPACE|ERR_CONNECTION/.test(String(e.message))) throw e; await page.waitForTimeout(400 * forsoeg); }
  }
  await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 8000 }).catch(() => {});
  return { page, luk: () => ctx.close() };
}

test('guidekort (guides.html): hele motorcyklen vises i alle kort ved 375/430/768/1024/1440/1920, lys og mørk', { timeout: 180000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['lys', 'moerk']) for (const w of [375, 430, 768, 1024, 1440, 1920]){
    const s = await side('guides.html', w, tema);
    try {
      const m = await s.page.evaluate(maalBilleder, '.gd-card-media img');
      assert.strictEqual(m.length, 10, `${w}: 10 kortbilleder (fandt ${m.length})`);
      for (const k of m){
        assert.ok(!k.fejl, `${w} ${k.src}: ${k.fejl}`);
        assert.strictEqual(k.fit, 'cover');
        assert.ok(k.bredde >= 0.85 && k.hoejde >= 0.85, `${tema} ${w}px ${k.src}: viser ${Math.round(k.bredde * 100)} % af motivets bredde og ${Math.round(k.hoejde * 100)} % af højden (felt ${k.box})`);
      }
      const ov = await s.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(ov <= 0, `${w}: overflow ${ov}`);
    } finally { await s.luk(); }
  }
});

test('guidekort: tekstblokken er kompakt — højst 48 px luft mellem uddrag og "Læsetid" (side-kort og gitterkort, 768/1024/1440/1920)', { timeout: 120000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [768, 1024, 1440, 1920]){
    const s = await side('guides.html', w);
    try {
      const m = await s.page.evaluate(() => [...document.querySelectorAll('.gd-card')].map(k => {
        const t = k.querySelector('.gd-card-text').getBoundingClientRect(), f = k.querySelector('.gd-card-foot').getBoundingClientRect();
        return { titel: k.querySelector('.gd-card-title').textContent.trim().slice(0, 28), klasse: k.className, luft: Math.round(f.top - t.bottom) };
      }));
      for (const k of m) assert.ok(k.luft <= 48, `${w}px "${k.titel}" (${k.klasse}): ${k.luft} px luft`);
    } finally { await s.luk(); }
  }
});

test('guide-hero: motorcyklen står inden for bannerets udsnit på alle guider og oversigten (375/768/1440/1920)', { timeout: 240000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [375, 768, 1440, 1920]){
    for (const sd of ['guides', ...GUIDES]){
      const s = await side(sd + '.html', w);
      try {
        const [k] = await s.page.evaluate(maalBilleder, '.gd-hero-photo');
        assert.ok(k && !k.fejl, `${sd} ${w}: hero ikke målt (${k && k.fejl})`);
        const lille = sd === 'guides';   // oversigtens hero er en slank bjælke
        assert.ok(k.bredde >= 0.9, `${sd} ${w}px: hero viser ${Math.round(k.bredde * 100)} % af motorcyklens bredde`);
        assert.ok(k.hoejde >= (lille ? 0.5 : 0.7), `${sd} ${w}px: hero viser ${Math.round(k.hoejde * 100)} % af motorcyklens højde (felt ${k.box})`);
      } finally { await s.luk(); }
    }
  }
});

test('"Læs også"-fotokort på guidesiderne viser hele motorcyklen (375/768/1440)', { timeout: 180000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const w of [375, 768, 1440]){
    for (const sd of GUIDES){
      const s = await side(sd + '.html', w);
      try {
        const m = await s.page.evaluate(maalBilleder, '.gd-rel-media img');
        for (const k of m){
          assert.ok(!k.fejl, `${sd} ${w} ${k.src}: ${k.fejl}`);
          assert.ok(k.bredde >= 0.85 && k.hoejde >= 0.85, `${sd} ${w}px læs også ${k.src}: ${Math.round(k.bredde * 100)} % bredde, ${Math.round(k.hoejde * 100)} % højde (felt ${k.box})`);
        }
      } finally { await s.luk(); }
    }
  }
});

test('guidedata: kortbilleder har en billedforankring, der holder motiverne i udsnit (statisk)', async t => {
  const { GUIDES: G } = require('./guides-data');
  for (const g of G){
    assert.ok(g.cardImage && g.cardPos, `${g.slug}: cardImage/cardPos`);
    if (/hero-/.test(g.cardImage)){
      const x = parseFloat(g.cardPos);
      assert.ok(x >= 75, `${g.slug}: heltefoto med motivet til højre skal forankres mod højre (${g.cardPos})`);
    } else {
      assert.match(g.cardPos, /^center( 100%| bottom)?$/, `${g.slug}: studiefoto forankres i bunden (${g.cardPos})`);
    }
  }
});

test('guide-figurer i artiklen: hele motorcyklen (>= 85 % af motivets bredde og højde) og ingen opskalering ved 375/430/768/1024/1440/1920', { timeout: 300000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  let figurer = 0;
  for (const w of [375, 430, 768, 1024, 1440, 1920]){
    for (const sd of GUIDES){
      const s = await side(sd + '.html', w);
      try {
        const m = await s.page.evaluate(maalBilleder, '.gd-fig img');
        const nat = await s.page.$$eval('.gd-fig img', els => els.map(i => [i.naturalWidth, i.naturalHeight]));
        m.forEach((k, i) => { k.nat = nat[i]; });
        for (const k of m){
          figurer++;
          assert.ok(!k.fejl, `${sd} ${w} ${k.src}: ${k.fejl}`);
          assert.ok(k.bredde >= 0.85 && k.hoejde >= 0.85, `${sd} ${w}px figur ${k.src}: viser ${Math.round(k.bredde * 100)} % af motivets bredde og ${Math.round(k.hoejde * 100)} % af højden (felt ${k.box})`);
          assert.ok(k.box[0] <= k.nat[0] + 1, `${sd} ${w}px figur ${k.src}: vist ${k.box[0]} px bred, men billedet er kun ${k.nat[0]} px (opskaleret = uskarpt)`);
        }
      } finally { await s.luk(); }
    }
  }
  assert.ok(figurer >= 6 * 3, `der skal være figurer at måle (fandt ${figurer}; tre guides har en figur)`);
});
