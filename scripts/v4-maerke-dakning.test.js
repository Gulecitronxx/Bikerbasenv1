/* V4 mærkedækning: låser scripts/v4-maerke-dakning.js. Hvert tjek skal KUNNE fejle (fejlindsprøjtning i en kopi af
   rodmappen), og den hurtige delmængde (fixtures, 7 mærker) skal være grøn mod den gemte baseline.
   Browserdelen springes over uden Playwright (sæt PLAYWRIGHT_PATH). Ingen netværk: Supabase besvares af fixtures. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const R = require('./v4-maerke-dakning.js');
const sb = require('./smoke-browser.js');

const REPO = path.join(__dirname, '..');
const BASELINE = path.join(REPO, 'docs', 'review', 'gauntlet', 'v4', 'qa', 'maerke-baseline-fixtures.json');
const KENDT = path.join(__dirname, 'v4-maerke-dakning.kendt.json');

/* Kopierer det, runneren læser, til en midlertidig rod, så fejl kan sprøjtes ind uden at røre repoet. */
function kopierRod(medBrowserfiler) {
  const rod = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-maerke-'));
  const kopi = rel => { const t = path.join(rod, rel); fs.mkdirSync(path.dirname(t), { recursive: true }); fs.cpSync(path.join(REPO, rel), t, { recursive: true }); };
  ['img/brands', 'js/brand-logos.js', 'js/brand-logos-data.js', 'maerker.html', 'sitemap.xml', '404.html'].forEach(kopi);
  fs.readdirSync(REPO).filter(f => /^maerke-.+\.html$/.test(f)).forEach(kopi);
  if (medBrowserfiler) {
    ['js', 'css', 'fonts', 'soegning.html', 'opret-annonce.html', 'logo-mark.png'].forEach(kopi);
    for (const f of fs.readdirSync(REPO)) if (/^(index|login|guides)\.html$/.test(f)) kopi(f);
  }
  return rod;
}
const ret = (rod, rel, fn) => { const p = path.join(rod, rel); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
const staticFund = (rod, opts) => {
  const reg = R.indlaesRegister(rod, opts && opts.manifest ? path.join(rod, 'img/brands/manifest.json') : undefined);
  const T = R.nyFundliste();
  R.statiskeTjek(rod, reg, R.opslagFraRegister(reg), T);
  return T.fund;
};
const tjekNavne = fund => new Set(fund.map(f => f.tjek));

test('statiske tjek: den nuværende build har ingen fejl i register/side/logo/oversigt/sitemap', () => {
  const fejl = staticFund(REPO).filter(f => f.niveau === 'fejl');
  assert.deepStrictEqual(fejl, [], JSON.stringify(fejl.slice(0, 5)));
});

test('statiske tjek kan fejle: dublet-slug, canonical, manglende logo, dublet i oversigt, tom indekserbar side, sitemap', () => {
  const rod = kopierRod(false);
  try {
    ret(rod, 'img/brands/manifest.json', t => {
      const m = JSON.parse(t);
      m.maerker.find(e => e.slug === 'bmw').fil = 'img/brands/findes-ikke.svg';
      m.maerker.push({ slug: 'honda', navn: 'Honda2', aliaser: ['harley'], fil: null, godkendt: false });
      return JSON.stringify(m);
    });
    ret(rod, 'maerke-honda.html', t => t.replace('href="https://bikerbasen.dk/maerke-honda"', 'href="https://bikerbasen.dk/maerke-andet"'));
    ret(rod, 'maerke-bmw.html', t => t.replace(/<meta name="robots" content="[^"]*noindex[^"]*">\s*/g, '').replace(/<span data-mk-n>[\d.]+<\/span>/, '<span data-mk-n>0</span>'));
    ret(rod, 'maerker.html', t => t.replace('<li data-mk-soeg="honda">', '<li data-mk-soeg="honda"><a href="maerke-honda.html"><span class="mk-az-navn"><span>Honda</span></span><span class="mk-az-n">1</span></a></li><li data-mk-soeg="honda">'));
    ret(rod, 'sitemap.xml', t => t.replace('</urlset>', '<url><loc>https://bikerbasen.dk/maerke-findes-ikke</loc></url></urlset>'));
    const navne = tjekNavne(staticFund(rod, { manifest: true }));
    for (const forventet of ['dublet-slug', 'logo-fil-mangler', 'side-canonical', 'tom-side-indekserbar', 'dublet-oversigt', 'sitemap-doedt', 'alias-to-maerker'])
      assert.ok(navne.has(forventet), `mangler fund "${forventet}"; fik ${[...navne].join(', ')}`);
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});

test('statiske tjek kan fejle (RIGTIGT register): dublet-alias, pille som link, skjult mærke, pille med side, forkert sum', () => {
  const rod = kopierRod(false);
  try {
    fs.cpSync(path.join(REPO, 'js', 'brands-registry.js'), path.join(rod, 'js', 'brands-registry.js'));
    assert.strictEqual(R.indlaesRegister(rod).registry ? 'registry' : 'manifest', 'registry');
    ret(rod, 'js/brands-registry.js', t => { assert.ok(t.includes("['Yamaha', 'JP', 'aktuel', [],"), 'mutationsmål'); return t.replace("['Yamaha', 'JP', 'aktuel', [],", "['Yamaha', 'JP', 'aktuel', ['honda motor'],"); });
    ret(rod, 'maerker.html', t => {
      assert.ok(t.includes('<li>AJP</li>') && t.includes('<li>Zero</li>'), 'mutationsmål (pille)');
      return t.replace('<li>AJP</li>', '<li><a href="maerke-ajp.html">AJP</a></li>').replace('<li>Zero</li>', '').replace('<li>Bajaj</li>', '<li>Bajaj</li> <li>Bajaj</li> <li>Bajaj</li>');
    });
    const fund = staticFund(rod);
    const navne = tjekNavne(fund);
    for (const forventet of ['register-dublet', 'flere-pille-er-link', 'oversigt-doedt-link', 'maerke-ikke-paa-oversigt', 'dublet-flere-pille', 'flere-tal', 'oversigt-sum'])
      assert.ok(navne.has(forventet), `mangler fund "${forventet}"; fik ${[...navne].join(', ')}`);
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});

test('rigtigt register: 93+ mærker, alle valgbare, Zero har slug zero, ingen statiske fejl', () => {
  const reg = R.indlaesRegister(REPO);
  assert.ok(reg.registry, 'js/brands-registry.js skal bruges');
  assert.ok(reg.maerker.length >= 90, String(reg.maerker.length));
  assert.deepStrictEqual(reg.maerker.filter(e => !reg.valgbare.includes(e.navn)).map(e => e.navn), []);
  assert.strictEqual(reg.maerker.find(e => e.navn === 'Zero').slug, 'zero');
});

test('baseline-sammenligning: skiftet mærke, mistet mærke, nyt mærke på Ukendt, stavning og forsvundne URL’er opdages', () => {
  const base = { annoncer: { a: 'Honda', b: 'BMW', c: 'Ukendt', d: 'Yamaha', e: 'SYM', f: 'Kawasaki' }, maerkeAntal: {}, sider: { 'maerke-honda.html': { brand: 'Honda', canonical: 'https://bikerbasen.dk/maerke-honda', noindex: false, statiskAntal: 3 } }, sitemap: [] };
  const lager = { liste: [{ id: 'a', brand: 'Suzuki' }, { id: 'b', brand: 'Ukendt' }, { id: 'c', brand: 'Ducati' }, { id: 'd', brand: 'Yamaha' }, { id: 'e', brand: 'Sym' }, { id: 'g', brand: 'KTM' }] };
  const T = R.nyFundliste();
  const stat = R.sammenlignBaseline(base, lager, { sider: [], sitemap: [] }, T, 'fixtures');
  const n = tjekNavne(T.fund);
  for (const t of ['annonce-skiftet-maerke', 'annonce-mistet-maerke', 'annonce-fik-maerke', 'annonce-maerke-stavning', 'annonce-forsvundet', 'url-forsvundet'])
    assert.ok(n.has(t), `mangler "${t}"; fik ${[...n].join(', ')}`);
  assert.deepStrictEqual({ u: stat.uaendret, s: stat.skiftet, m: stat.tilUkendt, k: stat.franUkendt, st: stat.stavning, f: stat.fjernet, ny: stat.nye }, { u: 1, s: 1, m: 1, k: 1, st: 1, f: 1, ny: 1 });
});

test('browser: den hurtige delmængde er grøn mod fixtures-baseline, dækker alle seks punkter og skriver intet til Supabase', async (t) => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const r = await R.koer({ hurtig: true, data: 'fixtures', baseline: BASELINE, kendt: KENDT, pw: kan.pw });
  const nye = r.fund.filter(f => f.niveau === 'fejl' && !f.kendt);
  assert.deepStrictEqual(nye, [], JSON.stringify(nye.slice(0, 5)));
  assert.strictEqual(r.overtraedelser, 0);
  const d = r.daekning;
  assert.ok(d.filterVaelger >= 5, 'filter: valgt via #so-brand ' + d.filterVaelger);
  assert.ok(d.filterAfkrydsning >= 5, 'filter: afkrydset ' + d.filterAfkrydsning);
  assert.ok(d.aliasSyntetisk > 100, 'alias: syntetiske søgninger ' + d.aliasSyntetisk);
  assert.ok(d.aliasFritekstUI >= 3, 'alias: søgefelt ' + d.aliasFritekstUI);
  assert.ok(d.hurtigsoegAlias >= 20, 'alias: hurtigsøgning maerker.html ' + d.hurtigsoegAlias);
  assert.ok(d.maerkesider >= 5, 'sider: ' + d.maerkesider);
  assert.ok(d.opretMaerker >= 5, 'opret-annonce: ' + d.opretMaerker);
  assert.strictEqual(d.baselineAnnoncer, r.lager.antal, 'baseline-id\'er sammenlignet');
  assert.strictEqual(r.baselineStat.uaendret, r.lager.antal);
  assert.strictEqual(r.baselineStat.skiftet + r.baselineStat.tilUkendt + r.baselineStat.fjernet, 0);
});

test('browser: et ødelagt mærkefilter (filtrering.js) opdages som filter-antal', async (t) => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const rod = kopierRod(true);
  try {
    ret(rod, 'js/filtrering.js', s => { assert.ok(s.includes('list = list.filter(l => maerker.has(mk(l.brand)));'), 'mutationsmål mangler'); return s.replace('list = list.filter(l => maerker.has(mk(l.brand)));', 'list = list.filter(l => true);'); });
    const r = await R.koer({ rod, maerker: ['Honda', 'BMW', 'Yamaha'], data: 'fixtures', pw: kan.pw });
    const fund = r.fund.filter(f => f.tjek === 'filter-antal' && f.niveau === 'fejl');
    assert.ok(fund.length >= 3, `forventede filter-antal-fejl, fik ${JSON.stringify(r.fund.map(f => f.tjek))}`);
  } finally { fs.rmSync(rod, { recursive: true, force: true }); }
});
