/* Lægger Google Analytics (GA4) ind på hver side — bag samtykke.

   Hvorfor ikke bare klistre gtag-stumpen ind:

   1. CSP. Hver side har en streng Content-Security-Policy, som ikke tillader
      googletagmanager. Uden en tilføjelse dér loader GA slet ikke, og der
      kommer ingen synlig fejl — man tror bare, det virker, indtil man kigger
      i rapporten en måned senere. Domænerne tilføjes derfor her.

   2. Samtykke. GA4 sætter analyse-cookies. Sitet har et cookiebanner, der
      spørger om lov, og privatlivspolitikken lover "valgfrie cookies til
      statistik ... Du kan til enhver tid ændre dit samtykke". Fyrer vi GA af
      ved sideindlæsning, spørger banneret om noget, der allerede er
      besluttet, og politikken passer ikke længere.

      Derfor: scriptet indlæses KUN når samtykket er 'all'. Trykker man "Kun
      nødvendige", sker der ingenting. Trykker man "Accepter alle", starter
      det med det samme uden genindlæsning (js/components.js kalder
      window.bbStartAnalytics efter at have gemt svaret).

   Idempotent: blokken er mærket <script id="ga4"> og genskrives.
   Kør: node scripts/inline-analytics.js  (del af scripts/build.js) */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const MAALE_ID = 'G-RWJZ8NJB0C';

/* Værterne GA har brug for. googletagmanager serverer selve scriptet;
   google-analytics tager imod målingerne. Begge skal med, ellers loader
   scriptet men kan ikke sende noget. */
const CSP_TILFOEJ = {
  'script-src': ['https://www.googletagmanager.com'],
  'connect-src': ['https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'],
  'img-src': ['https://www.googletagmanager.com', 'https://*.google-analytics.com'],
};

const block = `<script id="ga4">/* GA4 bag samtykke — se scripts/inline-analytics.js */
window.bbStartAnalytics=function(){
  if(window.__ga4Startet)return; window.__ga4Startet=true;
  var s=document.createElement("script");
  s.async=true; s.src="https://www.googletagmanager.com/gtag/js?id=${MAALE_ID}";
  document.head.appendChild(s);
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag("js",new Date());
  // anonymize_ip: vi har ikke brug for praecise adresser til at taelle besoeg.
  gtag("config","${MAALE_ID}",{anonymize_ip:true});
};
try{
  var c=JSON.parse(localStorage.getItem("bb_cookie_consent"));
  if(c&&c.level==="all")window.bbStartAnalytics();
}catch(e){}
<\/script>`;

/* Tilføjer værter til et direktiv i CSP-strengen uden at duplikere. */
function udvidCsp(csp){
  for (const [direktiv, vaerter] of Object.entries(CSP_TILFOEJ)){
    const re = new RegExp(`(${direktiv} [^;]*)`);
    if (!re.test(csp)) continue;
    csp = csp.replace(re, (m) => {
      let ud = m;
      for (const v of vaerter) if (!ud.includes(v)) ud += ' ' + v;
      return ud;
    });
  }
  return csp;
}

const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let touched = 0, udenCsp = [];

for (const file of files){
  const p = path.join(root, file);
  let html = fs.readFileSync(p, 'utf8');

  // 1. CSP
  const cspRe = /(<meta http-equiv="Content-Security-Policy" content=")([^"]+)(")/;
  if (cspRe.test(html)){
    html = html.replace(cspRe, (m, a, csp, c) => a + udvidCsp(csp) + c);
  } else {
    udenCsp.push(file);
  }

  // 2. Selve blokken — efter tema-scriptet, så temaet stadig sættes først.
  html = /<script id="ga4">[\s\S]*?<\/script>/.test(html)
    ? html.replace(/<script id="ga4">[\s\S]*?<\/script>/, block)
    : html.replace(/(<script>try\{var t=localStorage[\s\S]*?<\/script>)/, `$1\n${block}`);

  if (!html.includes('id="ga4"')){
    console.warn(`  ${file}: fandt ikke indsætningspunktet — sprunget over`);
    continue;
  }
  fs.writeFileSync(p, html);
  touched++;
}

console.log(`inline-analytics: GA4 (${MAALE_ID}) lagt på ${touched} sider, bag samtykke.`);
if (udenCsp.length) console.warn(`  BEMÆRK: ingen CSP at udvide på: ${udenCsp.join(', ')}`);
