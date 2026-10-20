#!/usr/bin/env node
/* Kopierer mærkeregistret (js/brands-registry.js, mellem // @@REGISTER-START og // @@REGISTER-END) ind i js/data.js
   mellem markørerne  / * @@BRANDREG-START * /  og  / * @@BRANDREG-END * /.

   V5: kopien i data.js er en SLANK browserudgave. Browseren bruger kun navne, aliaser, slug, logo og de rene opslags-/valideringsfunktioner;
   kilder, noter, kandidatvurdering, generatorens opgørelse og alle kommentarer bliver i js/brands-registry.js (Node: tests og generatorer
   bruger den fulde fil). Det sparer data.js-vægt på alle ~100 sider uden en ny <script>-tag (se docs/review/gauntlet/v5/maerke.md).
   Linjer mellem // @@NODE-ONLY-START og // @@NODE-ONLY-END udelades; MAERKER-tabellen skrives kompakt om (ingen noter; kilder bliver 'wp' =
   har belæg / 'eks' = har ikke), så verificeret og offentlig er uændrede.

   Hvorfor: ca. 100 sider henter allerede js/data.js. Et separat registerscript ville kræve en ny <script>-tag i hver
   side og hver generator (og i udgivelsens allowlist). Kopien gør, at ét mærkeregister virker overalt uden at røre
   sidernes script-lister. Kilden er js/brands-registry.js; data.js er afledt.

   Brug:
     node scripts/maerke-register-gen.js          skriv kopien i js/data.js
     node scripts/maerke-register-gen.js --tjek   skriv intet; afslut med kode 1, hvis data.js er ude af trit

   Bevarer data.js' linjeskift (CRLF/LF). Intet netværk. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KILDE = path.join(ROOT, 'js', 'brands-registry.js');
const DATA = path.join(ROOT, 'js', 'data.js');
const START = '/* @@BRANDREG-START — afledt af js/brands-registry.js; redigér IKKE her, kør node scripts/maerke-register-gen.js */';
const SLUT = '/* @@BRANDREG-END */';

function udtraek(kilde) {
  const t = kilde.replace(/\r\n/g, '\n');
  const a = t.indexOf('// @@REGISTER-START');
  const b = t.indexOf('// @@REGISTER-END');
  if (a < 0 || b < 0 || b < a) throw new Error('js/brands-registry.js mangler // @@REGISTER-START/-END');
  return t.slice(t.indexOf('\n', a) + 1, b).replace(/\n+$/, '');
}

/* Fuld registertekst -> slank browserudgave. Ren funktion (testes mod den fulde fil: samme svar på alle navne/aliaser). */
function slank(regTekst) {
  let t = regTekst.replace(/\r\n/g, '\n');
  // 1. kun-Node-områder
  t = t.replace(/^[ \t]*\/\/ @@NODE-ONLY-START[\s\S]*?\/\/ @@NODE-ONLY-END[ \t]*\n/gm, '');
  // 2. tabellen: én kompakt linje pr. mærke
  t = t.replace(/^(\s*)\[('(?:[^'\\]|\\.)*',.*)\],\s*$/gm, (hele, indryk, indhold) => {
    let r;
    /* eval er sikker her: indholdet er en MAERKER-linje fra repoets EGEN js/brands-registry.js (litteraler, ingen input udefra), og
       linjen skal matche tabelmønstret ovenfor. En linje, der ikke kan læses, bliver stående uændret (og --tjek/testen fanger det). */
    try { r = (0, eval)('[' + indhold + ']'); } catch (e) { return hele; }
    if (!Array.isArray(r) || r.length < 5 || !Array.isArray(r[3]) || !Array.isArray(r[4])) return hele;
    const IKKE_BELAEG = new Set(['ejer', 'eks']);
    const e = r[5] || {};
    const ekstra = {};
    if (e.slug) ekstra.slug = e.slug;
    if (e.logo) ekstra.logo = e.logo;
    if (e.offentlig === false) ekstra.offentlig = false;
    const post = [r[0], r[1], r[2], r[3], r[4].some(k => !IKKE_BELAEG.has(k)) ? ['wp'] : ['eks']];
    if (Object.keys(ekstra).length) post.push(ekstra);
    return indryk + JSON.stringify(post) + ',';
  });
  // 3. kommentarer: hele linjer og blokke, der starter en linje, samt haler efter mindst to mellemrum
  t = t.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n/gm, '');
  t = t.replace(/^[ \t]*\/\/.*\n/gm, '');
  t = t.replace(/(\S)[ \t]{2,}\/\/ [^\n'"`]*$/gm, '$1');
  t = t.replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n');
  return t.replace(/\n+$/, '');
}

function browserTekst(kilde) { return slank(udtraek(kilde)); }

/* Ren funktion (testes): data.js-tekst + registertekst -> ny data.js-tekst. */
function indsaet(dataTekst, regTekst) {
  const eol = dataTekst.includes('\r\n') ? '\r\n' : '\n';
  const lf = dataTekst.replace(/\r\n/g, '\n');
  const a = lf.indexOf('/* @@BRANDREG-START');
  const b = lf.indexOf(SLUT);
  if (a < 0 || b < 0 || b < a) throw new Error('js/data.js mangler markørerne @@BRANDREG-START/-END');
  const ud = lf.slice(0, a) + START + '\n' + regTekst + '\n' + lf.slice(b);
  return eol === '\r\n' ? ud.replace(/\n/g, '\r\n') : ud;
}

function kor(argv) {
  const tjek = argv.includes('--tjek');
  const reg = browserTekst(fs.readFileSync(KILDE, 'utf8'));
  const gammel = fs.readFileSync(DATA, 'utf8');
  const ny = indsaet(gammel, reg);
  if (tjek) {
    if (ny !== gammel) { console.error('maerke-register-gen: js/data.js er ude af trit med js/brands-registry.js — kør node scripts/maerke-register-gen.js'); return 1; }
    console.log('maerke-register-gen: ok');
    return 0;
  }
  if (ny !== gammel) { fs.writeFileSync(DATA, ny); console.log('maerke-register-gen: opdaterede js/data.js'); } else console.log('maerke-register-gen: uændret');
  return 0;
}

if (require.main === module) process.exit(kor(process.argv.slice(2)));
module.exports = { udtraek, slank, browserTekst, indsaet, START, SLUT };
