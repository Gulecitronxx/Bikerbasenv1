/* Pipelinen: discover -> fetch -> parse -> normalize -> upsert.

   Ét gennemløb pr. kilde, styret udelukkende af YAML'en. Hvert trin er
   adskilt, fordi de fejler af forskellige grunde og skal rapporteres hver for
   sig: et netværksudfald er ikke det samme som en selector, der ikke matcher
   længere, og en kørsel med 500 fundne og 0 gemte skal kunne skelnes fra en
   kørsel med 0 fundne. */

const { laesKilde } = require('./config');
const { aabnBrowser, hentListeside } = require('./hent');
const { tilAnnonce } = require('./parse');
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

/* ---------- Discover + fetch + parse + normalize ----------
   Alle felter står på kortet i gitteret. Vi henter derfor IKKE hver
   detaljeside: 500 annoncer ville blive 508 sideindlæsninger i stedet for 8,
   og med 2 sekunders pause er det forskellen på et minut og tyve. Færre kald
   er både hurtigere for os og venligere mod kilden. */
async function indsamlAnnoncer(context, kilde, { limit, log }){
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
      side = await hentListeside(context, kilde, liste.url);
    } catch (e){
      // En enkelt listeside, der fejler, må ikke tage de øvrige med sig.
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

/* ---------- Én kilde ---------- */
async function koerKilde(navn, { limit = null, toerloeb = false, stille = false } = {}){
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
    browser = await aabnBrowser();
    const { annoncer, kasseret } = await indsamlAnnoncer(browser.context, kilde, { limit, log });
    tal.fundet = annoncer.length;
    tal.fejl = kasseret;

    if (!annoncer.length){
      log.skriv('ingen annoncer fundet. Selectors eller sidestruktur bør efterses, før det gentager sig.');
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

    // En delvis kørsel har ikke set hele kataloget. Ville vi tælle de
    // usete med, ville --limit=20 på sigt sætte de øvrige 480 til 'borte'.
    if (!toerloeb && !limit){
      tal.borte = await db.markerBorte(sb, kilde_id);
      if (tal.borte) log.skriv(`${tal.borte} annoncer ikke set i ${db.KOERSLER_FOER_BORTE} kørsler — sat til 'borte'`);
    }

    log.skriv(`FÆRDIG: ${tal.fundet} fundet, ${tal.nye} nye, ${tal.opdaterede} opdaterede, ${tal.borte} borte, ${tal.fejl} kasseret`);
    if (koersel) await db.afslutKoersel(sb, koersel.id, tal, log.tekst());
    return { navn, ok: true, tal, annoncer, log: log.tekst() };

  } catch (e){
    log.skriv(`AFBRUDT: ${e.message}`);
    tal.fejl++;
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

module.exports = { koerKilde, koerKilder, indsamlAnnoncer };
