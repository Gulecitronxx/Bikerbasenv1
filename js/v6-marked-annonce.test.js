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
