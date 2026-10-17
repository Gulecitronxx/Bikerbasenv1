/* Indlejrer den kritiske (above-the-fold) CSS i <head> og udskyder de fulde ark (css/styles.css + sidens
   p-*.css), så første maling ikke venter på dem. Kører sidst før csp-hashes i byggekæden (efter
   stamp-version), så den arbejder på den friske ?v=.

   ============================================================
   HVAD ER ÆNDRET I W12 (og hvorfor det virker nu)
   ============================================================
   Før: en håndlavet liste af sektionsnavne pr. side (PAGES), og en IKKE_UDSKUDT-regel, der matchede alle filer,
   slog det hele fra. w11-perf målte, at indlejret kritisk CSS ville give mobil-FCP 1876 -> 652 ms (forside),
   men CLS 0,121 på koerekort-a2. To årsager, begge fundet i w12:

   1. Udsnittet var et gæt (hele sektioner efter navn). Nu afgør RIGTIG rendering det: scripts/kritisk-gen.js
      åbner hver sides familie i Chromium (390x844 og 1440x900, lys/mørk, friske cookies, mock-data) og gemmer,
      hvilke regler der rammer det, man ser i de første 1,5 viewporthøjder + skjulte elementer + alle
      skjul/fastlås-regler. Resultatet er scripts/kritisk-manifest.json (regel-hashes pr. familie). Her, i
      byggekæden, er der ingen browser: scripts/kritisk-css.js deler arkene i regler, tager dem manifestet kalder
      kritiske MED PLUS ALLE REGLER MANIFESTET IKKE KENDER (ny/ændret regel = med), og skriver dem i arkets egen
      rækkefølge. Et forældet manifest giver et større udsnit, aldrig et forkert.
   2. Udskydelsen brugte `onload="this.rel='stylesheet'"`. csp-hashes.js AFBRYDER på inline event-handlere, og
      CSP'en (script-src uden 'unsafe-hashes') blokerer dem: det fulde ark blev aldrig indlæst, og siden stod
      med udsnittet alene (w11-målingen af 0,121 CLS var altså et ark, der ALDRIG kom). Nu: ingen script og
      ingen handler. Arkene preloades i <head> (<link rel="preload" as="style">, høj prioritet, starter med det
      samme), og de rigtige <link rel="stylesheet"> står sidst i <body> (før et evt. <style> i body). Chromium
      maler det, der står før et stylesheet i body, uden at vente på det — og et ventende stylesheet holder
      sidens deferred scripts tilbage, indtil arket er hentet. Det er præcis den rækkefølge, scripts altid har
      kørt i (efter fuld CSS), så kode der læser layout (js/home.js måler gitterets spalter med
      getComputedStyle) ser aldrig et udsnit. Uden JavaScript virker det også: det er almindelige links.
      Kaskaden er uændret: det indlejrede udsnit står først, de fulde ark kommer bagefter og har sidste ord.

   Kun familier i AKTIV (scripts/kritisk-familier.js) får blokken; resten er byte-identiske med et build uden
   dette trin (render-blokerende <link>). Aktiveringen hviler på målingerne i
   docs/review/gauntlet/builder-w12-kritisk.md (CLS < 0,05 OG FCP-gevinst).

   CSP: sidernes style-src har 'unsafe-inline', så en indlejret <style> kræver ingen hash. script-src røres ikke.

   Idempotent: hver kørsel nulstiller først siden til to almindelige render-blokerende <link>s (også fra den
   gamle preload/onload-form) og bygger derefter forfra efter reglerne ovenfor.

   Miljø: BB_KRITISK=alle|ingen|navn,navn tvinger aktivering (til måling og test); uden den gælder AKTIV. */

const fs = require('fs');
const path = require('path');
const K = require('./kritisk-css');
const { AKTIV, familieFor } = require('./kritisk-familier');

const root = path.join(__dirname, '..');
const MANIFEST = path.join(__dirname, 'kritisk-manifest.json');

/* ---- Hvilke familier er slået til ---- */
function aktiveFamilier(env = process.env.BB_KRITISK){
  if (!env) return AKTIV;
  if (env === 'ingen') return new Set();
  if (env === 'alle') return 'alle';
  return new Set(env.split(',').map(s => s.trim()).filter(Boolean));
}

/* ---- Nulstil til almindelige render-blokerende links ---- */
function nulstil(html){
  return html
    // gammel form (w1-w10): preload + onload + noscript
    .replace(/<link rel="preload" as="style" href="(css\/[^"]+)" onload="[^"]*">\s*\n?<noscript><link rel="stylesheet" href="css\/[^"]*"><\/noscript>/g, '<link rel="stylesheet" href="$1">')
    // w12: indlejret blok væk; linkene nederst i body væk; preload i head bliver det almindelige link igen
    .replace(/<style id="critical">[\s\S]*?<\/style>\r?\n?/g, '')
    .replace(/<link rel="stylesheet" href="css\/[^"]+" data-kritisk>\r?\n?/g, '')
    .replace(/<link rel="preload" as="style" href="(css\/[^"]+)" data-kritisk>/g, '<link rel="stylesheet" href="$1">');
}

/* Stilarkene en side bruger (kun lokale css/*.css), i dokumentrækkefølge. */
function arkIside(html){
  const ud = [];
  for (const m of html.matchAll(/<link rel="stylesheet" href="(css\/[a-zA-Z0-9._-]+\.css)(\?[^"]*)?">/g)){
    if (!ud.some(x => x.fil === m[1])) ud.push({ fil: m[1], tag: m[0] });
  }
  return ud;
}

/* Bygger siden med indlejret kritisk blok. `kritisk` er CSS-teksten. Returnerer ny html (eller uændret, hvis siden
   ingen almindelige css-links har). Erstatter med slice, ikke String.replace, så $ i CSS ikke tolkes som mønster. */
function anvend(html, kritisk){
  const ark = arkIside(html);
  if (!ark.length) return html;
  const eol = html.includes(String.fromCharCode(13, 10)) ? String.fromCharCode(13, 10) : String.fromCharCode(10);
  const erstat = (h, fra, til) => { const i = h.indexOf(fra); return i < 0 ? h : h.slice(0, i) + til + h.slice(i + fra.length); };
  const preload = t => t.replace('rel="stylesheet"', 'rel="preload" as="style"').replace(/>$/, ' data-kritisk>');
  let ud = html;
  ark.forEach((a, i) => { ud = erstat(ud, a.tag, (i === 0 ? '<style id="critical">' + kritisk + '</style>' + eol : '') + preload(a.tag)); });
  // De rigtige links: foer et evt. <style> i body (sidens egne body-regler skal fortsat staa EFTER arkene i kaskaden), ellers nederst.
  const links = ark.map(a => a.tag.replace(/>$/, ' data-kritisk>') + eol).join('');
  const b = ud.search(/<body[\s>]/);
  const bs = b < 0 ? -1 : ud.indexOf('<style', b);
  const sted = bs >= 0 ? bs : ud.lastIndexOf('</body>');
  return sted < 0 ? html : ud.slice(0, sted) + links + ud.slice(sted);
}

/* ---- Hovedløb ---- */
function koer(){
  let manifest = null;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { /* ingen manifest */ }
  const aktive = aktiveFamilier();
  const cache = {};
  const hentArk = fil => {
    if (!cache[fil]){
      const p = K.parse(fs.readFileSync(path.join(root, fil), 'utf8'));
      cache[fil] = p.farlig.length ? { farlig: p.farlig } : { traeet: p.traeet };
    }
    return cache[fil];
  };
  const kendt = manifest ? new Set(manifest.regler) : new Set();

  const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
  let touched = 0, nulstillet = 0;
  const pr = {};
  for (const file of files){
    const htmlPath = path.join(root, file);
    const raa = fs.readFileSync(htmlPath, 'utf8');
    if (!/<link[^>]+css\/styles\.css/.test(raa)) continue;
    let html = nulstil(raa);
    const fam = familieFor(file);
    const taendt = fam && manifest && manifest.familier[fam] && (aktive === 'alle' || aktive.has(fam));
    let anvendt = false;
    if (taendt){
      const ark = arkIside(html).map(a => hentArk(a.fil));
      if (ark.some(a => a.farlig)){
        console.warn(`  ${file}: ark kan ikke afkortes sikkert (${ark.find(a => a.farlig).farlig[0]}) — render-blokerende`);
      } else {
        const krit = new Set(manifest.familier[fam].krit.map(i => manifest.regler[i]));
        const kritisk = K.udsnit(ark.map(a => a.traeet), krit, kendt);
        const ny = anvend(html, kritisk);
        if (ny !== html){
          html = ny; anvendt = true;
          pr[fam] = (pr[fam] || 0) + 1;
          touched++;
          if (process.env.BB_KRITISK_STILLE !== '1') console.log(`  ${file.padEnd(46)} ${(kritisk.length / 1024).toFixed(1)}KB kritisk (${fam})`);
        }
      }
    }
    if (html !== raa){
      fs.writeFileSync(htmlPath, html);
      if (!anvendt) nulstillet++;
    }
  }
  console.log(`inline-critical: ${touched} sider fik indlejret kritisk CSS` + (touched ? ` (${Object.entries(pr).map(([k, v]) => `${k} ${v}`).join(', ')})` : '')
    + (nulstillet ? `; ${nulstillet} nulstillet til render-blokerende` : '') + '.');
}

module.exports = { nulstil, anvend, arkIside, aktiveFamilier };
if (require.main === module) koer();
