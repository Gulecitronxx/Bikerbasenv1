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
<dialog class="cookie-modal" id="cookie-banner" aria-labelledby="cookie-modal-titel">
  <div class="cookie-modal-indhold">
    <h2 id="cookie-modal-titel">Vi bruger cookies</h2>
    <p>Bikerbasen bruger <strong>nødvendige cookies</strong> for at få siden til at fungere — dem kan du ikke fravælge, og de bruges ikke til at følge dig.</p>
    <p>Vi vil desuden gerne bruge <strong>valgfrie cookies til statistik</strong>, så vi kan se, hvad der virker på siden. Dem starter vi kun, hvis du siger ja.</p>
    <p class="cookie-modal-note">Du kan altid skifte mening. Læs mere i vores <a href="privatlivspolitik.html">privatlivspolitik</a>.</p>
    <div class="cookie-modal-actions">
      <button type="button" class="btn btn-lg cookie-modal-knap" id="cookie-necessary-only" autofocus>Kun nødvendige</button>
      <button type="button" class="btn btn-lg cookie-modal-knap" id="cookie-accept-all">Accepter alle</button>
    </div>
  </div>
</dialog>
<script>try{if(!localStorage.getItem(${JSON.stringify(NØGLE)})){var d=document.getElementById("cookie-banner");if(d&&d.showModal){d.showModal();}else if(d){d.setAttribute("open","");}}}catch(e){}<\/script>
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
