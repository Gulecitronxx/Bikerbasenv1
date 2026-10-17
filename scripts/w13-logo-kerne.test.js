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
  assert.match(m, /style="--bl-ar:1;--bl-sa:1"/);
  assert.match(m, /<span class="bl-mark" data-bl-src="img\/brands\/fx-ring\.svg"><\/span>/);
  // P2-1: INGEN skjult billede med samme URL ved siden af masken (det gav to SVG-kald pr. logo); klienten henter filen én gang
  assert.doesNotMatch(m, /<img|bl-probe|mask-image/);
  // statisk filreference (kun generatorerne): skjult + lazy, så scripts/udgiv.js ser filen, men browseren henter intet
  const st = inst.logoHTML('Honda', { storrelse: 'md', statisk: true });
  assert.match(st, /<img class="bl-ref" src="img\/brands\/fx-ring\.svg" alt="" width="\d+" height="\d+" loading="lazy" hidden>/);
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
  const k = inst.logoHTML('Kawasaki', { storrelse: 'md', statisk: true });
  const w = +/width="(\d+)"/.exec(k)[1], h = +/height="(\d+)"/.exec(k)[1];
  assert.ok(w <= mw && h <= mh, `${w}x${h} uden for ${mw}x${mh}`);
  // variant-krav: kun det ønskede -> ellers fallback
  assert.match(inst.logoHTML('Honda', { storrelse: 'md', variant: 'lockup' }), /bl--mono/);
  assert.match(inst.logoHTML('Honda', { storrelse: 'md', variant: 'emblem' }), /bl--logo/);
});

/* ---------- P2-2: varianter pr. størrelse, bred sm-slot, ens areal ---------- */

test('P2-2 sm-slot: emblem-varianten vælges når den findes (og forholdet ≤ 3), ellers hovedfilen skaleret ned — aldrig monogram for et bredt logo', () => {
  const inst = BL.opret(G.byggData(H.testManifest()));
  // Honda: hovedfil fx-ring (1,0), emblem fx-mark (1,5) -> emblem i sm; hovedfil i alle andre størrelser
  const hs = inst.logoHTML('Honda', { storrelse: 'sm' });
  assert.match(hs, /bl--logo bl--emblem"/); assert.match(hs, /data-bl-src="img\/brands\/fx-mark\.svg"/); assert.match(hs, /--bl-ar:1\.5;/);
  assert.match(inst.logoHTML('Honda', { storrelse: 'lg' }), /data-bl-src="img\/brands\/fx-ring\.svg"/);
  assert.doesNotMatch(inst.logoHTML('Honda', { storrelse: 'lg' }), /bl--emblem/);
  // Kawasaki: hovedfil 4,0 (bredt), emblem 2,5 -> emblem i sm (bredt logo bliver IKKE monogram længere)
  const ks = inst.logoHTML('Kawasaki', { storrelse: 'sm' });
  assert.match(ks, /bl--logo bl--emblem"/); assert.match(ks, /data-bl-src="img\/brands\/fx-bar-k\.svg"/);
  // KTM: ingen emblem-fil -> hovedfilen (3,5) skaleres ned til den brede slot i stedet for monogram
  const ts = inst.logoHTML('KTM', { storrelse: 'sm' });
  assert.match(ts, /bl--logo"/); assert.doesNotMatch(ts, /bl--emblem|bl--mono/); assert.match(ts, /data-bl-src="img\/brands\/fx-wide\.svg"/);
  // form: 'fuld' tvinger hovedfilen i sm; form: 'emblem' tvinger emblemet i en større slot
  assert.match(inst.logoHTML('Honda', { storrelse: 'sm', form: 'fuld' }), /fx-ring\.svg/);
  assert.match(inst.logoHTML('Honda', { storrelse: 'md', form: 'emblem' }), /fx-mark\.svg/);
  // et emblem bredere end 3 vælges ikke automatisk (Moto Guzzis ørn er 4,3 — her en syntetisk post)
  const bred = BL.opret({ v: 1, m: [{ s: 'x', n: 'X', a: [], m: 'X', v: 'lockup', f: 'ordmaerke', l: { src: 'img/brands/x.svg', w: 100, h: 50, c: 1, e: { src: 'img/brands/x-emblem.svg', w: 400, h: 100 } } }] });
  assert.match(bred.logoHTML('X', { storrelse: 'sm' }), /data-bl-src="img\/brands\/x\.svg"/);
  // data: varianten kommer fra manifestet (l.e), ingen mærke-hårdkodning i kernen
  assert.deepEqual(inst.logoFor('Honda').emblem, { src: 'img/brands/fx-mark.svg', bredde: 150, hoejde: 100 });
  assert.equal(inst.logoFor('KTM').emblem, null);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'js', 'brand-logos.js'), 'utf8'), /honda|kawasaki|yamaha|ktm|benelli|harley/i, 'ingen pr.-mærke-hårdkodning i kernen');
});

test('P2-2 læsbarhed: et logo, der ved slottens mål bliver lavere end 12 px, er monogram; alle andre er logo', () => {
  const smal = BL.opret({ v: 1, m: [{ s: 'x', n: 'X', a: [], m: 'X', v: 'ordmaerke', f: 'ordmaerke', l: { src: 'img/brands/x.svg', w: 1000, h: 100, c: 1 } }] });
  assert.match(smal.logoHTML('X', { storrelse: 'sm' }), /bl--mono/, 'forhold 10 i sm = 5,6 px højt');
  assert.match(smal.logoHTML('X', { storrelse: 'lg' }), /bl--logo/);
  const m = BL.slotMaal('sm', 4.5);
  assert.ok(m.h >= BL.MIN_HOEJDE, `forhold 4,5 i sm: ${m.h}`);
});

test('P2-2 alle GODKENDTE logoer i det rigtige manifest viser logo (ikke monogram) i sm-slot, læsbart og med ens visuel vægt i alle slots', () => {
  const godkendte = manifest.maerker.filter(m => m.godkendt && m.fil);
  assert.ok(godkendte.length >= 1);
  for (const m of godkendte){
    const h = BL.logoHTML(m.navn, { storrelse: 'sm', decorative: true });
    assert.match(h, /bl--logo/, `${m.slug}: monogram i sm — A–Z/filter ville blande logo og cirkel`);
    const l = BL.logoFor(m.navn);
    const em = l.emblem && l.emblem.bredde / l.emblem.hoejde <= BL.EMBLEM_MAKS_FORHOLD ? l.emblem : l;
    const sm = BL.slotMaal('sm', em.bredde / em.hoejde);
    assert.ok(sm.h >= BL.MIN_HOEJDE && sm.w <= 56.01 && sm.h <= 22.01, `${m.slug} sm ${sm.w.toFixed(1)}x${sm.h.toFixed(1)}`);
  }
  // ens max-areal-regel: i hver størrelse er største/mindste areal ≤ 2,2 for logoer med forhold ≥ 0,85 (smallere er højdebegrænsede)
  for (const s of BL.STORRELSER){
    const arealer = godkendte.map(m => { const l = BL.logoFor(m.navn); return { ar: l.bredde / l.hoejde, ...BL.slotMaal(s, l.bredde / l.hoejde) }; })
      .filter(x => x.ar >= 0.85 && x.h >= BL.MIN_HOEJDE).map(x => x.w * x.h);
    if (arealer.length < 2) continue;
    assert.ok(Math.max(...arealer) / Math.min(...arealer) <= 2.2, `${s}: areal-forhold ${(Math.max(...arealer) / Math.min(...arealer)).toFixed(2)}`);
  }
});

test('P2-2 gen-script: varianter.emblem valideres (fil, hash, mål) og kommer i klientens data; ukendt variant afvises', () => {
  const laes = f => { const t = { 'img/brands/fx-ring.svg': 'fx-ring.svg', 'img/brands/fx-mark.svg': 'fx-mark.svg' }[f]; if (!t) throw new Error('findes ikke'); return Buffer.from(H.svgTekst(t)); };
  const m = JSON.parse(JSON.stringify(H.renManifest()));
  Object.assign(m.maerker[0], { fil: 'img/brands/fx-ring.svg', godkendt: true, kilde: 'x', licens: 'y', varianter: { emblem: { fil: 'img/brands/fx-mark.svg' } } });
  const u = G.udfyld(m, laes, false);
  assert.equal(u.manifest.maerker[0].varianter.emblem.bredde, 150);
  assert.equal(u.manifest.maerker[0].varianter.emblem.hoejde, 100);
  assert.equal(u.manifest.maerker[0].varianter.emblem.hash, G.sha256(Buffer.from(H.svgTekst('fx-mark.svg'))));
  assert.deepEqual(G.valider(u.manifest, laes), []);
  assert.deepEqual(G.byggData(u.manifest).m[0].l.e, { src: 'img/brands/fx-mark.svg', w: 150, h: 100 });
  const forkert = JSON.parse(JSON.stringify(u.manifest)); forkert.maerker[0].varianter.emblem.hash = 'a'.repeat(64);
  assert.match(G.udfyld(forkert, laes, false).fejl.join('\n'), /varianter\.emblem\.hash/);
  const prøv = (aendr, forvent) => { const x = JSON.parse(JSON.stringify(u.manifest)); aendr(x.maerker[0]); assert.match(G.valider(x, laes).join('\n'), forvent); };
  prøv(x => { x.varianter.lockup = { fil: 'img/brands/fx-mark.svg' }; }, /ukendt variant/);
  prøv(x => { x.varianter.emblem.fil = 'img/brands/findes-ikke.svg'; }, /findes ikke/);
  prøv(x => { x.varianter.emblem.fil = '../x.svg'; }, /skal være img\/brands/);
  prøv(x => { x.varianter.emblem.fil = x.fil; }, /samme fil som hovedfilen/);
  prøv(x => { x.fil = null; x.godkendt = false; }, /kræver at mærket selv har en fil/);
  // et mærke uden godkendelse får ingen logo-data, heller ikke emblem
  const ugk = JSON.parse(JSON.stringify(u.manifest)); ugk.maerker[0].godkendt = false;
  assert.equal(G.byggData(ugk).m[0].l, undefined);
});

/* ---------- A12: CSS ---------- */

test('A12 p-brand-logo.css: ingen hårdkodede farver, og slotmålene følger SLOT i kernen', () => {
  const css = fs.readFileSync(path.join(ROOT, 'css', 'p-brand-logo.css'), 'utf8');
  const uden = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(uden, /#[0-9a-f]{3,8}\b/i, 'hex-farve');
  assert.doesNotMatch(uden, /\b(rgb|rgba|hsl|hsla)\(/i);
  assert.doesNotMatch(uden, /:\s*(white|black|red|green|blue|orange)\b/i);
  for (const [navn, [h, w, k]] of Object.entries(BL.SLOT)){
    const moenster = navn === 'hero' ? '@media \\(min-width:700px\\)\\{ \\.bl--hero' : `\\.bl--${navn}`;
    const regel = new RegExp(`${moenster}\\{[^}]*--bl-maxh:(\\d+)px;[^}]*--bl-maxw:(\\d+)px;[^}]*--bl-k:([\\d.]+)px`).exec(uden);
    assert.ok(regel, `.bl--${navn} mangler i CSS`);
    assert.equal(+regel[1], h, `${navn} højde`); assert.equal(+regel[2], w, `${navn} bredde`); assert.equal(+regel[3], k, `${navn} k (√maks. areal)`);
  }
  // bredden følger højde, bredde OG areal (ens visuel vægt)
  assert.match(uden, /width: min\(var\(--bl-maxw\), calc\(var\(--bl-maxh\) \* var\(--bl-ar\)\), calc\(var\(--bl-k\) \* var\(--bl-sa\)\)\)/);
  assert.match(uden, /\.bl-spalte--sm\{ width:56px;/, 'den lille kolonne er lige så bred som sm-slotten');
  assert.equal(BL.SLOT.sm[1], 56);
  // før klienten har hentet filen er masken en TOM svg (aldrig en massiv blok), og computed style afhænger ikke af klasser, der sættes asynkront
  assert.match(uden, /\.bl-mark\{[^}]*mask-image: var\(--bl-u, url\("data:image\/svg\+xml,%3Csvg xmlns='http:\/\/www\.w3\.org\/2000\/svg'\/%3E"\)\)/);
  assert.doesNotMatch(uden, /visibility:\s*(hidden|visible)|bl--klar/);
  assert.doesNotMatch(uden, /bl-probe/);
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

test('A3/A17 kernen har ingen afhængigheder; render-laget bruger hverken fetch, eval eller DOM — klient-laget henter kun img/brands/*.svg', () => {
  const k = fs.readFileSync(path.join(ROOT, 'js', 'brand-logos.js'), 'utf8');
  const kode = k.replace(/\/\*[\s\S]*?\*\//g, '');
  // render-laget (alt før klient-blokken) er rent: det kører også i Node/generatorerne
  const klientStart = kode.indexOf('const doc = rod && rod.document;');
  assert.ok(klientStart > 0, 'klient-blokken skal være afgrænset');
  assert.doesNotMatch(kode.slice(0, klientStart), /\bfetch\s*\(|XMLHttpRequest|\beval\s*\(|new Function|innerHTML|document\.|rod\.document|MutationObserver/);
  // klient-laget: ét fetch-kald, kun til filer, der matcher img/brands/<navn>.svg (data-attributten valideres først); ingen eval/innerHTML
  const klient = kode.slice(klientStart);
  assert.equal((klient.match(/\bfetch\s*\(/g) || []).length, 1, 'netop ét fetch-kald (ÉN hentning pr. fil)');
  assert.match(klient, /const FIL_OK = \/\^img\\\/brands\\\/\[a-z0-9\]\[a-z0-9-\]\*\\\.svg\$\/;/);
  assert.match(klient, /!FIL_OK\.test\(src\)/);
  assert.doesNotMatch(klient, /XMLHttpRequest|\beval\s*\(|new Function|innerHTML|document\.write/);
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

test('P2-3 hero: et logo, hvis tegning selv bærer navnet (Harley-Davidson-skjoldet, Ducati-skjoldet), er ikke "emblem" i manifestet — så viser hero kun logoet, ikke navnet to gange', () => {
  for (const slug of ['harley-davidson', 'ducati']){
    const e = manifest.maerker.find(m => m.slug === slug);
    assert.ok(e, slug);
    assert.notEqual(e.variant, 'emblem', `${slug}: filen indeholder navnet; variant 'emblem' ville give ekstra tekstlinje ved siden af logoet`);
    assert.equal(BL.logoFor(slug).variant, e.variant);
  }
  // generatoren skriver kun navnet ved siden af et emblem-only logo
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-brand-pages.js'), 'utf8');
  assert.match(src, /medNavn: l\.variant === 'emblem'/);
});
