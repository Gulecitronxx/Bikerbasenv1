/* V4 Agent 1: ÉT mærkeregister. Låser at
   (1) registret er rent: ingen dubletter, hvert mærke har belæg, slug = eksisterende URL-regel,
   (2) aliaser/stavemåder normaliseres til ét kanonisk mærke (CFMOTO/CFMoto/CF Moto, Zero/Zero Motorcycles, hd -> Harley-Davidson …),
   (3) ALLE forbrugere bruger registret: filter, søgning, opret-annonce, bro, generator, forside — og kan håndtere hvert registreret mærke,
   (4) lagerets mærker er 100 % håndteret (snapshot scripts/fixtures/maerke-lager.json): intet falder i "Ukendt" uden grund ("DKW 250"),
   (5) nye mærkenavne fra kilderne bliver ikke mærker af sig selv (kandidatvalidering), og et mærke uden annoncer får ingen side,
   (6) manglende logo giver aldrig manglende mærke.
   Kør: node --test scripts/maerke-register.test.js */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const R = require('../js/brands-registry.js');
const { slugify } = require('./slug');
const BrandLogos = require('../js/brand-logos.js');
const { udtraek, indsaet } = require('./maerke-register-gen.js');
const { analyser, snapshotRaekker, SNAPSHOT } = require('./maerke-kandidater.js');
const { browserModules } = require('./shared.js');

const laes = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const B = browserModules();
const DATA_SRC = laes('js/data.js');
/* data.js som browseren ser den: registret ligger INDE i data.js (ingen ekstra <script>-tag). */
const DATA = new Function(DATA_SRC + '\n;return { BrandRegistry, BRANDS_BY_MODEL, MODELLER_PR_MAERKE };')();

/* ---------- 1. Registrets renhed ---------- */

test('ingen dubletter: to mærker deler hverken navn, alias, nøgle eller slug', () => {
  assert.deepEqual(R.dubletter, []);
  const navne = R.alle().map(p => p.navn);
  assert.equal(new Set(navne.map(R.noegle)).size, navne.length, 'to mærkenavne har samme nøgle');
  const slugs = R.alle().map(p => p.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'to mærker har samme slug');
});

test('hvert mærke har belæg (kilder), kun kendte kildenøgler, og mærker uden selvstændigt belæg er udpeget ærligt', () => {
  const uden = [];
  for (const p of R.alle()) {
    assert.ok(p.kilder.length >= 1, `${p.navn}: ingen kilde`);
    for (const k of p.kilder) assert.ok(R.KILDER[k], `${p.navn}: ukendt kildenøgle ${k}`);
    assert.ok(['aktuel', 'historisk', 'ukendt'].includes(p.periode), `${p.navn}: periode ${p.periode}`);
    assert.match(p.land, /^[A-Z]{2}$/, `${p.navn}: landekode`);
    if (!p.verificeret) { uden.push(p.navn); assert.match(p.note, /ejerens bekræftelse/, `${p.navn}: uden belæg skal noten sige det`); }
  }
  assert.deepEqual(uden.sort(), ['Daelim', 'Super Soco', 'TM Racing'], 'listen over ubelagte mærker er ændret — opdatér dokumentationen');
  for (const [k, v] of Object.entries(R.KILDER)) if (/^https?:/.test(v)) new URL(v), assert.ok(k);
});

test('slug = scripts/slug.js slugify(navn) for alle mærker; ingen eksplicit slug der flytter en URL', () => {
  for (const p of R.alle()) assert.equal(p.slug, slugify(p.navn), `${p.navn}: slug ${p.slug} ≠ ${slugify(p.navn)}`);
});

test('URL\'er bevares: hver eksisterende maerke-<slug>.html er et registreret mærke med netop den slug', () => {
  const sider = fs.readdirSync(ROOT).filter(f => /^maerke-.+\.html$/.test(f)).map(f => f.replace(/^maerke-|\.html$/g, ''));
  assert.ok(sider.length >= 29, `forventede ≥ 29 mærkesider, fandt ${sider.length}`);
  for (const s of sider) {
    const p = R.fraSlug(s);
    assert.ok(p, `maerke-${s}.html har intet mærke i registret (ville blive slettet af byggeriet)`);
    assert.equal(R.slug(p.navn), s);
  }
});

test('registret har mindst alle mærkerne fra før V4 (ingen fjernet), og ingen mærker uden for den ægte liste', () => {
  const foer = ['Yamaha', 'Honda', 'Suzuki', 'Kawasaki', 'BMW', 'Ducati', 'KTM', 'Triumph', 'Harley-Davidson', 'Aprilia', 'Moto Guzzi', 'MV Agusta', 'Husqvarna',
    'Royal Enfield', 'Vespa', 'Piaggio', 'Benelli', 'Cagiva', 'Bimota', 'Norton', 'Indian', 'Zero', 'Energica', 'CFMoto', 'Zontes', 'Voge', 'Kymco', 'SYM', 'Hyosung',
    'Daelim', 'Bajaj', 'TVS', 'Hero MotoCorp', 'Yezdi', 'Ural', 'BSA', 'Beta', 'GasGas', 'Sherco', 'TM Racing', 'Fantic', 'SWM', 'Rieju', 'Nimbus', 'MZ', 'Peugeot', 'Sachs',
    'Buell', 'Victory', 'Can-Am', 'Keeway', 'Mash', 'Brixton', 'Lexmoto', 'QJMotor', 'Kove', 'Super Soco', 'Jawa', 'Gilera', 'Lambretta', 'Lauge Jensen', 'Bach', 'Rewaco', 'FB Mondial',
    'Derbi', 'Husaberg', 'Kreidler', 'Laverda', 'Maico', 'Montesa', 'Moto Morini', 'Ossa', 'Puch', 'Simson', 'Sur-Ron', 'Talaria', 'Zündapp'];
  for (const n of foer) assert.ok(R.find(n), `${n} mangler i registret`);
  // Ejerens liste (opgaven) — alle skal være med, inkl. dem der ikke var i V3
  for (const n of ['Yamaha', 'Honda', 'Kawasaki', 'Suzuki', 'BMW', 'Ducati', 'KTM', 'Triumph', 'Harley-Davidson', 'Royal Enfield', 'Aprilia', 'Benelli', 'CFMOTO', 'Husqvarna',
    'Indian', 'Moto Guzzi', 'MV Agusta', 'GASGAS', 'Zero', 'Piaggio', 'Vespa', 'BSA', 'Norton', 'Bimota', 'Beta', 'Sherco', 'Fantic', 'Rieju', 'Derbi', 'Gilera', 'Peugeot', 'SYM',
    'Kymco', 'Keeway', 'Hyosung', 'Mash', 'Voge', 'Zontes', 'QJMotor', 'Moto Morini', 'Brixton', 'Jawa', 'Ural', 'Can-Am', 'Buell', 'Victory', 'Husaberg', 'SWM', 'AJP', 'DKW']) {
    assert.ok(R.erKendt(n), `ejerens mærke ${n} er ikke registreret`);
  }
  assert.ok(R.alle().length >= 90);
});

/* ---------- 2. Normalisering ---------- */

test('aliaser, stavemåder og historiske betegnelser ender på ét kanonisk mærke', () => {
  const tabel = {
    CFMoto: ['CFMOTO', 'CFMoto', 'CF Moto', 'cf-moto', 'cf moto', 'cfmoto'],
    Zero: ['Zero', 'Zero Motorcycles', 'zero motorcycle', 'ZERO'],
    'Harley-Davidson': ['Harley-Davidson', 'harley davidson', 'Harley', 'hd', 'H-D', 'HARLEY-DAVIDSON'],
    'Royal Enfield': ['Royal Enfield', 'Royal-enfield', 'royalenfield'],
    'FB Mondial': ['Fb Mondial', 'fb-mondial', 'FB Mondial', 'F.B. Mondial'],
    SYM: ['Sym', 'SYM', 'sanyang'],
    BSA: ['Bsa', 'BSA', 'bsa'],
    GasGas: ['GASGAS', 'Gas Gas', 'gas-gas', 'GasGas'],
    'Lauge Jensen': ['Lauge', 'Lauge Jensen'],
    'MV Agusta': ['MV Agusta', 'mv-agusta', 'MVAgusta'],
    'Moto Guzzi': ['Moto-Guzzi', 'moto guzzi'],
    'Can-Am': ['Can-Am', 'Can Am', 'canam'],
    QJMotor: ['QJ Motor', 'QJMOTOR', 'qjmotor'],
    Zündapp: ['Zundapp', 'Zuendapp', 'Zündapp'],
    'Hero MotoCorp': ['Hero', 'Hero MotoCorp'],
  };
  for (const [kanonisk, varianter] of Object.entries(tabel)) {
    for (const v of varianter) assert.equal(R.normalise(v), kanonisk, `${v} -> ${R.normalise(v)}`);
  }
  for (const u of ['Ukendt', 'Andet Mærke', 'andet maerke', 'Andre mærker', 'Ikke oplyst', 'Uoplyst mærke']) assert.equal(R.normalise(u), 'Ukendt', u);
  for (const x of [null, undefined, '', '   ', {}]) assert.equal(R.normalise(x), null);
  assert.equal(R.kanonisk('Ny Fabrik'), 'Ny Fabrik', 'et ukendt navn returneres uændret (ingen gæt)');
});

test('"Ukendt" hedder "Uoplyst mærke" for brugeren; sentinellen bevares internt', () => {
  assert.equal(R.UKENDT, 'Ukendt');
  assert.equal(R.UKENDT_LABEL, 'Uoplyst mærke');
  for (const v of ['Ukendt', 'Andet Mærke', '', null, undefined]) assert.equal(R.visNavn(v), 'Uoplyst mærke');
  assert.equal(R.visNavn('cfmoto'), 'CFMoto');
  assert.equal(R.slug('Ukendt'), null, 'Uoplyst mærke har ingen mærkeside');
});

test('fraTekst læser kun et registreret mærke FØR mindst ét ord mere (ingen gæt)', () => {
  assert.equal(R.fraTekst('DKW 250'), 'DKW');
  assert.equal(R.fraTekst('CFMOTO MTX800'), 'CFMoto');
  assert.equal(R.fraTekst('Can-Am Spyder F3'), 'Can-Am');
  assert.equal(R.fraTekst('Moto Guzzi V7 Stone'), 'Moto Guzzi');
  assert.equal(R.fraTekst('Harley-Davidson FLHX'), 'Harley-Davidson');
  assert.equal(R.fraTekst('Honda'), null, 'mærket alene er ingen model');
  assert.equal(R.fraTekst('moto cross købes'), null);
  assert.equal(R.fraTekst('Andet mærke 123'), null);
  assert.equal(R.fraTekst(''), null);
});

/* ---------- 3. Alle forbrugere bruger registret ---------- */

test('data.js bærer registret (ingen ekstra <script>) og kopien er i trit med js/brands-registry.js', () => {
  assert.equal(indsaet(DATA_SRC, udtraek(laes('js/brands-registry.js'))), DATA_SRC, 'kør: node scripts/maerke-register-gen.js');
  const D = DATA.BrandRegistry;
  assert.equal(D.MAERKER_ANTAL, R.MAERKER_ANTAL);
  assert.deepEqual(D.dubletter, []);
  for (const v of ['CF Moto', 'Zero Motorcycles', 'hd', 'Andet Mærke', 'fb-mondial']) assert.equal(D.normalise(v), R.normalise(v));
  assert.deepEqual(D.valgbare(), R.valgbare());
});

test('BRANDS_BY_MODEL = alle registrerede mærker (kanoniske nøgler); ingen model-nøgle uden for registret', () => {
  const nogler = Object.keys(DATA.BRANDS_BY_MODEL).sort();
  assert.deepEqual(nogler, R.alle().map(p => p.navn).sort());
  for (const k of Object.keys(DATA.MODELLER_PR_MAERKE)) assert.equal(R.normalise(k), k, `model-nøglen "${k}" er ikke et kanonisk registernavn`);
  for (const [k, v] of Object.entries(DATA.BRANDS_BY_MODEL)) assert.ok(Array.isArray(v), k);
});

test('opret-annonce: ALLE registrerede mærker kan vælges (også dem uden annoncer og historiske)', () => {
  const kilde = laes('js/opret-annonce.js');
  assert.match(kilde, /BrandRegistry\.valgbare\(\)/, 'opret-annonce skal bygge mærkelisten af registret');
  assert.doesNotMatch(kilde, /Object\.keys\(BRANDS_BY_MODEL\)\.sort/);
  const valg = R.valgbare();
  for (const p of R.alle()) assert.ok(valg.includes(p.navn), `${p.navn} kan ikke vælges ved oprettelse`);
  for (const n of ['Vespa', 'DKW', 'Norton', 'Husaberg', 'Buell', 'Moto Morini']) assert.ok(valg.includes(n), n);
  assert.equal(new Set(valg).size, valg.length, 'dublet i valglisten');
});

test('filter og søgning: hvert registreret mærke — og hvert alias — finder en annonce med mærket', () => {
  const F = B.Filtrering;
  const mk = (brand, i) => ({ id: 'x' + i, brand, model: 'Testmodel', year: 2020, price: 10000, type: 'naked', title: `${brand} Testmodel` });
  const alle = R.alle().map((p, i) => mk(p.navn, i));
  for (const p of R.alle()) {
    for (const navn of [p.navn, p.navn.toUpperCase(), p.navn.toLowerCase(), ...p.aliaser]) {
      const ud = F.anvendFiltre(alle, { brands: [navn], types: [], models: [], regions: [], conditions: [], service: [], equipment: [], colors: [], q: '' }, null, null);
      assert.equal(ud.length, 1, `${p.navn}: filteret "${navn}" gav ${ud.length} annoncer`);
      assert.equal(ud[0].brand, p.navn);
    }
  }
  // "Uoplyst mærke" er et filter som alle andre: ?brands=Ukendt
  const ud = F.anvendFiltre([mk('Ukendt', 1), mk('Honda', 2)], { brands: ['Ukendt'], types: [], models: [], regions: [], conditions: [], service: [], equipment: [], colors: [], q: '' }, null, null);
  assert.deepEqual(ud.map(l => l.brand), ['Ukendt']);
});

test('søgesidens mærkefilter: kanoniserer URL, viser "Uoplyst mærke" sidst, søger på aliaser og bruger registret', () => {
  const s = laes('js/search.js');
  assert.match(s, /BrandRegistry\.kanonisk\(b\)/, 'readStateFromURL kanoniserer mærker');
  assert.match(s, /BrandRegistry\.visNavn\(b\)/, 'filteret viser registrets visningsnavn (Uoplyst mærke)');
  assert.match(s, /erUoplyst\(a\) - erUoplyst\(b\)/, '"Uoplyst mærke" sorteres sidst');
  assert.match(s, /\.aliaser/, 'mærkesøgningen kender aliaser');
  assert.doesNotMatch(s, /data-brand-row="\$\{escapeHTML\(b\.toLowerCase\(\)\)\}"/, 'den gamle søgetekst er væk');
});

test('forside og mærkegenerator bruger registret (ingen spredte lister, ingen "Ukendt"-streng-tjek)', () => {
  const home = laes('js/home.js');
  assert.match(home, /BrandRegistry\.erUkendt\(b\)/);
  assert.doesNotMatch(home, /b === 'Ukendt'/);
  const gen = laes('scripts/build-brand-pages.js');
  assert.match(gen, /require\('\.\.\/js\/brands-registry\.js'\)/);
  assert.match(gen, /MIN_LISTINGS_FULD_TEKST = BrandRegistry\.MIN_ANNONCER_INDEKS/);
  assert.doesNotMatch(gen, /const YDERLIGERE_KENDTE_MAERKER/);
  const bro = laes('js/backend-bridge.js');
  assert.doesNotMatch(bro, /const MAERKE_AKRONYM/);
  assert.doesNotMatch(bro, /Object\.keys\(BRANDS_BY_MODEL\)/);
});

test('mærkeoversigten (generatoren): "Flere mærker" dækker ALLE registrerede mærker uden annoncer, aktuelle og historiske hver for sig', () => {
  const { maerkerUdenLager } = require('./build-brand-pages.js');
  const opg = R.opgoer(['Honda', 'Honda', 'Yamaha', 'DKW', 'Ukendt']);
  assert.equal(opg.iLager.length, 3);
  assert.equal(opg.uoplyst, 1);
  const alleNavne = new Set([...opg.iLager.map(x => x.navn), ...opg.udenAnnoncer.aktuelle, ...opg.udenAnnoncer.historiske]);
  assert.equal(alleNavne.size, R.alle().length, 'et registreret mærke er hverken i lager eller på listen "uden annoncer"');
  assert.ok(opg.udenAnnoncer.historiske.includes('Buell'));
  assert.ok(!opg.udenAnnoncer.historiske.includes('DKW'), 'DKW har en annonce');
  assert.ok(opg.udenAnnoncer.aktuelle.includes('Vespa'));
  assert.deepEqual(maerkerUdenLager(opg.udenAnnoncer.aktuelle, ['Honda']).includes('Honda'), false);
});

/* ---------- 4. Lageret er 100 % håndteret ---------- */

test('lager-snapshot: hvert rå mærkenavn er registreret eller "uoplyst"; intet mærke uden for registret; DKW er ikke Ukendt', () => {
  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  assert.ok(snap.antal >= 700, `snapshot: ${snap.antal}`);
  const rows = snapshotRaekker(snap);
  const a = analyser(rows, { browser: B, modeller: DATA.MODELLER_PR_MAERKE });
  assert.equal(a.kandidater.length + a.afventer.length + a.afviste.length, 0, `uregistrerede navne i lageret: ${JSON.stringify([...a.kandidater, ...a.afventer, ...a.afviste].map(v => v.navn))}`);
  const antalPrMaerke = {};
  for (const r of rows) {
    const l = B.normalizeExternalListing(Object.assign({ kilde: {} }, r));
    assert.ok(l.brand === 'Ukendt' || R.erKendt(l.brand), `${l.brand} er ikke et registreret mærke`);
    assert.equal(l.brand, R.kanonisk(l.brand), `${l.brand} er ikke kanonisk stavet`);
    antalPrMaerke[l.brand] = (antalPrMaerke[l.brand] || 0) + (r.antal || 1);
  }
  assert.ok(antalPrMaerke.DKW >= 1, 'DKW 250 skal være DKW, ikke Ukendt');
  assert.ok((antalPrMaerke.Ukendt || 0) <= 1, `højst "moto købes" må stå som Uoplyst mærke, ikke ${antalPrMaerke.Ukendt}`);
  assert.deepEqual(a.uoplyst.map(u => u.titel), ['moto cross købes']);
  assert.ok(!('Royal-enfield' in antalPrMaerke) && !('Bsa' in antalPrMaerke) && !('Sym' in antalPrMaerke) && !('Fb Mondial' in antalPrMaerke) && !('Lauge' in antalPrMaerke));
  // De 29 mærker lageret havde før V4 + DKW
  for (const m of ['Honda', 'Harley-Davidson', 'Bach', 'Rewaco', 'Lauge Jensen', 'CFMoto', 'DKW', 'Fantic', 'Victory']) assert.ok(antalPrMaerke[m] >= 1, m);
});

test('hvert mærke der har en side i repoet, har mindst 1 annonce (ingen tom side) og er noindex under reglen', () => {
  const sider = fs.readdirSync(ROOT).filter(f => /^maerke-.+\.html$/.test(f));
  for (const f of sider) {
    const side = laes(f);
    const n = +((side.match(/data-mk-n>([\d.]+)</) || [])[1] || '0').replace('.', '');
    assert.ok(n >= 1, `${f}: tom mærkeside`);
    const regel = R.sideRegel(n);
    assert.equal(/name="robots" content="noindex/.test(side), !regel.indekserbar, `${f} (${n}): noindex-regel`);
  }
});

/* ---------- 5. Nye mærker fra kilderne ---------- */

test('et ukendt mærkenavn fra en kilde bliver IKKE et mærke: bro-annoncen står som Ukendt (Uoplyst mærke)', () => {
  for (const navn of ['Zyxwv', 'Hondaa', 'Z 900 RS', 'CB 500', 'Scooter', 'Test123']) {
    const l = B.normalizeExternalListing({ id: 'k1', maerke: navn, titel: `${navn} Standard`, url: 'https://guloggratis.dk/annonce/1', kilde: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' } });
    assert.equal(l.brand, 'Ukendt', `${navn} blev til mærket "${l.brand}"`);
  }
  // …men et registreret mærke, en kilde stave anderledes, læses korrekt
  const l = B.normalizeExternalListing({ id: 'k2', maerke: 'Zero Motorcycles', titel: 'Zero SR/F', url: 'https://x.dk/1', kilde: { navn: 'X', domaene: 'x.dk' } });
  assert.equal(l.brand, 'Zero');
});

test('kandidatvalidering: afvisning af stavefejl/modelnavne/generiske ord; kandidat kræver nok forekomster', () => {
  const modelNoegler = new Set(['mt07', 'z900', 'africatwin'].map(R.noegle));
  const v = (n, a) => R.vurderKandidat(n, a, { modelNoegler });
  assert.equal(v('Honda', 5).tilstand, 'registreret');
  assert.equal(v('Andet Mærke', 4).tilstand, 'registreret');
  assert.equal(v('Hondaa', 9).tilstand, 'afvist');
  assert.equal(v('Hondaa', 9).naermeste, 'Honda');
  assert.equal(v('Yamha', 9).tilstand, 'afvist');
  assert.equal(v('Z900', 9).tilstand, 'afvist');
  assert.equal(v('Africa Twin', 9).tilstand, 'afvist');
  assert.equal(v('MT-07', 9).tilstand, 'afvist', 'tal = modelnavn');
  assert.equal(v('Scooter', 20).tilstand, 'afvist');
  assert.equal(v('', 3).tilstand, 'afvist');
  assert.equal(v('Dette er en hel annoncetekst om en cykel', 5).tilstand, 'afvist');
  assert.equal(v('Nyfabrik', 2).tilstand, 'afventer');
  assert.equal(v('Nyfabrik', 3).tilstand, 'kandidat');
  assert.equal(R.vurderKandidat('Nyfabrik', 3, { min: 5 }).tilstand, 'afventer');
  // En kandidat ændrer ikke registret
  assert.equal(R.find('Nyfabrik'), null);
});

test('scripts/maerke-kandidater.js: rapporten logger kandidater i stedet for at udgive dem', () => {
  const rows = snapshotRaekker(JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')));
  rows.push({ maerke: 'Nyfabrik', titel: 'Nyfabrik Turbo 125', antal: 4 }, { maerke: 'Hondaa', titel: 'Hondaa CB', antal: 2 }, { maerke: 'Rarefabrik', titel: 'Rarefabrik X', antal: 1 });
  const a = analyser(rows, { browser: B, modeller: DATA.MODELLER_PR_MAERKE });
  assert.deepEqual(a.kandidater.map(v => v.navn), ['Nyfabrik']);
  assert.deepEqual(a.afventer.map(v => v.navn), ['Rarefabrik']);
  assert.deepEqual(a.afviste.map(v => v.navn), ['Hondaa']);
  assert.ok(a.uoplyst.some(u => /Nyfabrik/.test(u.titel)), 'kandidatens annoncer står som Uoplyst mærke, ikke som et nyt mærke');
});

test('sideregler: ingen tom side; tynd side er noindex; kun ≥ 5 annoncer er indekserbar', () => {
  assert.equal(R.MIN_ANNONCER_INDEKS, 5);
  assert.deepEqual(R.sideRegel(0), { side: false, indekserbar: false, tekstpakke: false });
  assert.deepEqual(R.sideRegel(1), { side: true, indekserbar: false, tekstpakke: false });
  assert.deepEqual(R.sideRegel(4), { side: true, indekserbar: false, tekstpakke: false });
  assert.deepEqual(R.sideRegel(5), { side: true, indekserbar: true, tekstpakke: true });
  assert.equal(R.status('Vespa', 0), 'uden-annoncer');
  assert.equal(R.status('DKW', 0), 'historisk');
  assert.equal(R.status('DKW', 1), 'aktiv');
});

/* ---------- 6. Logo-fallback ---------- */

test('manglende logo giver aldrig manglende mærke: hvert registreret mærke har logomarkup (logo eller monogram/ordmærke)', () => {
  const manifest = JSON.parse(laes('img/brands/manifest.json'));
  const slugs = new Set(manifest.maerker.map(m => m.slug));
  for (const p of R.alle()) {
    for (const str of ['sm', 'md', 'lg']) {
      const html = BrandLogos.logoHTML(p.navn, { storrelse: str, decorative: true });
      assert.ok(html && html.includes('class="bl '), `${p.navn} (${str}): intet logomarkup`);
      assert.ok(html.includes('bl-fb'), `${p.navn} (${str}): ingen fallback i markup`);
    }
    const key = R.logoNoegle(p.navn);
    if (slugs.has(key)) assert.equal(BrandLogos.logoFor(p.navn).slug, key);
  }
  const udenLogo = R.alle().filter(p => !BrandLogos.logoFor(p.navn).harLogo).map(p => p.navn);
  assert.ok(udenLogo.length > 0 && udenLogo.includes('DKW'), 'DKW har intet logo og skal alligevel kunne vises');
});

test('hver manifest-post (logo) peger på et registreret mærke, og alle manifestets navne/aliaser ender på samme mærke', () => {
  const manifest = JSON.parse(laes('img/brands/manifest.json'));
  for (const m of manifest.maerker) {
    const p = R.find(m.navn);
    assert.ok(p, `logo-manifestet har "${m.navn}", som ikke er i registret`);
    assert.equal(p.logo || p.slug, m.slug, `${m.navn}: registrets logo-nøgle ≠ manifestets slug`);
    assert.equal(m.navn, p.navn, `${m.slug}: manifestets navn bør være registrets kanoniske navn`);
    for (const a of m.aliaser || []) assert.equal(R.normalise(a), p.navn, `alias "${a}" fra manifestet ender ikke på ${p.navn}`);
  }
});
