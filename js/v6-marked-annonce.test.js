/* V6 marked / annonceside: (P2-2) ukendte fritekst-mærker får ingen mærke-/model-links i brødkrummen, (P2-3) brede ordmærker æder ikke titlen.
   Browsertest mod lokal mock (scripts/smoke-browser.js + smoke-fixtures.js), intet netværk, springes over uden Playwright.
   Kør: node --test js/v6-marked-annonce.test.js — V6_ROD=<mappe> måler en anden kopi (fx før-versionen). */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { uuid, egneRaekker, restSvar } = require(path.join(REPO, 'scripts', 'smoke-fixtures.js'));

const FRI = uuid(950);   // "Andet mærke": Fantasi Motors
let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v6-marked-annonce.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(process.env.V6_ROD || REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }), base: `http://127.0.0.1:${port}` };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

/* fixture-lageret + én EGEN annonce med et mærke, registret ikke kender (en sælgers "Andet mærke" i opret-annonce; indekserede annoncer får "Ukendt" i backend-broen) */
function svar(sti, p){
  const tabel = String(sti).split('?')[0];
  if (tabel !== 'listings') return restSvar(sti, p);
  const rk = egneRaekker();
  rk.push({ ...rk[0], id: FRI, brand: 'Fantasi Motors', model: 'Zeta 500', year: 2020, type: 'naked' });
  return { status: 200, body: rk };
}

async function side(vp, url, fn, { tema = 'light' } = {}){
  const c = await H.browser.newContext({ viewport: { width: vp, height: vp >= 1024 ? 900 : 844 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  await sb.installerMock(c, H.port, {}, { restSvar: svar });
  const p = await c.newPage();
  const fejl = []; p.on('pageerror', e => fejl.push(e.message));
  try {
    await p.goto(`${H.base}/${url}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(450);
    const r = await fn(p);
    assert.deepStrictEqual(fejl, [], 'ingen sidefejl');
    return r;
  } finally { await c.close(); }
}

const KRUMME = () => ({
  links: [...document.querySelectorAll('#bc-nav a')].map(a => ({ t: a.textContent.trim(), h: a.getAttribute('href') })),
  plain: [...document.querySelectorAll('#bc-nav .bc-plain')].map(a => a.textContent.trim()),
  aktuel: (document.getElementById('bc-current') || {}).textContent,
  alle: (document.getElementById('similar-all') || {}).href || '',
  videre: [...document.querySelectorAll('#an-videre a')].map(a => a.getAttribute('href')),
});

for (const vp of [375, 1440]) {
  test(`P2-2 ${vp}: fritekst-mærke ("Andet mærke") står som ren tekst i brødkrummen, uden ?brands=-links, og Se alle lignende / Søg videre følger`, { timeout: 60000 }, async t => {
    if (!H) return t.skip('Playwright mangler');
    const k = await side(vp, `annonce.html?id=${FRI}`, p => p.evaluate(KRUMME));
    assert.deepStrictEqual(k.links.map(l => l.t), ['Forside', 'Motorcykler'], `links: ${JSON.stringify(k.links)}`);
    assert.ok(k.links.every(l => !/brands=/.test(l.h)), 'intet ?brands=-link');
    assert.deepStrictEqual(k.plain, ['Fantasi Motors'], 'mærket står som ren tekst');
    assert.match(k.aktuel, /Fantasi Motors/);
    assert.ok(!/brands=/.test(k.alle), `"Se alle lignende" peger ikke på ?brands=: ${k.alle}`);
    assert.ok(k.videre.every(h => !/brands=Fantasi/.test(h)), `"Søg videre": ${k.videre}`);
  });
}

test('P2-2: søgningen finder stadig annoncen på ?q= (ren tekst er ikke et tab af vejen til den)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const n = await side(1440, 'soegning.html?q=fantasi', async p => { await p.waitForTimeout(500); return p.evaluate(() => document.querySelectorAll('#results-grid > .card, #results-grid > .listing-row').length); });
  assert.strictEqual(n, 1);
});

test('P2-2: et REGISTRERET mærke har stadig sine links (mærke og model)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const k = await side(1440, `annonce.html?id=${uuid(1)}`, p => p.evaluate(KRUMME));
  assert.deepStrictEqual(k.links.map(l => l.t), ['Forside', 'Motorcykler', 'Honda', 'CB 1000 R']);
  assert.match(k.links[2].h, /^soegning\.html\?brands=Honda$/);
  assert.strictEqual(k.plain.length, 0);
});

/* ---- statisk forrendering (scripts/build-listing-pages.js): samme regel i markup og strukturerede data ---- */
const { side: statiskSide, brodkrumme } = require(path.join(REPO, 'scripts', 'build-listing-pages.js'));
const FX = { id: 'fx-9', brand: 'Fantasi Motors', model: 'Zeta 500', year: 2020, price: 49995, km: 12000, ccm: 500, city: 'Aarhus', postnr: '8000', region: 'Midtjylland', type: 'naked', condition: 'God',
  description: 'Fixture.', photoUrls: [], equipment: [], seller: { is_dealer: false } };

test('P2-2 statisk: fritekst-mærke = ren tekst i markup og to led (+ annoncen) i BreadcrumbList; registreret mærke uændret (5 led)', () => {
  const bc = brodkrumme(FX);
  assert.ok(!/brands=/.test(bc), bc);
  assert.match(bc, /<span class="bc-plain">Fantasi Motors<\/span>/);
  const ld = html => JSON.parse(/<script type="application\/ld\+json" id="jsonld-breadcrumb">\s*([^]*?)\s*<\/script>/.exec(html)[1]).itemListElement;
  const fri = ld(statiskSide(FX));
  assert.deepStrictEqual(fri.map(i => i.position), [1, 2, 3]);
  assert.ok(fri.every(i => !/brands=/.test(i.item)));
  const kendt = ld(statiskSide({ ...FX, brand: 'Yamaha', model: 'MT-07' }));
  assert.deepStrictEqual(kendt.map(i => i.position), [1, 2, 3, 4, 5]);
  assert.match(kendt[2].item, /brands=Yamaha$/);
  const bk = brodkrumme({ ...FX, brand: 'Yamaha', model: 'MT-07' });
  assert.match(bk, /<a href="soegning\.html\?brands=Yamaha">Yamaha<\/a>/);
  assert.ok(!/bc-plain/.test(bk));
});

/* ---- P2-3: brede ordmærker i titelrækken ---- */
const BrandLogos = require(path.join(REPO, 'js', 'brand-logos.js'));
/* mærker med brede (og, efter V6-logoerne, også smallere) logoer; 'bred' = forholdet > 3, som reglen i js/annonce.js */
const WIDE = [['Honda', uuid(1)], ['KTM', uuid(34)], ['Royal Enfield', uuid(35)], ['Husqvarna', uuid(38)], ['Yamaha', uuid(13)], ['BMW', uuid(25)], ['Suzuki', uuid(22)], ['Kawasaki', uuid(18)]];
const erBred = n => { const l = BrandLogos.logoFor(n); return !!(l.harLogo && l.bredde / l.hoejde > 3); };
const TITEL = () => {
  const h1 = document.getElementById('listing-h1'), raekke = document.querySelector('.an-titelraekke'), logo = document.querySelector('.an-maerkelogo .bl');
  const tn = h1.firstChild, ord = []; const t = tn.textContent; let i = 0;
  for (const w of t.split(/(\s+)/)) { if (w.trim()) { const r = document.createRange(); r.setStart(tn, i); r.setEnd(tn, i + w.length); const b = r.getClientRects()[0]; ord.push({ w, top: Math.round(b.top) }); } i += w.length; }
  const linjer = [...new Set(ord.map(o => o.top))];
  const sidste = ord.filter(o => o.top === linjer[linjer.length - 1]).map(o => o.w);
  const hb = h1.getBoundingClientRect(), lb = logo ? logo.getBoundingClientRect() : null, rb = raekke ? raekke.getBoundingClientRect() : null;
  return { tekst: t, linjer: linjer.length, sidste, h1W: hb.width, h1Top: hb.top, logoW: lb && lb.width, logoBund: lb && lb.bottom, logoTop: lb && lb.top, logoLeft: lb && lb.left, h1Right: hb.right, raekkeW: rb && rb.width, sw: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};
for (const vp of [375, 768, 1440]) {
  test(`P2-3 ${vp}: H1 ombrydes pænt (ingen enlige ord), logoet højst 120 px bredt og æder ikke titlen — Honda, KTM, Royal Enfield, Husqvarna, Yamaha, BMW, Suzuki, Kawasaki`, { timeout: 240000 }, async t => {
    if (!H) return t.skip('Playwright mangler');
    for (const [navn, id] of WIDE) {
      /* V7 QA: mål først når TILSTANDEN er nået (fonte indlæst, logoet tegnet) og to målinger i træk er ens — ikke efter et fast antal ms. */
      const m = await side(vp, `annonce.html?id=${id}`, async p => {
        await p.waitForFunction(() => document.fonts.status === 'loaded' && (document.querySelector('.an-maerkelogo .bl') || {}).getBoundingClientRect && document.querySelector('.an-maerkelogo .bl').getBoundingClientRect().width > 0, null, { timeout: 15000 }).catch(() => {});
        let sidste = null, nu = await p.evaluate(TITEL);
        for (let i = 0; i < 20 && JSON.stringify(nu) !== JSON.stringify(sidste); i++) { sidste = nu; await p.waitForTimeout(120); nu = await p.evaluate(TITEL); }
        return nu;
      });
      assert.ok(m.logoW > 0 && m.logoW <= 120.5, `${navn}: logo ${m.logoW} px bredt (loft 120)`);
      assert.ok(m.linjer === 1 || m.sidste.length >= 2, `${navn} ${vp}: "${m.sidste.join(' ')}" står alene på sidste linje af "${m.tekst}" (${m.linjer} linjer)`);
      assert.ok(m.linjer <= 3, `${navn}: ${m.linjer} linjer`);
      assert.strictEqual(m.sw, 0, 'ingen vandret overflow');
      if (vp < 1180 && erBred(navn)) {
        assert.ok(m.logoBund <= m.h1Top + 1, `${navn}: ordmærket står over titlen under 1180 px (logo bund ${m.logoBund}, h1 top ${m.h1Top})`);
        assert.ok(m.h1W >= m.raekkeW - 1, `${navn}: H1 har hele rækkens bredde (${m.h1W} af ${m.raekkeW})`);
      } else {   // 1180 +, eller et smalt logo (forhold <= 3) ved siden af titlen
        assert.ok(m.logoLeft >= m.h1Right - 1, `${navn}: logoet overlapper ikke H1`);
      }
    }
  });
}

/* ---- V6: annoncesiden tættere på Annonce.png (forskelsliste i docs/review/gauntlet/v6/marked.md) ---- */
test('V6 1440: fotopillen er kompakt ("Foto: MC Syd"), men "flere billeder i deres annonce" står for skærmlæsere og i knappens titel; ingen galleri/tæller opdigtet', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const m = await side(1440, `annonce.html?id=${uuid(1)}`, p => p.evaluate(() => {
    const cap = document.querySelector('.an-photo-ext figcaption'), mere = document.querySelector('.an-photo-mere'), link = document.querySelector('.an-photo-link');
    const r = mere.getBoundingClientRect();
    return { synlig: cap.innerText.replace(/\s+/g, ' ').trim(), capB: cap.getBoundingClientRect().width, mereB: r.width, mereH: r.height, titel: link && link.title, aria: link && link.getAttribute('aria-label'), tael: document.querySelectorAll('.an-photo-ext .gallery-counter, .an-gallery .gallery-thumbs').length };
  }));
  assert.ok(m.mereB <= 1.5 && m.mereH <= 1.5, `halen er visuelt skjult (${m.mereB}x${m.mereH})`);
  assert.ok(m.capB <= 160, `pillen er kompakt: ${m.capB} px`);
  assert.match(m.titel, /Flere billeder hos MC Syd/); assert.match(m.aria, /Flere billeder hos MC Syd/);
  assert.strictEqual(m.tael, 0);
});

test('V6 1440: "Det bør du tjekke" har fotoet i højst ca. 40 % af båndet og er højst 200 px foto-højt (var halvdelen / 220 px)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const m = await side(1440, `annonce.html?id=${uuid(25)}`, p => p.evaluate(() => {
    const b = document.querySelector('.an-tjek').getBoundingClientRect(), f = document.querySelector('.an-tjek-foto').getBoundingClientRect();
    return { andel: f.width / b.width, fh: f.height, tekstB: document.querySelector('.an-tjek-tekst').getBoundingClientRect().width };
  }));
  assert.ok(m.andel <= 0.4, `foto ${(m.andel * 100).toFixed(0)} % af båndet`);
  assert.ok(m.fh <= 200, `foto ${m.fh} px højt`);
});

test('V6: stribens kort (Lignende) har intet sted-led (kilden bliver), og kortet er lavere end før (højst 320 px ved 1440)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const vp of [375, 1440]) {
    const m = await side(vp, `annonce.html?id=${uuid(25)}`, p => p.evaluate(() => {
      const k = [...document.querySelectorAll('#similar-listings .card')];
      return { n: k.length, sted: k.filter(e => e.querySelector('.rk-sted') && getComputedStyle(e.querySelector('.rk-sted')).display !== 'none').length, kilde: k.filter(e => e.querySelector('.rk-kilde')).length,
        snit: k.reduce((s, e) => s + e.getBoundingClientRect().height, 0) / (k.length || 1), over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }));
    assert.ok(m.n >= 4, `${vp}: ${m.n} lignende`);
    assert.strictEqual(m.sted, 0, `${vp}: sted skjult i stribens kort`);
    assert.ok(m.kilde >= m.n - 1, `${vp}: kilden står stadig på kortene (${m.kilde}/${m.n})`);
    if (vp === 1440) assert.ok(m.snit <= 320, `${vp}: kort ${m.snit.toFixed(0)} px`);
    assert.strictEqual(m.over, 0);
  }
});

test('V6 375: faktatabellens rækker er højst 34 px (10 rækker; før 36,8 px, tabellen 60 px lavere)', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  const m = await side(375, `annonce.html?id=${uuid(25)}`, p => p.evaluate(() => [...document.querySelectorAll('.an-fact')].map(e => Math.round(e.getBoundingClientRect().height))));
  assert.ok(m.length >= 8);
  assert.ok(m.every(h => h <= 34), `rækkehøjder ${m}`);
});
