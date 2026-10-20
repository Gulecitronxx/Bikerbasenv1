/* V5 mærker/registeret: "Andet mærke" i opret-annonce (inkl. mock-oprettelse), levende tal og hurtigsøg på maerker.html,
   "Flere mærker" er tekst (ikke knapper), mærker uden belæg er ikke offentlige, ukendt ?brands= spejles ikke i H1, nye mærker
   med belæg, slank browserkopi af registret. Browsertestene kører mod LOKAL mock (scripts/w9-saelger-mock.js) og springes over
   uden Playwright. Dokumentation: docs/review/gauntlet/v5/maerke.md */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const sb = require('../scripts/smoke-browser');
const { lavBackend, lavPng } = require('../scripts/w9-saelger-mock');
const R = require('./brands-registry.js');
const G = require('../scripts/maerke-register-gen.js');

const rod = path.join(__dirname, '..');
const laes = f => fs.readFileSync(path.join(rod, f), 'utf8');

/* ---------------- 1. Registeret: nye mærker, belæg, offentlig-flag, fritekstvalidering ---------------- */

test('V5: de mærker Critic efterlyste, og som kan belægges, er registreret med kilde; Hanway er IKKE (intet belæg fundet)', () => {
  const nye = ['Silence', 'NIU', 'Horwin', 'Segway', 'Stark Future', 'Cake', 'Lifan', 'Boss Hoss', 'Polaris Slingshot', 'Aermacchi', 'Malaguti', 'CZ'];
  for (const n of nye) {
    const p = R.find(n);
    assert.ok(p, `${n} mangler i registret`);
    assert.ok(p.verificeret, `${n} skal have selvstændigt belæg`);
    assert.ok(p.kilder.every(k => R.KILDER[k]), `${n}: ukendt kilde`);
    assert.ok(p.offentlig, `${n} må stå offentligt`);
  }
  assert.equal(R.normalise('Stark'), 'Stark Future');
  assert.equal(R.normalise('slingshot'), 'Polaris Slingshot');
  assert.equal(R.normalise('ČZ'), 'CZ');
  assert.equal(R.normalise('segway ninebot'), 'Segway');
  assert.equal(R.normalise('Hanway'), null, 'Hanway kunne ikke belægges og er derfor ikke tilføjet');
  assert.deepEqual(R.dubletter, []);
});

test('V5: Daelim, Super Soco og TM Racing er gyldige (normalisering, valg) men IKKE offentlige, før ejeren har bekræftet dem', () => {
  const ubelagte = R.alle().filter(p => !p.offentlig).map(p => p.navn).sort();
  assert.deepEqual(ubelagte, ['Daelim', 'Super Soco', 'TM Racing']);
  for (const n of ubelagte) {
    assert.ok(R.erKendt(n), `${n} er stadig et gyldigt mærke`);
    assert.ok(R.valgbare().includes(n), `${n} kan stadig vælges af en sælger`);
  }
  const opg = R.opgoer([]);
  for (const n of ubelagte) assert.ok(![...opg.udenAnnoncer.aktuelle, ...opg.udenAnnoncer.historiske].includes(n), `${n} må ikke stå på "Flere mærker"`);
  const html = laes('maerker.html');
  for (const n of ubelagte) assert.ok(!new RegExp('data-mk-navn="' + n + '"').test(html), `${n} må ikke stå på maerker.html`);
});

test('V5: validerFriMaerke — 2-40 tegn, trimmet, ingen HTML, ingen adresser, ikke "ukendt"; et registreret navn bliver registrets', () => {
  const ok = (t, navn, reg = false) => { const v = R.validerFriMaerke(t); assert.ok(v.ok, `${JSON.stringify(t)}: ${v.besked}`); assert.equal(v.navn, navn); assert.equal(v.registreret, reg); };
  const nej = (t, mønster) => { const v = R.validerFriMaerke(t); assert.equal(v.ok, false, JSON.stringify(t) + ' skulle afvises'); assert.match(v.besked, mønster); };
  ok('Hanway', 'Hanway');
  ok('  Zeta   Motors  ', 'Zeta Motors');
  ok("O'Neil", "O'Neil");
  ok('Øvre-Æ 2', 'Øvre-Æ 2');
  ok('honda', 'Honda', true);
  ok('  stark ', 'Stark Future', true);
  ok('x'.repeat(40), 'x'.repeat(40));
  nej('', /Skriv mærkets navn/);
  nej('   ', /Skriv mærkets navn/);
  nej('a', /mindst 2/);
  nej('x'.repeat(41), /højst være 40/);
  nej('<b>Hej</b>', /HTML/);
  nej('<script>', /HTML/);
  nej('Tom &amp; Jerry', /HTML/);
  nej('Foo "bar"', /bogstaver, tal/);
  nej('Foo_bar', /bogstaver, tal/);
  nej('12345', /bogstaver/);
  nej('www.motorer.dk', /adresse/);
  nej('https://x', /adresse|bogstaver/);
  nej('ukendt', /rigtige navn/);
  nej('Andet mærke', /rigtige navn/);
  assert.equal(R.FRI_MIN, 2); assert.equal(R.FRI_MAX, 40);
});

test('V5: kandidatloggen tæller sælgernes egne mærker ("Andet mærke") og opretter aldrig et mærke af dem', () => {
  const { analyser, rapport } = require('../scripts/maerke-kandidater.js');
  const a = analyser([], { egne: ['Hanway', 'Hanway', 'Hanway', 'Zeta Motors', 'Honda', 'Ukendt', ''] });
  const h = a.egneMaerker.find(v => v.navn === 'Hanway');
  assert.equal(h.antal, 3);
  assert.equal(h.tilstand, 'kandidat', 'tre sælgere har skrevet det: slå det op');
  assert.equal(a.egneMaerker.find(v => v.navn === 'Zeta Motors').tilstand, 'afventer');
  assert.ok(!a.egneMaerker.some(v => v.navn === 'Honda'), 'registrerede mærker er ikke kandidater');
  assert.match(rapport(a), /SÆLGERNES EGNE MÆRKER/);
  assert.equal(R.erKendt('Hanway'), false, 'rapporten ændrer ikke registret');
});

/* ---------------- 2. Slank browserkopi i data.js ---------------- */

test('V5: data.js bærer en SLANK kopi, der svarer det samme som den fulde fil på alle navne, aliaser og slugs', () => {
  const data = laes('js/data.js');
  assert.equal(G.indsaet(data, G.browserTekst(laes('js/brands-registry.js'))), data.replace(/\r\n/g, data.includes('\r\n') ? '\r\n' : '\n'), 'kør: node scripts/maerke-register-gen.js');
  const D = new Function(data + '\n;return BrandRegistry;')();
  const navne = new Set(['xyz', 'Andet mærke', 'ukendt', '', 'Zero Motorcycles', 'cf-moto', 'Harley', '  Honda Motor ', 'Hanway']);
  for (const p of R.alle()) { navne.add(p.navn); p.aliaser.forEach(a => navne.add(a)); navne.add(p.slug); }
  for (const n of navne) {
    for (const f of ['normalise', 'kanonisk', 'erKendt', 'erUkendt', 'visNavn', 'sammenlignNoegle', 'slug', 'logoNoegle', 'fraTekst'])
      assert.deepEqual(D[f](n), R[f](n), `${f}(${JSON.stringify(n)})`);
    const a = R.find(n), b = D.find(n);
    assert.equal(!!a, !!b, `find(${n})`);
    if (a) for (const k of ['navn', 'slug', 'periode', 'logo', 'verificeret', 'offentlig']) assert.equal(b[k], a[k], `${n}.${k}`);
  }
  assert.deepEqual(D.valgbare(), R.valgbare());
  assert.deepEqual(D.validerFriMaerke('  Zeta  X '), R.validerFriMaerke('  Zeta  X '));
  for (const k of ['KILDER', 'vurderKandidat', 'opgoer', 'sideRegel', 'status']) assert.equal(D[k], undefined, `${k} hører kun til Node-udgaven`);
  assert.deepEqual(D.dubletter, []);
});

test('V5: registrets vægt i data.js er målt og holdes nede (slank kopi < 4 KB gzip; data.js mindre end før V5)', () => {
  const data = laes('js/data.js').replace(/\r\n/g, '\n');
  const blok = data.slice(data.indexOf('/* @@BRANDREG-START'), data.indexOf('/* @@BRANDREG-END */'));
  const gz = zlib.gzipSync(blok).length;
  const fuld = zlib.gzipSync(R.MAERKER_ANTAL && fs.readFileSync(path.join(rod, 'js/brands-registry.js'), 'utf8')).length;
  assert.ok(gz < 4096, `slank kopi ${gz} B gzip`);
  assert.ok(gz < fuld * 0.7, `slank ${gz} B skal være væsentligt mindre end den fulde fil ${fuld} B`);
  assert.ok(zlib.gzipSync(data).length < 45905, 'data.js (gzip) skal være mindre end før V5 (45.905 B), selv med 12 mærker mere');
  for (const forbudt of ['wikipedia.org', 'visordown', 'GENERISKE', 'vurderKandidat']) assert.ok(!blok.includes(forbudt), `${forbudt} hører ikke i browserkopien`);
});

/* ---------------- 3. Statiske tjek af kilde og side ---------------- */

test('V5: kun REGISTREREDE mærker får mærkeside, forside-flise og "Flere mærker"-tal (et fritekst-mærke bliver aldrig et mærke af sig selv)', () => {
  const gen = laes('scripts/build-brand-pages.js');
  assert.match(gen, /LISTINGS\.filter\(l => l\.brand && BrandRegistry\.erKendt\(l\.brand\)\)/, 'mærkesider: kun registrerede mærker');
  assert.doesNotMatch(gen, /LISTINGS\.filter\(l => l\.brand && !BrandRegistry\.erUkendt\(l\.brand\)\)/);
  assert.match(gen, /udenMaerke = LISTINGS\.filter\(l => !l\.brand \|\| !BrandRegistry\.erKendt\(l\.brand\)\)/);
  assert.match(laes('js/home.js'), /!BrandRegistry\.erKendt\(b\)\) continue/, 'forsiden tæller kun registrerede mærker');
});

test('V5: "Flere mærker"-pillerne er tekst: ingen links, ingen knapper, bærer data til hurtigsøg og levende tal', () => {
  const html = laes('maerker.html');
  const piller = [...html.matchAll(/<li data-mk-soeg="([^"]*)" data-mk-pille="([^"]+)" data-mk-navn="([^"]+)">([^<]*)<\/li>/g)];
  assert.ok(piller.length >= 60, `kun ${piller.length} piller`);
  for (const [, soeg, slug, navn, tekst] of piller) {
    assert.equal(tekst, navn);
    assert.ok(soeg.split('|').includes(navn) && soeg.split('|').includes(slug), `${navn}: data-mk-soeg mangler navn/slug`);
    const p = R.find(navn); assert.ok(p, navn); assert.equal(p.slug, slug);
    for (const a of p.aliaser) assert.ok(soeg.split('|').includes(a), `${navn}: alias ${a}`);
  }
  const lister = [...html.matchAll(/<ul class="(mk-flere(?: mk-flere-hist)?)"[^>]*>([\s\S]*?)<\/ul>/g)];
  assert.equal(lister.length, 2, 'aktuelle + historiske');
  for (const [, , indhold] of lister) assert.ok(!/<a\b|<button\b/.test(indhold), 'pillerne indeholder intet link eller knap');
  assert.match(html, /<div class="mk-flere-nye" data-mk-nye hidden>/);
  assert.match(html, /js\/maerker-lager\.js/);
  assert.doesNotMatch(html, /<script[^>]*supabase/, 'oversigten henter stadig ingen Supabase-scripts ved indlæsning (kun dynamisk efter første maling)');
});

test('V5: H1 spejler ikke et ukendt ?brands= (kun registrerede mærker, uoplyst og mærker i lageret)', () => {
  const src = laes('js/search.js');
  const start = src.indexOf('function soegeoverskrift(');
  let i = src.indexOf('{', start), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  const f = new Function('BrandRegistry', src.slice(start, i + 1) + '\nreturn soegeoverskrift;')(R);
  const s = (brands, extra) => Object.assign({ brands, regions: [], kilde: '' }, extra);
  assert.equal(f(s(['xyz']), []), 'Motorcykler til salg i Danmark');
  assert.equal(f(s(['<img src=x onerror=1>']), []), 'Motorcykler til salg i Danmark');
  assert.equal(f(s(['Zero']), []), 'Zero til salg', 'registreret mærke uden lager står stadig');
  assert.equal(f(s(['xyz', 'Honda']), []), 'Honda til salg');
  assert.equal(f(s(['Ukendt']), []), 'Uoplyst mærke til salg');
  assert.equal(f(s(['Hanway']), [{ brand: 'Hanway' }]), 'Hanway til salg', 'et mærke annoncerne selv har, står');
  assert.equal(f(s(['xyz'], { regions: ['Fyn'] }), []), 'Motorcykler til salg i Fyn');
});

/* ---------------- 4. Browser: mock ---------------- */

let kan, server, port, browser;
test.before(async () => {
  kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v5-maerke.test: SKIPPER browsertestene (${kan.grund})`); return; }
  ({ server, port } = await sb.startServer(rod));
  browser = await kan.pw.chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); if (server) server.close(); });

async function aabn(opts, sti, { viewport = { width: 1280, height: 900 }, tema = 'lys', foer } = {}) {
  const bak = lavBackend(opts);
  const ctx = await browser.newContext({ viewport });
  await bak.installer(ctx, { tema });
  await ctx.addInitScript(() => {
    window.__bekraeftSvar = 'ja';
    try { localStorage.setItem('bb_cookie_consent', JSON.stringify({ level: 'necessary' })); } catch (e) { /* intet */ }
  });
  const page = await ctx.newPage();
  const fund = { side: [], konsol: [] };
  page.on('pageerror', e => fund.side.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/blockedbyclient|Failed to load resource/.test(m.text())) fund.konsol.push(m.text()); });
  if (foer) await foer(bak, ctx, page);
  await page.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'load' });
  return { bak, ctx, page, fund, t: bak.tilstand, luk: () => ctx.close() };
}

/* En rå eksterne_annoncer-række (som PostgREST svarer), nok til broens normalisering. */
const ekstern = (i, maerke, over = {}) => Object.assign({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, kilde_annonce_id: String(i), url: `https://eksempel.test/annonce/${i}`,
  titel: `${maerke} Testmodel ${i}`, maerke, model: `Testmodel ${i}`, variant: null, type: 'naked', aargang: 2015 + (i % 5), km: 10000 + i, ccm: 600, hk: 60,
  pris_dkk: 40000 + i * 111, stand: null, salgsmarkoerer: null, udledte_felter: null, by: 'Odense', postnr: '5000', saelgertype: 'forhandler',
  thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-10-01T00:00:00Z', sidst_set: '2026-10-19T00:00:00Z',
  kilde: { navn: 'Testkilde', domaene: 'eksempel.test' },
}, over);

const hurtig = async (page, q) => {
  await page.fill('#mk-hurtigsoeg-input', q);
  await page.waitForTimeout(80);
  return page.evaluate(() => ({
    status: document.querySelector('.mk-hurtigsoeg-status').textContent.trim(),
    az: [...document.querySelectorAll('#mk-az-liste li:not([hidden])')].length,
    piller: [...document.querySelectorAll('.mk-flere:not(.mk-flere-links) li:not([hidden])')].map(li => li.getAttribute('data-mk-navn')),
    pilleSynlige: [...document.querySelectorAll('.mk-flere:not(.mk-flere-links)')].filter(ul => !ul.hidden).length,
  }));
};

test('P2-5: hurtigsøgningen finder mærkerne under "Flere mærker" i stedet for at sige "Ingen mærker matcher"', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({}, 'maerker.html');
  try {
    await s.page.route('**/*.supabase.co/**', r => r.abort());   // kun det statiske
    await s.page.waitForSelector('[data-mk-hurtigsoeg]:not([hidden])');
    let r = await hurtig(s.page, 'zero');
    assert.match(r.status, /^Zero kender vi, men der er ingen annoncer lige nu\. Se under Flere mærker\.$/);
    assert.deepEqual(r.piller, ['Zero']);
    assert.equal(r.az, 0);
    r = await hurtig(s.page, 'Vespa');
    assert.match(r.status, /^Vespa kender vi, men der er ingen annoncer/);
    assert.deepEqual(r.piller, ['Vespa']);
    r = await hurtig(s.page, 'zero motorcycles');
    assert.deepEqual(r.piller, ['Zero'], 'aliasset "zero motorcycles" finder Zero');
    r = await hurtig(s.page, 'piaggio');
    assert.deepEqual(r.piller, ['Piaggio']);
    r = await hurtig(s.page, 'xyzzy');
    assert.equal(r.status, 'Ingen mærker matcher.');
    assert.equal(r.pilleSynlige, 0, 'ingen tom liste efterlades');
    r = await hurtig(s.page, 'daelim');
    assert.equal(r.status, 'Ingen mærker matcher.', 'Daelim har intet belæg og er ikke offentligt');
    r = await hurtig(s.page, 'honda');
    assert.equal(r.az, 1);
    assert.match(r.status, /^1 mærke med annoncer og 1 uden annoncer lige nu\./, 'Honda har annoncer; Montesa har aliaset "montesa honda" og er en pille');
    r = await hurtig(s.page, 'ho');
    assert.ok(r.az >= 1 && r.piller.length >= 1, 'både mærker med og uden annoncer');
    assert.match(r.status, /mærker? med annoncer og \d+ uden annoncer lige nu\. Se dem under Flere mærker\./);
    r = await hurtig(s.page, '');
    assert.equal(r.status, '');
    assert.ok(r.piller.length >= 60, 'tom søgning viser alle piller igen');
    assert.deepEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('P3: "Flere mærker"-pillerne er IKKE-interaktive: ingen ramme, ingen pegefinger, intet link, ingen hover-ændring', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  for (const tema of ['lys', 'moerk']) {
    const s = await aabn({}, 'maerker.html', { tema });
    try {
      await s.page.route('**/*.supabase.co/**', r => r.abort());
      const li = s.page.locator('.mk-flere:not(.mk-flere-links) li').first();
      await li.scrollIntoViewIfNeeded();
      const foer = await li.evaluate(el => { const c = getComputedStyle(el); return { cursor: c.cursor, border: c.borderTopWidth, bg: c.backgroundColor, radius: c.borderTopLeftRadius, farve: c.color }; });
      assert.equal(foer.cursor, 'default'); assert.equal(foer.border, '0px'); assert.equal(foer.radius, '0px');
      assert.equal(foer.bg, 'rgba(0, 0, 0, 0)');
      await li.hover();
      const efter = await li.evaluate(el => { const c = getComputedStyle(el); return { cursor: c.cursor, bg: c.backgroundColor, farve: c.color }; });
      assert.deepEqual(efter, { cursor: 'default', bg: foer.bg, farve: foer.farve }, 'ingen hover');
      assert.equal(await s.page.locator('.mk-flere:not(.mk-flere-links) li a, .mk-flere:not(.mk-flere-links) li button').count(), 0);
      assert.equal(await s.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    } finally { await s.luk(); }
  }
});

test('P2-4: maerker.html opdaterer pille/række ud fra det levende lager — Zero med en egen annonce bliver et link; tal følger lageret', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: false, annoncer: [
    { brand: 'Zero', model: 'SR/F', status: 'active' },
    { brand: 'Hanway', model: 'Raw 125', status: 'active' },     // fritekst-mærke: tælles ikke, bliver ikke et mærke
  ] }, 'maerker.html', { foer: async bak => {
    for (let i = 1; i <= 3; i++) bak.tilstand.tabeller.eksterne_annoncer.push(ekstern(i, 'Honda'));
    bak.tilstand.tabeller.eksterne_annoncer.push(ekstern(4, 'Yamaha'));
  } });
  try {
    const foer = await s.page.evaluate(() => ({
      pille: !!document.querySelector('.mk-flere li[data-mk-pille="zero"]'),
      flere: Number(document.querySelector('[data-mk-flere-n]').textContent),
      nyeSkjult: document.querySelector('[data-mk-nye]').hidden,
    }));
    assert.ok(foer.pille && foer.nyeSkjult, 'bygget: Zero er en pille uden annoncer');
    await s.page.waitForFunction(() => !document.querySelector('[data-mk-nye]').hidden, null, { timeout: 15000 });
    const efter = await s.page.evaluate(() => ({
      nye: [...document.querySelectorAll('[data-mk-nye-liste] li')].map(li => ({ navn: li.getAttribute('data-mk-navn'), tekst: li.textContent.trim(), href: li.querySelector('a').getAttribute('href') })),
      zeroPille: !!document.querySelector('.mk-flere:not(.mk-flere-links) li[data-mk-pille="zero"]'),
      flere: Number(document.querySelector('[data-mk-flere-n]').textContent),
      flereTekst: [...document.querySelectorAll('[data-mk-flere-n]')].map(e => e.textContent),
      pilleAntal: document.querySelectorAll('.mk-flere:not(.mk-flere-links) li').length,
      hondaTile: (document.querySelector('a.mk-brandtile[href="maerke-honda.html"] .mk-brandtile-n') || {}).textContent,
      hondaRaekke: (document.querySelector('#mk-az-liste a[href="maerke-honda.html"] .mk-az-n') || {}).textContent,
      yamahaRaekke: (document.querySelector('#mk-az-liste a[href="maerke-yamaha.html"] .mk-az-n') || {}).textContent,
      bmwRaekke: (document.querySelector('#mk-az-liste a[href="maerke-bmw.html"] .mk-az-n') || {}).textContent,
      alle: [...document.querySelectorAll('[data-mk-alle]')].map(e => e.textContent),
      hanwayNogetSted: /Hanway/.test(document.body.innerText),
      afbrud: !!document.getElementById('data-afbrud'),
    }));
    assert.deepEqual(efter.nye, [{ navn: 'Zero', tekst: 'Zero · 1 annonce', href: 'soegning.html?brands=Zero' }]);
    assert.equal(efter.zeroPille, false, 'pillen er flyttet ud af "uden annoncer"');
    assert.equal(efter.flere, foer.flere - 1, 'Flere mærker (N) tæller den ned');
    assert.equal(efter.pilleAntal, foer.flere - 1);
    assert.deepEqual(efter.flereTekst, [String(foer.flere - 1), String(foer.flere - 1)], 'overskrift og intro siger det samme');
    assert.equal(efter.hondaTile, '3 annoncer'); assert.equal(efter.hondaRaekke, '3');
    assert.equal(efter.yamahaRaekke, '1');
    assert.equal(efter.bmwRaekke, '0', 'et mærke med side men uden annoncer i lageret siger 0, ikke et forældet tal');
    assert.ok(efter.alle.length >= 2 && efter.alle.every(x => x === '6'), '3 Honda + 1 Yamaha + Zero + Hanway = 6 annoncer i lageret: ' + efter.alle);
    assert.equal(efter.hanwayNogetSted, false, 'et fritekst-mærke dukker ikke op som mærke på oversigten');
    assert.equal(efter.afbrud, false);
    assert.deepEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('P2-4: fejler hentningen, står det byggede uændret — og der kommer intet "Lageret kunne ikke hentes"-banner på oversigten', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ annoncer: [{ brand: 'Zero', model: 'SR/F' }] }, 'maerker.html', { foer: async bak => {
    bak.tilstand.fejl['GET eksterne_annoncer'] = { status: 500, besked: 'mock: nede', gentag: true };
  } });
  try {
    await s.page.waitForFunction(() => window.MaerkerLager && typeof backendReady === 'function', null, { timeout: 15000 });
    await s.page.waitForFunction(() => window.DATA_STATUS && window.DATA_STATUS.eksterne === 'fejlet', null, { timeout: 15000 });
    await s.page.waitForTimeout(300);
    const r = await s.page.evaluate(() => ({
      nyeSkjult: document.querySelector('[data-mk-nye]').hidden,
      zeroPille: !!document.querySelector('.mk-flere:not(.mk-flere-links) li[data-mk-pille="zero"]'),
      afbrud: !!document.getElementById('data-afbrud'), lagerFejl: document.documentElement.hasAttribute('data-lager-fejl'),
    }));
    assert.deepEqual(r, { nyeSkjult: true, zeroPille: true, afbrud: false, lagerFejl: false });
  } finally { await s.luk(); }
});

test('P2-4: maerker.html henter ingen Supabase-scripts eller data før første maling (kun dynamisk bagefter), og slet ikke ved Save-Data', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({}, 'maerker.html', { foer: async (bak, ctx, page) => {
    await page.addInitScript(() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }); });
  } });
  try {
    await s.page.waitForLoadState('networkidle');
    await s.page.waitForTimeout(800);
    assert.equal(s.t.log.length, 0, 'Save-Data: ingen backend-kald');
    assert.equal(await s.page.evaluate(() => typeof backendReady), 'undefined', 'bridge ikke indlæst ved Save-Data');
  } finally { await s.luk(); }
  const s2 = await aabn({}, 'maerker.html', { foer: async (bak, ctx, page) => {
    await page.addInitScript(() => { window.__foerLoad = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__foerLoad.push(e.name); }).observe({ type: 'resource', buffered: true }); });
  } });
  try {
    await s2.page.waitForFunction(() => window.DATA_STATUS && window.DATA_STATUS.eksterne === 'ok', null, { timeout: 15000 });
    const fund = await s2.page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const scripts = performance.getEntriesByType('resource').filter(e => /backend-bridge|supabase-api|supabase-config/.test(e.name));
      return { loadEnd: nav.loadEventEnd, scripts: scripts.map(e => ({ n: e.name.split('/').pop().split('?')[0], start: e.startTime })) };
    });
    assert.equal(fund.scripts.length, 3);
    for (const sc of fund.scripts) assert.ok(sc.start >= fund.loadEnd - 5, `${sc.n} starter ${Math.round(sc.start)} ms, load slutter ${Math.round(fund.loadEnd)} ms: må ikke ligge før load`);
  } finally { await s2.luk(); }
});

/* ---------------- "Andet mærke" i opret-annonce ---------------- */

async function udfyld(page, brandValg, frit) {
  await page.locator('label.radio-card', { has: page.locator('input[name="bike-type"][value="naked"]') }).click();
  if (brandValg) await page.selectOption('#f-brand', brandValg);
  if (frit != null) await page.fill('#f-brand-fri', frit);
  await page.fill('#f-model', 'Raw 125');
  await page.fill('#f-year', '2022');
  await page.fill('#f-km', '4200');
  await page.fill('#f-ccm', '125');
  await page.fill('#f-price', '19900');
  await page.selectOption('#f-condition', { index: 1 });
  await page.fill('#f-postnr', '8000');
  await page.waitForSelector('#postnr-list [role="option"], #postnr-list li, #postnr-list button', { timeout: 3000 }).catch(() => {});
  const valg = page.locator('#postnr-list [role="option"], #postnr-list li, #postnr-list button').first();
  if (await valg.count()) await valg.click();
  await page.fill('#f-desc', 'Velholdt lille maskine med servicehistorik, nye dæk og to nøgler. Sælges fordi jeg har købt en større.');
}
const klar = page => page.waitForSelector('body[data-op-klar]', { timeout: 10000 });

test('P2-1: "Andet mærke" står sidst i listen; valget åbner et fritekstfelt (fokus, påkrævet), og det lukker igen', { timeout: 60000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await klar(s.page);
    const valg = await s.page.$$eval('#f-brand option', o => o.map(x => [x.value, x.textContent]));
    assert.equal(valg[0][0], '');
    assert.deepEqual(valg[valg.length - 1], ['__andet', 'Andet mærke (skriv selv)']);
    assert.ok(valg.length - 2 >= R.valgbare().length, 'alle registrerede mærker kan stadig vælges');
    assert.ok(valg.some(v => v[0] === 'Silence') && valg.some(v => v[0] === 'Boss Hoss'), 'nye mærker kan vælges');
    assert.equal(await s.page.locator('#f-brand-fri').isVisible(), false, 'skjult som standard');
    /* Tastaturet giver et ÆGTE (isTrusted) change-event, som en bruger vil give; selectOption er syntetisk og flytter ikke fokus. */
    await s.page.focus('#f-brand');
    await s.page.keyboard.press('End');
    assert.equal(await s.page.inputValue('#f-brand'), '__andet');
    assert.equal(await s.page.locator('#f-brand-fri').isVisible(), true);
    assert.equal(await s.page.evaluate(() => document.activeElement.id), 'f-brand-fri', 'fokus på det nye felt');
    assert.equal(await s.page.getAttribute('#f-brand-fri', 'maxlength'), '40');
    assert.equal(await s.page.locator('#f-brand-fri').evaluate(e => e.required), true);
    assert.match(await s.page.locator('#f-brand-fri-hint').innerText(), /ikke et nyt mærke på Bikerbasen/);
    await s.page.selectOption('#f-brand', 'Honda');
    assert.equal(await s.page.locator('#f-brand-fri').isVisible(), false);
    assert.equal(await s.page.locator('#f-brand-fri').evaluate(e => e.required), false);
    assert.deepEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('P2-1: ugyldigt fritekst-mærke stoppes ved feltet (tomt, 1 tegn, HTML, adresse) og annoncen oprettes ikke', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await klar(s.page);
    const tjek = async (frit, moenster) => {
      await udfyld(s.page, '__andet', frit);
      await s.page.click('#step-next');
      await s.page.waitForSelector('#f-brand-fri-fejl', { timeout: 3000 });
      assert.match(await s.page.locator('#f-brand-fri-fejl').innerText(), moenster);
      assert.equal(await s.page.getAttribute('#f-brand-fri', 'aria-invalid'), 'true');
      assert.equal(s.t.tabeller.listings.length, 0);
    };
    await tjek('', /Skriv mærkets navn/);
    await tjek('a', /mindst 2/);
    await tjek('<b>Hanway</b>', /HTML/);
    await tjek('www.hanway.dk', /adresse/);
    await tjek('ukendt', /rigtige navn/);
    assert.deepEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

async function udgiv(page) {
  await page.waitForSelector('#op-photos', { state: 'visible' });
  await page.setInputFiles('#photo-input', [{ name: 'foto-1.png', mimeType: 'image/png', buffer: lavPng(640, 480, [150, 80, 40]) }]);
  await page.waitForFunction(() => document.querySelectorAll('#photo-grid img').length >= 1);
  await page.click('#step-next');
  await page.check('#f-terms');
  await Promise.all([page.waitForURL(/annonce\.html\?id=/, { timeout: 15000 }), page.click('#step-next')]);
}

test('P2-1 mock-oprettelse: en sælger med et mærke uden for registret ("Hanway") kan udgive; mærket gemmes som fritekst og bliver IKKE et registermærke', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await klar(s.page);
    await udfyld(s.page, '__andet', '  Hanway  ');
    await s.page.locator('#f-brand-fri').blur();
    assert.equal(await s.page.inputValue('#f-brand-fri'), 'Hanway', 'trimmet');
    await s.page.waitForSelector('#op-live-card', { timeout: 3000 });
    await s.page.waitForFunction(() => /Hanway Raw 125/.test((document.getElementById('op-live-card') || {}).innerText || ''), null, { timeout: 4000 });
    await udgiv(s.page);
    const L = s.t.tabeller.listings;
    assert.equal(L.length, 1);
    assert.equal(L[0].brand, 'Hanway', 'fritekst-mærket er gemt som annoncens mærke');
    assert.equal(L[0].model, 'Raw 125');
    assert.equal(R.erKendt('Hanway'), false, 'det er ikke blevet et registermærke');
    assert.equal(s.t.log.filter(l => l.metode === 'POST' && l.tabel === 'listings').length, 1);
    assert.deepEqual(s.fund.side, []);
  } finally { await s.luk(); }
});

test('P2-1: skriver sælgeren et registreret mærke i feltet ("honda"), vælges det på listen: ét mærke, ingen dublet-stavemåde', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ loggetInd: true }, 'opret-annonce.html');
  try {
    await klar(s.page);
    await udfyld(s.page, '__andet', 'honda');
    await s.page.locator('#f-brand-fri').blur();
    assert.equal(await s.page.inputValue('#f-brand'), 'Honda');
    assert.equal(await s.page.locator('#f-brand-fri').isVisible(), false);
    await udgiv(s.page);
    assert.equal(s.t.tabeller.listings[0].brand, 'Honda');
  } finally { await s.luk(); }
});

test('P2-1: redigering og kladde — en annonce med et fritekst-mærke kommer tilbage som "Andet mærke" + teksten; et nyt registermærke (Silence) vælges direkte', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const ID = 'bbbbbbbb-0000-4000-8000-0000000000b1';
  const s = await aabn({ loggetInd: true, annoncer: [{ id: ID, brand: 'Hanway', model: 'Raw 125' }] }, `opret-annonce.html?rediger=${ID}`);
  try {
    await klar(s.page);
    await s.page.waitForFunction(() => document.getElementById('f-model').value === 'Raw 125', null, { timeout: 8000 });
    assert.equal(await s.page.inputValue('#f-brand'), '__andet');
    assert.equal(await s.page.locator('#f-brand-fri').isVisible(), true);
    assert.equal(await s.page.inputValue('#f-brand-fri'), 'Hanway');
    assert.notEqual(await s.page.evaluate(() => document.activeElement.id), 'f-brand-fri', 'gendannelse stjæler ikke fokus');
  } finally { await s.luk(); }
  const s2 = await aabn({ loggetInd: true, annoncer: [{ id: ID, brand: 'Silence', model: 'S01' }] }, `opret-annonce.html?rediger=${ID}`);
  try {
    await klar(s2.page);
    await s2.page.waitForFunction(() => document.getElementById('f-model').value === 'S01', null, { timeout: 8000 });
    assert.equal(await s2.page.inputValue('#f-brand'), 'Silence');
    assert.equal(await s2.page.locator('#f-brand-fri').isVisible(), false);
  } finally { await s2.luk(); }
});

test('P2-1: et fritekst-mærke bliver aldrig en flise under "Populære mærker" på forsiden (kun registrerede mærker)', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({ annoncer: [
    { brand: 'Hanway', model: 'Raw 125' }, { brand: 'Hanway', model: 'Raw 150' },
    { brand: 'Yamaha', model: 'MT-07' }, { brand: 'Yamaha', model: 'MT-09' },
  ] }, 'index.html');
  try {
    await s.page.waitForFunction(() => document.querySelectorAll('#brand-cloud .maerke-flise').length > 0, null, { timeout: 15000 });
    const navne = await s.page.$$eval('#brand-cloud .maerke-flise', a => a.map(x => x.getAttribute('aria-label')));
    assert.ok(navne.some(n => /^Yamaha/.test(n)), 'Yamaha (registreret) er med: ' + navne);
    assert.ok(!navne.some(n => /Hanway/.test(n)), 'Hanway (fritekst) er ikke en flise');
    assert.ok(!/Hanway/.test(await s.page.locator('#seo-brands').innerText().catch(() => '')), 'og ikke i tekstlinkene');
  } finally { await s.luk(); }
});

test('P3-3: soegning.html?brands=xyz spejler ikke "xyz" i H1 (browser)', { timeout: 90000 }, async t => {
  if (!kan.ok) return t.skip(kan.grund);
  const s = await aabn({}, 'soegning.html?brands=xyz');
  try {
    await s.page.waitForFunction(() => { const h = document.querySelector('h1'); return h && h.textContent.trim().length > 0 && !/Indlæser/i.test(h.textContent); }, null, { timeout: 15000 });
    await s.page.waitForTimeout(400);
    const h1 = (await s.page.locator('h1').first().innerText()).trim();
    assert.ok(!/xyz/i.test(h1), 'H1: ' + h1);
    assert.match(h1, /Motorcykler til salg/);
  } finally { await s.luk(); }
  const s2 = await aabn({}, 'soegning.html?brands=Zero');
  try {
    await s2.page.waitForFunction(() => /Zero/.test((document.querySelector('h1') || {}).textContent || ''), null, { timeout: 15000 });
    assert.match((await s2.page.locator('h1').first().innerText()).trim(), /^Zero til salg/);
  } finally { await s2.luk(); }
});
