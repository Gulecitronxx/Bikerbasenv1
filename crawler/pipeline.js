/* Pipelinen: discover -> fetch -> parse -> normalize -> upsert.

   Ét gennemløb pr. kilde, styret udelukkende af YAML'en. Hvert trin er
   adskilt, fordi de fejler af forskellige grunde og skal rapporteres hver for
   sig: et netværksudfald er ikke det samme som en selector, der ikke matcher
   længere, og en kørsel med 500 fundne og 0 gemte skal kunne skelnes fra en
   kørsel med 0 fundne. */

const { laesKilde } = require('./config');
const { aabnBrowser, hentListeside, hentDetaljeside } = require('./hent');
const { tilAnnonce, berigMedDetalje } = require('./parse');
const db = require('./db');

function nyLog(skrivUd = true){
  const linjer = [];
  return {
    linjer,
    skriv(besked){
      const l = `[${new Date().toISOString().slice(11, 19)}] ${besked}`;
      linjer.push(l);
      if (skrivUd) console.log(l);
    },
    tekst(){ return linjer.join('\n'); },
  };
}

/* ---------- Vagten mod at banke på en dør, der siger nej (C-012) ----------

   Før løb detaljetrinet alle annoncer igennem, uanset hvor mange der
   fejlede. `tal.fejlede` blev talt, men brugt til ÉN ting: at dæmpe loggen.
   Begyndte kilden at svare 403, lavede crawleren alligevel alle 332
   forespørgsler — elleve minutter ved 2000 ms, tyve ved 3000 — mod en kilde,
   der aktivt sagde nej. For en crawler, der kører på et skriftligt ja
   (sources/mcsyd.yaml, sources/guloggratis.yaml), er det præcis den adfærd,
   der får et ja trukket tilbage.

   DE TO SLAGS 4xx KRÆVER MODSATTE REAKTIONER, og de endte før i samme
   `continue`:

     403 / 429 / 401 / 407 / 451  — kilden afviser OS. Bak ud, og skriv det
       i loggen, så et menneske ser det. Fem i træk er ikke et uheld.
     404 / 410                    — DENNE annonce er væk. Det er hverdag på
       en markedsplads: en annonce kan sagtens blive slettet mellem
       listesiden og detaljekaldet. Fortsæt.

   Men 25 forsvundne i TRÆK er ikke hverdag. Adresserne kom fra en listeside
   for få minutter siden, så det er ikke annoncerne, der er væk — det er
   detalje-URL'erne, vi bygger, der er forkerte. Det skal også stoppe, bare
   med en anden diagnose.

   Tællerne nulstilles KUN af et svar, der lykkedes. En timeout hverken
   bekræfter eller afkræfter et nej, og hvis den nulstillede, kunne en kilde,
   der svarer 403, timeout, 403, timeout, holde vagten i skak for evigt. */
const AFVISNINGSKODER = new Set([401, 403, 407, 429, 451]);
const AFVISNINGER_FOER_STOP = 5;
const IKKE_FUNDET_FOER_STOP = 25;

function statusFra(e){
  return Number.isInteger(e?.status) ? e.status : null;
}

/* Kastet, når kørslen stoppes af kildens svar og ikke af en fejl hos os.
   Markøren gør, at koerKilde() kan skrive en anden logbesked — og at en
   test kan skelne den fra en tilfældig undtagelse. */
function afbrydelsesFejl(besked, status){
  const e = new Error(besked);
  e.afbrudt_af_kilden = true;
  e.status = status ?? null;
  return e;
}

function nyAfvisningsvagt({ afvisninger = AFVISNINGER_FOER_STOP, ikkeFundet = IKKE_FUNDET_FOER_STOP } = {}){
  let afvist = 0;
  let forsvundne = 0;
  return {
    // Et svar, der kom igennem. Kun dét renser tavlen.
    svarede(){ afvist = 0; forsvundne = 0; },
    /* Returnerer { status, besked }, hvis kørslen skal stoppe — ellers null. */
    tael(e){
      const status = statusFra(e);
      if (status !== null && AFVISNINGSKODER.has(status)){
        forsvundne = 0;
        afvist++;
        if (afvist >= afvisninger){
          return { status, besked: `${afvist} svar i træk med HTTP ${status} — kilden afviser os` };
        }
        return null;
      }
      if (status === 404 || status === 410){
        afvist = 0;
        forsvundne++;
        if (forsvundne >= ikkeFundet){
          return {
            status,
            besked: `${forsvundne} adresser i træk gav HTTP ${status} — så mange annoncer forsvinder ikke `
                  + 'mellem listesiden og detaljekaldet; detalje-URL\'erne bør efterses',
          };
        }
        return null;
      }
      // Timeout, DNS, en tom side: ikke et nej fra kilden. Tællerne står.
      return null;
    },
  };
}

/* ---------- Discover + fetch + parse + normalize ----------
   Står alle felter på kortet i gitteret, henter vi IKKE hver detaljeside:
   500 annoncer ville blive 508 sideindlæsninger i stedet for 8, og med 2
   sekunders pause er det forskellen på et minut og tyve. Færre kald er både
   hurtigere for os og venligere mod kilden. Sådan er MC Syd.

   Er kilden derimod en, hvor kortet ikke HAR felterne, sætter YAML'en
   `detalje.hent: true`, og så følger berigMedDetaljer() nedenfor efter.

   `hent` kan byttes ud. Det er ikke et lag for lagets skyld: afbrydelsen
   ovenfor SKAL kunne efterprøves, og den eneste anden måde at fremkalde et
   403 på ville være at få kilden til at blokere os. Standardværdien er den
   rigtige funktion, så driften ikke går gennem en omvej. */
async function indsamlAnnoncer(context, kilde, { limit, log, hent = hentListeside }){
  const fundne = new Map();   // kilde_annonce_id -> { annonce, maerkeFraUrl }
  let kasseret = 0;
  const grunde = new Map();

  for (const liste of kilde.liste_urler){
    if (limit && fundne.size >= limit){
      log.skriv(`grænse på ${limit} nået — springer resten af liste-URL'erne over`);
      break;
    }

    let side;
    try {
      side = await hent(context, kilde, liste.url);
    } catch (e){
      /* Et afvisningssvar på en LISTESIDE tåler ingen tæller. Der er 1-8 af
         dem, og de er hoveddøren: er den lukket, er der ingen mening i at
         gå videre til de 332 detaljesider bagved. Detaljetrinet har en
         tæller på fem, fordi der er hundredvis af døre og én af dem kan
         være låst uden at huset er det. Her er huset lukket. */
      const status = statusFra(e);
      if (status !== null && AFVISNINGSKODER.has(status)){
        throw afbrydelsesFejl(
          `HTTP ${status} på listesiden ${liste.url} — kilden afviser os ved hoveddøren, `
          + 'og kørslen stopper her frem for at gå videre til detaljesiderne',
          status,
        );
      }
      // En enkelt listeside, der fejler af andre grunde, må ikke tage de
      // øvrige med sig: en timeout på én mærkeside er ikke et nej.
      log.skriv(`FEJL på ${liste.url}: ${e.message}`);
      continue;
    }

    if (side.advarsel) log.skriv(`${liste.url}: ${side.advarsel}`);
    log.skriv(`${liste.url}: ${side.kort.length} kort i DOM'en (mærke fra URL: ${liste.maerke || 'ukendt'})`);

    for (const raa of side.kort){
      if (limit && fundne.size >= limit) break;

      const r = tilAnnonce(raa, kilde, liste.maerke);
      if (!r.ok){
        kasseret++;
        const noegle = r.grund.replace(/\d+/g, 'N');
        grunde.set(noegle, (grunde.get(noegle) || 0) + 1);
        continue;
      }

      const tidligere = fundne.get(r.annonce.kilde_annonce_id);
      // Samme motorcykel står både på /alle-motorcykler/ og på sin mærkeside.
      // Mærkesiden vinder: dér er mærket kendt fra URL'en og ikke udledt af
      // titlen, og det er den hyppigste kilde til forkert mærke.
      if (!tidligere || (!tidligere.maerkeFraUrl && liste.maerke)){
        fundne.set(r.annonce.kilde_annonce_id, { annonce: r.annonce, maerkeFraUrl: Boolean(liste.maerke) });
      }
    }
  }

  if (kasseret){
    log.skriv(`${kasseret} kort kasseret:`);
    for (const [grund, antal] of grunde) log.skriv(`   ${antal}x ${grund}`);
  }

  return { annoncer: [...fundne.values()].map(v => v.annonce), kasseret };
}

/* ---------- Berig med detaljesiden ----------
   Ét kald pr. annonce. Det er kørslens dyreste trin, og derfor rapporterer
   det sig selv i tal, der kan sammenlignes fra gang til gang: hvor mange
   sider blev hentet, hvor mange svarede med felter, og — vigtigst — hvor
   mange annoncer der endte med hestekræfter.

   Hk er grunden til, at trinet findes. Uden effekt kan koerekortForListing()
   ikke skelne A2 fra A, og alle 332 MC Syd-annoncer står derfor uden
   kørekortkategori. Falder det tal her, er det ikke en langsom kørsel, det
   er en kørsel, der har mistet sit formål — og så skal det stå i loggen.

   En enkelt annonce, der fejler, tager ikke resten med sig. Annoncen bliver
   gemt med det, kortet gav; den mister felter, ikke sin plads.

   MEN: fejler de i træk, og fejler de med kildens nej, stopper vi. Se vagten
   øverst i filen. `hent` kan byttes ud af samme grund som i
   indsamlAnnoncer(): afbrydelsen skal kunne afprøves mod en attrap. */
async function berigMedDetaljer(context, kilde, annoncer, { log, hent = hentDetaljeside }){
  const tal = { hentet: 0, tomme: 0, fejlede: 0, ikke_fundet: 0, felter: new Map() };
  const vagt = nyAfvisningsvagt();
  let afbryd = null;
  let behandlet = 0;

  for (const [i, annonce] of annoncer.entries()){
    let svar;
    behandlet = i + 1;
    try {
      svar = await hent(context, kilde, annonce.url);
      tal.hentet++;
      vagt.svarede();
    } catch (e){
      tal.fejlede++;
      const status = statusFra(e);
      if (status === 404 || status === 410) tal.ikke_fundet++;
      if (tal.fejlede <= 3) log.skriv(`detaljeside fejlede (${annonce.kilde_annonce_id}): ${e.message}`);
      afbryd = vagt.tael(e);
      if (afbryd) break;
      continue;
    }

    if (!Object.keys(svar.par).length){ tal.tomme++; continue; }

    const { laest } = berigMedDetalje(annonce, svar.par, kilde);
    for (const f of laest) tal.felter.set(f, (tal.felter.get(f) || 0) + 1);

    // Et livstegn undervejs. Trinet tager minutter, ikke sekunder, og en
    // stille terminal i tyve minutter er ikke til at skelne fra en hængt proces.
    if ((i + 1) % 50 === 0) log.skriv(`   detaljesider: ${i + 1} af ${annoncer.length}`);
  }

  const daekning = [...tal.felter.entries()]
    .map(([f, n]) => `${f} ${n}/${annoncer.length}`).join(', ');
  log.skriv(`detaljesider: ${tal.hentet} hentet, ${tal.tomme} uden specfelter, ${tal.fejlede} fejlede`
    + (tal.ikke_fundet ? ` (heraf ${tal.ikke_fundet} annoncer der ikke findes længere)` : ''));
  log.skriv(`felter fra detaljesiden: ${daekning || 'INGEN — selectors eller etiketter bør efterses'}`);
  if (!tal.felter.get('hk')){
    log.skriv('ADVARSEL: ingen annoncer fik hestekræfter. Uden hk kan kørekortkategorien ikke udledes, og det er hele grunden til, at detaljesiderne hentes.');
  }

  /* Loggen skrives FØRST. Det, trinet nåede at samle, er stadig det tal, der
     fortæller hvor det gik galt — og et kast, der tager tallene med sig,
     efterlader kun "AFBRUDT" uden noget at måle på. */
  if (afbryd){
    log.skriv(`STOP: ${afbryd.besked}. ${annoncer.length - behandlet} detaljesider blev IKKE hentet.`);
    throw afbrydelsesFejl(afbryd.besked, afbryd.status);
  }
  return tal;
}

/* ---------- Én kilde ----------
   `hentere` er testens indgang og driftens ingenting: udelades den, bruges
   de rigtige funktioner. Den findes, fordi C-012's afbrydelse ellers kun
   kunne efterprøves ved at få en rigtig forhandler til at svare 403 på
   hundredvis af kald i træk — altså ved at gøre præcis det, rettelsen er
   lavet for at undgå. */
async function koerKilde(navn, { limit = null, toerloeb = false, stille = false, hentere = {} } = {}){
  const log = nyLog(!stille);
  const kilde = laesKilde(navn);

  log.skriv(`${kilde.navn} (${kilde.domaene}) — ${kilde.liste_urler.length} liste-URL'er, ${kilde.crawl_delay_ms} ms mellem kald`);
  if (kilde.aktiv === false) {
    log.skriv('kilden er sat inaktiv i YAML\'en — springer over');
    return { navn, sprunget_over: true, log: log.tekst() };
  }
  if (limit) log.skriv(`DELVIS KØRSEL: højst ${limit} annoncer. Forsvundne annoncer markeres IKKE.`);
  if (toerloeb) log.skriv('TØRLØB: der skrives ikke til databasen.');

  let sb = null, kilde_id = null, koersel = null;
  if (!toerloeb){
    sb = db.klient();
    const k = await db.sikrKilde(sb, kilde);
    kilde_id = k.id;
    if (!k.aktiv){
      // Opt-out: kilden er slået fra i databasen. Så crawler vi den ikke,
      // uanset hvad YAML'en siger, og lader den eksisterende soft-delete
      // køre videre af sig selv.
      log.skriv('kilden er sat inaktiv i databasen (opt-out) — springer over');
      return { navn, sprunget_over: true, log: log.tekst() };
    }
    koersel = await db.startKoersel(sb, kilde_id);
  }

  const tal = { fundet: 0, nye: 0, opdaterede: 0, borte: 0, fejl: 0 };
  let browser = null;

  try {
    browser = await (hentere.aabnBrowser || aabnBrowser)();
    const { annoncer, kasseret } = await indsamlAnnoncer(browser.context, kilde, {
      limit, log, hent: hentere.hentListeside,
    });
    tal.fundet = annoncer.length;
    tal.fejl = kasseret;

    if (!annoncer.length){
      log.skriv('ingen annoncer fundet. Selectors eller sidestruktur bør efterses, før det gentager sig.');
    }

    if (kilde.detalje?.hent && annoncer.length){
      const sek = Math.round(annoncer.length * kilde.crawl_delay_ms / 1000);
      log.skriv(`henter ${annoncer.length} detaljesider (~${Math.floor(sek/60)} min ${sek%60} s ved ${kilde.crawl_delay_ms} ms mellem kald)`);
      await berigMedDetaljer(browser.context, kilde, annoncer, { log, hent: hentere.hentDetaljeside });
    }

    if (!toerloeb && annoncer.length){
      const skrevet = await db.skrivAnnoncer(sb, kilde_id, annoncer);
      tal.nye = skrevet.nye;
      tal.opdaterede = skrevet.opdaterede;
      log.skriv(`gemt: ${skrevet.nye} nye, ${skrevet.opdaterede} opdaterede`);
      /* Parseren har hentet noget, tabellen ikke har plads til. Det er ikke
         en fejl — koerslen er lykkedes — men det er heller ikke ingenting:
         praecis sadan forsvandt hestekraefterne fra hvert eneste kort i
         maaneder, uden at noget nogensinde fejlede. Enten skal feltet have en
         kolonne, eller ogsaa skal parseren holde op med at hente det. */
      if (skrevet.ukendte_felter?.length){
        log.skriv(`ADVARSEL: ${skrevet.ukendte_felter.join(', ')} blev parset, men har ingen kolonne — værdien kastes væk ved hver kørsel`);
      }
    }

    /* En delvis kørsel har ikke set hele kataloget. Ville vi tælle de
       usete med, ville --limit=20 på sigt sætte de øvrige 480 til 'borte'.

       `tal.fundet` gives med, fordi markeringen skal kunne nægte at køre.
       Se værnet over markerBorte() i crawler/db.js: uden det er tre kørsler
       med nul kort nok til at sætte hele kataloget til 'borte', og et
       omdøbt CSS-navn hos kilden er nok til at udløse det. Værnet henter
       selv kildens aktive rækketal — pipelinen skal ikke sende det med, for
       så kunne de to komme til at se på hver sin mængde. */
    if (!toerloeb && !limit){
      const b = await db.markerBorte(sb, kilde_id, tal.fundet);
      tal.borte = b.antal;
      if (b.sprunget_over){
        log.skriv(`VÆRN: forsvundne annoncer blev IKKE markeret — ${b.grund}.`);
        log.skriv('     Kataloget står urørt. Efterse selectors i kildens YAML, før næste kørsel;');
        log.skriv('     er faldet ægte, går markeringen af sig selv, når fundet er stabilt igen.');
      } else if (tal.borte){
        log.skriv(`${tal.borte} annoncer ikke set i ${db.KOERSLER_FOER_BORTE} kørsler — sat til 'borte' (${b.grund})`);
      }
    }

    log.skriv(`FÆRDIG: ${tal.fundet} fundet, ${tal.nye} nye, ${tal.opdaterede} opdaterede, ${tal.borte} borte, ${tal.fejl} kasseret`);
    /* Også en kørsel, hvor værnet sprang markeringen over, afsluttes her — med
       `fundet: 0`, hvis den fandt nul. Det er med vilje: en kørsel, der er
       sket, skal kunne ses i crawl_koersler, og en række uden `afsluttet` er
       umulig at skelne fra en kørsel, der stadig er i gang.

       Det var den historik, C-011 red på: tre nul-kørsler blev til `[0,0,0]`,
       og værnet læste det som "ny kilde". Rettelsen er ikke at holde op med at
       skrive nullerne ned — den er, at værnet ikke længere afgør "ny kilde" ud
       fra kørselshistorikken, men ud fra kildens aktive rækker. */
    if (koersel) await db.afslutKoersel(sb, koersel.id, tal, log.tekst());
    return { navn, ok: true, tal, annoncer, log: log.tekst() };

  } catch (e){
    log.skriv(`AFBRUDT: ${e.message}`);
    tal.fejl++;
    /* Stoppede KILDEN os (C-012), skal det stå tydeligt i loggen — det er
       den linje, et menneske skal se, før næste kørsel starter, og den
       gemmes med i crawl_koersler nedenfor.

       Og bemærk hvor den her gren ligger: markerBorte() står inde i try'et,
       som kastet lige har forladt. En afbrudt kørsel markerer altså INTET
       som borte, og det er den rigtige rækkefølge. Værnet i crawler/db.js
       (C-011) ville også blokere den — en kørsel, der blev stoppet ved
       hoveddøren, finder færre end 60 % af kildens aktive rækker — men den
       skal ikke blokeres af et værn, den skal aldrig nå derhen. To spærrer
       om det samme, med vilje. */
    if (e.afbrudt_af_kilden){
      log.skriv(`     Kørslen blev stoppet MED VILJE efter kildens svar${e.status ? ` (HTTP ${e.status})` : ''}.`);
      log.skriv('     Der er hverken skrevet annoncer eller markeret noget som borte.');
      log.skriv('     Er svaret 403/401/451, skal tilladelsen efterses, før crawleren startes igen;');
      log.skriv('     er det 429, skal crawl_delay_ms op i kildens YAML.');
    }
    // Kørslen lukkes også når den fejler. En række uden afsluttet-tidsstempel
    // er umulig at skelne fra en kørsel, der stadig er i gang.
    if (koersel){
      await db.afslutKoersel(sb, koersel.id, tal, log.tekst()).catch(() => {});
    }
    return { navn, ok: false, fejl: e, tal, log: log.tekst() };
  } finally {
    if (browser) await browser.luk();
  }
}

/* ---------- Flere kilder ----------
   Serielt og med fejlisolering. En kilde, der er nede, ændrer intet for de
   andre; den bliver en fejlet kørsel i crawl_koersler og en linje i
   opsummeringen. */
async function koerKilder(navne, muligheder = {}){
  const resultater = [];
  for (const navn of navne){
    try {
      resultater.push(await koerKilde(navn, muligheder));
    } catch (e){
      // Fejl allerede i konfigurationen — kilden nåede aldrig at starte.
      console.error(`[${navn}] kunne ikke starte: ${e.message}`);
      resultater.push({ navn, ok: false, fejl: e, log: e.message });
    }
  }
  return resultater;
}

module.exports = {
  koerKilde, koerKilder, indsamlAnnoncer,
  /* Eksporteres, saa afbrydelsen kan efterproeves mod en attrap frem for mod
     kildens rigtige server. Det er hele pointen med C-012: den betingelse,
     der staar mellem os og elleve minutters bankning paa en doer, der siger
     nej, skal have en test. */
  berigMedDetaljer, nyAfvisningsvagt, AFVISNINGSKODER,
  AFVISNINGER_FOER_STOP, IKKE_FUNDET_FOER_STOP,
};
