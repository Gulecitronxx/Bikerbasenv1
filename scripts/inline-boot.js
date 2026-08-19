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
/* `forhandler.html` stod her indtil 16.08.2026 og er taget ud igen — ikke
   fordi annoncerne ligger under folden, men fordi siden ALDRIG læser listen.
   `hentSaelgerLokalt()` i js/forhandler.js matcher på sælgerens id eller navn;
   en egen annonce har `seller.id` = uuid, og den vej slår op direkte i
   databasen med `db.listingsBySeller()`. Prefetchen hentede altså 200 rækker
   for at kaste dem væk. Se samme argument i SIDER_UDEN_EGNE i
   js/backend-bridge.js — de to steder skal ændres sammen. */
const ANNONCER_OVER_FOLDEN = [
  /^soegning\.html$/,
  /^annonce(-.+)?\.html$/,
  /^maerke(r|-.+)?\.html$/,
  /^mine-annoncer\.html$/,
];

/* ---------- Forbindelsen til kildernes billedvært ----------

   HVAD DER VAR GALT. Søgesidens LCP-element er det første annoncekorts foto,
   og det ligger på `images.danbase.dk` — MC Syds billedvært, varmlinket.
   Målt (Lighthouse 12.8.2, mobil, 4x CPU, HEAD): LCP 4.201 ms fordelt som
   TTFB 457 · Load Delay 2.443 · Load Time 1.226 · Render Delay 113. De
   1.226 ms er ét billede på 59.702 B — altså 49 B/ms. Resten er, at
   browseren møder en HELT ny origin i det øjeblik den skal bruge den:
   DNS-opslag, TCP-håndtryk og TLS-håndtryk oven i selve hentningen. Siden
   har `preconnect` til Supabase og til jsDelivr, men ikke til den vært, dens
   STØRSTE element kommer fra.

   Hvorfor det ikke bare kan preloades i stedet: adressen på fotoet findes
   ikke, før dataene er hjemme og kortet er tegnet (se `blandetRaekkefoelge()`
   i js/search.js — rækkefølgen afgøres i browseren). En `preconnect` kræver
   ikke at kende adressen, kun værten, og den kan derfor stå i HTML'en.

   Værterne LÆSES ud af sidens egen `img-src` i CSP'en frem for at stå her.
   Det er ikke smart for smartheds skyld: CSP'en er i forvejen stedet, hvor
   det står skrevet ned, hvilke billedværter siden må hente fra, og en liste
   mere ville før eller siden komme i modstrid med den. Kommer der en ny
   kilde (sources/*.yaml), får den sin preconnect samme dag dens vært
   kommer i CSP'en. */
const EGNE_ELLER_IKKE_BILLEDER = [
  /supabase\.co$/,          // har allerede sin egen preconnect ovenfor
  /googletagmanager\.com$/, // analytics hentes med vilje sent
  /google-analytics\.com$/,
];

function billedVaerter(html){
  const csp = (html.match(/<meta http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/) || [])[1] || '';
  const imgSrc = (csp.split(';').find(d => d.trim().startsWith('img-src')) || '').trim();
  const ud = [];
  for (const led of imgSrc.split(/\s+/).slice(1)){
    if (!/^https:\/\//.test(led)) continue;      // 'self', data:, blob:
    if (led.includes('*')) continue;             // jokertegn kan ikke preconnectes
    const vaert = led.replace(/^https:\/\//, '').replace(/\/.*$/, '');
    if (EGNE_ELLER_IKKE_BILLEDER.some(re => re.test(vaert))) continue;
    ud.push(vaert);
  }
  return ud;
}

const HINT_START = '<!--kildefotos:start-->';
const HINT_SLUT = '<!--kildefotos:slut-->';

function billedHints(html){
  const vaerter = billedVaerter(html);
  if (!vaerter.length) return '';
  // crossorigin: <img> uden crossorigin-attribut hentes i "anonymous"-tilstand,
  // og en preconnect UDEN crossorigin ville derfor varme en anden forbindelse
  // op end den, billedet ender med at bruge. Det er den klassiske fælde ved
  // preconnect — to forbindelser i stedet for nul.
  return HINT_START
    + vaerter.map(v => `<link rel="preconnect" href="https://${v}" crossorigin>`).join('')
    + HINT_SLUT;
}

function skrivHints(html, hints){
  const re = new RegExp(`${HINT_START}[\\s\\S]*?${HINT_SLUT}`);
  if (re.test(html)) return hints ? html.replace(re, hints) : html.replace(new RegExp(`\\r?\\n?${HINT_START}[\\s\\S]*?${HINT_SLUT}`), '');
  if (!hints) return html;
  // Lige efter de eksisterende preconnects, så alle forbindelseshints står
  // samlet og i den rækkefølge, browseren møder dem.
  return html.replace(/(<link rel="preconnect"[^>]*>)(?![\s\S]*<link rel="preconnect")/, `$1\n${hints}`);
}

const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let touched = 0;
let hintet = 0;

for (const file of files){
  const htmlPath = path.join(root, file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Kun sider der rent faktisk viser annoncer (dvs. loader backend-broen).
  if (!/js\/backend-bridge\.js/.test(html)) continue;

  if (!ANNONCER_OVER_FOLDEN.some(re => re.test(file))){
    const før = html;
    // \r?\n?, ikke \n?: HTML-filerne har CRLF i arbejdstræet (core.autocrlf).
    // Uden \r? blev linjeskiftet halveret, og der stod et løst CR tilbage —
    // så holdt git op med at kunne normalisere filen, og HELE filen stod som
    // ændret i diffen. Set og rettet 16.08.2026.
    html = html.replace(/\r?\n?<script id="boot-listings">[\s\S]*?<\/script>/, '');
    html = skrivHints(html, '');
    if (html !== før){
      fs.writeFileSync(htmlPath, html);
      console.log(`  ${file}: prefetch fjernet (siden er ikke på listen ovenfor)`);
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
  const hints = billedHints(html);
  html = skrivHints(html, hints);
  if (hints && html.includes(HINT_START)) hintet++;
  fs.writeFileSync(htmlPath, html);
  touched++;
}

console.log(`inline-boot: annonce-prefetch indlejret på ${touched} sider, `
  + `preconnect til kildernes billedværter på ${hintet}.`);
