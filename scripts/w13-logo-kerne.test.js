/* W13 logo-system: kernen (js/brand-logos.js), manifestet, gen-scriptet, SVG-reglerne og vagten mod stille 404.
   Ren Node — ingen browser, intet netværk. Layout/CLS/kontrast måles i w13-logo-layout.test.js, generatoren i w13-logo-generator.test.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BL = require('../js/brand-logos.js');
const G = require('./brand-logos-gen.js');
const H = require('./__fixtures__/w13-logo-hjaelp.js');

const manifest = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
/* Tests af ærlig default/fallback bruger et eget "rent" manifest (ingen godkendte), så de ikke ændrer sig, når ejeren slår logoer til/fra. */
const ren = H.renManifest();
const BLren = BL.opret(G.byggData(ren));
const slugs = new Set(manifest.maerker.map(m => m.slug));

/* ---------- A1/A2: manifest ---------- */

test('A1 manifestet dækker alle mærkesider, de tre udkast-mærker uden side og alle redaktionelle mærker', () => {
  assert.equal(manifest.maerker.length, 64);
  const sider = fs.readdirSync(ROOT).filter(f => /^maerke-.+\.html$/.test(f)).map(f => f.replace(/^maerke-|\.html$/g, ''));
  assert.ok(sider.length >= 29, `forventede ≥ 29 mærkesider, fandt ${sider.length}`);
  for (const s of sider) assert.ok(slugs.has(s), `mærkeside ${s} mangler i manifestet`);
  for (const s of ['gasgas', 'zero', 'piaggio']) assert.ok(slugs.has(s), s);
  const data = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  const blok = data.slice(data.indexOf('const BRANDS_BY_MODEL'), data.indexOf('const TYPE_BY_MODEL_HINT'));
  const noegler = [...blok.matchAll(/^ {2}'?([^':\n]+?)'?: \[/gm)].map(m => m[1]);
  assert.ok(noegler.length >= 60, `fandt kun ${noegler.length} mærker i BRANDS_BY_MODEL`);
  for (const n of noegler) assert.ok(slugs.has(BL.normaliser(n)), `${n} -> ${BL.normaliser(n)} er ikke i manifestet`);
});

test('A2 det RIGTIGE manifest er konsistent: godkendt -> fil findes, hash stemmer, < 6 KB, godkendt_af/dato; ingen rasterfiler', () => {
  const laes = f => fs.readFileSync(path.join(ROOT, f));
  for (const m of manifest.maerker){
    assert.ok(m.monogram.length >= 1 && m.monogram.length <= 3, `${m.slug} monogram`);
    assert.equal(m.fallback, 'ordmaerke', m.slug);
    if (!m.godkendt) continue;
    assert.ok(m.fil, `${m.slug}: godkendt uden fil`);
    assert.ok(fs.existsSync(path.join(ROOT, m.fil)), `${m.slug}: ${m.fil} findes ikke`);
    const buf = laes(m.fil);
    assert.equal(G.sha256(buf), m.hash, `${m.slug}: hash stemmer ikke`);
    assert.ok(buf.length < 6 * 1024, `${m.slug}: ${buf.length} bytes`);
    assert.deepEqual(G.tjekSvg(buf.toString('utf8')), [], m.slug);
    const mm = G.maal(buf.toString('utf8'));
    assert.ok(Math.abs(m.bredde / m.hoejde - mm.bredde / mm.hoejde) < 0.001, `${m.slug}: forhold`);
    assert.equal(m.godkendt_af, 'ejer', `${m.slug}: godkendt_af`);
    assert.match(String(m.godkendt_dato), /^\d{4}-\d{2}-\d{2}$/, `${m.slug}: godkendt_dato`);
    assert.ok(m.kilde && m.licens, `${m.slug}: proveniens`);
  }
  assert.deepEqual(G.valider(manifest, laes), [], 'manifestet består gen-scriptets validering');
  const filer = fs.readdirSync(path.join(ROOT, 'img', 'brands'));
  assert.deepEqual(filer.filter(f => /\.(png|jpe?g|webp|gif|avif)$/i.test(f)), [], 'ingen rasterfiler i img/brands/');
});

test('A2 ren default (eget manifest): ingen godkendte, ingen filer, korrekt fallback og monogram', () => {
  assert.equal(ren.maerker.length, manifest.maerker.length);
  for (const m of ren.maerker){ assert.equal(m.godkendt, false); assert.equal(m.fil, null); assert.equal(m.fallback, 'ordmaerke'); }
  assert.doesNotMatch(G.datafilTekst(ren), /"l":/);
});

/* ---------- A3: gen-script ---------- */

test('A3 data-filen er genereret af manifestet (--tjek grøn) og gen er deterministisk', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'brand-logos-gen.js'), '--tjek'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.equal(G.datafilTekst(manifest), G.datafilTekst(JSON.parse(JSON.stringify(manifest))));
  const fil = fs.readFileSync(G.DATA, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(fil, G.datafilTekst(manifest));
  assert.ok(Buffer.byteLength(fil) < 12 * 1024, 'klientens data skal være lille (ingen kilde/licens/hash)');
  assert.doesNotMatch(fil, /kilde|licens|hash/);
});

test('A3 valider afviser ugyldige poster og udfyld opdager forkert hash/forhold', () => {
  const laes = f => { if (f === 'img/brands/fx-ring.svg') return Buffer.from(H.svgTekst('fx-ring.svg')); throw new Error('findes ikke'); };
  const ok = JSON.parse(JSON.stringify(ren));
  assert.deepEqual(G.valider(ok, laes), []);
  const prøv = (aendr, forvent) => {
    const m = JSON.parse(JSON.stringify(ren));
    aendr(m.maerker[0]);
    const f = G.valider(m, laes).join('\n');
    assert.match(f, forvent);
  };
  prøv(m => { m.variant = 'logo'; }, /variant/);
  prøv(m => { m.godkendt = true; }, /godkendt:true kræver fil/);
  prøv(m => { m.fil = 'img/brands/findes-ikke.svg'; }, /findes ikke/);
  prøv(m => { m.fil = 'img/brands/fx-ring.svg'; }, /kilde og licens/);
  prøv(m => { m.fil = '../../etc/x.svg'; }, /skal være img\/brands/);
  prøv(m => { m.fil = 'img/brands/x.png'; }, /skal være img\/brands/);
  prøv(m => { m.monogram = 'ABCD'; }, /monogram/);
  prøv(m => { m.slug = 'Store Bogstaver'; }, /slug/);
  prøv(m => { m.fallback = 'logo'; }, /fallback/);
  const dobbelt = JSON.parse(JSON.stringify(ren)); dobbelt.maerker[1].slug = dobbelt.maerker[0].slug;
  assert.match(G.valider(dobbelt, laes).join('\n'), /to gange/);

  // hash/forhold udfyldes, og et ændret hash afvises uden --opdater
  const m = JSON.parse(JSON.stringify(ren));
  Object.assign(m.maerker[0], { fil: 'img/brands/fx-ring.svg', godkendt: true, kilde: 'x', licens: 'y' });
  const u = G.udfyld(m, laes, false);
  assert.equal(u.aendret, true);
  assert.equal(u.manifest.maerker[0].bredde, 100);
  assert.equal(u.manifest.maerker[0].hash, G.sha256(Buffer.from(H.svgTekst('fx-ring.svg'))));
  assert.deepEqual(G.valider(u.manifest, laes), []);
  const forkert = JSON.parse(JSON.stringify(u.manifest)); forkert.maerker[0].hash = 'a'.repeat(64);
  assert.match(G.udfyld(forkert, laes, false).fejl.join('\n'), /hash i manifestet/);
  assert.equal(G.udfyld(forkert, laes, true).fejl.length, 0, '--opdater overskriver');
  // linjeskift ændrer ikke hash (autocrlf)
  assert.equal(G.sha256(Buffer.from('a\r\nb\r\n')), G.sha256(Buffer.from('a\nb\n')));
});

/* ---------- A4: normalisering ---------- */

test('A4 normalisering: aliaser, accenter, store bogstaver og sentinel', () => {
  const tabel = {
    'BMW': 'bmw', 'bmw motorrad': 'bmw', 'BMW Motorrad': 'bmw', 'Bmw-Motorrad': 'bmw',
    'Harley-Davidson': 'harley-davidson', 'harley davidson': 'harley-davidson', 'harley': 'harley-davidson', 'Harley': 'harley-davidson',
    'HD': 'harley-davidson', 'hd': 'harley-davidson', 'H-D': 'harley-davidson', 'h-d': 'harley-davidson', 'harleydavidson': 'harley-davidson',
    'CFMoto': 'cfmoto', 'CFMOTO': 'cfmoto', 'cf moto': 'cfmoto', 'CF Moto': 'cfmoto', 'cf-moto': 'cfmoto',
    'Zero Motorcycles': 'zero', 'zero': 'zero', 'ZERO MOTORCYCLES': 'zero',
    'GasGas': 'gasgas', 'Gas Gas': 'gasgas', 'gas gas': 'gasgas', 'GASGAS': 'gasgas',
    'Indian': 'indian', 'Indian Motorcycle': 'indian', 'indian motorcycles': 'indian',
    'Moto Guzzi': 'moto-guzzi', 'motoguzzi': 'moto-guzzi', 'Royal Enfield': 'royal-enfield', 'Royal-enfield': 'royal-enfield', 'royalenfield': 'royal-enfield',
    'MV Agusta': 'mv-agusta', 'mvagusta': 'mv-agusta', 'Lauge': 'lauge-jensen', 'lauge jensen': 'lauge-jensen',
    'Can-Am': 'can-am', 'can am': 'can-am', 'KTM': 'ktm', 'ktm': 'ktm', 'Honda': 'honda', '  honda  ': 'honda', 'HONDA': 'honda',
    'Piaggio': 'piaggio', 'Vespa': 'vespa', 'FB Mondial': 'fb-mondial', 'Hero MotoCorp': 'hero-motocorp',
    'Zündapp': 'zundapp', 'Ducati®': 'ducati', 'Åbenrå MC': 'aabenraa-mc', 'Øresund': 'oeresund',
  };
  for (const [ind, ud] of Object.entries(tabel)) assert.equal(BL.normaliser(ind), ud, JSON.stringify(ind));
  for (const ind of ['Ukendt', 'ukendt', 'UKENDT', 'andet mærke', 'Andet Mærke', 'andet maerke', 'Andet-Maerke', '', '   ', '---', '®', null, undefined, {}, [], true, () => 1]){
    assert.equal(BL.normaliser(ind), null, `skal være null: ${String(ind)}`);
  }
  // nøglerne på Object.prototype må ikke slå igennem
  for (const ind of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'prototype']){
    const l = BL.logoFor(ind);
    assert.equal(l.harLogo, false);
    assert.ok(typeof l.slug === 'string' && l.slug.length > 0, ind);
    assert.doesNotThrow(() => BL.logoHTML(ind, { storrelse: 'md' }));
  }
  // idempotens: normaliseret slug normaliseres til sig selv for alle manifestposter
  for (const m of manifest.maerker){
    assert.equal(BL.normaliser(m.slug), m.slug, m.slug);
    assert.equal(BL.normaliser(m.navn), m.slug, m.navn);
    for (const a of m.aliaser) assert.equal(BL.normaliser(a), m.slug, `alias ${a}`);
  }
});

test('A4 logoFor: vist navn, monogram og ingen logo uden godkendelse', () => {
  const l = BLren.logoFor('bmw motorrad');
  assert.equal(l.slug, 'bmw'); assert.equal(l.navn, 'BMW'); assert.equal(l.harLogo, false);
  assert.equal(l.src, null); assert.equal(l.bredde, null); assert.equal(l.hoejde, null);
  assert.equal(BLren.logoFor('CFMOTO').navn, 'CFMoto', 'visningsnavn fra manifestet, ikke fra kaldet');
  assert.equal(BLren.logoFor('Harley-Davidson').monogram, 'HD');
  assert.equal(BLren.logoFor('MV Agusta').monogram, 'MV');
  assert.equal(BLren.logoFor('Yamaha').monogram, 'Y');
  assert.equal(BLren.monogramFor('Ny Fabrik'), 'NF');
  const ukendt = BLren.logoFor('Ukendt');
  assert.equal(ukendt.slug, null); assert.equal(ukendt.harLogo, false);
  assert.equal(BLren.logoHTML('Ukendt'), '', 'Ukendt får ingen logo og ingen tom plads');
  assert.equal(BLren.logoHTML('andet mærke'), '');
});

/* ---------- fallback + markup ---------- */

test('A6 fallback: alle mærker × alle størrelser × decorative giver markup med tekst; ingen <img> uden godkendt logo', () => {
  for (const m of ren.maerker) for (const storrelse of BLren.STORRELSER) for (const decorative of [true, false]){
    const h = BLren.logoHTML(m.navn, { storrelse, decorative });
    assert.ok(h.length > 40, `${m.slug} ${storrelse}`);
    assert.match(h, new RegExp(`class="bl bl--${storrelse} bl--(mono|ord)"`));
    assert.doesNotMatch(h, /<img/, 'intet billede uden godkendelse');
    assert.doesNotMatch(h, /mask-image/);
    const tekst = h.replace(/<[^>]+>/g, '').trim();
    assert.ok(tekst.length >= 1, `${m.slug} fallback uden synlig tekst`);
    if (decorative) assert.match(h, /aria-hidden="true"/);
  }
  // decorative (navnet står ved siden af) -> monogram; ikke decorative -> ordmærke; sm er altid monogram
  assert.match(BLren.logoHTML('BSA', { storrelse: 'md' }), /bl--mono/);
  assert.match(BLren.logoHTML('BSA', { storrelse: 'md', decorative: false }), /bl--ord/);
  assert.match(BLren.logoHTML('BSA', { storrelse: 'sm', decorative: false }), /bl--mono/);
  assert.match(BLren.logoHTML('FB Mondial', { storrelse: 'lg', decorative: false }), /bl-l">FB<\/span> <span class="bl-l">MONDIAL/);
  assert.match(BLren.logoHTML('Lauge Jensen', { storrelse: 'lg', decorative: false }), /--bl-nl:2/);
  // ukendt størrelse -> md
  assert.match(BLren.logoHTML('Honda', { storrelse: 'kæmpe' }), /bl--md/);
});

test('A5 ingen HTML-injektion fra mærkenavne', () => {
  const faelder = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "' onmouseover='x", 'A&B <b>fed</b>', '`${x}`', 'x"y', '<svg/onload=1>'];
  const tm = H.testManifest();
  const data = G.byggData(tm);
  const inst = BL.opret(data);
  for (const f of faelder) for (const b of [BL, inst]) for (const dekor of [true, false]) for (const storrelse of BL.STORRELSER){
    const h = b.logoHTML(f, { storrelse, decorative: dekor });
    // intet navn-afledt tag: alle tags i outputtet er de fire kendte
    const tags = [...h.matchAll(/<\/?([a-z][a-z0-9]*)/gi)].map(m => m[1].toLowerCase());
    for (const t of tags) assert.ok(['span', 'img'].includes(t), `uventet tag <${t}> for ${f}`);
    assert.doesNotMatch(h, /<script|<svg|<b>|<img[^>]*\son[a-z]+=/i);
    // attributværdier er afsluttet korrekt: hver attribut er name="..." uden løs "
    for (const tag of h.match(/<[^>]+>/g)){
      const uden = tag.replace(/="[^"]*"/g, '').replace(/^<|\/?>$/g, '');
      assert.doesNotMatch(uden, /["'<]/, `løs anførselstegn i ${tag}`);
    }
  }
  const h = BL.logoHTML('A&B <b>fed</b>', { storrelse: 'lg', decorative: false });
  assert.match(h, /&lt;B&gt;/);
  assert.doesNotMatch(h, /<b>/i);
  // et logo-mærke med farlig fil-sti i data kan ikke bryde ud af attributten
  const ond = BL.opret({ v: 1, m: [{ s: 'x', n: 'X', a: [], m: 'X', v: 'emblem', f: 'ordmaerke', l: { src: "a');x:url('b\"><script>", w: 10, h: 10, c: 1 } }] });
  const oh = ond.logoHTML('X', { storrelse: 'md' });
  assert.doesNotMatch(oh, /<script/);
  assert.doesNotMatch(oh, /style="[^"]*"[^>]*"><script/);
});

test('A6 logo-markup: maske for ensfarvet, <img> for flerfarvet, fast slot og korrekt alt/aria', () => {
  const inst = BL.opret(G.byggData(H.testManifest()));
  const m = inst.logoHTML('Honda', { storrelse: 'md' });
  assert.match(m, /class="bl bl--md bl--logo"/);
  assert.match(m, /style="--bl-ar:1"/);
  assert.match(m, /mask-image:url\('img\/brands\/fx-ring\.svg'\)/);
  assert.match(m, /<img class="bl-probe" src="img\/brands\/fx-ring\.svg" alt="" width="\d+" height="\d+" hidden>/);
  assert.match(m, /aria-hidden="true"/);
  assert.match(m, /bl-fb bl-mono/, 'fallback ligger i markup til fejlfald');
  // ikke dekorativt: rolle og navn (ikke tom alt)
  const a = inst.logoHTML('Honda', { storrelse: 'hero', decorative: false });
  assert.match(a, /role="img" aria-label="Honda-logo"/);
  assert.doesNotMatch(a, /aria-hidden/);
  // flerfarvet: <img> med alt
  const f = inst.logoHTML('Suzuki', { storrelse: 'lg', decorative: false });
  assert.match(f, /<img class="bl-img" src="img\/brands\/fx-multi\.svg" alt="Suzuki-logo" width="\d+" height="\d+" decoding="async">/);
  assert.doesNotMatch(f, /mask-image/);
  const fd = inst.logoHTML('Suzuki', { storrelse: 'lg' });
  assert.match(fd, /alt=""/); assert.match(fd, /aria-hidden="true"/);
  // forhold og pixelmål ligger inden for slotten
  const lg = inst.logoFor('Kawasaki');
  assert.equal(lg.bredde / lg.hoejde, 4);
  const [mh, mw] = inst.SLOT.md;
  const k = inst.logoHTML('Kawasaki', { storrelse: 'md' });
  const w = +/width="(\d+)"/.exec(k)[1], h = +/height="(\d+)"/.exec(k)[1];
  assert.ok(w <= mw && h <= mh, `${w}x${h} uden for ${mw}x${mh}`);
  // variant-krav: kun det ønskede -> ellers fallback; bredt ordmærke i sm -> monogram
  assert.match(inst.logoHTML('Honda', { storrelse: 'md', variant: 'lockup' }), /bl--mono/);
  assert.match(inst.logoHTML('Honda', { storrelse: 'md', variant: 'emblem' }), /bl--logo/);
  assert.match(inst.logoHTML('Kawasaki', { storrelse: 'sm' }), /bl--mono/);
  assert.match(inst.logoHTML('Honda', { storrelse: 'sm' }), /bl--logo/);
});

/* ---------- A12: CSS ---------- */

test('A12 p-brand-logo.css: ingen hårdkodede farver, og slotmålene følger SLOT i kernen', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'p-brand-logo.css'), 'utf8');
  const uden = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(uden, /#[0-9a-f]{3,8}\b/i, 'hex-farve');
  assert.doesNotMatch(uden, /\b(rgb|rgba|hsl|hsla)\(/i);
  assert.doesNotMatch(uden, /:\s*(white|black|red|green|blue|orange)\b/i);
  for (const [navn, [h, w]] of Object.entries(BL.SLOT)){
    const moenster = navn === 'hero' ? '@media \\(min-width:700px\\)\\{ \\.bl--hero' : `\\.bl--${navn}`;
    const regel = new RegExp(`${moenster}\\{[^}]*--bl-maxh:(\\d+)px;[^}]*--bl-maxw:(\\d+)px`).exec(uden);
    assert.ok(regel, `.bl--${navn} mangler i CSS`);
    assert.equal(+regel[1], h, `${navn} højde`); assert.equal(+regel[2], w, `${navn} bredde`);
  }
  assert.match(uden, /var\(--color-fg\)/); assert.match(uden, /var\(--color-fg-muted\)/);
  assert.doesNotMatch(uden, /--color-success/, 'grøn bruges kun til ✓');
});

/* ---------- A13: SVG-regler ---------- */

test('A13 SVG-regler: placeholder-SVG\'erne består, farlige eksempler afvises', () => {
  const filer = fs.readdirSync(H.FIX_DIR).filter(f => f.endsWith('.svg'));
  assert.ok(filer.length >= 8);
  for (const f of filer){
    const t = H.svgTekst(f);
    assert.deepEqual(G.tjekSvg(t), [], f);
    assert.ok(Buffer.byteLength(t) < 6 * 1024, `${f} < 6 KB`);
    assert.ok(G.maal(t), `${f} har viewBox`);
    assert.match(t, /PLACEHOLDER/, `${f} er tydeligt mærket som placeholder`);
  }
  const svg = b => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${b}</svg>`;
  const dårlige = {
    script: svg('<script>alert(1)</script>'), handler: svg('<rect onclick="x()" width="1" height="1"/>'),
    foreign: svg('<foreignObject><div/></foreignObject>'), image: svg('<image href="#a"/>'),
    extHref: svg('<use href="https://x.example/a.svg#b"/>'), xlink: svg('<use xlink:href="http://x/a"/>'),
    urlRef: svg('<rect style="fill:url(https://x/a)" width="1" height="1"/>'), imp: svg('<style>@import "x";</style>'),
    js: svg('<a href="javascript:alert(1)"/>'), doctype: '<!DOCTYPE svg><svg viewBox="0 0 1 1"/>',
    stor: svg('<path d="' + 'M0 0L1 1'.repeat(1000) + '"/>'), ikkeSvg: '<html></html>',
  };
  for (const [navn, t] of Object.entries(dårlige)) assert.ok(G.tjekSvg(t).length > 0, `${navn} skulle afvises`);
  assert.deepEqual(G.tjekSvg(svg('<use href="#a"/><path fill="url(#g)" d="M0 0"/>')), [], 'interne referencer er ok');
});

/* ---------- A14: stille-404-vagt ---------- */

test('A14 hver manifest-fil findes og er med i udgiv-allowlisten (stille-404-vagt)', () => {
  const udgiv = fs.readFileSync(path.join(ROOT, 'scripts', 'udgiv.js'), 'utf8');
  const m = /\{\s*fra:\s*'img',\s*tillad:\s*(\/[^/]+\/)\s*\}/.exec(udgiv);
  assert.ok(m, 'udgiv.js: img-allowlisten kunne ikke findes');
  const tillad = new RegExp(m[1].slice(1, -1));
  assert.ok(tillad.test('x.svg'), 'udgiv.js udgiver ikke længere .svg fra img/ — logoer ville give stille 404');
  assert.ok(!tillad.test('manifest.json'), 'manifestet udgives ikke (det er indlejret i js/brand-logos-data.js)');
  const brugt = [];
  for (const e of manifest.maerker){
    if (!e.fil) continue;
    brugt.push(e.fil);
    assert.ok(fs.existsSync(path.join(ROOT, e.fil)), `${e.slug}: ${e.fil} findes ikke`);
    assert.ok(tillad.test(path.basename(e.fil)), `${e.slug}: ${e.fil} ville ikke blive udgivet`);
    assert.ok(e.fil.startsWith('img/brands/'));
  }
  // og de to scripts og stilarket, som logo-markup kræver, udgives (js/ og css/ hele mapper)
  for (const f of ['js/brand-logos.js', 'js/brand-logos-data.js', 'js/maerker-sog.js', 'css/p-brand-logo.css']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  assert.ok(/\{\s*fra:\s*'js',\s*tillad:\s*\/\\\.js\$\/,\s*undtag:\s*\/\\\.test\\\.js\$\/\s*\}/.test(udgiv));
  assert.ok(brugt.length === 0 || brugt.every(f => /\.svg$/.test(f)));
});

test('A3/A17 kernen har ingen afhængigheder og bruger hverken fetch, eval eller DOM ved indlæsning', () => {
  const k = fs.readFileSync(path.join(ROOT, 'js', 'brand-logos.js'), 'utf8');
  const kode = k.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(kode, /\bfetch\s*\(|XMLHttpRequest|\beval\s*\(|new Function|innerHTML|document\.write/);
  assert.deepEqual([...kode.matchAll(/require\(([^)]*)\)/g)].map(m => m[1]), ["'./brand-logos-data.js'"]);
  // indlæses i et rent vm-miljø uden Node-globaler som en browser (global BrandLogos)
  const vm = require('vm');
  const sandbox = { self: null }; sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(G.DATA, 'utf8'), sandbox);
  vm.runInContext(k, sandbox);
  assert.equal(typeof sandbox.BrandLogos.logoHTML, 'function');
  assert.equal(sandbox.BrandLogos.normaliser('H-D'), 'harley-davidson');
  assert.equal(sandbox.BrandLogos.logoHTML('Honda', { storrelse: 'md' }), BL.logoHTML('Honda', { storrelse: 'md' }), 'browser og Node giver ens markup');
});
