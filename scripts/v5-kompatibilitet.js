/* V5 browserkompatibilitet — statisk scanning af css/ og js/ + simulering af "ældre browser".

   Playwright har kun Chromium her (Firefox/WebKit er ikke installeret, og der installeres ikke noget). Derfor to metoder, der
   erstatter det, motoren ikke kan vise:
     1. scan(rod)      Finder hvilke moderne funktioner koden bruger, hvor mange steder, og hvilken browserversion de kræver
                       (tabel FEATURES; versionerne er fra MDN/caniuse efter bedste viden - kontrollér ved tvivl på caniuse.com).
                       Giver "gulvet": laveste version hvor siden virker uden at noget går i stykker.
     2. degrader(css,[ids])  Fjerner det en ældre browser ville ignorere (regler med :has(), @container-blokke, deklarationer med
                       color-mix()/dvh, ...) fra en kopi af CSS'en, så scripts/v5-krydsbrowser.js kan måle, hvad der sker
                       (overflow, usynlig tekst, konsolfejl) uden at have den gamle browser.

   CLI:  node scripts/v5-kompatibilitet.js              (markdown-tabel af brugte funktioner + gulv)
         node scripts/v5-kompatibilitet.js --json */

const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');

/* min: første version med understøttelse. fallback: 'nej' = siden går i stykker/mister funktion uden; 'delvist' = layout/pynt
   forringes; 'progressiv' = ren forbedring, siden virker fint uden. fatal: scriptet kan ikke parses (hele filen dør). */
const FEATURES = [
  /* --- JS: syntaks (parse-fejl dræber hele filen) --- */
  { id: 'regex-lookbehind', art: 'js', label: 'Regex lookbehind (?<=  ?<!)', find: /\(\?<[=!]/g, min: { chrome: 62, safari: '16.4', firefox: 78 }, fallback: 'nej', fatal: true,
    note: 'Regulært udtryk i literal-form giver SyntaxError ved indlæsning i Safari < 16.4: hele filen (js/data.js, filtrering.js, backend-bridge.js, annonce.js, opret-annonce.js) kører ikke -> Store/annoncer virker ikke på iOS <= 16.3.' },
  { id: 'optional-chaining', art: 'js', label: 'Optional chaining ?. og nullish ??', find: /\?\.[a-zA-Z_\[(]|\?\?(?!=)/g, min: { chrome: 80, safari: '13.1', firefox: 74 }, fallback: 'nej' },
  { id: 'private-fields', art: 'js', label: 'Klasse-private felter #x', find: /^\s*#[a-zA-Z_]\w*\s*[=;(]/gm, min: { chrome: 74, safari: '14.1', firefox: 90 }, fallback: 'nej' },
  { id: 'bigint', art: 'js', label: 'BigInt-literal', find: /\b\d+n\b/g, min: { chrome: 67, safari: '14', firefox: 68 }, fallback: 'nej' },
  { id: 'unicode-property-escapes', art: 'js', label: 'Regex \\p{…} (unicode)', find: /\\p\{/g, min: { chrome: 64, safari: '11.1', firefox: 78 }, fallback: 'nej', fatal: true },
  /* --- JS: API'er --- */
  { id: 'dialog-showmodal', art: 'js', label: '<dialog>.showModal()', find: /showModal\(/g, min: { chrome: 37, safari: '15.4', firefox: 98 }, fallback: 'delvist', note: 'bekraeft-dialog.js falder tilbage til confirm(); cookie-dialog og lightbox har tjek.' },
  { id: 'inert', art: 'js', label: 'inert-attributten', find: /\binert\b/g, min: { chrome: 102, safari: '15.5', firefox: 112 }, fallback: 'delvist', note: 'uden inert kan fokus nå skjulte paneler (tilgængelighed)' },
  { id: 'random-uuid', art: 'js', label: 'crypto.randomUUID()', find: /randomUUID/g, min: { chrome: 92, safari: '15.4', firefox: 95 }, fallback: 'nej', note: 'Kun i supabase-api.js (billedupload). Kræver HTTPS. TypeError i Safari < 15.4.' },
  { id: 'intersection-observer', art: 'js', label: 'IntersectionObserver', find: /IntersectionObserver/g, min: { chrome: 58, safari: '12.1', firefox: 55 }, fallback: 'nej' },
  { id: 'clipboard', art: 'js', label: 'navigator.clipboard', find: /navigator\.clipboard/g, min: { chrome: 66, safari: '13.1', firefox: 63 }, fallback: 'progressiv' },
  { id: 'web-share', art: 'js', label: 'navigator.share', find: /navigator\.share/g, min: { chrome: 89, safari: '12.1', firefox: 'ikke desktop' }, fallback: 'progressiv' },
  { id: 'replacechildren', art: 'js', label: 'Element.replaceChildren()', find: /replaceChildren/g, min: { chrome: 86, safari: '14.1', firefox: 78 }, fallback: 'nej' },
  { id: 'array-flat', art: 'js', label: 'Array.prototype.flat/flatMap', find: /\.flat(Map)?\(/g, min: { chrome: 69, safari: '12', firefox: 62 }, fallback: 'nej' },
  /* --- CSS --- */
  { id: 'css-has', art: 'css', label: ':has()', find: /:has\(/g, min: { chrome: 105, safari: '15.4', firefox: 121 }, fallback: 'delvist', degrader: 'has',
    note: 'Regler med :has() ignoreres helt i ældre browsere (hele selektorlisten er ugyldig).' },
  { id: 'css-container', art: 'css', label: '@container / container-type', find: /@container\b|container-type/g, min: { chrome: 105, safari: '16', firefox: 110 }, fallback: 'delvist', degrader: 'container' },
  { id: 'css-color-mix', art: 'css', label: 'color-mix()', find: /color-mix\(/g, min: { chrome: 111, safari: '16.2', firefox: 113 }, fallback: 'delvist', degrader: 'colormix',
    note: 'Deklarationen ignoreres: farven falder tilbage til den foregående/standard (ofte gennemsigtig) - risiko for usynlig tekst.' },
  { id: 'css-dvh', art: 'css', label: 'dvh/svh/lvh-enheder', find: /\d(dvh|svh|lvh)\b/g, min: { chrome: 108, safari: '15.4', firefox: 101 }, fallback: 'delvist', degrader: 'dvh' },
  { id: 'css-is', art: 'css', label: ':is() / :where()', find: /:(is|where)\(/g, min: { chrome: 88, safari: '14', firefox: 78 }, fallback: 'delvist' },
  { id: 'css-focus-visible', art: 'css', label: ':focus-visible', find: /:focus-visible/g, min: { chrome: 86, safari: '15.4', firefox: 85 }, fallback: 'delvist', note: 'Uden støtte ignoreres reglen -> ingen fokusring ved tastatur, hvis den kun er sat på :focus-visible.' },
  { id: 'css-aspect-ratio', art: 'css', label: 'aspect-ratio', find: /aspect-ratio/g, min: { chrome: 88, safari: '15', firefox: 89 }, fallback: 'delvist' },
  { id: 'css-inset', art: 'css', label: 'inset-genvej', find: /[\s;{]inset\s*:/g, min: { chrome: 87, safari: '14.1', firefox: 66 }, fallback: 'delvist' },
  { id: 'css-gap-flex', art: 'css', label: 'gap (flex og grid)', find: /gap\s*:/g, min: { chrome: 84, safari: '14.1', firefox: 63 }, fallback: 'delvist' },
  { id: 'css-accent-color', art: 'css', label: 'accent-color', find: /accent-color/g, min: { chrome: 93, safari: '15.4', firefox: 92 }, fallback: 'progressiv' },
  { id: 'css-text-wrap', art: 'css', label: 'text-wrap: balance/pretty', find: /text-wrap/g, min: { chrome: 114, safari: '17.5', firefox: 121 }, fallback: 'progressiv' },
  { id: 'css-backdrop-filter', art: 'css', label: 'backdrop-filter', find: /backdrop-filter/g, min: { chrome: 76, safari: '9 (-webkit-)', firefox: 103 }, fallback: 'progressiv' },
  { id: 'css-scrollbar-width', art: 'css', label: 'scrollbar-width', find: /scrollbar-width/g, min: { chrome: 121, safari: '18.2', firefox: 64 }, fallback: 'progressiv' },
  { id: 'css-content-visibility', art: 'css', label: 'content-visibility', find: /content-visibility/g, min: { chrome: 85, safari: '18', firefox: 125 }, fallback: 'progressiv' },
  { id: 'css-overscroll', art: 'css', label: 'overscroll-behavior', find: /overscroll-behavior/g, min: { chrome: 63, safari: '16', firefox: 59 }, fallback: 'progressiv' },
  { id: 'css-mask', art: 'css', label: 'mask / -webkit-mask', find: /(?:^|[\s;{])(?:-webkit-)?mask(?:-image)?\s*:/g, min: { chrome: 120, safari: '15.4', firefox: 53 }, fallback: 'progressiv', note: 'Koden skriver både -webkit-mask og mask, så den virker i alle browsere; kun nye browsere bruger den uprefixede.' },
  { id: 'css-logical', art: 'css', label: 'logiske egenskaber (margin-inline m.fl.)', find: /(margin|padding)-(inline|block)/g, min: { chrome: 87, safari: '14.1', firefox: 66 }, fallback: 'delvist' },
  { id: 'css-clamp', art: 'css', label: 'clamp()/min()/max()', find: /clamp\(|[\s:(,](min|max)\(/g, min: { chrome: 79, safari: '13.1', firefox: 75 }, fallback: 'delvist' },
  { id: 'css-modal-backdrop', art: 'css', label: '::backdrop', find: /::backdrop/g, min: { chrome: 37, safari: '15.4', firefox: 47 }, fallback: 'progressiv' },
  /* --- Vagtliste: ikke brugt nu. Dukker de op, hæves gulvet drastisk uden at nogen har besluttet det. --- */
  { id: 'css-nesting', art: 'css', label: 'CSS nesting (&)', find: /^\s*&[\s.:\[]/gm, min: { chrome: 120, safari: '17.2', firefox: 117 }, fallback: 'nej', vagt: true },
  { id: 'css-scope', art: 'css', label: '@scope', find: /@scope\b/g, min: { chrome: 118, safari: '17.4', firefox: 146 }, fallback: 'nej', vagt: true },
  { id: 'css-anchor', art: 'css', label: 'anchor positioning', find: /anchor-name|position-anchor|anchor\(/g, min: { chrome: 125, safari: '26', firefox: 147 }, fallback: 'nej', vagt: true },
  { id: 'css-starting-style', art: 'css', label: '@starting-style', find: /@starting-style/g, min: { chrome: 117, safari: '17.5', firefox: 129 }, fallback: 'nej', vagt: true },
  { id: 'css-light-dark', art: 'css', label: 'light-dark()', find: /light-dark\(/g, min: { chrome: 123, safari: '17.5', firefox: 120 }, fallback: 'nej', vagt: true },
  { id: 'css-view-transition', art: 'css', label: 'View Transitions', find: /view-transition/g, min: { chrome: 111, safari: '18', firefox: 144 }, fallback: 'nej', vagt: true },
  { id: 'css-field-sizing', art: 'css', label: 'field-sizing', find: /field-sizing/g, min: { chrome: 123, safari: '26.2', firefox: 'nej' }, fallback: 'nej', vagt: true },
  { id: 'css-scroll-timeline', art: 'css', label: 'scroll-drevne animationer', find: /animation-timeline|scroll-timeline|view-timeline/g, min: { chrome: 115, safari: '26', firefox: 'nej' }, fallback: 'nej', vagt: true },
  { id: 'html-popover', art: 'js', label: 'popover-attributten', find: /\bpopover\b(?!-)/g, min: { chrome: 114, safari: '17', firefox: 125 }, fallback: 'nej', vagt: true, kunHtml: true },
  { id: 'js-tosorted', art: 'js', label: 'toSorted/toReversed/toSpliced', find: /\.(toSorted|toReversed|toSpliced)\(/g, min: { chrome: 110, safari: '16', firefox: 115 }, fallback: 'nej', vagt: true },
  { id: 'js-groupby', art: 'js', label: 'Object.groupBy/Map.groupBy', find: /(Object|Map)\.groupBy/g, min: { chrome: 117, safari: '17.4', firefox: 119 }, fallback: 'nej', vagt: true },
  { id: 'js-structuredclone', art: 'js', label: 'structuredClone', find: /structuredClone/g, min: { chrome: 98, safari: '15.4', firefox: 94 }, fallback: 'nej', vagt: true },
  { id: 'js-withresolvers', art: 'js', label: 'Promise.withResolvers', find: /withResolvers/g, min: { chrome: 119, safari: '17.4', firefox: 121 }, fallback: 'nej', vagt: true },
  { id: 'js-replaceall', art: 'js', label: 'String.replaceAll', find: /\.replaceAll\(/g, min: { chrome: 85, safari: '13.1', firefox: 77 }, fallback: 'nej', vagt: true },
  { id: 'js-at', art: 'js', label: 'Array/String .at()', find: /\.at\(-?\d/g, min: { chrome: 92, safari: '15.4', firefox: 90 }, fallback: 'nej', vagt: true },
  { id: 'js-abort-timeout', art: 'js', label: 'AbortSignal.timeout', find: /AbortSignal\.timeout/g, min: { chrome: 103, safari: '16', firefox: 100 }, fallback: 'nej', vagt: true },
  { id: 'js-hasown', art: 'js', label: 'Object.hasOwn', find: /Object\.hasOwn\(/g, min: { chrome: 93, safari: '15.4', firefox: 92 }, fallback: 'nej', vagt: true },
];

const versionTal = v => { const m = String(v).match(/^\s*(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : (v === 'nej' || /ikke/.test(String(v)) ? Infinity : 0); };

function laesFiler(rod) {
  const ud = { css: [], js: [], html: [] };
  const mappe = (rel, ext, art) => {
    let navne = [];
    try { navne = fs.readdirSync(path.join(rod, rel)); } catch (e) { return; }
    for (const n of navne) {
      if (!n.endsWith(ext) || /\.test\.js$/.test(n) || /^(w\d+-|v\d+-)?.*-hjaelp\.js$/.test(n)) continue;
      if (rel === 'js' && n === 'vendor') continue;
      ud[art].push({ fil: `${rel}/${n}`, tekst: fs.readFileSync(path.join(rod, rel, n), 'utf8') });
    }
  };
  mappe('css', '.css', 'css'); mappe('js', '.js', 'js');
  /* Inline <style>/<script> i rod-HTML tæller med (kritisk CSS, inline boot). */
  for (const n of fs.readdirSync(rod).filter(f => /\.html$/.test(f))) {
    const h = fs.readFileSync(path.join(rod, n), 'utf8');
    ud.html.push({ fil: n, tekst: h });
  }
  return ud;
}

/* Fjerner kommentarer og strenge groft, så "inert" i en kommentar ikke tæller. */
function renTekst(t, art) {
  let s = t.replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (art === 'js') s = s.replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');
  return s;
}

function scan(rod = REPO) {
  const filer = laesFiler(rod);
  const res = FEATURES.map(f => {
    const kilder = f.kunHtml ? filer.html : (f.art === 'css' ? filer.css.concat(filer.html.map(h => ({ fil: h.fil + ' (inline)', tekst: (h.tekst.match(/<style[\s\S]*?<\/style>/g) || []).join('\n') }))) : filer.js.concat(filer.html.map(h => ({ fil: h.fil + ' (inline)', tekst: (h.tekst.match(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/g) || []).join('\n') }))));
    let antal = 0;
    const fil = {};
    for (const k of kilder) {
      let txt = f.kunHtml ? k.tekst.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '') : renTekst(k.tekst, f.art);
      if (f.kunHtml) { const m = txt.match(/<[a-z][^>]*\spopover[\s=>]/g); antal += m ? m.length : 0; if (m) fil[k.fil] = m.length; continue; }
      const m = txt.match(f.find);
      if (m) { antal += m.length; fil[k.fil] = m.length; }
    }
    return { id: f.id, art: f.art, label: f.label, min: f.min, fallback: f.fallback, fatal: !!f.fatal, vagt: !!f.vagt, note: f.note || null, antal, filer: Object.entries(fil).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n}:${c}`) };
  });
  const brugt = res.filter(r => r.antal > 0);
  /* Gulv = største min-version over BRUGTE funktioner, hvor siden ikke kan klare sig uden (fallback nej/delvist). */
  const gulv = {};
  for (const b of ['chrome', 'safari', 'firefox']) {
    const kandidater = brugt.filter(r => r.fallback !== 'progressiv');
    let max = null;
    for (const r of kandidater) { const v = versionTal(r.min[b]); if (v === Infinity) { max = { v: Infinity, id: r.id, vis: r.min[b] }; break; } if (!max || v > max.v) max = { v, id: r.id, vis: r.min[b] }; }
    gulv[b] = max ? { version: max.vis, drevetAf: max.id } : null;
  }
  /* Gulv uden de "fatale" (hvis lookbehind fjernes) - viser hvad det koster at fjerne den. */
  const gulvUdenFatale = {};
  for (const b of ['chrome', 'safari', 'firefox']) {
    let max = null;
    for (const r of brugt.filter(r => r.fallback !== 'progressiv' && !(r.id === 'regex-lookbehind'))) { const v = versionTal(r.min[b]); if (!max || v > max.v) max = { v, id: r.id, vis: r.min[b] }; }
    gulvUdenFatale[b] = max ? { version: max.vis, drevetAf: max.id } : null;
  }
  return { features: res, brugt, vagt: res.filter(r => r.vagt && r.antal > 0), gulv, gulvUdenLookbehind: gulvUdenFatale };
}

/* ---------- CSS-degradering (simulerer en ældre browser) ---------- */

/* Minimal CSS-gennemgang: returnerer en liste af tokens {type:'rule'|'at'|'decl', ...} rekursivt. Håndterer strenge, kommentarer, url(). */
function splitTop(css, tegn) {
  const dele = [];
  let dybde = 0, par = 0, streng = null, start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (streng) { if (c === '\\') i++; else if (c === streng) streng = null; continue; }
    if (c === '"' || c === "'") { streng = c; continue; }
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e === -1 ? css.length : e + 1; continue; }
    if (c === '(') par++; else if (c === ')') par--;
    else if (c === '{') dybde++;
    else if (c === '}') { dybde--; if (dybde === 0 && tegn === '}') { dele.push(css.slice(start, i + 1)); start = i + 1; } }
    else if (c === ';' && tegn === ';' && dybde === 0 && par === 0) { dele.push(css.slice(start, i + 1)); start = i + 1; }
  }
  if (start < css.length) dele.push(css.slice(start));
  return dele;
}

/* Fjerner det, de valgte egenskaber ikke understøtter. valg: Set af 'has' | 'container' | 'colormix' | 'dvh'. */
/* Kommentarer fjernes først: de kan indeholde klammer og semikolon, der forvirrer gennemgangen. */
const udenKommentarer = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

function degrader(css, valg) {
  valg = valg instanceof Set ? valg : new Set(valg);
  css = udenKommentarer(css);
  const afDecl = erDecl => {
    const deklarationer = splitTop(erDecl, ';');
    return deklarationer.filter(d => {
      const v = d.slice(d.indexOf(':') + 1);
      if (valg.has('colormix') && /color-mix\(/.test(v)) return false;
      if (valg.has('dvh') && /\d(dvh|svh|lvh)\b/.test(v)) return false;
      return true;
    }).join('');
  };
  const rens = blok => splitTop(blok, '}').map(r => {
    const aaben = r.indexOf('{');
    if (aaben === -1) return r;
    const prelude = r.slice(0, aaben), indhold = r.slice(aaben + 1, r.lastIndexOf('}'));
    if (/^\s*@/.test(prelude)) {
      if (valg.has('container') && /^\s*@container\b/.test(prelude)) return '';
      if (/^\s*@(media|supports|layer)\b/.test(prelude)) return `${prelude}{${rens(indhold)}}`;
      return afDeclSikker(r);                       // @font-face, @keyframes: deklarationer røres kun for color-mix/dvh
    }
    if (valg.has('has') && /:has\(/.test(prelude)) return '';
    if (valg.has('container') && /container-type|container-name|\bcontainer\s*:/.test(indhold)) { /* container-type droppes ikke: ukendt egenskab er harmløs, men @container er væk */ }
    return `${prelude}{${afDecl(indhold)}}`;
  }).join('');
  const afDeclSikker = r => { const a = r.indexOf('{'); return `${r.slice(0, a)}{${afDecl(r.slice(a + 1, r.lastIndexOf('}')))}}`; };
  return rens(css);
}

function rapport(s) {
  const l = ['| Funktion | Brugt | Chrome/Edge | Safari/iOS | Firefox | Uden støtte |', '|---|---|---|---|---|---|'];
  for (const r of s.brugt.sort((a, b) => b.antal - a.antal)) l.push(`| ${r.label}${r.fatal ? ' (FATAL)' : ''} | ${r.antal} | ${r.min.chrome} | ${r.min.safari} | ${r.min.firefox} | ${r.fallback} |`);
  l.push('', `Gulv (uden funktioner der er rene forbedringer): Chrome ${s.gulv.chrome.version} (${s.gulv.chrome.drevetAf}), Safari ${s.gulv.safari.version} (${s.gulv.safari.drevetAf}), Firefox ${s.gulv.firefox.version} (${s.gulv.firefox.drevetAf}).`);
  l.push(`Uden lookbehind: Safari ${s.gulvUdenLookbehind.safari.version} (${s.gulvUdenLookbehind.safari.drevetAf}).`);
  if (s.vagt.length) l.push('', 'ADVARSEL: vagtliste-funktioner i brug: ' + s.vagt.map(v => `${v.label} (${v.antal})`).join(', '));
  return l.join('\n');
}

module.exports = { FEATURES, scan, degrader, udenKommentarer, rapport, splitTop, versionTal };

if (require.main === module) {
  const s = scan(REPO);
  console.log(process.argv.includes('--json') ? JSON.stringify(s, null, 1) : rapport(s));
}
