#!/usr/bin/env node
/* Regeltabel for motorcykeltype afledt af mærke + model (V7, data).

   KILDEN er data/model-typer.json. Reglerne er KOPIERET ind i js/data.js mellem
   markørerne @@TYPETABEL-START/-END, så hver side, der henter js/data.js, har dem uden en
   ekstra <script>-tag (samme mønster som mærkeregistret, scripts/maerke-register-gen.js).

     node scripts/type-klassificering.js --generer            skriv blokken ind i js/data.js
     node scripts/type-klassificering.js --tjek               afbryd (1), hvis js/data.js er ude af trit
     node scripts/type-klassificering.js --maal <snap.json>   dækning før/efter + præcision mod kildens egne typer
     node scripts/type-klassificering.js --stikproeve <snap.json> [n]   n tilfældige afledte (fast frø) til håndkontrol

   HVORFOR DEN FINDES. 359 af 737 annoncer (49 %) stod uden type, fordi kilderne ikke oplyser den,
   og titlen ikke har et kategoriord ("Honda GL 1800 Gold Wing"). Det er sitets hyppigste tomme
   felt, og det betyder, at typefilteret og type-siderne tæller under halvdelen af lageret.
   Reglerne her udfylder KUN det, en model entydigt er (CB 1000 R = naked, GL 1800 = touring).
   Alt andet forbliver "Ukendt". Intet skrives til databasen: typen afledes ved læsning, bærer
   `typeAfledt: true` og vises som "afledt fra model" (js/annonce.js, js/components.js).

   PRÆCISION. Kildens egen type vinder altid; reglerne bruges kun, når kilden tier. Derfor kan
   præcisionen måles ærligt på de annoncer, KILDEN selv har typet: kør reglerne på dem uden at
   se kildens type og tæl, hvor ofte de er enige (--maal). Kravet er >= 95 %. */

const fs = require('node:fs');
const path = require('node:path');

const ROD = path.join(__dirname, '..');
const TABEL_FIL = path.join(ROD, 'data', 'model-typer.json');
const DATA_JS = path.join(ROD, 'js', 'data.js');
const START = '/* @@TYPETABEL-START';
const SLUT = '/* @@TYPETABEL-END */';
const TYPER = ['sport', 'touring', 'cruiser', 'naked', 'adventure', 'scooter', 'classic', 'cross'];

function noegle(s){
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function laesTabel(fil = TABEL_FIL){
  return JSON.parse(fs.readFileSync(fil, 'utf8'));
}

/* Validering: en regel, der ikke kan virke, må ikke komme med uden at nogen ved det. */
function valider(tabel){
  const fejl = [];
  if (!tabel || typeof tabel.maerker !== 'object') return ['tabellen mangler "maerker"'];
  for (const [maerke, regler] of Object.entries(tabel.maerker)){
    const set = new Set();
    for (const r of regler){
      const [moenster, type, note, graenser] = r;
      const hvad = `${maerke}/${moenster}`;
      if (typeof moenster !== 'string' || !/^~?[a-z0-9]*$/.test(moenster)) fejl.push(`${hvad}: mønstret skal være a-z0-9 (evt. med ~ foran)`);
      if (type !== null && !TYPER.includes(type)) fejl.push(`${hvad}: ukendt type "${type}"`);
      if (!note || typeof note !== 'string') fejl.push(`${hvad}: en regel uden begrundelse (3. felt)`);
      if (set.has(moenster)) fejl.push(`${hvad}: mønstret står to gange`);
      set.add(moenster);
      if (moenster === '~' ) fejl.push(`${hvad}: tomt "indeholder"-mønster`);
      if (graenser !== undefined){
        const ok = graenser && typeof graenser === 'object' && Object.keys(graenser).every(k => ['aarFra', 'aarTil'].includes(k) && Number.isInteger(graenser[k]) && graenser[k] >= 1900 && graenser[k] <= 2100);
        if (!ok) fejl.push(`${hvad}: 4. felt skal være {aarFra?, aarTil?} (hele årstal)`);
      }
    }
    if (maerke !== '*' && !regler.length) fejl.push(`${maerke}: ingen regler`);
  }
  return fejl;
}

/* Den blok, der står i js/data.js. Motoren er den ENESTE implementering; Node-værktøjer (dette script, testene)
   bruger den samme kode ved at læse data.js, ikke en kopi. */
function byg(tabel){
  const linjer = [];
  const noeglerSorteret = Object.keys(tabel.maerker).sort((a, b) => (a === '*') - (b === '*') || a.localeCompare(b));
  for (const m of noeglerSorteret){
    const rk = tabel.maerker[m].map(([p, t, , g]) => `[${JSON.stringify(p)},${t === null ? 'null' : JSON.stringify(t)}${g ? `,${g.aarFra || 0},${g.aarTil || 0}` : ''}]`).join(',');
    linjer.push(`  ${JSON.stringify(noegle(m) || '*')}: [${rk}],`);
  }
  const antal = noeglerSorteret.reduce((n, m) => n + tabel.maerker[m].length, 0);
  return `${START} — afledt af data/model-typer.json (${antal} regler); redigér IKKE her, kør node scripts/type-klassificering.js --generer */
const TYPE_TABEL = {
${linjer.join('\n')}
};
/* Motorcykeltype afledt af mærke + model, når kilden ikke oplyser den (V7). Mønstret er et PRÆFIKS af det normaliserede
   modelnavn (a-z0-9); "~" foran = "indeholder". Det LÆNGSTE mønster vinder; ved lige længde vinder mærkets eget over "*".
   Type null blokerer (modellen forbliver Ukendt). Slutter mønstret på et ciffer, må næste tegn ikke være et ciffer.
   Et tredje og fjerde tal er årgangsgrænser (fra, til; 0 = ingen): gælder reglen kun for nyere modeller (Z650 fra 2017), springes den
   over, når årgangen er uden for — eller ukendt. */
function typeNoegle(s){
  return String(s == null ? '' : s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function afledtTypeFor(brand, model, titel, aargang){
  const b = typeNoegle(brand);
  let m = typeNoegle(model);
  if (!m){ const t = typeNoegle(titel); m = b && t.startsWith(b) ? t.slice(b.length) : t; }
  let bedst = null;
  for (const [liste, ejer] of [[TYPE_TABEL[b], 1], [TYPE_TABEL['*'], 0]]){
    for (const [moenster, type, fra, til] of (liste || [])){
      if (fra || til){
        const aar = Number(aargang);
        if (!(aar >= 1900) || (fra && aar < fra) || (til && aar > til)) continue;
      }
      const inkl = moenster.charAt(0) === '~';
      const p = inkl ? moenster.slice(1) : moenster;
      if (!(inkl ? m.includes(p) : m.startsWith(p))) continue;
      if (!inkl && /\\d$/.test(p) && /\\d/.test(m.charAt(p.length))) continue;
      if (!bedst || p.length > bedst.len || (p.length === bedst.len && ejer > bedst.ejer)) bedst = { len: p.length, ejer, type, moenster };
    }
  }
  return bedst && bedst.type ? { type: bedst.type, regel: bedst.moenster } : null;
}
${SLUT}`;
}

function indsaet(kilde, blok){
  const crlf = kilde.includes('\r\n');
  const s = kilde.replace(/\r\n/g, '\n');
  const a = s.indexOf(START), z = s.indexOf(SLUT);
  if (a === -1 || z === -1 || z < a) throw new Error('js/data.js mangler markørerne @@TYPETABEL-START/-END');
  const ud = s.slice(0, a) + blok + s.slice(z + SLUT.length);
  return crlf ? ud.replace(/\n/g, '\r\n') : ud;
}

function erITrit(){
  const kilde = fs.readFileSync(DATA_JS, 'utf8');
  return indsaet(kilde, byg(laesTabel())) === kilde;
}

/* ---------- Måling ---------- */
function indlaesMotor(){
  const { browserModules } = require('./shared.js');
  return browserModules();
}

function maal(raekker){
  const M = indlaesMotor();
  const normaliserede = raekker.map(r => ({ r, l: M.normalizeExternalListing(r) }));
  const uden = normaliserede.filter(x => !x.l.typeAfledt && !x.l.type);
  const afledt = normaliserede.filter(x => x.l.typeAfledt);
  const kilde = normaliserede.filter(x => x.l.type && !x.l.typeAfledt);

  /* Præcision: kør reglerne på de annoncer, kilden SELV har typet, og sammenlign. */
  let ramt = 0, enige = 0;
  const uenige = [];
  const paaTypeFraModel = {};
  for (const x of kilde){
    const h = M.afledtTypeFor(x.l.brand, x.r.model, x.r.titel, x.r.aargang);
    if (!h) continue;
    ramt++;
    if (h.type === x.l.type) enige++; else uenige.push({ titel: x.r.titel, model: x.l.model, kilde: x.l.type, regel: h.type, moenster: h.regel });
  }
  for (const x of afledt) paaTypeFraModel[x.l.type] = (paaTypeFraModel[x.l.type] || 0) + 1;
  return {
    i_alt: normaliserede.length,
    foer: { med_type: kilde.length, uden_type: normaliserede.length - kilde.length },
    efter: { med_type: kilde.length + afledt.length, uden_type: uden.length, afledt: afledt.length },
    afledt_pr_type: paaTypeFraModel,
    praecision: { regler_ramte_kildetypede: ramt, enige, uenige_antal: uenige.length, procent: ramt ? Math.round(1000 * enige / ramt) / 10 : null, uenige },
    uden_type: uden.map(x => `${x.l.brand} | ${x.l.model}`),
    afledte: afledt.map(x => ({ id: x.r.id, titel: x.r.titel, brand: x.l.brand, model: x.l.model, aar: x.r.aargang, ccm: x.r.ccm, type: x.l.type, regel: x.l.typeRegel })),
  };
}

/* Stikprøve med fast frø: mulberry32, så "de 50" er de samme hver gang og kan genfindes. */
function stikproeve(afledte, n, frø = 20261026){
  let a = frø >>> 0;
  const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const kopi = afledte.slice();
  for (let i = kopi.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); [kopi[i], kopi[j]] = [kopi[j], kopi[i]]; }
  return kopi.slice(0, n);
}

module.exports = { TYPER, noegle, laesTabel, valider, byg, indsaet, erITrit, maal, stikproeve, DATA_JS, TABEL_FIL };

if (require.main === module){
  const arg = process.argv.slice(2);
  const fejl = valider(laesTabel());
  if (fejl.length){ console.error('model-typer.json er ugyldig:\n  ' + fejl.join('\n  ')); process.exit(1); }
  if (arg.includes('--generer')){
    const kilde = fs.readFileSync(DATA_JS, 'utf8');
    const ny = indsaet(kilde, byg(laesTabel()));
    if (ny !== kilde) fs.writeFileSync(DATA_JS, ny);
    console.log(ny !== kilde ? 'js/data.js opdateret' : 'js/data.js var allerede ajour');
  } else if (arg.includes('--tjek')){
    if (!erITrit()){ console.error('js/data.js er ude af trit med data/model-typer.json — kør: node scripts/type-klassificering.js --generer'); process.exit(1); }
    console.log('js/data.js er i trit med data/model-typer.json');
  } else if (arg.includes('--maal') || arg.includes('--stikproeve')){
    const flag = arg.includes('--maal') ? '--maal' : '--stikproeve';
    const fil = arg[arg.indexOf(flag) + 1];
    const raekker = JSON.parse(fs.readFileSync(fil, 'utf8'));
    const m = maal(Array.isArray(raekker) ? raekker : raekker.data);
    if (flag === '--maal'){
      const { afledte, uden_type, ...kort } = m;
      console.log(JSON.stringify(kort, null, 2));
    } else {
      const n = Number(arg[arg.indexOf(flag) + 2]) || 50;
      for (const x of stikproeve(m.afledte, n)) console.log(`${x.type.padEnd(9)} ${String(x.brand).padEnd(16)} ${String(x.model).padEnd(34)} ${x.aar || '?'} ${x.ccm || '?'}ccm  regel=${x.regel}  | ${x.titel}`);
    }
  } else {
    console.log('Brug: --generer | --tjek | --maal <snapshot.json> | --stikproeve <snapshot.json> [n]');
  }
}
