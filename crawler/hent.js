/* Fetch: hent en listeside i en rigtig browser.

   MC Syds annoncegitter injiceres af JavaScript. Den rå HTML på en mærkeside
   er 48.807 bytes med 49 links og NUL af dem peger på et produkt — det er
   verificeret med curl. Derfor Playwright og ikke fetch(). En crawler bygget
   på fetch() ville ikke fejle her; den ville rapportere nul annoncer og se
   ud som om kilden var tom.

   Browseren startes én gang pr. kørsel og genbruges. At starte Chromium pr.
   side koster mere tid end selve hentningen. */

const { chromium } = require('playwright');
const { medHastighedsgraense } = require('./hastighed');
const { udtraekKort, udtraekDetalje } = require('./parse');

const NAVIGATION_TIMEOUT_MS = 45_000;
const GITTER_TIMEOUT_MS = 20_000;
const DETALJE_TIMEOUT_MS = 15_000;

// Vi siger hvem vi er. En forhandler, der ser trafikken i sin log, skal kunne
// se, at det er os, og kunne finde en adresse at skrive til.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/131.0.0.0 Safari/537.36 Bikerbasen-indeksering/1.0 (+https://bikerbasen.dk/om-indeksering)';

/* Statuskoden skal MED ud af kastet (C-012).

   Før stod der bare `throw new Error('HTTP 403 på ...')`, og pipelinen kunne
   kun læse den igen ud af en tekststreng. Uden koden kan den ikke skelne de
   to slags 4xx, og de kræver modsatte reaktioner: 403/429 er kilden, der
   siger nej til OS — bak ud og alarmér. 404 er én annonce, der er væk —
   fortsæt. Begge endte før i samme `continue`, og så kunne crawleren lave
   332 forespørgsler mod en kilde, der havde afvist den første. */
function httpFejl(status, url){
  const e = new Error(`HTTP ${status} på ${url}`);
  e.status = status;
  return e;
}

async function aabnBrowser(){
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: 'da-DK',
    viewport: { width: 1440, height: 1000 },
  });
  return {
    context,
    luk: async () => { await context.close().catch(() => {}); await browser.close().catch(() => {}); },
  };
}

/* Hent én listeside og returnér de rå kort.

   Hele besøget — navigation, ventetid på gitteret og scroll — ligger inde i
   hastighedsgrænsen. Ellers ville et scroll, der udløser efterindlæsning,
   ramme serveren uden for køen. */
async function hentListeside(context, kilde, url){
  return medHastighedsgraense(kilde.domaene, kilde.crawl_delay_ms, async () => {
    const page = await context.newPage();
    try {
      const svar = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      if (svar && svar.status() >= 400){
        throw httpFejl(svar.status(), url);
      }

      try {
        await page.waitForSelector(kilde.selectors.kort, { timeout: GITTER_TIMEOUT_MS });
      } catch {
        // Ingen kort. Enten en tom mærkeside eller et designskift. Begge dele
        // skal rapporteres som nul med en grund, ikke som en fejlet kørsel.
        return { url, kort: [], advarsel: `ingen kort matchede "${kilde.selectors.kort}" inden ${GITTER_TIMEOUT_MS} ms` };
      }

      await rulTilBunden(page, kilde.selectors.kort);
      const kort = await udtraekKort(page, kilde.selectors);
      return { url, kort, advarsel: null };
    } finally {
      await page.close().catch(() => {});
    }
  });
}

/* Hent én annonces detaljeside og returnér dens specfelter som etiket -> tekst.

   Det her er det dyre kald. Kommentaren over indsamlAnnoncer() i pipeline.js
   forklarer, hvorfor MC Syd IKKE får det: alle felter står på deres kort, og
   332 detaljesider ville koste tyve minutter for ingenting.

   Gul og Gratis er det modsatte. Deres kort har titel, pris, postnummer og
   dato — og intet andet. Ccm, hk, kilometer og årgang står kun her. Uden
   dette kald ville hver eneste annonce fra dem stå "Ikke oplyst" i alle
   felter og blive skjult af alle filtre, inklusive kørekortfiltret.

   Hentningen ligger inde i hastighedsgrænsen, ligesom listesiderne. Én
   annonce = ét kald = ét ophold. Det er dét, der gør trinet dyrt, og det er
   dét, der gør det høfligt. */
async function hentDetaljeside(context, kilde, url){
  return medHastighedsgraense(kilde.domaene, kilde.crawl_delay_ms, async () => {
    const page = await context.newPage();
    try {
      const svar = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      if (svar && svar.status() >= 400){
        throw httpFejl(svar.status(), url);
      }
      try {
        await page.waitForSelector(kilde.detalje.par, { timeout: DETALJE_TIMEOUT_MS });
      } catch {
        /* Ingen specfelter. Kan være en annonce, hvor sælgeren ikke udfyldte
           noget, og kan være et designskift. Forskellen ses kun på antallet,
           og derfor tælles og logges det i pipelinen frem for at kaste. */
        return { url, par: {}, advarsel: `ingen specfelter matchede "${kilde.detalje.par}"` };
      }
      return { url, par: await udtraekDetalje(page, kilde.detalje), advarsel: null };
    } finally {
      await page.close().catch(() => {});
    }
  });
}

/* Sikkerhedsnet mod efterindlæsning ved scroll. Vi ruller til bunden, indtil
   antallet af kort holder op med at vokse. Loftet er der, fordi en side med
   uendelig scroll ellers ville køre, til hukommelsen løb tør.

   MC Syd har det IKKE: hele listen står i DOM'en ved første indlæsning, 345
   kort både før og efter scroll, og siden skriver selv "343 ud af 343
   resultater". Løkken koster derfor én ekstra optælling pr. side og stopper.
   Den bliver stående, fordi den næste Danbase-forhandler kan have flere
   produkter, end de leverer på én gang — og fordi alternativet er stille
   datatab: en liste, der er afkortet, ser ud som en liste, der er kort. */
async function rulTilBunden(page, kortSelector, maksRul = 25){
  let forrige = -1;
  for (let i = 0; i < maksRul; i++){
    const antal = await page.evaluate(s => document.querySelectorAll(s).length, kortSelector);
    if (antal === forrige) break;
    forrige = antal;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // Kort ophold: dette er ikke et nyt HTTP-kald til dokumentet, men det kan
    // udløse XHR. Vi giver siden tid til at svare, før vi tæller igen.
    await page.waitForTimeout(800);
  }
}

module.exports = { aabnBrowser, hentListeside, hentDetaljeside, USER_AGENT };
