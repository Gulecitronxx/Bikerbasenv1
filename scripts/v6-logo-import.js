#!/usr/bin/env node
/* V6 logoer: importerer de syv OFFICIELLE mærkelogoer (Wikimedia Commons, hentet 2026-10-21 efter ejerens ønske i chatten 2026-10-20) fra
   docs/review/gauntlet/v6/logoer/original/ til img/brands/<slug>.svg og opdaterer manifestet (img/brands/manifest.json).
   De erstatter AI-vektoriserede udkast (Yamaha, Suzuki, BMW, Kawasaki, KTM, Aprilia, CFMoto) og deres emblem-/ordmærke-varianter.

   Kør:  node scripts/v6-logo-import.js            skriv img/brands/<slug>.svg + manifestpost, fjern de erstattede udkastfiler og assets.json-poster
                                                   (derefter: node scripts/brand-logos-gen.js --opdater)
         node scripts/v6-logo-import.js --tjek     skriv intet; exit 1 hvis img/brands ikke er det, importeren ville lave

   Samme regler som V5 (scripts/v5-logo-import.js; renMetadata/normaliser er DEN SAMME kode):
   - Kun ROD-elementets attributter viewBox / width / height ændres — aldrig et path, en farve eller et andet element. Originalen ligger urørt
     (kilde_hash i manifestet = hash af originalen; hash = hash af filen i img/brands).
   - Metadata, kommentarer og editor-tilstand fjernes fra de UDGIVNE filer (renMetadata).
   - viewBox rettes KUN hvor den mangler (KTM) eller width/height ikke passer til den (BMW: 100 %). Måling (getBoundingClientRect pr. element, 2026-10-21):
     alle syv tegninger fylder deres viewBox fra kant til kant (højst 1,4 % luft), så ingen beskæring og ingen ny viewBox er nødvendig.
   - Ingen netværk. Intet hentes. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const G = require('./brand-logos-gen.js');
const V5 = require('./v5-logo-import.js');

const ROOT = path.join(__dirname, '..');
const KILDE_MAPPE = path.join(ROOT, 'docs', 'review', 'gauntlet', 'v6', 'logoer', 'original');
const BRANDS = path.join(ROOT, 'img', 'brands');
const HENTET = '2026-10-21';
const GODKENDT_AF = 'ejer (bad om download i chatten 2026-10-20)';
const GODKENDT_DATO = '2026-10-21';

/* variant = hvad filen viser: lockup (emblem + navn), ordmaerke (kun skrift/farveflade med skrift). viewBox: null = originalens bevares (eller, hvis den mangler,
   udledes af width/height). note = hvad der er gjort ved viewBox og hvorfor (kommer i manifestet). */
const SPEC = {
  'yamaha': { variant: 'lockup', viewBox: null, note: 'originalens viewBox (26,458 x 6,085) passer til tegningen (målt: højst 1,2 % luft) og til width/height (100 x 23); uændret. Valgt: lockuppen med stemmegaffel-emblem og ordmærke' },
  'suzuki': { variant: 'lockup', viewBox: null, note: 'originalens viewBox (0 0 144 28) passer til tegningen (målt: 1,4 % luft i bunden); uændret. Valgt: den vandrette lockup (S-emblem + ordmærke)' },
  'bmw': { variant: 'lockup', viewBox: null, note: 'originalens viewBox (0 0 811 173) passer til tegningen; width/height var 100 %, sat til viewBox-størrelsen (811 x 173), så slotmatematikken og billedet får numeriske mål. Filen er "BMW Motorrad"-logoet (rundel + skrift)' },
  'kawasaki': { variant: 'lockup', viewBox: null, note: 'originalens viewBox (0 0 168,332 x 29,999) passer til tegningen; uændret. Valgt: den vandrette lockup (River Mark-emblem + ordmærke)' },
  'ktm': { variant: 'ordmaerke', viewBox: null, note: 'originalen havde ingen viewBox; sat til width/height (779,528 x 305,652), som tegningen fylder kant til kant (orange flade 0-779,5 x 0-305,7)' },
  'aprilia': { variant: 'ordmaerke', viewBox: null, note: 'originalens viewBox (0 0 400 200) passer til tegningen (rød flade i hele viewBox); uændret. Det hvide registered-tegn i ordmærket er en del af udgiverens logo og er ikke rørt' },
  'cfmoto': { variant: 'lockup', viewBox: null, note: 'originalens viewBox (0 0 142 28) passer til tegningen og width/height; uændret' },
};
/* De mærker, hvis AI-udkast (img/brands/<slug>.svg + -emblem/-ordmaerke) erstattes af den officielle fil. */
const ERSTATTER_UDKAST = Object.keys(SPEC);
/* Tre mærker har stadig kun et AI-udkast: der findes ingen SVG på Wikimedia Commons (se docs/review/gauntlet/v6/logoer.md). */
const MANGLER_OFFICIEL = ['gasgas', 'zero', 'moto-guzzi'];

const LF = buf => Buffer.from(Buffer.from(buf).toString('utf8').split('\r\n').join('\n'), 'utf8');
const laes = slug => fs.readFileSync(path.join(KILDE_MAPPE, `${slug}.svg`));

function bygAlt(){
  const kilder = JSON.parse(fs.readFileSync(path.join(KILDE_MAPPE, 'kilder.json'), 'utf8'));
  const bySlug = new Map(kilder.map(k => [k.slug, k]));
  const filer = {};
  for (const slug of Object.keys(SPEC)){
    const k = bySlug.get(slug);
    if (!k) throw new Error(`${slug}: ikke i kilder.json`);
    const orig = LF(laes(slug)).toString('utf8');
    const raaHash = crypto.createHash('sha256').update(laes(slug)).digest('hex');
    const ren = V5.renMetadata(orig);
    filer[slug] = { kilde: k, original: orig, raaHash, raaBytes: laes(slug).length, ud: V5.normaliser(ren.tekst, SPEC[slug]), spec: SPEC[slug], renset: ren.opg };
  }
  return filer;
}

function opdaterManifest(manifest, filer){
  const kopi = JSON.parse(JSON.stringify(manifest));
  for (const [slug, f] of Object.entries(filer)){
    const m = kopi.maerker.find(x => x.slug === slug);
    if (!m) throw new Error(`${slug}: ingen post i manifestet (mærkeregistret skal have mærket)`);
    const kildeHash = G.sha256(Buffer.from(f.original, 'utf8'));
    const afvigelse = f.raaHash !== f.kilde.sha256;
    const hentet = f.kilde.hentet || HENTET;
    m.fil = `img/brands/${slug}.svg`;
    m.godkendt = true;
    m.kilde = f.kilde.kilde;
    m.kilde_url = f.kilde.originalUrl;
    m.licens = f.kilde.licens;
    m.hentet = hentet;
    m.kilde_fil = `docs/review/gauntlet/v6/logoer/original/${slug}.svg`;
    m.kilde_hash = kildeHash;
    m.variant = f.spec.variant;
    m.ensfarvet = false;
    m.autenticitet = 'officiel';
    m.kraever_officiel_fil = false;
    m.godkendt_af = GODKENDT_AF;
    m.godkendt_dato = GODKENDT_DATO;
    m.normalisering = f.spec.note + (f.renset.length ? '. Metadata fjernet fra den udgivne fil (ingen path/farve/geometri rørt): ' + f.renset.join(', ') : '. Ingen metadata at fjerne');
    delete m.varianter;
    delete m.bemaerkning;
    if (afvigelse) m.bemaerkning = `Den leverede fil (rå sha256 ${f.raaHash.slice(0, 12)}…) afviger fra hashen i kilder.json (${f.kilde.sha256.slice(0, 12)}…). Manifestet følger den fil, der faktisk ligger i kilde_fil.`;
    delete m.hash; delete m.bredde; delete m.hoejde;   // sættes af brand-logos-gen.js --opdater
  }
  return kopi;
}

/* Filer og poster der skal væk: AI-udkastenes emblem-/ordmærke-varianter (og for de syv slugs også assets.json-posten). */
function udkastFiler(){
  const ud = [];
  for (const slug of ERSTATTER_UDKAST) for (const v of ['emblem', 'ordmaerke']) ud.push(path.join(BRANDS, `${slug}-${v}.svg`));
  return ud.filter(f => fs.existsSync(f));
}

function koer(argv){
  const tjek = argv.includes('--tjek');
  const filer = bygAlt();
  let galt = 0;
  for (const [slug, f] of Object.entries(filer)){
    const mal = path.join(BRANDS, `${slug}.svg`);
    const nu = fs.existsSync(mal) ? LF(fs.readFileSync(mal)).toString('utf8') : null;
    if (tjek){
      if (nu !== f.ud){ console.error(`v6-logo-import: img/brands/${slug}.svg er ude af trit med importeren`); galt = 1; }
    } else {
      fs.writeFileSync(mal, f.ud, 'utf8');
    }
  }
  const rester = udkastFiler();
  const assetsFil = path.join(BRANDS, 'assets.json');
  const assets = JSON.parse(fs.readFileSync(assetsFil, 'utf8'));
  const assetRester = ERSTATTER_UDKAST.filter(s => assets[s] !== undefined);
  if (tjek){
    for (const f of rester){ console.error(`v6-logo-import: ${path.relative(ROOT, f)} skulle være fjernet`); galt = 1; }
    for (const s of assetRester){ console.error(`v6-logo-import: ${s} står stadig i assets.json`); galt = 1; }
    if (!galt) console.log(`v6-logo-import: ok (${Object.keys(filer).length} filer)`);
    return galt;
  }
  for (const f of rester) fs.unlinkSync(f);
  for (const s of assetRester) delete assets[s];
  fs.writeFileSync(assetsFil, JSON.stringify(assets, null, 2) + '\n', 'utf8');
  const man = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
  fs.writeFileSync(G.MANIFEST, JSON.stringify(opdaterManifest(man, filer), null, 2) + '\n', 'utf8');
  console.log(`v6-logo-import: skrev ${Object.keys(filer).length} filer og manifestposter, fjernede ${rester.length} udkastfiler — kør nu: node scripts/brand-logos-gen.js --opdater`);
  return 0;
}

if (require.main === module) process.exit(koer(process.argv.slice(2)));

module.exports = { SPEC, ERSTATTER_UDKAST, MANGLER_OFFICIEL, HENTET, KILDE_MAPPE, bygAlt, opdaterManifest, udkastFiler };
