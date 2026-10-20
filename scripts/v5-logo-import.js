#!/usr/bin/env node
/* V5 logoer: importerer de OFFICIELLE mærkelogoer (Wikimedia Commons, hentet 2026-10-20 efter ejerens ønske i chatten) fra
   docs/review/gauntlet/v5/logoer/original/ til img/brands/<slug>.svg og opdaterer manifestet (img/brands/manifest.json).

   Kør:  node scripts/v5-logo-import.js            skriv img/brands/<slug>.svg + manifestpost (derefter: node scripts/brand-logos-gen.js --opdater)
         node scripts/v5-logo-import.js --tjek     skriv intet; exit 1 hvis filerne i img/brands ikke er det, importeren ville lave

   Regler (V5-beslutninger, forklaret i docs/review/gauntlet/v5/logoer.md):
   - Kun ROD-elementets attributter viewBox / width / height ændres — aldrig et path, en farve eller et andet element. Originalen ligger
     urørt i docs/review/gauntlet/v5/logoer/original/ (kilde_hash i manifestet = hash af originalen; hash = hash af filen i img/brands).
   - viewBox-beskæring bruges KUN, hvor en slogan/firmanavn ligger helt uden for logoets egen tegning (Honda, Triumph, Kymco; målt med
     getBoundingClientRect pr. element), og hvor originalens viewBox manglede, var forkert eller havde meget luft (AJP, Benelli, DKW,
     Rieju, SYM). Kan sloganet ikke fjernes rent med et rektangel (Rieju: tagline og logo overlapper lodret), vises filen uændret.
   - Ingen netværk. Intet hentes. */

const fs = require('fs');
const path = require('path');
const G = require('./brand-logos-gen.js');

const ROOT = path.join(__dirname, '..');
const KILDE_MAPPE = path.join(ROOT, 'docs', 'review', 'gauntlet', 'v5', 'logoer', 'original');
const HENTET = '2026-10-20';
const GODKENDT_AF = 'ejer (bad om download i chatten 2026-10-20)';

/* viewBox: [x, y, bredde, højde] eller null (originalens bevares). variant = hvad filen viser: lockup (emblem + navn), emblem (uden navn:
   navnet skrives ved siden af), ordmaerke (kun skrift). note = hvad der er gjort ved viewBox og hvorfor (kommer i manifestet). */
const SPEC = {
  'ajp': { variant: 'lockup', viewBox: [59, 296, 458, 249], note: 'viewBox beskåret til tegningens egne grænser (originalen havde ca. 20 % luft rundt om)' },
  'benelli': { variant: 'ordmaerke', viewBox: [136, 101.3, 341.5, 63.2], note: 'originalens viewBox (220 90 170 80, forhold 2,1) passer ikke til tegningen (x 136-477, forhold 5,4); den virkede kun, fordi width/height (700 x 160) gav et bredere billedfelt. Med slotmatematikken (forholdet læses fra viewBox) ville logoet blive klemt; viewBox sat til tegningens egne grænser' },
  'bimota': { variant: 'lockup', viewBox: null },
  'dkw': { variant: 'lockup', viewBox: [0, 0, 1215.5, 617.49], note: 'originalen havde ingen viewBox; sat til width/height' },
  'ducati': { variant: 'lockup', viewBox: null },
  'fantic': { variant: 'ordmaerke', viewBox: null },
  'gilera': { variant: 'emblem', viewBox: null },
  'harley-davidson': { variant: 'emblem', viewBox: null },
  'honda': { variant: 'ordmaerke', viewBox: [0, 0, 300, 36.5], note: 'sloganet "The Power of Dreams" (y 50,7-67,8) ligger under logoet (y 0-36,5); viewBox beskåret til y 0-36,5, ingen path rørt' },
  'husqvarna': { variant: 'lockup', viewBox: null },
  'indian': { variant: 'ordmaerke', viewBox: null },
  'keeway': { variant: 'ordmaerke', viewBox: null },
  'kymco': { variant: 'lockup', viewBox: [0, 0, 200, 31.6], note: 'det kinesiske firmanavn (y 41,4-55) ligger under logoet (y 0-31,5); viewBox beskåret til y 0-31,6, ingen path rørt' },
  'mv-agusta': { variant: 'emblem', viewBox: null },
  'piaggio': { variant: 'emblem', viewBox: null },
  'rieju': { variant: 'lockup', viewBox: [101, 103.5, 1398, 193], note: 'originalen havde ingen viewBox; sat til tegningens egne grænser. Den lille tagline "For everyday adventure" er IKKE beskåret: den overlapper logoets ovale emblem lodret, så et rektangel kan ikke fjerne den rent' },
  'royal-enfield': { variant: 'ordmaerke', viewBox: null },
  'sherco': { variant: 'ordmaerke', viewBox: null },
  'sym': { variant: 'ordmaerke', viewBox: [-20000, 10500000, 248040000, 87450000], note: 'viewBox (248000000 x 97899983) følger pathenes koordinater (CorelDRAW, enhed 1e-5) og er bevaret i skala; kun tomrummet øverst er skåret væk. width/height sat til 1000x353' },
  'triumph': { variant: 'emblem', viewBox: [35, 0, 130, 116.5], note: 'sloganet "FOR THE RIDE" (y 129-152) ligger under emblemet (y 1-115,3); viewBox beskåret til emblemet, ingen path rørt' },
  'vespa': { variant: 'ordmaerke', viewBox: null, note: 'width/height var 100 %; sat til viewBox-størrelsen' },
};
/* Mærker, hvor et AI-udkast (img/brands/<slug>.svg + -emblem/-ordmaerke) erstattes af den officielle fil. */
const ERSTATTER_UDKAST = ['honda', 'harley-davidson', 'indian', 'benelli', 'triumph', 'royal-enfield', 'ducati', 'mv-agusta', 'husqvarna', 'piaggio'];

const tal = n => String(Math.round(n * 1000) / 1000);

/* Persondata og redigeringsrester fjernes fra de FILER, SOM UDGIVES (img/brands/*.svg): kommentarer (generator-/forfatterlinjer med navne), RDF/Creative
   Commons-metadata, editor-tilstand (sodipodi:namedview, docname, version) og data-name-attributter (SYM: uploaderens mailadresse). Kun metadata — aldrig paths,
   farver, defs, style eller geometri. Returnerer { tekst, opg } hvor opg er en kort liste til manifestets 'normalisering'. */
function renMetadata(tekst){
  let t = tekst; const opg = [];
  const tael = (re, navn) => { let n = 0; t = t.replace(re, () => { n++; return ''; }); if (n) opg.push(`${n} ${navn}`); };
  tael(/<!--[\s\S]*?-->[ \t]*\r?\n?/g, 'kommentar(er) (generator-/forfatterlinjer)');
  tael(/<metadata\b[^>]*\/>[ \t]*\r?\n?/g, 'tom metadata-blok');
  tael(/[ \t]*<metadata\b[^>]*[^/]>[\s\S]*?<\/metadata>[ \t]*\r?\n?/g, 'metadata-blok(ke) (RDF/Creative Commons)');
  tael(/[ \t]*<sodipodi:namedview\b[\s\S]*?\/>[ \t]*\r?\n?/g, 'sodipodi:namedview (editor-tilstand)');
  tael(/\s+data-name\s*=\s*"[^"]*"/g, 'data-name-attribut');
  tael(/\s+sodipodi:docname\s*=\s*"[^"]*"/g, 'sodipodi:docname');
  tael(/\s+inkscape:(?:version|export-filename|export-xdpi|export-ydpi)\s*=\s*"[^"]*"/g, 'inkscape-versions-/eksportattribut(ter)');
  return { tekst: t, opg };
}

/* Sætter (eller indsætter) én attribut i rod-tagget. */
function saetAttr(rod, navn, vaerdi){
  const re = new RegExp(`(\\s${navn}\\s*=\\s*)(["'])[^"']*\\2`);
  if (re.test(rod)) return rod.replace(re, (m, a) => `${a}"${vaerdi}"`);
  return rod.replace(/\s*\/?>$/, m => ` ${navn}="${vaerdi}"${m}`);
}
function attr(rod, navn){
  const m = new RegExp(`\\s${navn}\\s*=\\s*(["'])([^"']*)\\1`).exec(rod);
  return m ? m[2] : null;
}

/* Ren funktion: original-tekst + spec -> den normaliserede tekst (kun rod-tagget ændres). */
function normaliser(tekst, spec){
  const m = /<svg\b[^>]*>/.exec(tekst);
  if (!m) throw new Error('ingen <svg>-rod');
  let rod = m[0];
  const fuldRod = rod;
  const erTal = v => v != null && /^[\d.]+(px)?$/.test(v);
  const vbTekst = attr(rod, 'viewBox');
  let vb = vbTekst ? vbTekst.trim().split(/[\s,]+/).map(Number) : null;
  if (spec.viewBox){
    vb = spec.viewBox;
    rod = saetAttr(rod, 'viewBox', vb.map(tal).join(' '));
  }
  if (!vb){
    const w = parseFloat(attr(rod, 'width')), h = parseFloat(attr(rod, 'height'));
    if (!(w > 0 && h > 0)) throw new Error('hverken viewBox eller width/height');
    vb = [0, 0, w, h];
    rod = saetAttr(rod, 'viewBox', `0 0 ${tal(w)} ${tal(h)}`);
  }
  const w0 = attr(rod, 'width'), h0 = attr(rod, 'height');
  const forhold = vb[2] / vb[3];
  const passer = erTal(w0) && erTal(h0) && Math.abs(parseFloat(w0) / parseFloat(h0) / forhold - 1) < 0.005;
  if (spec.viewBox || !passer){
    const w = vb[2] <= 2000 ? vb[2] : 1000;
    rod = saetAttr(rod, 'width', tal(w));
    rod = saetAttr(rod, 'height', tal(w / forhold));
  }
  return tekst.replace(fuldRod, () => rod);
}

function laes(slug){ return fs.readFileSync(path.join(KILDE_MAPPE, `${slug}.svg`)); }
const LF = buf => Buffer.from(Buffer.from(buf).toString('utf8').split('\r\n').join('\n'), 'utf8');

function bygAlt(){
  const kilder = JSON.parse(fs.readFileSync(path.join(KILDE_MAPPE, 'kilder.json'), 'utf8'));
  const bySlug = new Map(kilder.map(k => [k.slug, k]));
  const filer = {};
  for (const slug of Object.keys(SPEC)){
    const k = bySlug.get(slug);
    if (!k) throw new Error(`${slug}: ikke i kilder.json`);
    const orig = LF(laes(slug)).toString('utf8');
    /* kilder.json har det RÅ hash (flere originaler har CRLF); kilde_hash i manifestet er linjeskift-neutralt (som alle andre hash i systemet) */
    const raaHash = require('crypto').createHash('sha256').update(laes(slug)).digest('hex');
    const ren = renMetadata(orig);
    filer[slug] = { kilde: k, original: orig, raaHash, raaBytes: laes(slug).length, ud: normaliser(ren.tekst, SPEC[slug]), spec: SPEC[slug], renset: ren.opg };
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
    m.fil = `img/brands/${slug}.svg`;
    m.godkendt = true;
    m.kilde = f.kilde.kilde;
    m.kilde_url = f.kilde.originalUrl;
    m.licens = f.kilde.licens;
    m.hentet = HENTET;
    m.kilde_fil = `docs/review/gauntlet/v5/logoer/original/${slug}.svg`;
    m.kilde_hash = kildeHash;
    m.variant = f.spec.variant;
    m.ensfarvet = false;
    m.autenticitet = 'officiel';
    m.kraever_officiel_fil = false;
    m.godkendt_af = GODKENDT_AF;
    m.godkendt_dato = HENTET;
    m.normalisering = (f.spec.note || 'ingen ændring af viewBox (originalens bevares)') + (f.renset.length ? '. Metadata fjernet fra den udgivne fil (ingen path/farve/geometri rørt): ' + f.renset.join(', ') : '. Ingen metadata at fjerne');
    delete m.varianter;
    delete m.bemaerkning;
    if (slug === 'sym'){
      m.bemaerkning = 'kilder.json (download-loggen) angiver 3912 bytes og sha256 ' + f.kilde.sha256.slice(0, 12) + '…; den leverede fil var 1958 bytes (før mailadressen i docs-kopien blev erstattet): orkestratoren konverterede den fra UTF-16 til UTF-8 (derfor mindre), og kilder.json-hash/-størrelse stammer fra et tidligere, mislykket kørselsforsøg. Manifestet følger den fil, der ligger i kilde_fil. Uploaderens mailadresse i originalens data-name er erstattet med [fjernet] i docs-kopien (kilde_hash er hash af den redigerede kopi) og er fjernet helt fra den udgivne fil.';
    } else if (afvigelse){
      m.bemaerkning = `Den leverede fil (rå sha256 ${f.raaHash.slice(0, 12)}…) afviger fra hashen i kilder.json (${f.kilde.sha256.slice(0, 12)}…). Manifestet følger den fil, der faktisk ligger i kilde_fil.`;
    }
    // hash/bredde/hoejde sættes af brand-logos-gen.js --opdater (den ene sandhed om filen i img/brands)
    delete m.hash; delete m.bredde; delete m.hoejde;
  }
  return kopi;
}

function koer(argv){
  const tjek = argv.includes('--tjek');
  const filer = bygAlt();
  let galt = 0;
  for (const [slug, f] of Object.entries(filer)){
    const mal = path.join(ROOT, 'img', 'brands', `${slug}.svg`);
    const nu = fs.existsSync(mal) ? LF(fs.readFileSync(mal)).toString('utf8') : null;
    if (tjek){
      if (nu !== f.ud){ console.error(`v5-logo-import: img/brands/${slug}.svg er ude af trit med importeren`); galt = 1; }
    } else {
      fs.writeFileSync(mal, f.ud, 'utf8');
    }
  }
  if (!tjek){
    const man = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
    fs.writeFileSync(G.MANIFEST, JSON.stringify(opdaterManifest(man, filer), null, 2) + '\n', 'utf8');
    console.log(`v5-logo-import: skrev ${Object.keys(filer).length} filer og manifestposter — kør nu: node scripts/brand-logos-gen.js --opdater`);
  } else if (!galt) console.log(`v5-logo-import: ok (${Object.keys(filer).length} filer)`);
  return galt;
}

if (require.main === module) process.exit(koer(process.argv.slice(2)));

module.exports = { SPEC, ERSTATTER_UDKAST, normaliser, renMetadata, bygAlt, opdaterManifest, KILDE_MAPPE };
