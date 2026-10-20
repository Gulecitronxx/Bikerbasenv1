#!/usr/bin/env node
/* Kopierer mærkeregistret (js/brands-registry.js, mellem // @@REGISTER-START og // @@REGISTER-END) ind i js/data.js
   mellem markørerne  / * @@BRANDREG-START * /  og  / * @@BRANDREG-END * /.

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
  const reg = udtraek(fs.readFileSync(KILDE, 'utf8'));
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
module.exports = { udtraek, indsaet, START, SLUT };
