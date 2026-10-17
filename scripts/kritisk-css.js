/* Kritisk CSS (w12): CSS-opdeling i regler, regelnoegler og udvaelgelse. Ren tekstbehandling, ingen browser.

   Bruges af to ting:
     - scripts/kritisk-gen.js (Playwright) afgoer ved RIGTIG rendering, hvilke regler der tegner det, man ser
       i de foerste skaerme af en sidefamilie, og gemmer noeglerne i scripts/kritisk-manifest.json.
     - scripts/inline-critical.js (byggekaeden, ingen browser) laver ud af manifestet og de to ark
       (css/styles.css + sidens p-*.css) en delmaengde af det fulde ark, som indlejres i <head>.

   Delmaengden er altid i arkets EGEN raekkefoelge (styles.css foer p-*.css) og bevarer @media/@supports/
   @container-omslagene om reglerne. Foerste maling ser dermed samme kaskade som det fulde ark.

   REGLEN DER GOER DET SIKKERT: en regel, manifestet ikke kender (ny eller aendret), tages ALTID med. Et
   gammelt manifest giver derfor et stoerre udsnit, aldrig et forkert. Noegler er indholdshash af
   (omslag + vaelger + deklarationer), ikke linjenumre. */

const crypto = require('crypto');
const { minifyCSS } = require('./shared');

/* At-regler med et regelsaet indeni, som kan afkortes regel for regel. */
const GRUPPER = new Set(['media', 'supports', 'container', 'document']);
/* At-regler hvis semantik afhaenger af raekkefoelge/omfang paa tvaers af regler. Findes de, kan arket
   ikke afkortes sikkert; parse() melder 'farlig', og inline-critical.js lader siden staa som den er. */
const FARLIGE = new Set(['layer', 'scope', 'import', 'starting-style']);

function noegle(tekst){
  return crypto.createHash('sha1').update(minifyCSS(tekst)).digest('hex').slice(0, 10);
}

/* Springer streng/kommentar over fra position i; returnerer ny position, eller -1 hvis i ikke starter en. */
function springOver(css, i){
  const c = css[i];
  if (c === '/' && css[i + 1] === '*'){
    const e = css.indexOf('*/', i + 2);
    return e === -1 ? css.length : e + 2;
  }
  if (c === '"' || c === "'"){
    let j = i + 1;
    while (j < css.length){
      if (css[j] === '\\'){ j += 2; continue; }
      if (css[j] === c) return j + 1;
      j++;
    }
    return css.length;
  }
  return -1;
}

/* Finder tegnet der lukker blokken, der aabnes ved position aabn (css[aabn] === '{'). */
function lukBlok(css, aabn){
  let dybde = 0;
  for (let i = aabn; i < css.length;){
    const s = springOver(css, i);
    if (s !== -1){ i = s; continue; }
    if (css[i] === '{') dybde++;
    else if (css[i] === '}'){ dybde--; if (dybde === 0) return i; }
    i++;
  }
  return css.length - 1;
}

/* Tekst uden strenge og kommentarer (til at se, om der staar en { UDEN FOR dem). */
function stripStrenge(t){
  let ud = '';
  for (let i = 0; i < t.length;){
    const s = springOver(t, i);
    if (s !== -1){ i = s; ud += ' '; continue; }
    ud += t[i++];
  }
  return ud;
}

/* Parser CSS-tekst til et trae. Knudetyper:
     { type:'regel',  vaelger, krop, noegle }
     { type:'gruppe', navn, prelude, born:[...] }        (@media osv.)
     { type:'blok',   navn, prelude, krop, noegle }      (@font-face, @keyframes, @property ...)
     { type:'udsagn', tekst, navn }                      (@charset, @import ...)
   Returnerer { traeet, farlig:[...] }. */
function parse(css, ctx = []){
  const noder = [], farlig = [];
  let i = 0;
  while (i < css.length){
    // mellemrum + kommentarer
    while (i < css.length){
      if (/\s/.test(css[i])){ i++; continue; }
      if (css[i] === '/' && css[i + 1] === '*'){ i = springOver(css, i); continue; }
      break;
    }
    if (i >= css.length) break;
    // prelude indtil { eller ;
    let j = i, dybde = 0;
    while (j < css.length){
      const s = springOver(css, j);
      if (s !== -1){ j = s; continue; }
      const c = css[j];
      if (c === '(' || c === '[') dybde++;
      else if (c === ')' || c === ']') dybde--;
      else if (dybde <= 0 && (c === '{' || c === ';' || c === '}')) break;
      j++;
    }
    const prelude = css.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, ' ').trim();
    if (css[j] === '}'){ i = j + 1; continue; }   // forvildet }
    if (css[j] === ';' || j >= css.length){
      if (prelude){
        const m = prelude.match(/^@([\w-]+)/);
        if (m && FARLIGE.has(m[1].toLowerCase())) farlig.push(prelude.slice(0, 60));
        noder.push({ type: 'udsagn', tekst: prelude + ';', navn: m ? m[1].toLowerCase() : '' });
      }
      i = j + 1; continue;
    }
    const slut = lukBlok(css, j);
    const krop = css.slice(j + 1, slut);
    i = slut + 1;
    const am = prelude.match(/^@([\w-]+)\s*([\s\S]*)$/);
    if (am){
      const navn = am[1].toLowerCase().replace(/^-\w+-/, '');   // -webkit-keyframes -> keyframes
      if (FARLIGE.has(navn)) farlig.push(prelude.slice(0, 60));
      if (GRUPPER.has(navn)){
        const barn = parse(krop, ctx.concat(prelude));
        farlig.push(...barn.farlig);
        noder.push({ type: 'gruppe', navn, prelude, born: barn.traeet });
      } else {
        noder.push({ type: 'blok', navn, prelude, krop, noegle: noegle(ctx.join('|') + '|' + prelude + '{' + krop + '}') });
      }
      continue;
    }
    if (stripStrenge(krop).includes('{')) farlig.push('CSS-nesting i regel: ' + prelude.slice(0, 50));
    noder.push({ type: 'regel', vaelger: prelude, krop, noegle: noegle(ctx.join('|') + '|' + prelude + '{' + krop + '}') });
  }
  return { traeet: noder, farlig };
}

/* Alle regler fladt, i dokumentraekkefoelge (kun type 'regel'). */
function fladRegler(traeet, ud = []){
  for (const n of traeet){
    if (n.type === 'regel') ud.push(n);
    else if (n.type === 'gruppe') fladRegler(n.born, ud);
  }
  return ud;
}

/* Alle noegler (regler + blokke) i raekkefoelge — det, manifestet indekserer. */
function alleNoegler(traeet, ud = []){
  for (const n of traeet){
    if (n.type === 'regel' || n.type === 'blok') ud.push(n.noegle);
    else if (n.type === 'gruppe') alleNoegler(n.born, ud);
  }
  return ud;
}

/* Vaelgerlisten delt paa kommaer paa topniveau (ikke i parenteser, klammer eller strenge). */
function splitVaelgere(vaelger){
  const ud = [];
  let dybde = 0, start = 0;
  for (let i = 0; i < vaelger.length;){
    const s = springOver(vaelger, i);
    if (s !== -1){ i = s; continue; }
    const c = vaelger[i];
    if (c === '(' || c === '[') dybde++;
    else if (c === ')' || c === ']') dybde--;
    else if (c === ',' && dybde === 0){ ud.push(vaelger.slice(start, i).trim()); start = i + 1; }
    i++;
  }
  ud.push(vaelger.slice(start).trim());
  return ud.filter(Boolean);
}

/* Genskriver et trae til minificeret tekst; behold(n) afgoer pr. regel/blok. Tomme grupper udelades. */
function skriv(traeet, behold){
  let ud = '';
  for (const n of traeet){
    if (n.type === 'regel'){ if (behold(n)) ud += n.vaelger + '{' + n.krop + '}\n'; }
    else if (n.type === 'blok'){ if (behold(n)) ud += n.prelude + '{' + n.krop + '}\n'; }
    else if (n.type === 'udsagn'){ /* @charset/@import hoerer ikke hjemme i et udsnit */ }
    else {
      const indre = skriv(n.born, behold);
      if (indre) ud += n.prelude + '{\n' + indre + '}\n';
    }
  }
  return ud;
}

/* Udsnittet. `krit` er maengden af noegler manifestet kalder kritiske, `kendt` alle noegler manifestet har
   set. Regel: kritisk, ELLER ukendt for manifestet. @font-face/@property tages altid med; @keyframes kun
   hvis en medtaget regel naevner navnet. */
function udsnit(traeer, krit, kendt){
  const kritisk = n => krit.has(n.noegle) || !kendt.has(n.noegle);
  const flad = traeer.flatMap(t => fladRegler(t));
  const brugteTekster = [];
  const behold = n => {
    if (n.type === 'regel') return kritisk(n);
    if (n.navn === 'font-face' || n.navn === 'property') return true;
    if (n.navn === 'keyframes') return false;      // afgoeres i anden runde
    return kritisk(n);
  };
  for (const r of flad) if (kritisk(r)) brugteTekster.push(r.krop);
  const brugt = brugteTekster.join('\n');
  const medKeyframes = n => {
    if (n.type === 'blok' && n.navn === 'keyframes'){
      const navn = n.prelude.replace(/^@[\w-]+\s*/, '').trim().replace(/^["']|["']$/g, '');
      return new RegExp('(^|[\\s:,])' + navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])').test(brugt);
    }
    return behold(n);
  };
  return minifyCSS(traeer.map(t => skriv(t, medKeyframes)).join(''));
}

module.exports = { parse, fladRegler, alleNoegler, splitVaelgere, udsnit, noegle };
