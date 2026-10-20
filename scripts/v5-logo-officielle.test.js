/* V5 logoer: de 21 OFFICIELLE logoer (Wikimedia Commons, hentet 2026-10-20) i img/brands/.
   Kør: node --test scripts/v5-logo-officielle.test.js
   Struktur-, hash-, proveniens- og import-tests kører altid. Browser-tests (beskæring, farvet rendering, flise i mørk tilstand, slot uden layoutskift)
   kræver Playwright/Chromium og skippes ellers. Intet netværk: siden er virtuel og leveres fra en lokal server på repoets rod. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const G = require('./brand-logos-gen.js');
const IMP = require('./v5-logo-import.js');
const V6 = require('./v6-logo-import.js');
const BL = require('../js/brand-logos.js');
const VEK = require('./logo-vektoriser-alle.js');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'img', 'brands');
const manifest = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
const SLUGS = ['ajp', 'benelli', 'bimota', 'dkw', 'ducati', 'fantic', 'gilera', 'harley-davidson', 'honda', 'husqvarna', 'indian', 'keeway', 'kymco',
  'mv-agusta', 'piaggio', 'rieju', 'royal-enfield', 'sherco', 'sym', 'triumph', 'vespa'];
/* AI-udkast, der blev erstattet af en officiel fil (honda ... piaggio) — 'tvivlsom'/'ubrugelig' i assets.json før V5 */
const ERSTATTET = ['honda', 'harley-davidson', 'indian', 'benelli', 'triumph', 'royal-enfield', 'ducati', 'mv-agusta', 'husqvarna', 'piaggio'];
const ERSTATTET_V5V6 = ERSTATTET.concat(V6.ERSTATTER_UDKAST);   // V6: yamaha, suzuki, bmw, kawasaki, ktm, aprilia, cfmoto
const post = s => manifest.maerker.find(m => m.slug === s);
const LF = buf => Buffer.from(buf).toString('utf8').split('\r\n').join('\n');
const original = s => LF(fs.readFileSync(path.join(IMP.KILDE_MAPPE, `${s}.svg`)));
const rodTag = t => /<svg\b[^>]*>/.exec(t)[0];
const rodAttrs = t => { const o = {}; for (const m of rodTag(t).matchAll(/\s([\w:.-]+)\s*=\s*"([^"]*)"/g)) o[m[1]] = m[2]; return o; };

/* ---------- manifest og proveniens ---------- */

test('manifestet har præcis de 21 officielle poster: godkendt, officiel, farvet, med kilde, licens, hentedato, ejer-godkendelse og hash', () => {
  const officielle = manifest.maerker.filter(m => m.autenticitet === 'officiel').map(m => m.slug).sort();
  /* V6 har tilføjet syv flere officielle poster (scripts/v6-logo-import.js, testet i v6-logo-officielle.test.js); her kontrolleres de 21 fra V5 + at intet andet er officielt */
  assert.deepStrictEqual(officielle, SLUGS.concat(V6.ERSTATTER_UDKAST).sort());
  for (const s of SLUGS){
    const m = post(s);
    assert.strictEqual(m.godkendt, true, s);
    assert.strictEqual(m.ensfarvet, false, `${s}: officielle filer er farvede og tegnes som billede`);
    assert.strictEqual(m.kraever_officiel_fil, false, s);
    assert.strictEqual(m.fil, `img/brands/${s}.svg`);
    assert.strictEqual(m.godkendt_af, 'ejer (bad om download i chatten 2026-10-20)', s);
    assert.strictEqual(m.godkendt_dato, '2026-10-20', s);
    assert.strictEqual(m.hentet, '2026-10-20', s);
    assert.match(m.kilde, /^https:\/\/commons\.wikimedia\.org\/wiki\/File%3A/, s);
    assert.match(m.kilde_url, /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//, s);
    assert.match(m.licens, /Public domain/, s);
    assert.match(m.licens, /varemærke/i, `${s}: licensteksten skal sige, at logoet er et varemærke`);
    assert.strictEqual(m.varianter, undefined, `${s}: ingen gamle AI-varianter må stå sammen med den officielle fil`);
    assert.ok(['lockup', 'emblem', 'ordmaerke'].includes(m.variant), s);
    assert.ok(m.normalisering && m.normalisering.length > 10, `${s}: normalisering beskrevet`);
  }
});

test('hash i manifestet = hash af filen i img/brands; kilde_hash = hash af den UÆNDREDE original i docs; filen findes og er et gyldigt SVG-input', () => {
  for (const s of SLUGS){
    const m = post(s);
    const buf = fs.readFileSync(path.join(ROOT, m.fil));
    assert.strictEqual(G.sha256(buf), m.hash, `${s}: hash`);
    assert.strictEqual(G.sha256(fs.readFileSync(path.join(ROOT, m.kilde_fil))), m.kilde_hash, `${s}: kilde_hash`);
    assert.deepStrictEqual(G.tjekSvg(buf.toString('utf8'), G.MAX_OFFICIEL_BYTES), [], s);
    assert.deepStrictEqual(G.validerOfficiel(m, s, f => fs.readFileSync(path.join(ROOT, f))), [], s);
    const mm = G.maal(buf.toString('utf8'));
    assert.ok(mm && Math.abs(m.bredde / m.hoejde - mm.bredde / mm.hoejde) < 1e-9, `${s}: forhold`);
  }
});

test('kilder.json (orkestratorens download-log) stemmer med originalerne — undtagen SYM, som er dokumenteret', () => {
  const kilder = JSON.parse(fs.readFileSync(path.join(IMP.KILDE_MAPPE, 'kilder.json'), 'utf8'));
  let afvigelser = [];
  for (const k of kilder.filter(x => SLUGS.includes(x.slug))){
    if (require('crypto').createHash('sha256').update(fs.readFileSync(path.join(IMP.KILDE_MAPPE, k.fil))).digest('hex') !== k.sha256) afvigelser.push(k.slug);   // råt (flere originaler har CRLF)
    assert.strictEqual(post(k.slug).kilde, k.kilde, k.slug);
    assert.strictEqual(post(k.slug).kilde_url, k.originalUrl, k.slug);
  }
  assert.deepStrictEqual(afvigelser, ['sym'], 'kun SYM afviger fra kilder.json (anden fil end logget) — skal stå i bemærkningen');
  assert.match(post('sym').bemaerkning, /3912 bytes/);
});

/* ---------- kun rod-attributter er ændret ---------- */

/* Tegningens "fingeraftryk": alle geometri-/farve-/stil-attributter på ikke-rod-elementer (uden metadata) + <style>-indhold + rækkefølgen af tegne-elementer. */
const GEO = /\s(d|points|fill|stroke|stroke-width|stroke-miterlimit|stroke-linejoin|stroke-linecap|stroke-dasharray|stroke-dashoffset|opacity|fill-opacity|fill-rule|clip-rule|transform|style|class|x|y|cx|cy|r|rx|ry|x1|y1|x2|y2|width|height|offset|stop-color|stop-opacity|clip-path|mask|id|gradientUnits|gradientTransform|xlink:href|href)\s*=\s*"([^"]*)"/g;
function tegning(t){
  /* uafhængig af importerens renser: skær prolog, rod-tag, kommentarer, metadata og editor-tilstand væk med egne mønstre */
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

/* ---------- persondata og redigeringsrester ---------- */

const FORBUDT = [
  [/[\w.+-]+@[\w-]+\.[a-z]{2,}/i, 'mailadresse'],
  [/[A-Za-z]:\\\\?(?:Users|Documents|Dokumenter)/i, 'lokal Windows-sti (C:\\Users ...)'],
  [/[A-Za-z]:\\[^\s"<]+/, 'Windows-sti'],
  [/\/(?:home|Users)\/[^\s"<]+/, 'lokal Unix-sti (/home/, /Users/)'],
  [/<script/i, '<script>'], [/\son[a-z]+\s*=/i, 'hændelses-attribut'], [/<foreignObject/i, 'foreignObject'], [/<image[\s>]/i, '<image>'],
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

test('INGEN SVG i img/brands (alle filer, også AI-udkast) indeholder mailadresse, lokal filsti, telefonnummer, metadata/kommentarer, script, hændelses-attributter eller ekstern href', () => {
  const filer = fs.readdirSync(DIR).filter(f => f.endsWith('.svg'));
  assert.ok(filer.length >= 35, `forventede alle logofiler, fandt ${filer.length}`);
  for (const f of filer){
    const t = fs.readFileSync(path.join(DIR, f), 'utf8');
    for (const [re, navn] of FORBUDT) assert.ok(!re.test(t), `${f}: indeholder ${navn}`);
    assert.deepStrictEqual(ekstern(t), [], f);
  }
});

test('docs-kopierne af originalerne (docs ligger i et offentligt repo) har heller ingen mailadresse eller lokal filsti; SYM-adressen er erstattet med [fjernet]', () => {
  for (const s of SLUGS){
    const t = fs.readFileSync(path.join(IMP.KILDE_MAPPE, `${s}.svg`), 'utf8');
    for (const [re, navn] of FORBUDT.slice(0, 4)) assert.ok(!re.test(t), `original ${s}: indeholder ${navn}`);
  }
  assert.match(fs.readFileSync(path.join(IMP.KILDE_MAPPE, 'sym.svg'), 'utf8'), /data-name="\[fjernet\]"/);
  assert.match(post('sym').normalisering, /data-name-attribut/);
  assert.match(post('sym').bemaerkning, /UTF-16/);
  assert.match(post('sym').bemaerkning, /\[fjernet\]/);
  // renseren er deterministisk og fjerner det, den skal: mail, kommentar, metadata, editor-tilstand — men intet andet
  const test1 = IMP.renMetadata('<?xml version="1.0"?>\n<!-- Creator: X by Y -->\n<svg viewBox="0 0 1 1" data-name="a@b.dk" sodipodi:docname="C:\\Users\\x\\f.svg">\n<metadata id="m"><rdf:RDF><dc:creator>Z</dc:creator></rdf:RDF></metadata>\n<sodipodi:namedview id="n" />\n<metadata id="c"/>\n<path d="M0 0L1 1" fill="#fff"/></svg>');
  assert.doesNotMatch(test1.tekst, /@|Creator|metadata|namedview|docname|data-name|Users/);
  assert.match(test1.tekst, /<path d="M0 0L1 1" fill="#fff"\/>/);
  assert.match(test1.tekst, /<svg viewBox="0 0 1 1">/);
});

test('importeren er reproducerbar: --tjek er grøn, og brand-logos-gen --tjek er grøn', () => {
  let r = spawnSync(process.execPath, [path.join(__dirname, 'v5-logo-import.js'), '--tjek'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  r = spawnSync(process.execPath, [path.join(__dirname, 'brand-logos-gen.js'), '--tjek'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr || r.stdout);
});

test('viewBox normaliseret hvor den manglede/var forkert: DKW og Rieju har viewBox, SYM har et rimeligt width/height, Benelli viser hele skriften', () => {
  for (const s of ['dkw', 'rieju', 'sym', 'vespa', 'honda', 'triumph', 'kymco', 'ajp', 'benelli']){
    const a = rodAttrs(fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8'));
    assert.ok(a.viewBox, `${s}: viewBox`);
    const vb = a.viewBox.split(/\s+/).map(Number);
    assert.ok(vb[2] > 0 && vb[3] > 0, s);
    assert.ok(/^[\d.]+$/.test(a.width) && /^[\d.]+$/.test(a.height), `${s}: numerisk width/height (ikke % eller pt)`);
    assert.ok(Math.abs(a.width / a.height / (vb[2] / vb[3]) - 1) < 0.005, `${s}: width/height passer til viewBox`);
    assert.ok(a.width <= 2000, `${s}: width`);
  }
  assert.ok(!/viewBox="220 90 170 80"/.test(fs.readFileSync(path.join(DIR, 'benelli.svg'), 'utf8')), 'Benelli: den forkerte original-viewBox er rettet');
  assert.match(post('dkw').normalisering, /ingen viewBox/);
});

test('AI-udkastene er fjernet konsekvent: ingen emblem/ordmærke-varianter, assets.json og vektoriser-batchen kender dem ikke', () => {
  const assets = JSON.parse(fs.readFileSync(path.join(DIR, 'assets.json'), 'utf8'));
  for (const s of ERSTATTET){
    for (const v of ['emblem', 'ordmaerke']) assert.ok(!fs.existsSync(path.join(DIR, `${s}-${v}.svg`)), `${s}-${v}.svg skulle være fjernet`);
    assert.strictEqual(assets[s], undefined, `${s} står stadig i assets.json`);
    assert.ok(VEK.ERSTATTET_AF_OFFICIEL.includes(s), `${s} mangler i vektoriser-batchens ERSTATTET_AF_OFFICIEL`);
    assert.ok(!VEK.TABEL.some(b => b.slug === s), `${s}: batchen ville overskrive den officielle fil`);
  }
  assert.deepStrictEqual(VEK.ERSTATTET_AF_OFFICIEL.slice().sort(), ERSTATTET_V5V6.slice().sort());
  assert.strictEqual(VEK.ALLE_UDKAST.length, 20);
  assert.deepStrictEqual(VEK.TABEL.map(b => b.slug).sort(), Object.keys(assets).sort());
  /* ingen forældreløse emblem/ordmærke-filer: hver -emblem/-ordmaerke-fil hører til et mærke med den variant i manifestet */
  for (const f of fs.readdirSync(DIR)){
    const m = /^(.+)-(emblem|ordmaerke)\.svg$/.exec(f);
    if (!m) continue;
    assert.ok(post(m[1]) && post(m[1]).varianter && post(m[1]).varianter[m[2]], `${f} er ikke i manifestet`);
  }
});

test('mærker uden logo beholder fallback; officielle mærker har logo i klientens data som farvet (c:0), uden emblem/ordmærke-felt', () => {
  const MANGLER = ['bsa', 'cagiva', 'buell', 'victory', 'fb-mondial', 'hyosung', 'rewaco', 'lauge-jensen', 'bach'];
  for (const s of MANGLER){
    assert.strictEqual(post(s).godkendt, false, s);
    assert.strictEqual(post(s).fil, null, s);
    assert.strictEqual(BL.logoFor(s).harLogo, false, s);
    assert.match(BL.logoHTML(s, { storrelse: 'lg' }), /bl--mono/, s);
  }
  for (const s of SLUGS){
    const l = BL.logoFor(s);
    assert.strictEqual(l.harLogo, true, s);
    assert.strictEqual(l.ensfarvet, false, s);
    assert.strictEqual(l.emblem, null, s);
    assert.strictEqual(l.ordmaerke, null, s);
  }
});

/* ---------- SVG-regler ---------- */

test('tjekSvg: den standardiserede W3C-DOCTYPE accepteres; ENTITY, intern delmængde, script og ekstern href afvises; officielle filer må fylde mere end udkast', () => {
  const dt = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
  const svg = b => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${b}</svg>`;
  assert.deepStrictEqual(G.tjekSvg(`<?xml version="1.0"?>\n${dt}\n${svg('<path d="M0 0"/>')}`), []);
  assert.ok(G.tjekSvg('<!DOCTYPE svg [<!ENTITY x "y">]>' + svg('')).length > 0, 'intern delmængde/ENTITY');
  assert.ok(G.tjekSvg('<!DOCTYPE svg SYSTEM "http://evil.example/x.dtd">' + svg('')).length > 0, 'ekstern DTD');
  assert.ok(G.tjekSvg(dt + svg('<script>alert(1)</script>')).length > 0);
  assert.ok(G.tjekSvg(dt + svg('<use xlink:href="https://x.example/a.svg#b"/>')).length > 0);
  const stor = svg('<path d="' + 'M0 0L1 1'.repeat(1500) + '"/>');
  assert.ok(Buffer.byteLength(stor) > 6 * 1024 && Buffer.byteLength(stor) < G.MAX_OFFICIEL_BYTES);
  assert.ok(G.tjekSvg(stor).length > 0, 'over 6 KB afvises som udkast');
  assert.deepStrictEqual(G.tjekSvg(stor, G.MAX_OFFICIEL_BYTES), [], 'men er ok som officiel fil');
  // valider(): en officiel post uden proveniens afvises
  const kopi = JSON.parse(JSON.stringify(manifest));
  const h = kopi.maerker.find(m => m.slug === 'honda');
  delete h.kilde_hash; h.ensfarvet = true;
  const laes = f => fs.readFileSync(path.join(ROOT, f));
  const fejl = G.valider(kopi, laes).join('\n');
  assert.match(fejl, /kilde_hash/); assert.match(fejl, /farvet/);
  const h2 = JSON.parse(JSON.stringify(manifest)); h2.maerker.find(m => m.slug === 'honda').kilde_hash = 'a'.repeat(64);
  assert.match(G.valider(h2, laes).join('\n'), /kilde_hash passer ikke/);
});

test('ingen officiel fil indeholder script, hændelses-attributter, ekstern reference, indlejret billede eller foreignObject', () => {
  for (const s of SLUGS){
    const t = fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8');
    for (const f of [/<script/i, /\son[a-z]+\s*=/i, /<foreignObject/i, /<image[\s>]/i, /javascript:/i, /@import/i, /<!ENTITY/i, /data:image/i]) assert.ok(!f.test(t), `${s}: ${f}`);
    for (const m of t.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) assert.ok(m[1].startsWith('#'), `${s}: href ${m[1]}`);
    for (const m of t.matchAll(/url\(\s*["']?([^)"']*)/gi)) assert.ok(m[1].startsWith('#'), `${s}: url(${m[1]})`);
  }
});

/* ---------- markup (Node) ---------- */

test('logoHTML: officielle logoer er <img> i fast slot (width/height + --bl-ar), aldrig maske; lazy kun i sm/md/lg; alt kun når ikke dekorativt', () => {
  for (const s of SLUGS){
    const m = post(s);
    for (const str of ['sm', 'lg', 'xl', 'hero']){
      const h = BL.logoHTML(m.navn, { storrelse: str, decorative: true, statisk: true });
      if (/bl--mono/.test(h)){ assert.strictEqual(str, 'sm', `${s} ${str}: kun sm må falde tilbage til monogram`); continue; }
      assert.match(h, /bl--logo bl--img/, `${s} ${str}`);
      assert.doesNotMatch(h, /bl-mark|mask-image|bl-ref/, `${s} ${str}: ingen maske`);
      assert.match(h, new RegExp(`<img class="bl-img" src="img/brands/${s}\\.svg" alt="" width="\\d+" height="\\d+" decoding="async"${str === 'sm' || str === 'lg' ? ' loading="lazy"' : ''}>`), `${s} ${str}`);
      const w = +/width="(\d+)"/.exec(h)[1], hh = +/height="(\d+)"/.exec(h)[1];
      assert.ok(w <= BL.SLOT[str][1] && hh <= BL.SLOT[str][0], `${s} ${str}: ${w}x${hh} uden for slot`);
    }
    const a = BL.logoHTML(m.navn, { storrelse: 'xl', decorative: false });
    assert.match(a, new RegExp(`alt="${m.navn.replace(/[-]/g, '[-]')}-logo"`), s);
    assert.doesNotMatch(a, /aria-hidden/);
  }
});

/* ---------- browser ---------- */

const sb = require('./smoke-browser');
let pw = null, grund = '';
test.before(async () => { const t = await sb.playwrightTilgaengelig(); pw = t.ok ? t.pw : null; grund = t.grund || ''; });

/* En virtuel side med alle officielle logoer i fire størrelser, plus et .mk-hero-felt (altid mørkt foto). */
function sideHTML(tema){
  const rk = str => SLUGS.map(s => `<li>${BL.logoHTML(post(s).navn, { storrelse: str, decorative: true, statisk: true })}</li>`).join('');
  return `<!doctype html><html lang="da" data-theme="${tema}"><head><meta charset="utf-8"><link rel="stylesheet" href="css/styles.css"><link rel="stylesheet" href="css/p-brand-logo.css"><link rel="stylesheet" href="css/p-maerke.css"></head>
<body><main><ul id="lg" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;padding:24px">${rk('lg')}</ul>
<ul id="sm" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;padding:24px">${rk('sm')}</ul>
<ul id="xl" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;padding:24px">${rk('xl')}</ul>
<section class="mk-hero" style="padding:32px;background:#222"><ul id="hero" style="display:flex;flex-wrap:wrap;gap:24px;list-style:none;margin:0;padding:0">${rk('hero')}</ul></section></main>
<script src="js/brand-logos-data.js"></script><script src="js/brand-logos.js"></script></body></html>`;
}

async function medSide(tema, scheme, fn){
  const { server, port } = await sb.startServer(ROOT);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, serviceWorkers: 'block' });
    await ctx.route('**/__v5-logo.html', r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: sideHTML(tema) }));
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/__v5-logo.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 });
    return await fn(page);
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
}

test('browser: alle 21 officielle filer indlæses som billede i hver størrelse, ingen falder tilbage til fallback, og farvede blokke er ikke massive', { timeout: 120000 }, async t => {
  if (!pw) return t.skip(grund);
  const r = await medSide('light', 'light', page => page.evaluate(() => {
    const ud = { ok: 0, fejl: [], bl: document.querySelectorAll('.bl--img').length, mark: document.querySelectorAll('.bl-mark').length, fb: [] };
    for (const im of document.images){
      if (!im.classList.contains('bl-img')) continue;
      if (im.naturalWidth > 0) ud.ok++; else ud.fejl.push(im.getAttribute('src'));
      const bl = im.closest('.bl');
      if (bl.classList.contains('bl--fejl')) ud.fb.push(bl.dataset.bl);
    }
    /* Alfa-dækning og antal farver ved 200 px: masken i currentColor ville gøre en tegning med ~100 % dækning til en massiv blok. */
    ud.maal = {};
    const seen = new Set();
    for (const im of document.querySelectorAll('#xl .bl-img')){
      const slug = im.closest('.bl').dataset.bl; if (seen.has(slug)) continue; seen.add(slug);
      const c = document.createElement('canvas'); c.width = 200; c.height = Math.max(8, Math.round(200 * im.naturalHeight / im.naturalWidth));
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let dak = 0; const farver = new Set();
      for (let i = 0; i < d.length; i += 4){ if (d[i + 3] > 200) dak++; farver.add([d[i] >> 5, d[i + 1] >> 5, d[i + 2] >> 5, d[i + 3] > 128 ? 1 : 0].join()); }
      ud.maal[slug] = { dak: dak / (d.length / 4), farver: farver.size };
    }
    return ud;
  }));
  assert.strictEqual(r.fejl.length, 0, `billeder uden indhold: ${r.fejl}`);
  assert.deepStrictEqual(r.fb, []);
  assert.strictEqual(r.mark, 0, 'ingen maske-elementer for officielle logoer');
  assert.ok(r.bl >= 21 * 3, `forventede ≥ 63 farvede logoer, fandt ${r.bl}`);
  for (const s of SLUGS) assert.ok(r.maal[s] && r.maal[s].farver >= 2, `${s}: tegningen har ≥ 2 farver/alfa-niveauer (${JSON.stringify(r.maal[s])})`);
  /* DKW, Ducati og Sherco er fyldte blokke: en currentColor-maske ville vise en massiv klods (≥ 90 % dækning) — derfor farvet rendering. */
  for (const s of ['dkw', 'ducati', 'sherco']) assert.ok(r.maal[s].dak > 0.9, `${s}: dækning ${r.maal[s].dak}`);
  assert.ok(r.maal.dkw.farver >= 3 && r.maal.sherco.farver >= 3, 'DKW (gul/blå/sort) og Sherco (blå/gul) har flere farver');
});

test('browser: mørk tilstand — ALLE farvede logoer står på samme neutrale lyse flise (kontrast ≥ 7 mod sort), flisen flytter ikke slotten; lys tilstand har ingen flise', { timeout: 120000 }, async t => {
  if (!pw) return t.skip(grund);
  const maal = (tema, scheme) => medSide(tema, scheme, page => page.evaluate(() => {
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rgb = s => (/rgba?\(([^)]+)\)/.exec(s) || [0, '0,0,0,0'])[1].split(',').map(Number);
    return [...document.querySelectorAll('.bl--img')].map(bl => {
      const cs = getComputedStyle(bl), r = bl.getBoundingClientRect();
      const sh = /(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(cs.boxShadow);
      return { slug: bl.dataset.bl, sek: bl.closest('ul').id, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
        bg: cs.backgroundColor, bgA: rgb(cs.backgroundColor)[3] === undefined ? 1 : rgb(cs.backgroundColor)[3], bgL: lum(rgb(cs.backgroundColor)),
        spread: sh ? Number(sh[5]) : 0, skygge: sh ? sh[1] : null, radius: cs.borderTopLeftRadius };
    });
  }));
  const lys = await maal('light', 'light');
  const moerk = await maal('dark', 'dark');
  const moerkSystem = await maal('auto', 'dark');   // ingen data-theme: følger prefers-color-scheme
  assert.strictEqual(lys.length, moerk.length);
  for (let i = 0; i < lys.length; i++){
    const a = lys[i], b = moerk[i], c = moerkSystem[i];
    assert.strictEqual(b.slug, a.slug);
    /* samme slot i begge temaer: flisen ligger udenfor (box-shadow), så intet flytter sig */
    assert.strictEqual(b.w, a.w, `${a.slug} ${a.sek}: bredde skifter mellem lys og mørk`);
    assert.strictEqual(b.h, a.h, `${a.slug} ${a.sek}: højde skifter mellem lys og mørk`);
    assert.strictEqual(c.w, a.w);
    if (a.sek !== 'hero'){
      assert.strictEqual(a.bgA, 0, `${a.slug} ${a.sek}: ingen flise i lys tilstand`);
      assert.strictEqual(a.spread, 0, `${a.slug} ${a.sek}: ingen flise-udstrækning i lys tilstand`);
    }
    /* mørk: samme neutrale lyse flade for ALLE (ikke et valg pr. logo) */
    assert.strictEqual(b.bg, 'rgb(245, 241, 235)', `${a.slug} ${a.sek}: flisen i mørk tilstand`);
    assert.strictEqual(c.bg, b.bg, `${a.slug} ${a.sek}: prefers-color-scheme giver samme flise`);
    assert.ok(b.spread >= 3 && b.spread <= 6, `${a.slug} ${a.sek}: spread ${b.spread}`);
    assert.ok((b.bgL + 0.05) / (0 + 0.05) >= 7, `${a.slug}: kontrast mellem flise og sort logo`);
  }
  /* hero (altid mørkt foto): flise også i lys tilstand, lys flade */
  for (const h of lys.filter(x => x.sek === 'hero')){
    assert.strictEqual(h.bg, 'rgb(255, 255, 255)', `${h.slug}: hero-flise i lys tilstand`);
    assert.strictEqual(h.spread, 6, `${h.slug}: hero-flisens kant`);
  }
});

test('browser: beskæring er ren — Honda, Triumph og Kymco skjuler sloganet/firmanavnet uden at klippe selve logoet; øvrige filer klipper intet af', { timeout: 120000 }, async t => {
  if (!pw) return t.skip(grund);
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1600, height: 1200 } })).newPage();
    await page.goto('about:blank');   // ingen site-CSS: svg'ens størrelse er præcis width/height fra filen
    const res = {};
    for (const s of SLUGS){
      const tekst = fs.readFileSync(path.join(DIR, `${s}.svg`), 'utf8');
      res[s] = await page.evaluate(t => {
        document.body.innerHTML = '<div id="x" style="position:absolute;left:0;top:0">' + t.replace(/<\?xml[^>]*\?>/, '').replace(/<!DOCTYPE[^>]*>/, '') + '</div>';
        const svg = document.querySelector('#x svg'); const vb = svg.viewBox.baseVal;
        const o = svg.getBoundingClientRect(); const sk = o.width / vb.width;
        const ud = { inde: 0, ude: 0, delvis: 0, delvisEl: [] };
        const tol = Math.max(vb.width, vb.height) * 0.004;
        for (const e of svg.querySelectorAll('path,polygon,rect,circle,ellipse,polyline,line')){
          if (e.closest('defs,clipPath,mask,metadata,symbol')) continue;
          const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue;
          const l = (r.left - o.left) / sk + vb.x, tp = (r.top - o.top) / sk + vb.y, rt = (r.right - o.left) / sk + vb.x, bt = (r.bottom - o.top) / sk + vb.y;
          const helt = l >= vb.x - tol && tp >= vb.y - tol && rt <= vb.x + vb.width + tol && bt <= vb.y + vb.height + tol;
          const intet = rt <= vb.x + tol || l >= vb.x + vb.width - tol || bt <= vb.y + tol || tp >= vb.y + vb.height - tol;
          if (helt) ud.inde++; else if (intet) ud.ude++; else { ud.delvis++; ud.delvisEl.push(e.tagName + ' ' + [l, tp, rt, bt].map(Math.round).join(',')); }
        }
        return ud;
      }, tekst);
    }
    for (const s of SLUGS){
      assert.strictEqual(res[s].delvis, 0, `${s}: ${res[s].delvis} elementer er klippet halvt midt i viewBox (${res[s].delvisEl.slice(0, 3)})`);
      assert.ok(res[s].inde >= 1, s);
      if (['honda', 'triumph', 'kymco'].includes(s)) assert.ok(res[s].ude >= 1, `${s}: sloganet/firmanavnet skal ligge helt udenfor viewBox`);
      else assert.strictEqual(res[s].ude, 0, `${s}: intet må være skåret væk`);
    }
    /* Sloganets bogstaver er stadig i filen (ingen path er fjernet) — de er bare uden for viewBox. */
    assert.ok(res.honda.ude === 1 && res.honda.inde === 2, `Honda: 1 slogan-path ude, 2 logo-paths inde (${JSON.stringify(res.honda)})`);
    assert.ok(res.triumph.ude >= 10, `Triumph: de 10 bogstaver i FOR THE RIDE er udenfor (${res.triumph.ude})`);
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
  }
});
