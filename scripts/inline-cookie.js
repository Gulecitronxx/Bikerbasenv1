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

/* V6: det inline script åbner dialogen OG kobler de to knapper selv. Før var knapperne kun koblet af
   js/components.js — blev den blokeret/fejlede (script blokeret, netværksfejl, JS-fejl i et tidligere script),
   stod en showModal()-dialog åben med døde knapper, og hele siden var inert.
   Nu: "Accepter alle" / "Kun nødvendige" gemmer samtykket (samme nøgle og format {level,date} som
   Store.setCookieConsent), lukker og fjerner dialogen, og "Accepter alle" starter statistik (window.bbStartAnalytics,
   først nu — aldrig før samtykke). Dialogen mærkes data-bound="inline"; js/components.js kobler så ikke
   igen (idempotent: ét klik = ét gemt samtykke), men beholder sin vagt mod skjulte dialoger.
   Regel uændret: ikke på privatlivspolitik/vilkaar/om-indeksering. Mangler lagring (privat vindue), åbnes dialogen
   ikke her (som før), og components.js afgør. Skrevet i ES5 uden afhængigheder, så en tidligere fejl ikke kan nå den. */
const INLINE_KODE = String.raw`try{var K=__NOEGLE__,d=document.getElementById("cookie-banner");if(d&&!localStorage.getItem(K)){var l=/\/(privatlivspolitik|vilkaar|om-indeksering)(\.html)?$/.test(location.pathname);if(!l){var sv=function(v){return function(){if(d.getAttribute("data-svaret"))return;d.setAttribute("data-svaret",v);try{localStorage.setItem(K,JSON.stringify({level:v,date:new Date().toISOString()}));}catch(e){}try{d.close&&d.close();}catch(e){}d.removeAttribute("open");if(d.parentNode)d.parentNode.removeChild(d);if(v==="all"&&typeof window.bbStartAnalytics==="function"){try{window.bbStartAnalytics();}catch(e){}}};};var a=document.getElementById("cookie-accept-all"),n=document.getElementById("cookie-necessary-only");if(a&&n){a.addEventListener("click",sv("all"));n.addEventListener("click",sv("necessary"));d.addEventListener("cancel",function(e){e.preventDefault();});d.setAttribute("data-bound","inline");}if(d.showModal){d.showModal();}else{d.setAttribute("open","");}var z=function(){if(!d.isConnected||!d.open)return 1;var c=getComputedStyle(d);if(c.display==="none"||c.visibility==="hidden"||!d.offsetWidth){d.close&&d.close();d.removeAttribute("open");d.setAttribute("hidden","");return 1;}};if(!z()){var m=0,t=setInterval(function(){if(z()||++m>48)clearInterval(t);},250);document.addEventListener("visibilitychange",z);}}}}catch(e){}`.replace('__NOEGLE__', JSON.stringify(NØGLE));

const blok = `<!--cookie:start-->
<dialog class="cookie-modal" id="cookie-banner" aria-labelledby="cookie-modal-titel" aria-describedby="cookie-modal-tekst">
  <div class="cookie-modal-indhold">
    <h2 id="cookie-modal-titel">Vi bruger cookies</h2>
    <p class="cookie-modal-note" id="cookie-modal-tekst"><strong>Nødvendige cookies</strong> får siden til at virke og følger dig ikke. <strong>Statistik-cookies</strong> starter vi kun, hvis du siger ja. <a href="privatlivspolitik.html">Læs mere</a></p>
    <div class="cookie-modal-actions">
      <button type="button" class="btn btn-lg cookie-modal-knap" id="cookie-necessary-only" autofocus>Kun nødvendige</button>
      <button type="button" class="btn btn-lg cookie-modal-knap" id="cookie-accept-all">Accepter alle</button>
    </div>
  </div>
</dialog>
<script>${INLINE_KODE}</script>
<!--cookie:end-->`;

const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let touched = 0;

for (const file of files){
  const htmlPath = path.join(root, file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Kun sider der kører den fælles komponentkode (og dermed havde banneret).
  if (!/js\/components\.js/.test(html)) continue;

  /* 404.html bruges paa vilkaarlig dybe URL'er (/xx/yy/zz) — dér er et relativt link doedt. */
  const sideblok = file === '404.html' ? blok.replace('href="privatlivspolitik.html"', 'href="/privatlivspolitik.html"') : blok;
  html = /<!--cookie:start-->[\s\S]*?<!--cookie:end-->/.test(html)
    ? html.replace(/<!--cookie:start-->[\s\S]*?<!--cookie:end-->/, () => sideblok)
    : html.replace('</body>', () => sideblok + '\n</body>');

  fs.writeFileSync(htmlPath, html);
  touched++;
}

console.log(`inline-cookie: cookiebanner lagt i markuppen på ${touched} sider.`);
