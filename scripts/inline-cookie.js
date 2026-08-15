/* Lægger cookiebanneret i selve markuppen i stedet for at lade javascriptet
   bygge det ~4 sekunder inde i indlæsningen.

   Hvorfor: bannerets tekst var sidens LCP-element på seks sider (login,
   annonce, forhandler, mine annoncer, dashboard, opret annonce). Ikke fordi
   den er stor, men fordi den var det største element der overhovedet blev
   malet — resten af de siders indhold bygges også af javascript. Målt:
   LCP 3.9-4.5s, hvoraf 3.9-4.1s var ren "render delay" mens banneret
   ventede på at js/components.js kørte.

   Nu står banneret i HTML'en (skjult), og en lille inline-linje viser det
   med det samme, hvis brugeren ikke allerede har svaret. js/components.js
   kobler kun knapperne på. Banneret er position:fixed, så det skubber
   ingenting — ingen CLS ved at vise det tidligt.

   Idempotent: blokken er mærket <!--cookie:start--> … <!--cookie:end-->. */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

// Samme nøgle som Store.KEYS.cookieConsent i js/store.js.
const NØGLE = (fs.readFileSync(path.join(root, 'js', 'store.js'), 'utf8')
  .match(/cookieConsent:\s*'([^']+)'/) || [])[1];
if (!NØGLE) throw new Error('inline-cookie: kunne ikke læse cookieConsent-nøglen fra js/store.js');

const blok = `<!--cookie:start-->
<div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Cookiesamtykke" hidden>
  <div class="cookie-banner-text">
    <strong>Vi bruger cookies</strong>
    <p>Bikerbasen bruger nødvendige cookies for at få siden til at fungere, og valgfrie cookies til statistik og forbedring af oplevelsen. Læs mere i vores <a href="privatlivspolitik.html">privatlivspolitik</a>.</p>
  </div>
  <div class="cookie-banner-actions">
    <button type="button" class="btn btn-outline btn-sm" id="cookie-necessary-only">Kun nødvendige</button>
    <button type="button" class="btn btn-primary btn-sm" id="cookie-accept-all">Accepter alle</button>
  </div>
</div>
<script>try{if(!localStorage.getItem(${JSON.stringify(NØGLE)}))document.getElementById("cookie-banner").hidden=false;}catch(e){}<\/script>
<!--cookie:end-->`;

const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let touched = 0;

for (const file of files){
  const htmlPath = path.join(root, file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Kun sider der kører den fælles komponentkode (og dermed havde banneret).
  if (!/js\/components\.js/.test(html)) continue;

  html = /<!--cookie:start-->[\s\S]*?<!--cookie:end-->/.test(html)
    ? html.replace(/<!--cookie:start-->[\s\S]*?<!--cookie:end-->/, blok)
    : html.replace('</body>', blok + '\n</body>');

  fs.writeFileSync(htmlPath, html);
  touched++;
}

console.log(`inline-cookie: cookiebanner lagt i markuppen på ${touched} sider.`);
