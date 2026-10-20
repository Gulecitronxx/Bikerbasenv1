/* Hjælp til W13-logotests: et testmanifest, hvor nogle mærker har en PLACEHOLDER-SVG (simple geometriske former — ikke
   rigtige logoer) og er godkendt. Bruges KUN i tests og screenshots; det rigtige manifest (img/brands/manifest.json) er
   uændret og har ingen godkendte logoer. */
const fs = require('fs');
const path = require('path');
const G = require('../brand-logos-gen.js');

const ROOT = path.join(__dirname, '..', '..');
const FIX_DIR = path.join(__dirname, 'brands');

/* slug -> [placeholderfil, variant, ensfarvet, emblemfil?] — blandede forhold: 0,6 · 0,9 · 1,0 · 1,15 · 1,5 · 3,5 · 4,0. Emblemfilen (valgfri) er
   mærkets varianter.emblem: Honda 1,5 (smallere end hovedfilen 1,0 er ikke kravet — kun at den vælges i sm), Kawasaki 2,5 (hovedfilen er 4,0). */
const TILDELING = {
  honda: ['fx-ring.svg', 'emblem', true, 'fx-mark.svg'],
  yamaha: ['fx-triangle.svg', 'emblem', true],
  bmw: ['fx-hex.svg', 'emblem', true],
  kawasaki: ['fx-bar.svg', 'ordmaerke', true, 'fx-bar-k.svg'],
  ktm: ['fx-wide.svg', 'ordmaerke', true],
  ducati: ['fx-shield.svg', 'lockup', true],
  suzuki: ['fx-multi.svg', 'lockup', false],
  triumph: ['fx-tall.svg', 'emblem', true],
};

function svgTekst(fil){ return fs.readFileSync(path.join(FIX_DIR, fil), 'utf8'); }

/* Det rigtige manifest uden nogen godkendelser/filer: testenes "ingen logo"-tilstand, uanset hvad ejeren har slået til. */
function renManifest(){
  const m = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
  for (const e of m.maerker){
    Object.assign(e, { fil: null, godkendt: false, kilde: null, licens: null, hash: null, bredde: null, hoejde: null, variant: 'ordmaerke', ensfarvet: true });
    delete e.godkendt_af; delete e.godkendt_dato; delete e.varianter;
    /* V5: proveniensfelter for OFFICIELLE filer (scripts/v5-logo-import.js) hører til den ægte godkendelse og nulstilles sammen med den */
    for (const k of ['autenticitet', 'kraever_officiel_fil', 'kilde_url', 'hentet', 'kilde_fil', 'kilde_hash', 'normalisering', 'bemaerkning']) delete e[k];
  }
  return m;
}

function testManifest(){
  const m = renManifest();
  for (const e of m.maerker){
    const t = TILDELING[e.slug];
    if (!t) continue;
    const tekst = svgTekst(t[0]);
    const mm = G.maal(tekst);
    e.fil = `img/brands/${t[0]}`;
    e.godkendt = true;
    e.kilde = 'PLACEHOLDER (test) — ikke et rigtigt logo';
    e.licens = 'ingen — kun layouttest';
    e.variant = t[1];
    e.ensfarvet = t[2];
    e.bredde = mm.bredde; e.hoejde = mm.hoejde;
    e.hash = G.sha256(Buffer.from(tekst, 'utf8'));
    if (t[3]){
      const et = svgTekst(t[3]); const em = G.maal(et);
      e.varianter = { emblem: { fil: `img/brands/${t[3]}`, hash: G.sha256(Buffer.from(et, 'utf8')), bredde: em.bredde, hoejde: em.hoejde } };
    }
  }
  return m;
}

/* Skriver placeholder-SVG'erne til <site>/img/brands/ (så en lokal server kan levere dem). */
function kopierSvg(site){
  const ud = path.join(site, 'img', 'brands');
  fs.mkdirSync(ud, { recursive: true });
  for (const f of fs.readdirSync(FIX_DIR)) if (f.endsWith('.svg')) fs.copyFileSync(path.join(FIX_DIR, f), path.join(ud, f));
  return ud;
}

/* Kopi af repoet UDEN for repoet (til generatorkørsler; generatoren skriver i sin rod). Kopierer kun det, den bruger. */
function kopierRepo(maal){
  const MED = new Set(['scripts', 'js', 'css', 'img', 'fonts', 'crawler', 'sources']);
  fs.mkdirSync(maal, { recursive: true });
  for (const navn of fs.readdirSync(ROOT)){
    const kilde = path.join(ROOT, navn);
    const st = fs.statSync(kilde);
    if (st.isDirectory()){
      if (!MED.has(navn)) continue;
      fs.cpSync(kilde, path.join(maal, navn), { recursive: true, force: true,
        filter: p => !/[\\/](node_modules|\.git)([\\/]|$)/.test(p) });
    } else if (/\.(html|json|txt|xml|png|svg)$|^CNAME$/.test(navn)){
      fs.copyFileSync(kilde, path.join(maal, navn));
    }
  }
  return maal;
}

module.exports = { renManifest, TILDELING, FIX_DIR, ROOT, testManifest, kopierSvg, kopierRepo, svgTekst };

/* Bygger en kopi udenfor repoet og kører brand-sidegeneratoren på det syntetiske lager (ingen netværk, ingen produktion).
   logoer:true -> testmanifestet (placeholder-SVG, godkendt) skrives i kopien og data-filen regenereres dér. */
function bygKopi(maal, { logoer }){
  const { spawnSync } = require('child_process');
  kopierRepo(maal);
  /* Kopien får ALTID sit eget manifest: placeholder-logoer (logoer:true) eller ingen godkendte (logoer:false). */
  fs.writeFileSync(path.join(maal, 'img', 'brands', 'manifest.json'), JSON.stringify(logoer ? testManifest() : renManifest(), null, 2) + '\n');
  if (logoer) kopierSvg(maal);
  const g = spawnSync(process.execPath, [path.join(maal, 'scripts', 'brand-logos-gen.js')], { cwd: maal, encoding: 'utf8' });
  if (g.status !== 0) throw new Error('gen fejlede i kopien: ' + g.stderr);
  const env = { ...process.env, BB_TILLAD_FALD: '1' };
  const b = spawnSync(process.execPath, ['-r', path.join(maal, 'scripts', '__fixtures__', 'w13-lager-preload.js'), path.join(maal, 'scripts', 'build-brand-pages.js')],
    { cwd: maal, encoding: 'utf8', env, timeout: 120000 });
  if (b.status !== 0) throw new Error('build-brand-pages fejlede i kopien: ' + (b.stderr || b.stdout));
  return maal;
}
module.exports.bygKopi = bygKopi;
