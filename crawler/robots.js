/* robots.txt — hentet og læst ved HVER kørsel (C-013).

   HVAD DER VAR GALT. Spærren hed `robots_tjekket`, men den var en
   attestation og ikke en kontrol: et felt med en dato i, som nogen havde
   skrevet. Filen blev aldrig hentet og aldrig parset i kørselsstien — de
   eneste `robots`-forekomster i crawler/ var kravet i config.js og en
   kolonne, datoen blev kopieret over i. Tilføjede mcsyd.dk
   `Disallow: /Produkter/` i morgen, kørte crawleren videre i dag, i morgen
   og resten af året, og vi ville ikke opdage det.

   En dato er stadig værd at have: den siger, hvornår et MENNESKE læste
   filen og traf en beslutning. Den her fil er det andet halve — maskinens
   kontrol af, at beslutningen stadig gælder. De to erstatter ikke hinanden.

   HVORDAN DEN FEJLER. Rækkefølgen er valgt, så tvivl altid falder ud til
   kildens fordel:

     2xx        filen læses og reglerne gælder.
     4xx        der ER ingen robots.txt. Det er ikke et forbud — en side
                uden robots.txt siger ikke nej. Alt er tilladt.
     5xx        serveren er i knæ. Vi ved ikke, hvad der står i filen, og
                så crawler vi ikke. Det er også den venlige handling: en
                server, der svarer 503, skal ikke have 332 kald oveni.
     netværk    samme som 5xx. Vi ved det ikke -> vi lader være.

   Reglerne følger RFC 9309: grupper pr. User-agent, længste matchende sti
   vinder, og ved lige længde vinder Allow over Disallow. `Crawl-delay` er
   ikke i RFC'en, men er udbredt, og vi respekterer den, når den er LÆNGERE
   end vores egen — aldrig når den er kortere. */

const { USER_AGENT } = require('./hent');

// Vores eget navn i User-Agent-strengen. Det er dét, en forhandler ville
// skrive i sin robots.txt, hvis han ville sige nej til netop os.
const VORES_TOKEN = 'bikerbasen-indeksering';

const HENT_TIMEOUT_MS = 15_000;

/* ---------- Parsing ---------- */

/* robots.txt er linjebaseret: `felt: værdi`, kommentarer med #, og grupper
   dannet af én eller flere User-agent-linjer efterfulgt af regler. Flere
   User-agent-linjer i træk hører til SAMME gruppe — det er det sted, en
   naiv parser oftest tager fejl, og fejlen falder ud til vores fordel, så
   den skal skrives ned. */
function parseRobots(tekst){
  const grupper = [];
  let aktuel = null;
  let sidsteVarUA = false;

  for (const raa of String(tekst || '').split(/\r?\n/)){
    const linje = raa.replace(/#.*$/, '').trim();
    if (!linje) continue;
    const skilt = linje.indexOf(':');
    if (skilt < 0) continue;
    const felt = linje.slice(0, skilt).trim().toLowerCase();
    const vaerdi = linje.slice(skilt + 1).trim();

    if (felt === 'user-agent'){
      if (!sidsteVarUA){
        aktuel = { agenter: [], regler: [], crawlDelay: null };
        grupper.push(aktuel);
      }
      aktuel.agenter.push(vaerdi.toLowerCase());
      sidsteVarUA = true;
      continue;
    }
    sidsteVarUA = false;
    if (!aktuel) continue;

    if (felt === 'disallow' || felt === 'allow'){
      // "Disallow:" uden værdi betyder udtrykkeligt "ingenting er forbudt".
      if (felt === 'disallow' && vaerdi === '') continue;
      if (vaerdi === '') continue;
      aktuel.regler.push({ tillad: felt === 'allow', sti: vaerdi });
    } else if (felt === 'crawl-delay'){
      const sek = Number(vaerdi.replace(',', '.'));
      if (Number.isFinite(sek) && sek > 0) aktuel.crawlDelay = sek;
    }
  }
  return grupper;
}

/* Den gruppe, der gælder for OS. Mest specifikke match vinder: står vores
   eget navn i filen, er det den gruppe, og `*` bruges kun, når intet andet
   passer. Findes ingen af delene, er der ingen regler. */
function gruppeFor(grupper, token = VORES_TOKEN){
  let bedst = null;
  let bedstLaengde = -1;
  for (const g of grupper){
    for (const a of g.agenter){
      const passer = a === '*' ? 0 : (token.includes(a) ? a.length : -1);
      if (passer > bedstLaengde){ bedstLaengde = passer; bedst = g; }
    }
  }
  return bedst || { agenter: [], regler: [], crawlDelay: null };
}

/* Mønstermatch med * og $, som robots.txt bruger dem. Alt andet i stien er
   bogstaveligt — også tegn, der er specielle i et regex, og derfor
   escapes de. */
function stiMatcher(moenster, sti){
  let ud = '';
  for (const tegn of moenster){
    if (tegn === '*'){ ud += '.*'; continue; }
    if (tegn === '$'){ ud += '$'; continue; }
    ud += tegn.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  try { return new RegExp('^' + ud).test(sti); }
  catch { return false; }
}

/* Længste matchende regel vinder. Ved lige længde vinder Allow — det er
   RFC'ens regel, og den er den mindst overraskende: en kilde, der skriver
   begge dele om samme sti, mente at åbne den. */
function erTilladt(gruppe, url){
  let sti;
  try { const u = new URL(url); sti = u.pathname + u.search; }
  catch { return { tilladt: false, regel: 'URL kunne ikke læses' }; }

  let vinder = null;
  for (const r of gruppe.regler || []){
    if (!stiMatcher(r.sti, sti)) continue;
    if (!vinder
      || r.sti.length > vinder.sti.length
      || (r.sti.length === vinder.sti.length && r.tillad && !vinder.tillad)){
      vinder = r;
    }
  }
  if (!vinder) return { tilladt: true, regel: null };
  return {
    tilladt: vinder.tillad,
    regel: `${vinder.tillad ? 'Allow' : 'Disallow'}: ${vinder.sti}`,
  };
}

/* ---------- Hentning ---------- */

/* `hent` kan byttes ud, af samme grund som hentefunktionerne i pipeline.js:
   en spærre, der kun kan afprøves ved at ringe til en rigtig forhandlers
   server, bliver ikke afprøvet. */
async function hentRobots(domaene, { hent = fetch, timeoutMs = HENT_TIMEOUT_MS } = {}){
  const url = `https://${domaene}/robots.txt`;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const ur = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const svar = await hent(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain' },
      redirect: 'follow',
      signal: ctrl?.signal,
    });
    const status = svar.status;
    const tekst = status >= 200 && status < 300 ? await svar.text() : '';
    return { url, status, tekst, fejl: null };
  } catch (e){
    return { url, status: null, tekst: '', fejl: e.message || String(e) };
  } finally {
    if (ur) clearTimeout(ur);
  }
}

/* Kørslens robots-dom for én kilde.

   Returnerer ALTID et objekt med `maaCrawle`, `gruppe`, `grund` og
   `crawlDelayMs`. Kaldstedet skal kunne skrive grunden i loggen uden at
   skulle gætte på, hvad der skete. */
async function robotsDom(domaene, muligheder = {}){
  const svar = await hentRobots(domaene, muligheder);

  if (svar.fejl){
    return {
      maaCrawle: false, gruppe: null, crawlDelayMs: null,
      grund: `${svar.url} kunne ikke hentes (${svar.fejl}) — vi ved ikke, hvad der står i den, og så crawler vi ikke`,
    };
  }
  if (svar.status >= 500){
    return {
      maaCrawle: false, gruppe: null, crawlDelayMs: null,
      grund: `${svar.url} svarede HTTP ${svar.status} — serveren er i knæ, og den skal ikke have en crawl oveni`,
    };
  }
  if (svar.status >= 400){
    return {
      maaCrawle: true, gruppe: { agenter: [], regler: [], crawlDelay: null }, crawlDelayMs: null,
      grund: `${svar.url} svarede HTTP ${svar.status} — der er ingen robots.txt, og en manglende fil er ikke et forbud`,
    };
  }

  const gruppe = gruppeFor(parseRobots(svar.tekst));
  const hvem = gruppe.agenter.length ? `User-agent: ${gruppe.agenter.join(', ')}` : 'ingen gruppe passer på os';
  return {
    maaCrawle: true,
    gruppe,
    crawlDelayMs: gruppe.crawlDelay != null ? Math.round(gruppe.crawlDelay * 1000) : null,
    grund: `${svar.url} hentet (${hvem}, ${gruppe.regler.length} regler)`,
  };
}

/* ---------- Vagten, kørslen bruger ----------

   robots.txt gælder PR. VÆRT, ikke pr. kilde, og de to er ikke det samme her:
   sources/guloggratis.yaml har `domaene: guloggratis.dk`, mens dens eneste
   liste-URL står på `www.guloggratis.dk`. Et opslag på kildens `domaene`
   ville altså hente en fil fra en anden oprindelse end den, vi henter sider
   fra — og så beskytter kontrollen ingenting. Vagten slår derfor op på
   URL'ens egen vært og husker svaret, så der stadig kun bliver ét kald pr.
   vært pr. kørsel. */
function nyRobotsVagt({ hent } = {}){
  const domme = new Map();   // vært -> dom

  async function domFor(url){
    let vaert;
    try { vaert = new URL(url).host; }
    catch {
      return { maaCrawle: false, gruppe: null, crawlDelayMs: null, grund: `URL kunne ikke læses: ${url}` };
    }
    if (!domme.has(vaert)) domme.set(vaert, await robotsDom(vaert, { hent }));
    return domme.get(vaert);
  }

  return {
    /* { tilladt, regel, grund } for én URL. `tilladt: false` dækker både
       "robots.txt siger nej" og "vi kunne ikke få fat i robots.txt" — for
       kilden er de to det samme: der bliver ikke hentet noget. */
    async maaHente(url){
      const d = await domFor(url);
      if (!d.maaCrawle) return { tilladt: false, regel: null, grund: d.grund };
      const r = erTilladt(d.gruppe, url);
      return { tilladt: r.tilladt, regel: r.regel, grund: d.grund };
    },
    // Den LÆNGSTE Crawl-delay, nogen af værterne har bedt om.
    crawlDelayMs(){
      let laengst = null;
      for (const d of domme.values()){
        if (d.crawlDelayMs != null) laengst = Math.max(laengst ?? 0, d.crawlDelayMs);
      }
      return laengst;
    },
    grunde(){ return [...domme.entries()].map(([vaert, d]) => `${vaert} — ${d.grund}`); },
  };
}

module.exports = {
  nyRobotsVagt, robotsDom, hentRobots, parseRobots, gruppeFor, erTilladt, stiMatcher,
  VORES_TOKEN, HENT_TIMEOUT_MS,
};
