/* Head- og whitespace-optimering af de HTML-sider, der udgives (kun _site, aldrig kilden).
   Brugt af scripts/udgiv.js; testet i scripts/w11-perf.test.js.

   FONT-PRELOAD. Maalt (Slow 4G 150 ms/1,44 Mbit, 4x CPU, gzip-server, minificeret _site, A/B/A/B,
   7 koersler pr. celle): de to woff2-preloads (67 KB) deler baandbredde lige med den render-
   blokerende css og hero-billedet, saa css'en lander ca. 1 s senere end uden dem. Uden preload
   fald FCP: forside 2160/1488 -> 1364/1296 ms, soegning 1440/1380 -> 1092/1012 ms, type-sport
   1760/1668 -> 1344/1424 ms; CLS uaendret (0,000-0,003). Modsiger work/DECISIONS.md
   "Font-preloadene BLIVER" (maalt dengang paa en stoerre css). Pris: fonten opdages foerst naar
   css er parset, saa teksten staar kort i system-skrift (font-display:swap, som altid).
   Standard i udgiv.js: preloads BEHOLDES; BB_FONT_PRELOAD=0 fjerner dem. Regex rammer KUN as="font". */

const FONT_PRELOAD = /<link\b[^>]*\brel="preload"[^>]*\bas="font"[^>]*>[ \t]*\r?\n?/gi;

function fjernFontPreload(html){
  return html.replace(FONT_PRELOAD, '');
}

/* Fjerner foranstillet indrykning og tomme linjer UDEN for <script>, <style>, <pre>, <textarea>
   (inline-scripts skal blive byte-identiske: deres sha256 staar i CSP'en). Foranstillet
   mellemrum efter et linjeskift kollapser i rendering alligevel. */
function traekWhitespace(html){
  return html.replace(/(<(script|style|pre|textarea)\b[\s\S]*?<\/\2>)|([^<]+|<)/gi,
    (m, blok, _t, tekst) => blok ? blok : tekst.replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n'));
}

function optimerHead(html, valg = {}){
  let ud = html;
  if (!valg.beholdFontPreload) ud = fjernFontPreload(ud);
  return traekWhitespace(ud);
}

module.exports = { fjernFontPreload, traekWhitespace, optimerHead };
