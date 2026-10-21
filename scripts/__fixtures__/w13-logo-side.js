/* Testside til logosystemet: de samme slots, som forsiden, mærkesiden, søgefilteret og annoncetitlen får — bygget med
   BrandLogos.logoHTML og repoets egne stilark (styles.css + p-brand-logo.css). Bruges af w13-logo-layout.test.js og til
   screenshots. Alle logoer her er PLACEHOLDER-former (scripts/__fixtures__/brands), ikke rigtige logoer. */
const BL = require('../../js/brand-logos.js');
const G = require('../brand-logos-gen.js');
const H = require('./w13-logo-hjaelp.js');

const FORSIDE = ['Yamaha', 'Honda', 'BMW', 'Kawasaki', 'KTM', 'Ducati'];
const FILTER = ['Honda', 'Yamaha', 'BSA', 'Kawasaki', 'Suzuki', 'Triumph', 'Harley-Davidson', 'FB Mondial'];
const UDEN_LOGO = ['BSA', 'FB Mondial', 'Lauge Jensen', 'Hyosung', 'Harley-Davidson', 'Royal Enfield', 'Kymco', 'MV Agusta'];
const ALLE = ['Honda', 'Yamaha', 'BMW', 'Kawasaki', 'KTM', 'Ducati', 'Suzuki', 'Triumph'];

/* medLogo=false -> standard-instansen (ingen godkendte logoer); true -> testmanifestet med placeholder-SVG'er. */
function instans(medLogo){
  return BL.opret(G.byggData(medLogo ? H.testManifest() : H.renManifest()));
}

function side(medLogo, { sti = '/' } = {}){
  const b = instans(medLogo);
  const fl = (n, i) => `<a class="maerke-flise" href="#" aria-label="${n}, ${1200 - i * 90} annoncer">
        ${b.logoHTML(n, { storrelse: 'lg', decorative: true })}
        <strong>${n}</strong>
        <span class="tal-n" aria-hidden="true">${1200 - i * 90}</span>
      </a>`;
  const hero = (n, kl) => `<div class="hero-test ${kl || ''}" data-test="hero-${b.normaliser(n)}"><p class="hero-ord">${b.logoHTML(n, { storrelse: 'hero', decorative: true })}${b.logoFor(n).harLogo && b.logoFor(n).variant !== 'emblem' ? '' : `<span>${n}</span>`}</p></div>`;
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>W13 logotest</title>
<link rel="stylesheet" href="${sti}css/styles.css"><link rel="stylesheet" href="${sti}css/p-brand-logo.css">
<style>
  body{ margin:0; padding:16px; background:var(--color-bg); color:var(--color-fg); font-family:var(--font-body); }
  h2{ font-size:14px; margin:20px 0 8px; font-family:var(--font-display); }
  .raekke{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  .hero-test{ background:#12100c; padding:16px; border-radius:12px; margin-bottom:8px; --bl-fg:#fff; --bl-text:#fff; --bl-mono-fg:#fff; --bl-mono-bg:transparent; }
  .hero-ord{ display:flex; align-items:center; gap:.45em; margin:0; color:#fff; font:700 clamp(30px,6vw,54px)/1 var(--font-display); text-transform:uppercase; }
  .filter-test{ width:min(100%,280px); background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; padding:8px 12px; }
  .filter-test label{ display:flex; align-items:center; gap:8px; min-height:36px; font-size:14px; }
  .titel-test{ display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .titel-test h1{ margin:0; font-size:28px; font-family:var(--font-display); }
  .alene{ background:var(--color-surface); border:1px solid var(--color-border); border-radius:10px; padding:10px 14px; }
</style></head><body>
<h2>Forsidens «Populære mærker» (6 fliser, lg-slot)</h2>
<div class="tre-kol"><div class="kol"><div class="maerke-grid" id="grid-forside" data-test="grid-forside">${FORSIDE.map(fl).join('')}</div></div></div>

<h2>Mærkeside-hero (emblem + navn / ordmærke / uden logo)</h2>
${hero('Honda')}${hero('Kawasaki')}${hero('BSA')}${hero('Harley-Davidson')}

<h2>Søgefilter (sm-slot i fast kolonne)</h2>
<div class="filter-test" data-test="filter">${FILTER.map(n => `<label><span class="bl-spalte bl-spalte--sm">${b.logoHTML(n, { storrelse: 'sm', decorative: true })}</span><input type="checkbox"> ${n}</label>`).join('')}</div>

<h2>Annoncetitel med logo (xl, ikke dekorativt)</h2>
<div class="titel-test" data-test="titel"><h1>Honda CB 1000 R</h1>${b.logoHTML('Honda', { storrelse: 'xl', decorative: false })}</div>

<h2>Ordmærke-fallback alene (lg, ikke dekorativt) — samme slot som et logo</h2>
<div class="raekke" data-test="alene">${UDEN_LOGO.map(n => `<span class="alene">${b.logoHTML(n, { storrelse: 'lg', decorative: false })}</span>`).join('')}</div>

<h2>Alle slotstørrelser, logo/fallback</h2>
<div class="raekke" data-test="stoerrelser">${['sm', 'md', 'lg', 'xl', 'hero'].map(s => ALLE.concat(UDEN_LOGO.slice(0, 3)).map(n => b.logoHTML(n, { storrelse: s })).join('')).join('')}</div>

<h2>md-slot: visuel vægt</h2>
<div class="raekke" data-test="vaegt" id="vaegt">${ALLE.map(n => `<span data-n="${n}">${b.logoHTML(n, { storrelse: 'md' })}</span>`).join('')}</div>
<h2>Alle slots: visuel vægt (areal) pr. størrelse</h2>
<div class="raekke" data-test="vaegt-alle" id="vaegt-alle">${['sm', 'az', 'md', 'lg', 'xl', 'hero'].map(s => ALLE.map(n => `<span data-n="${n}" data-s="${s}">${b.logoHTML(n, { storrelse: s })}</span>`).join('')).join('')}</div>

<h2>A–Z-liste (sm-slot i bred kolonne): logo eller monogram i samme kolonne</h2>
<div class="filter-test" data-test="az">${ALLE.concat(UDEN_LOGO).map(n => `<label class="az-rad"><span class="bl-spalte bl-spalte--sm">${b.logoHTML(n, { storrelse: 'sm', decorative: true })}</span><span class="az-navn">${n}</span></label>`).join('')}</div>
<div id="indsaet" style="min-height:120px" data-test="indsaet"></div>
<script type="application/json" id="testdata">${JSON.stringify(G.byggData(H.testManifest()))}</script>
<script src="${sti}js/brand-logos-data.js"></script><script src="${sti}js/brand-logos.js"></script>
</body></html>`;
}

module.exports = { side, instans, FORSIDE, FILTER, UDEN_LOGO, ALLE };
