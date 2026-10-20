/* V5: pris-skyderen i søgesidens filterpanel — håndtagene (min og max) skal stå lodret midt på sporet.
   Ejeren så de runde håndtag "for højt", halvt oven på den orange streg. Årsag: ::-webkit-slider-thumb har ingen margin-top, så håndtaget sidder i toppen af
   et 34 px højt spor (Firefox centrerer selv). Håndtagene er pseudo-elementer og kan ikke måles med getBoundingClientRect, så testen læser PIXLER:
   et skærmbillede af skyderen afkodes på et canvas; håndtagets ring (primærfarven i kolonnen midt på håndtaget) og sporets streg (kolonne midt imellem)
   skal have samme lodrette midte, højst 1 px forskel. Kun Chromium er installeret her (WebKit/Firefox er ikke kørt; Firefox centrerer selv, se css/p-soegning.css).
   Kør: node --test js/v5-skyder.test.js. V5_ROD=<mappe> måler en anden kopi af sitet (fx før-versionen). */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v5-skyder.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(process.env.V5_ROD || REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

async function aabn(w, tema, url = 'soegning.html'){
  const c = await H.browser.newContext({ viewport: { width: w, height: 1400 }, deviceScaleFactor: 2, locale: 'da-DK', colorScheme: tema, serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  await sb.installerMock(c, H.port, {}, { restSvar: sb.lagerSvar });
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'load' });
  await p.waitForFunction(() => document.documentElement.classList.contains('so-klar'), null, { timeout: 8000 }).catch(() => {});
  /* Skyderen bor i filterpanelet; på mobil er panelet en skuffe, som åbnes af "Filtre". */
  if (w < 960) { await p.click('.mobile-filter-btn').catch(() => {}); await p.waitForTimeout(500); }
  await p.evaluate(() => document.getElementById('range-price').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  return { c, p };
}

/* Afkod et PNG-skærmbillede (Buffer) i en tom side og returnér en funktion over pixler. Kører i siden for at slippe for en PNG-afkoder i Node. */
async function pixelProbe(ctx, png, spec){
  const q = await ctx.newPage();
  try {
    return await q.evaluate(async ({ b64, spec }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      const px = (x, y) => { const i = (y * cv.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
      const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      /* lodret udstrækning af pixler, der ligner `farve` (tolerance), i kolonnen x */
      const udstraekning = (x, farve, tol) => { let t = -1, b = -1; for (let y = 0; y < cv.height; y++) if (dist(px(x, y), farve) <= tol) { if (t < 0) t = y; b = y; } return t < 0 ? null : [t, b]; };
      const farve = spec.farve;
      return { thumb: udstraekning(spec.xThumb, farve, spec.tol), h: cv.height, rail2: (() => {
        /* sporet: pixler i kolonnen midt imellem, der afviger fra baggrunden */
        const bg = px(spec.xRail, 2); let t = -1, bt = -1;
        for (let y = 0; y < cv.height; y++) if (dist(px(spec.xRail, y), bg) > 24) { if (t < 0) t = y; bt = y; }
        return t < 0 ? null : [t, bt]; })() };
    }, { b64: png.toString('base64'), spec });
  } finally { await q.close(); }
}

for (const tema of ['light', 'dark']) {
  for (const w of [375, 430, 768, 1440]) {
    test(`pris-skyderen ${w} px ${tema === 'dark' ? 'mørk' : 'lys'}: håndtagene er lodret centreret på sporet (±1 px), spor og udfyldning lige høje`, { timeout: 60000 }, async t => {
      if (!H) return t.skip('Playwright mangler');
      const { c, p } = await aabn(w, tema);
      try {
        const geo = await p.evaluate(() => {
          const r = document.getElementById('range-price'); const b = r.getBoundingClientRect();
          const rail = r.querySelector('.dual-range-rail').getBoundingClientRect(), fill = r.querySelector('.dual-range-fill').getBoundingClientRect();
          const primaer = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
          const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = primaer; cv.fillRect(0, 0, 1, 1); const f = cv.getImageData(0, 0, 1, 1).data;
          const th = r.querySelector('.dr-thumb'); const ts = getComputedStyle(th, '::-webkit-slider-thumb');
          return { x: b.x, y: b.y, w: b.width, h: b.height, railH: rail.height, fillH: fill.height, railMid: rail.top + rail.height / 2 - b.y, fillMid: fill.top + fill.height / 2 - b.y,
            farve: [f[0], f[1], f[2]], thumbW: parseFloat(ts.width), thumbH: parseFloat(ts.height), thumbBox: ts.boxSizing, border: parseFloat(ts.borderTopWidth), mt: ts.marginTop };
        });
        assert.ok(Math.abs(geo.railH - geo.fillH) < 0.5, `spor ${geo.railH} og udfyldning ${geo.fillH} er lige høje`);
        assert.ok(Math.abs(geo.railMid - geo.fillMid) < 0.5, 'spor og udfyldning har samme midte');
        assert.ok(Math.abs(geo.railMid - geo.h / 2) < 0.75, `sporet står midt i skyderen (${geo.railMid} af ${geo.h})`);
        assert.ok(geo.thumbW >= 24 && geo.thumbH >= 24, `håndtagets trykflade ≥ 24 px (${geo.thumbW}x${geo.thumbH})`);
        /* pixelprobe: skyderen er 2x. Min-håndtaget ligger helt til venstre, max-håndtaget helt til højre (standardværdier). */
        /* Skjul sporets streg og udfyldning, så kun håndtaget er tegnet: så er "øverste/nederste primærfarvede pixel" præcis håndtagets ring. Sporets midte kendes fra DOM'en (testet ovenfor). */
        await p.addStyleTag({ content: '.dual-range-rail,.dual-range-fill{display:none !important}' });
        const png = await p.screenshot({ clip: { x: Math.floor(geo.x) - 6, y: Math.floor(geo.y) - 14, width: Math.ceil(geo.w) + 12, height: Math.ceil(geo.h) + 28 } });
        const off = Math.floor(geo.x) - 6;
        const xThumb = Math.round((geo.x - off + 12) * 2);   // midt på min-håndtaget (24 px bredt, helt til venstre)
        const r = await pixelProbe(c, png, { farve: geo.farve, tol: 60, xThumb, xRail: xThumb + 2 });
        if (process.env.V5_DEBUG) console.log(JSON.stringify({ r, geo, xThumb }));
        assert.ok(r.thumb, 'håndtagets ring fundet');
        const thumbMid = (r.thumb[0] + r.thumb[1] + 1) / 2 / 2, railMid = 14 + geo.railMid;   // css-px i udsnittet (14 px luft foroven)
        assert.ok(Math.abs(thumbMid - railMid) <= 1, `${w} ${tema}: håndtagets midte ${thumbMid} og sporets midte ${railMid} afviger ${(thumbMid - railMid).toFixed(2)} px`);
      } finally { await c.close(); }
    });
  }
}

test('skyderen: piletaster flytter håndtagene, labels "0 kr." og "300.000+ kr." står der, og fokus giver en synlig ring', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const { c, p } = await aabn(1440, 'light');
  try {
    const labels = await p.evaluate(() => document.querySelector('#range-price').parentElement.querySelector('.so-range-ends').textContent.replace(/\s+/g, ' ').trim());
    assert.match(labels, /0 kr\./); assert.match(labels, /300\.000\+ kr\./);
    const min = p.locator('#range-price .dr-min');
    await min.focus();
    const foer = await min.inputValue();
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
    const efter = await min.inputValue();
    assert.ok(Number(efter) > Number(foer), `ArrowRight øger min (${foer} -> ${efter})`);
    const max = p.locator('#range-price .dr-max'); await max.focus();
    const m1 = await max.inputValue(); await p.keyboard.press('ArrowLeft');
    assert.ok(Number(await max.inputValue()) < Number(m1), 'ArrowLeft mindsker max');
    /* Fokusring: håndtaget er et pseudo-element, så stilen kan ikke læses; i stedet sammenlignes to udsnit (uden og med tastaturfokus). Ringen er en skygge uden for håndtaget. */
    const clip = await p.evaluate(() => { const b = document.getElementById('range-price').getBoundingClientRect(); return { x: Math.floor(b.x) - 8, y: Math.floor(b.y) - 10, width: 60, height: Math.ceil(b.height) + 20 }; });
    await p.evaluate(() => document.activeElement.blur());
    const uden = await p.screenshot({ clip });
    await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab');   // tastaturfokus (så :focus-visible gælder) lander på et håndtag
    const fokus = await p.evaluate(() => document.activeElement.className);
    assert.match(fokus, /dr-thumb/, 'fokus på et håndtag');
    await p.evaluate(() => document.getElementById('range-price').querySelector('.dr-min').focus());
    await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
    const med = await p.screenshot({ clip });
    assert.ok(!uden.equals(med), 'fokus ændrer tegningen (synlig fokusring)');
  } finally { await c.close(); }
});
