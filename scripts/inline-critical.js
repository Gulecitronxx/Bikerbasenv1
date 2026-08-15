/* Inliner den kritiske (above-the-fold) CSS på forsiden og gør resten af
   styles.css ikke-render-blokerende. Kører sidst i byggekæden (efter
   stamp-version), så den arbejder på den friske ?v=.

   Hvorfor: forsidens LCP/FCP ventede på hele styles.css (108KB, render-
   blokerende). Ved at indlejre kun det above-the-fold (tokens → reset →
   buttons → header → hero, dvs. alt før "Category tiles") og hente resten
   asynkront, maler headeren+hero'en med det samme.

   Idempotent: markør <style id="critical"> genskrives, og stylesheet-linket
   skiftes kun til preload-swap hvis det stadig er et almindeligt stylesheet. */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8').split(/\r?\n/);
const boundary = css.findIndex(l => /Category tiles/.test(l));
if (boundary < 0) throw new Error('inline-critical: kunne ikke finde "Category tiles"-grænsen i styles.css');

const critical = css.slice(0, boundary).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')   // fjern kommentarer
  .replace(/[ \t]+/g, ' ')
  .replace(/\s*\n\s*/g, '\n')
  .replace(/\n{2,}/g, '\n')
  .trim();

const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Gør forsidens fulde stylesheet ikke-render-blokerende (kun hvis ikke gjort).
html = html.replace(
  /<link rel="stylesheet" href="(css\/styles\.css[^"]*)">/,
  '<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel=\'stylesheet\'">\n<noscript><link rel="stylesheet" href="$1"></noscript>'
);

// Indlejr/genskriv den kritiske CSS.
const block = `<style id="critical">${critical}</style>`;
html = /<style id="critical">[\s\S]*?<\/style>/.test(html)
  ? html.replace(/<style id="critical">[\s\S]*?<\/style>/, block)
  : html.replace('</head>', block + '\n</head>');

fs.writeFileSync(htmlPath, html);
console.log(`inline-critical: ${(critical.length / 1024).toFixed(1)}KB kritisk CSS indlejret (grænse linje ${boundary + 1}).`);
