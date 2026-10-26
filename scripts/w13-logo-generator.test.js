/* W13 logo-system: scripts/build-brand-pages.js på SYNTETISK lager i en KOPI udenfor repoet (os.tmpdir()/w13-logo/…).
   Intet netværk, ingen produktion, ingen skrivning i repoet. Placeholder-SVG'er (simple former, ikke rigtige logoer) bruges til
   at bevise, at systemet virker, når et logo bliver godkendt — uden at ét rigtigt logo findes i repoet. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const H = require('./__fixtures__/w13-logo-hjaelp.js');

/* V7 QA: EGEN mappe pr. kørsel. Den faste %TEMP%\w13-logo blev delt af alle worktrees og alle kørsler: kopierRepo() kopierer oven i det, der lå (fra en
   anden worktrees kode), og `udgiv.js` sletter _site mens en anden kørsel skriver (ENOTEMPTY, målt i npm test-kørsel 2 af 2). */
const BASE = fs.mkdtempSync(path.join(os.tmpdir(), 'w13-logo-gen-'));
process.on('exit', () => { try { fs.rmSync(BASE, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { /* ryd op er bedste forsøg */ } });
const dirAf = n => path.join(BASE, n);
const les = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
const maerkeFiler = dir => fs.readdirSync(dir).filter(f => /^maerke-.+\.html$/.test(f)).sort();

let fra, til, til2;
test.before(() => {
  fra = H.bygKopi(dirAf('gen-fra'), { logoer: false });
  til = H.bygKopi(dirAf('gen-til'), { logoer: true });
  til2 = H.bygKopi(dirAf('gen-til2'), { logoer: true });
});

const antal = (s, re) => (s.match(re) || []).length;

test('A15 uden godkendt logo er mærkesidens hero og CTA uændret (monogram + tekstlinje); ingen logo-scripts, intet logo-stilark', () => {
  const html = les(fra, 'maerke-honda.html');
  assert.match(html, /<p class="mk-wordmark" aria-hidden="true"><span class="mk-mono">H<\/span><span>Honda<\/span><\/p>/);
  assert.match(html, /<p class="mk-cta-navn" aria-hidden="true">Honda<\/p>/);
  assert.doesNotMatch(html, /p-brand-logo\.css|brand-logos/);
  assert.doesNotMatch(html, /class="bl[ "]/);
  const hd = les(fra, 'maerke-harley-davidson.html');
  assert.match(hd, /<span class="mk-mono">HD<\/span><span>Harley-Davidson<\/span>/);
  assert.match(hd, /mk-wordmark mk-wordmark-lang"/);
});

test('A15 maerker.html uden logo: topfliser har monogram-slot, A-Z uændret, hurtigsøg skjult uden JS, logo-CSS linket, scripts ikke', () => {
  const html = les(fra, 'maerker.html');
  const fliser = html.match(/<a class="mk-brandtile"[\s\S]*?<\/a>/g);
  assert.equal(fliser.length, 8, 'de 8 mærker med flest annoncer');
  for (const f of fliser){
    assert.match(f, /<span class="mk-brandtile-logo"><span class="bl bl--lg bl--mono" data-bl="[a-z0-9-]+" aria-hidden="true">/);
    assert.match(f, /mk-brandtile-navn/); assert.match(f, /mk-brandtile-n/);
  }
  assert.equal(antal(html, /mk-az-logo/g), 0, 'A-Z får først logokolonne, når mindst ét logo er godkendt');
  assert.match(html, /<div class="mk-hurtigsoeg" data-mk-hurtigsoeg hidden>/);
  assert.match(html, /<script defer src="js\/maerker-sog\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="css\/p-brand-logo\.css">/);
  assert.doesNotMatch(html, /brand-logos(-data)?\.js/);
  assert.doesNotMatch(html, /<img[^>]*class="bl-/);
});

test('A15 med godkendte placeholder-logoer: hero, CTA, topfliser og A-Z bruger logoHTML; mærker uden logo får monogram i samme slot', () => {
  const honda = les(til, 'maerke-honda.html');   // emblem (ring)
  assert.match(honda, /<p class="mk-wordmark mk-wordmark--logo" aria-hidden="true"><span class="bl bl--hero bl--logo" data-bl="honda"/);
  assert.match(honda, /<\/span><span>Honda<\/span><\/p>/, 'emblem: navnet står ved siden af');
  assert.match(honda, /<p class="mk-cta-navn mk-cta-navn--logo" aria-hidden="true"><span class="bl bl--lg bl--logo" data-bl="honda"/);
  assert.match(honda, /<link rel="stylesheet" href="css\/p-brand-logo\.css">/);
  assert.match(honda, /<script defer src="js\/brand-logos-data\.js"><\/script>\s*<script defer src="js\/brand-logos\.js"><\/script>/);
  assert.match(honda, /<span class="bl-mark" data-bl-src="img\/brands\/fx-ring\.svg"><\/span><img class="bl-ref" src="img\/brands\/fx-ring\.svg" alt="" width="\d+" height="\d+" loading="lazy" hidden>/,
    'maske + statisk filreference (skjult, lazy) til udgiv.js; ingen bl-probe');
  assert.doesNotMatch(honda, /bl-probe|mask-image/);
  assert.match(honda, /<noscript><style>\.bl--logo>\.bl-fb\{display:inline-flex\}\.bl--logo>\.bl-mark\{display:none\}<\/style><\/noscript>/, 'uden JS vises ordmærke/monogram i stedet for tom plads');
  assert.match(honda, /<span class="bl bl--hero bl--logo" data-bl="honda" style="--bl-ar:1;--bl-sa:1"/, 'hero-slot (72 px høj i CSS)');

  const kawa = les(til, 'maerke-kawasaki.html');  // ordmærke: logoet ER navnet -> ingen ekstra tekst
  assert.doesNotMatch(kawa, /bl--hero[^]*?<\/span><span>Kawasaki<\/span><\/p>/);
  assert.match(kawa, /<p class="mk-wordmark mk-wordmark--logo"[^>]*><span class="bl bl--hero bl--logo" data-bl="kawasaki" style="--bl-ar:4;--bl-sa:2"/);

  /* P2-3: et logo, der selv bærer navnet (lockup/ordmærke), står ALENE i hero — ingen ekstra tekstlinje (Harley-Davidson viste før logo + stor tekst).
     Kun emblem-only logoer (variant 'emblem') får navnet ved siden af. Ducati er 'lockup' i testmanifestet. */
  const duc = les(til, 'maerke-ducati.html');
  assert.match(duc, /<p class="mk-wordmark mk-wordmark--logo" aria-hidden="true"><span class="bl bl--hero bl--logo" data-bl="ducati"/);
  assert.doesNotMatch(duc, /<p class="mk-wordmark[^>]*>(?:(?!<\/p>)[^])*<span>Ducati<\/span><\/p>/, 'ingen dobbelt navn i hero');
  assert.match(duc, /<p class="mk-cta-navn mk-cta-navn--logo" aria-hidden="true"><span class="bl bl--lg bl--logo" data-bl="ducati"[^]*?<\/span><\/p>/);
  assert.doesNotMatch(duc, /mk-cta-navn--logo[^]{0,500}<span>Ducati<\/span><\/p>/, 'ingen dobbelt navn i CTA');

  const bsa = les(til, 'maerke-bsa.html');        // intet logo -> uændret hero, intet logo-stilark/script
  assert.match(bsa, /<span class="mk-mono">B<\/span><span>BSA<\/span>/);
  assert.doesNotMatch(bsa, /p-brand-logo\.css|brand-logos/);

  const idx = les(til, 'maerker.html');
  const fliser = idx.match(/<a class="mk-brandtile"[\s\S]*?<\/a>/g);
  assert.equal(fliser.length, 8);
  for (const f of fliser) assert.match(f, /class="bl bl--lg bl--(logo|mono)[ "]/);
  assert.ok(fliser.some(f => /bl--logo/.test(f)) && fliser.some(f => /bl--mono/.test(f)), 'både logo- og monogramfliser — samme slot');
  const rk = idx.match(/<li data-mk-soeg="[^"]*"><a [\s\S]*?<\/li>/g);   // A–Z-rækkerne (V5: "Flere mærker"-pillerne har også data-mk-soeg, men er tekst)
  assert.ok(rk.length >= 29);
  assert.equal(antal(idx, /<span class="mk-az-logo">/g), rk.length, 'A-Z: logokolonne på ALLE rækker, ellers hopper navnene');
  for (const r of rk) assert.match(r, /class="bl bl--az bl--(logo|mono)[ "]/);
  assert.match(idx, /<script defer src="js\/brand-logos-data\.js"><\/script>\s*<script defer src="js\/brand-logos\.js"><\/script>\s*<script defer src="js\/maerke\.js">/);
  // ingen pr.-mærke-hårdkodning: ALLE logoreferencer kommer fra manifestet
  for (const m of idx.matchAll(/img\/brands\/([a-z0-9-]+\.svg)/g)) assert.ok(Object.values(H.TILDELING).some(t => t.includes(m[1])), m[1]);

  /* P2-2: A–Z viser et logo for HVERT mærke, der har et godkendt logo (også brede: Kawasaki, KTM) — ikke monogram — og monogram for resten,
     i samme (V6: 80 px, slot az) kolonne. az vælger emblem-varianten, hvor manifestet har en; ellers hovedfilen. */
  const raekkeFor = slug => rk.find(r => r.includes(`href="maerke-${slug}.html"`));
  for (const slug of Object.keys(H.TILDELING)){
    const r = raekkeFor(slug);
    if (!r) continue;   // mærket har ingen side i det syntetiske lager
    assert.match(r, /class="bl bl--az bl--logo[ "]/, `${slug}: logo i A–Z`);
    assert.doesNotMatch(r, /bl--mono/, `${slug}: ikke monogram`);
    const em = H.TILDELING[slug][3];
    assert.match(r, new RegExp(`(?:data-bl-src|src)="img/brands/${(em || H.TILDELING[slug][0]).replace('.', '\\.')}"`), `${slug}: ${em ? 'emblem-variant' : 'hovedfil'} i sm`);
  }
  assert.match(raekkeFor('kawasaki'), /bl--emblem/);
  assert.match(raekkeFor('bsa'), /bl--az bl--mono/);
  assert.ok(rk.filter(r => /bl--logo/.test(r)).length >= 5 && rk.filter(r => /bl--mono/.test(r)).length >= 10);
  assert.match(les(til, 'css/p-maerke.css'), /\.mk-az-logo\{[^}]*width:80px/);
});

test('A15 aliaser står i hver A-Z-række (hurtigsøg finder "harley" og "bmw motorrad")', () => {
  const idx = les(fra, 'maerker.html');
  const hd = /<li data-mk-soeg="([^"]*)"><a href="maerke-harley-davidson\.html"/.exec(idx);
  assert.ok(hd, 'Harley-Davidson-række');
  for (const t of ['harley-davidson', 'harley', 'hd', 'h-d']) assert.ok(hd[1].split('|').includes(t), t);
  assert.match(idx, /data-mk-soeg="bmw|bmw motorrad"/);
});

test('A15 generatoren er deterministisk: to byg giver byte-identiske sider (med og uden logoer)', () => {
  const a = ['maerker.html', ...maerkeFiler(til)];
  assert.ok(a.length >= 30);
  assert.deepEqual(maerkeFiler(til2), maerkeFiler(til));
  for (const f of a) assert.equal(les(til, f), les(til2, f), f);
  // og et byg uden logoer ændrer sig ikke ved at logofiler/manifest findes (default = uændret)
  const igen = H.bygKopi(dirAf('gen-fra2'), { logoer: false });
  for (const f of ['maerker.html', 'maerke-honda.html', 'maerke-bsa.html']) assert.equal(les(fra, f), les(igen, f), f);
});

test('A15 alle mærke-links peger på eksisterende filer — i det byggede output og i det committede maerker.html', () => {
  for (const [dir, navn] of [[til, 'byg'], [fra, 'byg uden logo'], [H.ROOT, 'repoet']]){
    const html = les(dir, 'maerker.html');
    const links = [...new Set([...html.matchAll(/href="(maerke-[a-z0-9-]+\.html)"/g)].map(m => m[1]))];
    assert.ok(links.length >= 25, `${navn}: ${links.length} links`);
    for (const l of links) assert.ok(fs.existsSync(path.join(dir, l)), `${navn}: ${l} findes ikke`);
  }
});

test('A14 udgiv.js: logo-SVG\'er kopieres til _site, og en manglende logofil afbryder udgivelsen (ingen stille 404)', () => {
  const env = { ...process.env, NODE_PATH: path.join(H.ROOT, 'node_modules') };
  const koer = dir => spawnSync(process.execPath, [path.join(dir, 'scripts', 'udgiv.js')], { cwd: dir, encoding: 'utf8', env, timeout: 120000 });
  const r = koer(til);
  const ud = (r.stdout || '') + (r.stderr || '');
  assert.ok(fs.existsSync(path.join(til, '_site', 'img', 'brands', 'fx-ring.svg')), 'placeholder-SVG blev ikke udgivet:\n' + ud.slice(-600));
  for (const f of fs.readdirSync(H.FIX_DIR).filter(x => x.endsWith('.svg'))) assert.ok(fs.existsSync(path.join(til, '_site', 'img', 'brands', f)), f);
  assert.ok(fs.existsSync(path.join(til, '_site', 'js', 'brand-logos.js')) && fs.existsSync(path.join(til, '_site', 'js', 'brand-logos-data.js')));
  assert.ok(fs.existsSync(path.join(til, '_site', 'css', 'p-brand-logo.css')));
  assert.ok(!fs.existsSync(path.join(til, '_site', 'img', 'brands', 'manifest.json')), 'manifestet udgives ikke');
  assert.doesNotMatch(ud, /img\/brands/, 'ingen logoreference mangler i udgivelsen (kun de syntetiske annoncesider kan mangle her)');

  // negativ: fjern én logofil i kopien -> udgiv afbryder og nævner filen
  fs.unlinkSync(path.join(til, 'img', 'brands', 'fx-ring.svg'));
  const r2 = koer(til);
  const ud2 = (r2.stdout || '') + (r2.stderr || '');
  assert.match(ud2, /AFBRUDT/);
  assert.match(ud2, /img\/brands\/fx-ring\.svg/, 'udgiv skal nævne den manglende logofil');
  H.kopierSvg(til);   // gendan
});

test('A11/A15 kopien rørte ikke repoet (ingen skrivning udenfor tmp)', () => {
  const r = spawnSync('git', ['status', '--porcelain', '--', 'maerker.html', 'maerke-honda.html', 'sitemap.xml', 'robots.txt', 'img/brands'], { cwd: H.ROOT, encoding: 'utf8' });
  assert.equal(r.stdout.trim(), '', 'generatortesten må ikke ændre genererede filer i repoet');
});
