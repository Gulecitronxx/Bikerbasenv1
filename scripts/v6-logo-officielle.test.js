/* V6 logoer: de syv OFFICIELLE logoer (Wikimedia Commons, hentet 2026-10-21) der erstatter AI-udkast: Yamaha, Suzuki, BMW, Kawasaki, KTM, Aprilia, CFMoto.
   Kør: node --test scripts/v6-logo-officielle.test.js
   Struktur-, hash-, proveniens-, metadata- og import-tests kører altid. Browser-tests (tegningen fylder viewBox, farvet rendering, flise i mørk tilstand, slot uden
   layoutskift, mærkesidens hero) kræver Playwright/Chromium og skippes ellers. Intet netværk: siden er virtuel og leveres fra en lokal server på repoets rod. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const G = require('./brand-logos-gen.js');
const V5 = require('./v5-logo-import.js');
const IMP = require('./v6-logo-import.js');
const BL = require('../js/brand-logos.js');
const VEK = require('./logo-vektoriser-alle.js');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'img', 'brands');
const manifest = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
const SLUGS = ['yamaha', 'suzuki', 'bmw', 'kawasaki', 'ktm', 'aprilia', 'cfmoto'];
const MANGLER_OFFICIEL = ['gasgas', 'zero', 'moto-guzzi'];
const post = s => manifest.maerker.find(m => m.slug === s);
const LF = buf => Buffer.from(buf).toString('utf8').split('\r\n').join('\n');
const original = s => LF(fs.readFileSync(path.join(IMP.KILDE_MAPPE, `${s}.svg`)));
const rodTag = t => /<svg\b[^>]*>/.exec(t)[0];
const rodAttrs = t => { const o = {}; for (const m of rodTag(t).matchAll(/\s([\w:.-]+)\s*=\s*"([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const rawSha = buf => crypto.createHash('sha256').update(buf).digest('hex');

/* ---------- manifest og proveniens ---------- */

test('de syv er officielle poster: godkendt, farvet, kilde-URL, licens (varemærke), hentet 2026-10-21, ejer-godkendelse, hash og normalisering', () => {
  assert.deepStrictEqual(IMP.ERSTATTER_UDKAST.slice().sort(), SLUGS.slice().sort());
  for (const s of SLUGS){
    const m = post(s);
    assert.strictEqual(m.godkendt, true, s);
    assert.strictEqual(m.autenticitet, 'officiel', s);
    assert.strictEqual(m.ensfarvet, false, `${s}: officielle filer er farvede og tegnes som billede`);
    assert.strictEqual(m.kraever_officiel_fil, false, s);
    assert.strictEqual(m.fil, `img/brands/${s}.svg`);
    assert.strictEqual(m.godkendt_af, 'ejer (bad om download i chatten 2026-10-20)', s);
    assert.strictEqual(m.godkendt_dato, '2026-10-21', s);
    assert.strictEqual(m.hentet, '2026-10-21', s);
    assert.match(m.kilde, /^https:\/\/commons\.wikimedia\.org\/wiki\/File%3A/, s);
    assert.match(m.kilde_url, /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//, s);
    assert.match(m.licens, /Public domain/, s);
    assert.match(m.licens, /varemærke/i, `${s}: licensteksten skal sige, at logoet er et varemærke`);
    assert.strictEqual(m.kilde_fil, `docs/review/gauntlet/v6/logoer/original/${s}.svg`, s);
    assert.strictEqual(m.varianter, undefined, `${s}: ingen gamle AI-varianter (emblem/ordmærke) må stå sammen med den officielle fil`);
    assert.ok(['lockup', 'ordmaerke'].includes(m.variant), s);
    assert.ok(m.normalisering && m.normalisering.length > 10, `${s}: normalisering beskrevet`);
    assert.doesNotMatch(String(m.kilde), /AI-genereret|ChatGPT/, `${s}: ingen rest af AI-proveniensen`);
    assert.doesNotMatch(String(m.licens), /Udkast ikke verificeret/, s);
    assert.strictEqual(m.monogram.length >= 1, true, `${s}: monogram bevaret som fallback`);
  }
});

test('hash = hash af filen i img/brands; kilde_hash = hash af den UÆNDREDE original i docs; validerOfficiel og tjekSvg er rene; forholdet stemmer', () => {
  for (const s of SLUGS){
    const m = post(s);
    const buf = fs.readFileSync(path.join(ROOT, m.fil));
    assert.strictEqual(G.sha256(buf), m.hash, `${s}: hash`);
    assert.strictEqual(G.sha256(fs.readFileSync(path.join(ROOT, m.kilde_fil))), m.kilde_hash, `${s}: kilde_hash`);
    assert.deepStrictEqual(G.tjekSvg(buf.toString('utf8'), G.MAX_OFFICIEL_BYTES), [], s);
    assert.deepStrictEqual(G.validerOfficiel(m, s, f => fs.readFileSync(path.join(ROOT, f))), [], s);
    const mm = G.maal(buf.toString('utf8'));
    assert.ok(mm && Math.abs(m.bredde / m.hoejde - mm.bredde / mm.hoejde) < 1e-9, `${s}: forhold`);
    assert.ok(buf.length < G.MAX_OFFICIEL_BYTES, `${s}: ${buf.length} byte`);
  }
});

test('kilder.json (orkestratorens download-log) stemmer med originalerne (rå sha256, bytes, URL, licens, dato) og med manifestet — ingen afvigelser', () => {
  const kilder = JSON.parse(fs.readFileSync(path.join(IMP.KILDE_MAPPE, 'kilder.json'), 'utf8'));
  assert.deepStrictEqual(kilder.map(k => k.slug).sort(), SLUGS.slice().sort());
  for (const k of kilder){
    const buf = fs.readFileSync(path.join(IMP.KILDE_MAPPE, k.fil));
    assert.strictEqual(rawSha(buf), k.sha256, `${k.slug}: rå sha256 (originalen er byte for byte som hentet)`);
    assert.strictEqual(buf.length, k.bytes, `${k.slug}: bytes`);
    assert.strictEqual(post(k.slug).kilde, k.kilde, k.slug);
    assert.strictEqual(post(k.slug).kilde_url, k.originalUrl, k.slug);
    assert.strictEqual(post(k.slug).licens, k.licens, k.slug);
    assert.strictEqual(post(k.slug).hentet, k.hentet, k.slug);
    assert.strictEqual(post(k.slug).bemaerkning, undefined, `${k.slug}: ingen hash-afvigelse at forklare`);
  }
});

/* ---------- kun rod-attributter er ændret ---------- */

const GEO = /\s(d|points|fill|stroke|stroke-width|stroke-miterlimit|stroke-linejoin|stroke-linecap|stroke-dasharray|stroke-dashoffset|opacity|fill-opacity|fill-rule|clip-rule|transform|style|class|x|y|cx|cy|r|rx|ry|x1|y1|x2|y2|width|height|offset|stop-color|stop-opacity|clip-path|mask|id|gradientUnits|gradientTransform|xlink:href|href)\s*=\s*"([^"]*)"/g;
function tegning(t){
  let x = t.slice(t.indexOf(rodTag(t)) + rodTag(t).length);
  x = x.replace(/<!--[\s\S]*?-->/g, '').replace(/<metadata\b[\s\S]*?<\/metadata>|<metadata\b[^>]*\/>/g, '').replace(/<sodipodi:namedview\b[\s\S]*?\/>/g, '');
  const tags = [...x.matchAll(/<([a-zA-Z][\w:-]*)/g)].map(m => m[1]).join(',');
  const attr = [...x.matchAll(GEO)].map(m => m[1] + '=' + m[2].replace(/\s+/g, ' ').trim());
  const stil = [...x.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1].replace(/\s+/g, ' ').trim());
  return { tags, attr, stil };
}

test('importen ændrer KUN rod-attributterne viewBox/width/height og fjerner metadata — tegningen (paths, farver, defs, style, geometri) er identisk med originalen', () => {
  for (const s of SLUGS){
    const o = original(s), n = LF(fs.readFileSync(path.join(DIR, `${s}.svg`)));
    const a = rodAttrs(o), b = rodAttrs(n);
    for (const k of ['viewBox', 'width', 'height', 'data-name', 'sodipodi:docname', 'inkscape:version']){ delete a[k]; delete b[k]; }
    assert.deepStrictEqual(b, a, `${s}: andre rod-attributter end viewBox/width/height er ændret`);
    const to = tegning(o), tn = tegning(n);
    assert.strictEqual(tn.tags, to.tags, `${s}: elementerne er ændret`);
    assert.deepStrictEqual(tn.attr, to.attr, `${s}: geometri/farve/stil-attributter er ændret`);
    assert.deepStrictEqual(tn.stil, to.stil, `${s}: <style> er ændret`);
    assert.ok(to.attr.some(x => /^(d|points|width)=/.test(x)), `${s}: fingeraftrykket er tomt (testen måler ikke noget)`);
  }
});

test('viewBox: kun rettet hvor den manglede (KTM) eller width/height ikke passede (BMW: 100 %, Suzuki: ingen); Yamaha, Kawasaki, Aprilia og CFMoto er uændrede i viewBox', () => {
  const vb = s => rodAttrs(fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8')).viewBox;
  const ovb = s => rodAttrs(original(s)).viewBox;
  for (const s of ['yamaha', 'suzuki', 'bmw', 'kawasaki', 'aprilia', 'cfmoto']) assert.strictEqual(vb(s), ovb(s), `${s}: viewBox skal være uændret`);
  assert.strictEqual(ovb('ktm'), undefined, 'KTM-originalen har ingen viewBox');
  assert.strictEqual(vb('ktm'), '0 0 779.528 305.652');
  assert.match(post('ktm').normalisering, /ingen viewBox/);
  for (const s of SLUGS){
    const a = rodAttrs(fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8'));
    const v = a.viewBox.split(/\s+/).map(Number);
    assert.ok(v[2] > 0 && v[3] > 0, s);
    assert.ok(/^[\d.]+$/.test(a.width) && /^[\d.]+$/.test(a.height), `${s}: numerisk width/height (ikke % eller pt): ${a.width} x ${a.height}`);
    assert.ok(Math.abs(a.width / a.height / (v[2] / v[3]) - 1) < 0.005, `${s}: width/height passer til viewBox`);
  }
  assert.deepStrictEqual([rodAttrs(original('bmw')).width, rodAttrs(original('bmw')).height], ['100%', '100%']);
  assert.deepStrictEqual([rodAttrs(fs.readFileSync(path.join(DIR, 'bmw.svg'), 'utf8')).width, rodAttrs(fs.readFileSync(path.join(DIR, 'bmw.svg'), 'utf8')).height], ['811', '173']);
});

/* ---------- persondata og redigeringsrester ---------- */

const FORBUDT = [
  [/[\w.+-]+@[\w-]+\.[a-z]{2,}/i, 'mailadresse'],
  [/[A-Za-z]:\\\\?(?:Users|Documents|Dokumenter)/i, 'lokal Windows-sti (C:\\Users ...)'],
  [/[A-Za-z]:\\[^\s"<]+/, 'Windows-sti'],
  [/\/(?:home|Users)\/[^\s"<]+/, 'lokal Unix-sti (/home/, /Users/)'],
  [/<script/i, '<script>'], [/\son[a-z]+\s*=/i, 'hændelses-attribut'], [/<foreignObject/i, 'foreignObject'], [/<image[\s>]/i, '<image>'],
  [/<!ENTITY|javascript:|@import|data:image/i, 'ENTITY/javascript:/@import/indlejret billede'],
  [/dc:(creator|publisher|contributor|rights|source|date)|cc:Agent|cc:license|<rdf:RDF|<metadata/i, 'RDF/dc:creator/Creative Commons-metadata'],
  [/sodipodi:(docname|absref|namedview)|inkscape:(export-filename|version)|data-name\s*=/i, 'editor-metadata/data-name'],
  [/<!--/, 'kommentar (kan rumme brugernavne)'],
  [/\+\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2,4}|\b(?:tlf|tel|telefon|phone|mobil|mobile)\b[^<]{0,20}\d{6,}/i, 'telefonnummer'],
];
function ekstern(t){
  const f = [];
  for (const m of t.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) if (!m[1].startsWith('#')) f.push('ekstern href ' + m[1].slice(0, 40));
  for (const m of t.matchAll(/url\(\s*["']?([^)"']*)/gi)) if (!m[1].startsWith('#')) f.push('url() udenfor filen ' + m[1].slice(0, 40));
  return f;
}
/* Eneste tilladte DOCTYPE: den standardiserede W3C-SVG-1.1 (BMW-filen); ingen intern delmængde. */
const doctypes = t => [...t.matchAll(/<!DOCTYPE[^>]*>/gi)].map(m => m[0]);

test('GUARD: de syv udgivne filer (og ALLE SVG i img/brands) indeholder ingen mailadresse, lokal filsti, telefonnummer, metadata/kommentarer, script, hændelses-attributter, ekstern href, indlejret billede eller entity', () => {
  const filer = fs.readdirSync(DIR).filter(f => f.endsWith('.svg'));
  assert.ok(filer.length >= 30, `forventede alle logofiler, fandt ${filer.length}`);
  for (const f of filer){
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    for (const [re, navn] of FORBUDT) assert.ok(!re.test(t), `${f}: indeholder ${navn}`);
    assert.deepStrictEqual(ekstern(t), [], f);
  }
  for (const s of SLUGS) assert.ok(filer.includes(`${s}.svg`), s);
});

test('GUARD: kun BMW har en DOCTYPE, og det er den standardiserede W3C SVG 1.1 uden intern delmængde; de øvrige seks har ingen', () => {
  const W3C = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
  for (const s of SLUGS){
    const d = doctypes(fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8'));
    if (s === 'bmw') assert.deepStrictEqual(d, [W3C], s);
    else assert.deepStrictEqual(d, [], s);
  }
});

test('GUARD: docs-kopierne af originalerne (docs ligger i et offentligt repo) har heller ingen mailadresse, lokal filsti, script eller ekstern reference', () => {
  for (const s of SLUGS){
    const t = fs.readFileSync(path.join(IMP.KILDE_MAPPE, `${s}.svg`), 'utf8');
    for (const [re, navn] of FORBUDT.slice(0, 9)) assert.ok(!re.test(t), `original ${s}: indeholder ${navn}`);
    assert.deepStrictEqual(ekstern(t), [], `original ${s}`);
  }
  const k = fs.readFileSync(path.join(IMP.KILDE_MAPPE, 'kilder.json'), 'utf8');
  assert.ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}|[A-Za-z]:\\\\/i.test(k), 'kilder.json: ingen mailadresse eller lokal sti');
});

test('renseren fjerner fra de udgivne filer det, den skal (Yamaha: RDF-metadata, editor-tilstand, kommentar; Suzuki: data-name og generator-kommentar; KTM: kommentar) — og intet andet', () => {
  assert.match(post('yamaha').normalisering, /metadata-blok/);
  assert.match(post('yamaha').normalisering, /sodipodi:namedview/);
  assert.match(post('yamaha').normalisering, /kommentar/);
  assert.match(post('suzuki').normalisering, /data-name-attribut/);
  assert.match(post('ktm').normalisering, /kommentar/);
  for (const s of ['bmw', 'kawasaki', 'aprilia', 'cfmoto']) assert.match(post(s).normalisering, /Ingen metadata at fjerne/, s);
  const ud = fs.readFileSync(path.join(DIR, 'yamaha.svg'), 'utf8');
  assert.doesNotMatch(ud, /metadata|rdf:RDF|namedview|docname|Created with Inkscape/);
  assert.match(ud, /<title\s+id="title7982">Yamaha Motor logo<\/title>/, 'titlen (tilgængeligt navn) er bevaret');
  const su = fs.readFileSync(path.join(DIR, 'suzuki.svg'), 'utf8');
  assert.doesNotMatch(su, /data-name|Generator: Adobe/);
});

test('importeren er reproducerbar: v6 --tjek, v5 --tjek og brand-logos-gen --tjek er grønne', () => {
  for (const [script, arg] of [['v6-logo-import.js', '--tjek'], ['v5-logo-import.js', '--tjek'], ['brand-logos-gen.js', '--tjek']]){
    const r = spawnSync(process.execPath, [path.join(__dirname, script), arg], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${script}: ${r.stderr || r.stdout}`);
  }
});

/* ---------- AI-udkast er ryddet; tre mærker mangler stadig officiel fil ---------- */

test('de erstattede AI-udkast er fjernet konsekvent: ingen emblem/ordmærke-filer, assets.json og vektoriser-batchen kender dem ikke; kun GasGas, Zero og Moto Guzzi er udkast', () => {
  const assets = JSON.parse(fs.readFileSync(path.join(DIR, 'assets.json'), 'utf8'));
  for (const s of SLUGS){
    for (const v of ['emblem', 'ordmaerke']) assert.ok(!fs.existsSync(path.join(DIR, `${s}-${v}.svg`)), `${s}-${v}.svg skulle være fjernet`);
    assert.strictEqual(assets[s], undefined, `${s} står stadig i assets.json`);
    assert.ok(VEK.ERSTATTET_AF_OFFICIEL.includes(s), `${s} mangler i vektoriser-batchens ERSTATTET_AF_OFFICIEL`);
    assert.ok(!VEK.TABEL.some(b => b.slug === s), `${s}: batchen ville overskrive den officielle fil`);
  }
  assert.strictEqual(VEK.ERSTATTET_AF_OFFICIEL.length, 17);
  assert.deepStrictEqual(VEK.TABEL.map(b => b.slug).sort(), MANGLER_OFFICIEL.slice().sort());
  assert.deepStrictEqual(Object.keys(assets).sort(), MANGLER_OFFICIEL.slice().sort());
  assert.deepStrictEqual(IMP.MANGLER_OFFICIEL.slice().sort(), MANGLER_OFFICIEL.slice().sort());
  for (const s of MANGLER_OFFICIEL){
    const m = post(s);
    assert.notStrictEqual(m.autenticitet, 'officiel', s);
    assert.strictEqual(m.ensfarvet, true, `${s}: AI-udkastet er stadig ensfarvet maske`);
    assert.match(m.kilde, /AI-genereret udkast/, s);
    assert.ok(m.varianter && m.varianter.emblem && m.varianter.ordmaerke, `${s}: udkastets varianter er bevaret`);
    assert.strictEqual(BL.logoFor(s).harLogo, true, `${s}: udkastet vises stadig (fallback monogram/ordmærke altid med)`);
  }
});

test('hver -emblem/-ordmaerke-fil i img/brands hører til et mærke med den variant i manifestet (ingen forældreløse filer)', () => {
  for (const f of fs.readdirSync(DIR)){
    const m = /^(.+)-(emblem|ordmaerke)\.svg$/.exec(f);
    if (!m) continue;
    assert.ok(post(m[1]) && post(m[1]).varianter && post(m[1]).varianter[m[2]], `${f} er ikke i manifestet`);
    assert.ok(MANGLER_OFFICIEL.includes(m[1]), `${f}: kun de tre udkast har stadig varianter`);
  }
});

test('logoFor/logoHTML: de syv er farvede <img> i fast slot uden emblem/ordmærke-felt; BMW findes også som "BMW Motorrad"; sm falder tilbage til monogram, når logoet ville blive lavere end 12 px', () => {
  for (const s of SLUGS){
    const l = BL.logoFor(s);
    assert.strictEqual(l.harLogo, true, s);
    assert.strictEqual(l.ensfarvet, false, s);
    assert.strictEqual(l.emblem, null, s);
    assert.strictEqual(l.ordmaerke, null, s);
    assert.strictEqual(l.src, `img/brands/${s}.svg`);
    const ar = post(s).bredde / post(s).hoejde;
    for (const str of ['sm', 'md', 'lg', 'xl', 'hero']){
      const h = BL.logoHTML(post(s).navn, { storrelse: str, decorative: true, statisk: true });
      const mal = BL.slotMaal(str, ar);
      if (mal.h < BL.MIN_HOEJDE){
        /* en ærlig fallback frem for et ulæseligt logo: kun sm/md (aldrig lg/xl/hero) */
        assert.ok(str === 'sm' || str === 'md', `${s} ${str}: for lavt (${mal.h.toFixed(1)} px)`);
        assert.match(h, /bl--mono/, `${s} ${str}: monogram når logoet ville blive lavere end ${BL.MIN_HOEJDE} px (${mal.h.toFixed(1)})`);
        continue;
      }
      assert.match(h, /bl--logo bl--img/, `${s} ${str}`);
      assert.doesNotMatch(h, /bl-mark|mask-image|bl-ref/, `${s} ${str}: ingen maske`);
      const w = +/width="(\d+)"/.exec(h)[1], hh = +/height="(\d+)"/.exec(h)[1];
      assert.ok(w <= BL.SLOT[str][1] && hh <= BL.SLOT[str][0], `${s} ${str}: ${w}x${hh} uden for slot`);
    }
  }
  for (const navn of ['BMW', 'BMW Motorrad', 'bmw motorrad', 'Bmw-Motorrad']) assert.strictEqual(BL.logoFor(navn).slug, 'bmw', navn);
  assert.match(BL.logoHTML('BMW', { storrelse: 'xl', decorative: false }), /alt="BMW-logo"/);
});

/* ---------- browser ---------- */

const sb = require('./smoke-browser');
let pw = null, grund = '';
test.before(async () => { const t = await sb.playwrightTilgaengelig(); pw = t.ok ? t.pw : null; grund = t.grund || ''; });

function sideHTML(tema){
  const rk = str => SLUGS.map(s => `<li>${BL.logoHTML(post(s).navn, { storrelse: str, decorative: true, statisk: true })}</li>`).join('');
  return `<!doctype html><html lang="da" data-theme="${tema}"><head><meta charset="utf-8"><link rel="stylesheet" href="css/styles.css"><link rel="stylesheet" href="css/p-brand-logo.css"><link rel="stylesheet" href="css/p-maerke.css"></head>
<body><main><ul id="lg" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;padding:24px">${rk('lg')}</ul>
<ul id="sm" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;padding:24px">${rk('sm')}</ul>
<ul id="xl" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;padding:24px">${rk('xl')}</ul>
<section class="mk-hero" style="padding:32px;background:#222"><ul id="hero" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;margin:0;padding:0">${rk('hero')}</ul></section></main>
<script src="js/brand-logos-data.js"></script><script src="js/brand-logos.js"></script></body></html>`;
}

async function medSide(tema, scheme, fn, viewport){
  const { server, port } = await sb.startServer(ROOT);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 900 }, colorScheme: scheme, serviceWorkers: 'block' });
    await ctx.route('**/__v6-logo.html', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: sideHTML(tema) }));
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/__v6-logo.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 });
    return await fn(page);
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
}

test('browser: tegningen fylder sin viewBox kant til kant (højst 2 % luft pr. side) og intet element er klippet — så normaliseringen er rigtig, og slotten bruges fuldt ud', { timeout: 120000 }, async t => {
  if (!pw) return t.skip(grund);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 1200 } })).newPage();
    await page.goto('about:blank');
    for (const s of SLUGS){
      const tekst = fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8');
      const r = await page.evaluate(t => {
        document.body.innerHTML = '<div id="x" style="position:absolute;left:0;top:0;width:1000px">' + t.replace(/<\?xml[^>]*\?>/, '').replace(/<!DOCTYPE[^>]*>/, '') + '</div>';
        const svg = document.querySelector('#x svg'); const vb = svg.viewBox.baseVal;
        const o = svg.getBoundingClientRect(); const sk = o.width / vb.width;
        let L = 1e9, T = 1e9, R = -1e9, B = -1e9, n = 0, delvis = 0;
        const tol = Math.max(vb.width, vb.height) * 0.004;
        for (const e of svg.querySelectorAll('path,polygon,rect,circle,ellipse,polyline,line')){
          if (e.closest('defs,clipPath,mask,metadata,symbol')) continue;
          const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue;
          const l = (r.left - o.left) / sk + vb.x, tp = (r.top - o.top) / sk + vb.y, rt = (r.right - o.left) / sk + vb.x, bt = (r.bottom - o.top) / sk + vb.y;
          n++; L = Math.min(L, l); T = Math.min(T, tp); R = Math.max(R, rt); B = Math.max(B, bt);
          if (l < vb.x - tol || tp < vb.y - tol || rt > vb.x + vb.width + tol || bt > vb.y + vb.height + tol) delvis++;
        }
        return { vb: [vb.x, vb.y, vb.width, vb.height], n, delvis,
          luft: [(L - vb.x) / vb.width, (T - vb.y) / vb.height, (vb.x + vb.width - R) / vb.width, (vb.y + vb.height - B) / vb.height], hojdeForhold: o.height / o.width };
      }, tekst);
      assert.ok(r.vb[2] > 0 && r.vb[3] > 0, `${s}: viewBox har størrelse ${r.vb}`);
      assert.ok(r.n >= 1, s);
      assert.strictEqual(r.delvis, 0, `${s}: ${r.delvis} elementer ligger uden for viewBox`);
      for (const l of r.luft) assert.ok(l <= 0.02 && l >= -0.004, `${s}: luft ${(l * 100).toFixed(1)} % (${r.luft.map(x => (x * 100).toFixed(1))})`);
      assert.ok(Math.abs(r.hojdeForhold / (r.vb[3] / r.vb[2]) - 1) < 0.005, `${s}: svg'ens egen billedformat passer til viewBox`);
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
  }
});

test('browser: alle syv indlæses som billede i hver størrelse, ingen falder tilbage til fallback, ingen maske, og logoerne har rigtige brandfarver', { timeout: 120000 }, async t => {
  if (!pw) return t.skip(grund);
  const r = await medSide('light', 'light', page => page.evaluate(() => {
    const ud = { ok: 0, fejl: [], bl: document.querySelectorAll('.bl--img').length, mark: document.querySelectorAll('.bl-mark').length, fb: [], maal: {} };
    for (const im of document.images){
      if (!im.classList.contains('bl-img')) continue;
      if (im.naturalWidth > 0) ud.ok++; else ud.fejl.push(im.getAttribute('src'));
      const bl = im.closest('.bl');
      if (bl.classList.contains('bl--fejl')) ud.fb.push(bl.dataset.bl);
    }
    const seen = new Set();
    for (const im of document.querySelectorAll('#xl .bl-img')){
      const slug = im.closest('.bl').dataset.bl; if (seen.has(slug)) continue; seen.add(slug);
      const c = document.createElement('canvas'); c.width = 200; c.height = Math.max(8, Math.round(200 * im.naturalHeight / im.naturalWidth));
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let dak = 0, rod = 0, bla = 0, orange = 0; const n = d.length / 4;
      for (let i = 0; i < d.length; i += 4){
        if (d[i + 3] > 200) dak++;
        if (d[i + 3] > 200 && d[i] > 190 && d[i + 1] < 60 && d[i + 2] < 70) rod++;
        if (d[i + 3] > 200 && d[i] < 40 && d[i + 1] < 90 && d[i + 2] > 110) bla++;
        if (d[i + 3] > 200 && d[i] > 220 && d[i + 1] > 90 && d[i + 1] < 150 && d[i + 2] < 60) orange++;
      }
      ud.maal[slug] = { dak: dak / n, rod: rod / n, bla: bla / n, orange: orange / n };
    }
    return ud;
  }));
  assert.strictEqual(r.fejl.length, 0, `billeder uden indhold: ${r.fejl}`);
  assert.deepStrictEqual(r.fb, []);
  assert.strictEqual(r.mark, 0, 'ingen maske-elementer for officielle logoer');
  assert.ok(r.bl >= 7 * 3, `forventede ≥ 21 farvede logoer, fandt ${r.bl}`);
  /* Aprilia: rød flade med hvid skrift; KTM: orange flade med sort skrift — en currentColor-maske ville vise en massiv klods */
  assert.ok(r.maal.aprilia.dak > 0.9 && r.maal.aprilia.rod > 0.5, `Aprilia: ${JSON.stringify(r.maal.aprilia)}`);
  assert.ok(r.maal.ktm.dak > 0.9 && r.maal.ktm.orange > 0.5, `KTM: ${JSON.stringify(r.maal.ktm)}`);
  assert.ok(r.maal.yamaha.rod > 0.05, `Yamaha er rød: ${JSON.stringify(r.maal.yamaha)}`);
  assert.ok(r.maal.suzuki.bla > 0.05, `Suzuki har blå skrift: ${JSON.stringify(r.maal.suzuki)}`);
  for (const s of SLUGS) assert.ok(r.maal[s].dak > 0.05, `${s}: tegningen er ikke tom (${JSON.stringify(r.maal[s])})`);
});

test('browser: mørk tilstand — alle syv står på samme neutrale lyse flise som de øvrige farvede logoer (kontrast ≥ 7 mod sort), flisen flytter ikke slotten; lys tilstand har ingen flise', { timeout: 120000 }, async t => {
  if (!pw) return t.skip(grund);
  const maal = (tema, scheme) => medSide(tema, scheme, page => page.evaluate(() => {
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rgb = s => (/rgba?\(([^)]+)\)/.exec(s) || [0, '0,0,0,0'])[1].split(',').map(Number);
    return [...document.querySelectorAll('.bl--img')].map(bl => {
      const cs = getComputedStyle(bl), r = bl.getBoundingClientRect();
      const sh = /(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(cs.boxShadow);
      return { slug: bl.dataset.bl, sek: bl.closest('ul').id, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
        bg: cs.backgroundColor, bgA: rgb(cs.backgroundColor)[3] === undefined ? 1 : rgb(cs.backgroundColor)[3], bgL: lum(rgb(cs.backgroundColor)), spread: sh ? Number(sh[5]) : 0 };
    });
  }));
  const lys = await maal('light', 'light');
  const moerk = await maal('dark', 'dark');
  assert.strictEqual(lys.length, moerk.length);
  assert.ok(lys.length >= 21, `${lys.length} logoer`);
  for (let i = 0; i < lys.length; i++){
    const a = lys[i], b = moerk[i];
    assert.strictEqual(b.slug, a.slug);
    assert.strictEqual(b.w, a.w, `${a.slug} ${a.sek}: bredde skifter mellem lys og mørk`);
    assert.strictEqual(b.h, a.h, `${a.slug} ${a.sek}: højde skifter mellem lys og mørk`);
    if (a.sek !== 'hero'){ assert.strictEqual(a.bgA, 0, `${a.slug} ${a.sek}: ingen flise i lys tilstand`); assert.strictEqual(a.spread, 0, `${a.slug} ${a.sek}`); }
    assert.strictEqual(b.bg, 'rgb(245, 241, 235)', `${a.slug} ${a.sek}: flisen i mørk tilstand`);
    assert.ok((b.bgL + 0.05) / 0.05 >= 7, `${a.slug}: kontrast mellem flise og sort logo`);
  }
});

test('browser: slotmål — logoet fylder sin slot uden at blive klemt eller beskåret (width/height = slotmatematikken), på 375, 768 og 1440 px, og siden har intet vandret overløb', { timeout: 180000 }, async t => {
  if (!pw) return t.skip(grund);
  for (const vp of [{ width: 375, height: 800 }, { width: 768, height: 900 }, { width: 1440, height: 900 }]){
    const r = await medSide('light', 'light', page => page.evaluate(() => {
      const ud = { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, mal: [] };
      for (const bl of document.querySelectorAll('.bl--img')){
        const im = bl.querySelector('.bl-img'); const b = bl.getBoundingClientRect(), i = im.getBoundingClientRect();
        ud.mal.push({ slug: bl.dataset.bl, sek: bl.closest('ul').id, bw: b.width, bh: b.height, iw: i.width, ih: i.height, nw: im.naturalWidth, nh: im.naturalHeight, fit: getComputedStyle(im).objectFit });
      }
      return ud;
    }), vp);
    assert.ok(r.over <= 0, `${vp.width}: vandret overløb ${r.over}`);
    for (const m of r.mal){
      assert.ok(m.iw > 0 && m.ih > 0, `${vp.width} ${m.slug} ${m.sek}: billedet har størrelse`);
      assert.ok(m.iw <= m.bw + 0.5 && m.ih <= m.bh + 0.5, `${vp.width} ${m.slug} ${m.sek}: billedet (${m.iw}x${m.ih}) er større end slotten (${m.bw}x${m.bh})`);
      assert.ok(Math.abs(m.iw / m.ih / (m.nw / m.nh) - 1) < 0.03, `${vp.width} ${m.slug} ${m.sek}: billedet er klemt (${m.iw}x${m.ih} mod naturlig ${m.nw}x${m.nh}, fit ${m.fit})`);
    }
  }
});

/* Brede ordmærker i annoncetitlen (Honda: 160 px, restpunkt 5 i V5) hører til annonce-agentens spor; V6-logoer rører hverken js/annonce.js eller css/p-annonce.css. */
test('afgrænsning: V6-logoer ændrer hverken js/annonce.js eller css/p-annonce.css (annonce-agentens spor)', () => {
  const r = spawnSync('git', ['status', '--porcelain', '--', 'js/annonce.js', 'css/p-annonce.css'], { cwd: ROOT, encoding: 'utf8' });
  assert.strictEqual((r.stdout || '').trim(), '', 'js/annonce.js/css/p-annonce.css må ikke være ændret i arbejdskopien');
});
