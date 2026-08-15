/* Indlejrer en lille "boot-fetch" øverst i hver side, der henter annoncerne
   FØR resten af javascriptet er hentet og kørt.

   Hvorfor: opstarten var strengt seriel — 15 js-filer skulle hentes og
   parses, DOMContentLoaded skulle falde, Supabase-SDK'et skulle initialisere,
   og FØRST derefter gik forespørgslen efter annoncer af sted. Målt på
   søgesiden (uden throttling) startede den 1.6s inde; med mobil-throttle
   landede LCP på 6.3s, fordi kortets foto først bliver kendt, når kortet er
   tegnet.

   Nu går forespørgslen af sted i første HTML-chunk — parallelt med at
   js/css/fonts hentes — og backend-bridge samler bare resultatet op
   (`window.__bbListingsBoot`). Falder den på gulvet, henter SDK'et som før;
   siden virker uændret uden den.

   Nøglen er den offentlige publishable-nøgle, der i forvejen ligger i
   js/supabase-config.js. Den er ikke en hemmelighed — RLS bestemmer adgangen.

   Idempotent: blokken er mærket <script id="boot-listings"> og genskrives. */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const cfg = fs.readFileSync(path.join(root, 'js', 'supabase-config.js'), 'utf8');
const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
if (!url || !key) throw new Error('inline-boot: kunne ikke læse url/anonKey fra js/supabase-config.js');

// Samme forespørgsel som db.listListings({ limit: 200 }) uden filtre.
const select = '*,seller:public_profiles!listings_seller_id_fkey(*),photos:listing_photos(id,storage_path,position)';
const query = `${url}/rest/v1/listings?select=${encodeURIComponent(select)}`
  + '&status=eq.active&order=created_at.desc&limit=200';

const block = `<script id="boot-listings">(function(){var k=${JSON.stringify(key)};`
  + `window.__bbListingsBoot=fetch(${JSON.stringify(query)},{headers:{apikey:k,Authorization:"Bearer "+k}})`
  + `.then(function(r){return r.ok?r.json():null}).catch(function(){return null})})();<\/script>`;

/* Kun sider hvor annoncerne er above-the-fold. På forsiden er hero-fotoet
   sidens LCP, og annoncerne ligger langt nede — dér stjæler prefetchen
   båndbredde og hovedtråd fra det, brugeren rent faktisk ser først
   (målt: FCP 1.3s → 1.8s, TBT 300ms → 440ms). */
const ANNONCER_OVER_FOLDEN = [
  /^soegning\.html$/,
  /^annonce(-.+)?\.html$/,
  /^maerke(r|-.+)?\.html$/,
  /^forhandler\.html$/,
  /^mine-annoncer\.html$/,
];

const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let touched = 0;

for (const file of files){
  const htmlPath = path.join(root, file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Kun sider der rent faktisk viser annoncer (dvs. loader backend-broen).
  if (!/js\/backend-bridge\.js/.test(html)) continue;

  if (!ANNONCER_OVER_FOLDEN.some(re => re.test(file))){
    const før = html;
    html = html.replace(/\n?<script id="boot-listings">[\s\S]*?<\/script>/, '');
    if (html !== før){
      fs.writeFileSync(htmlPath, html);
      console.log(`  ${file}: prefetch fjernet (annoncer er ikke above-the-fold)`);
    }
    continue;
  }

  html = /<script id="boot-listings">[\s\S]*?<\/script>/.test(html)
    ? html.replace(/<script id="boot-listings">[\s\S]*?<\/script>/, block)
    // Efter tema-scriptet, så temaet stadig sættes allerførst (undgår flash).
    : html.replace(/(<script>try\{var t=localStorage[\s\S]*?<\/script>)/, `$1\n${block}`);

  if (!html.includes('id="boot-listings"')){
    console.warn(`  ${file}: fandt ikke indsætningspunktet — sprunget over`);
    continue;
  }
  fs.writeFileSync(htmlPath, html);
  touched++;
}

console.log(`inline-boot: annonce-prefetch indlejret på ${touched} sider.`);
