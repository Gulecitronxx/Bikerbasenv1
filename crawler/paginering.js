/* Paginering: gennemgå en kategoris sider 1..N inden for reglerne.

   Baggrund (w12): Gul og Gratis viser 60 annoncer pr. side og har 59 sider.
   Crawleren hentede kun den første, fandt 59 af ca. 3.489 annoncer, og
   værnet mod forsvundne annoncer (crawler/db.js, grænse 60 %) greb ind — med
   rette. Det her modul er den lovlige vej til resten.

   HVAD DER ER LOVLIGT. Kun det, en besøgende også ser: den synlige
   paginering på websiden ("Side: [2] af 59", knapperne Forrige/Næste og
   <link rel="next" href="…?page=2"> i <head>). Ikke kildens interne
   GraphQL-endpoint — se sources/mcsyd.yaml om hvorfor vi ikke bruger en
   leverandørs JSON-endpoint. Og ikke et gæt: er siderne forbudt i
   robots.txt, hentes de ikke (jensensmc.yaml har en Disallow-regel på ?page).

   HVAD DER ALDRIG ÆNDRES HER (CLAUDE.md):
     - hver side hentes gennem hastighed.js (serielt, crawl_delay_ms mellem
       kald), fordi `hentSide` er hent.js' funktioner, ikke en ny vej;
     - robots.txt tjekkes for HVER side-URL, ikke kun for den første;
     - et hårdt loft (ABSOLUT_MAKS_SIDER) og kildens eget max_sider, så en
       fejl ikke giver en endeløs crawl.

   KOMPLET ER ET LØFTE. Resultatet siger `komplet: true` KUN, når vi har set
   enden af kataloget: sidste side nået ("af N"), en tom side efter side 1,
   eller en side uden "næste". Alt andet — loftet nået, en side der fejlede,
   robots.txt der spærrer, en side uden nye annoncer, en grænse — er
   `komplet: false`, og pipelinen kalder da aldrig markerBorte(). En
   afkortet liste ligner nemlig en kort liste, og en kort liste får
   annoncer sat til 'borte', der bare stod på side 17. */

const TYPER = ['sidetal', 'knap', 'scroll'];

// Absolut loft, uanset hvad en YAML-fil beder om.
const ABSOLUT_MAKS_SIDER = 100;

/* Validering. Kaldes fra config.js' validerKilde() med dens `kraev`-funktion,
   så fejlene kommer ud i samme liste og med feltets navn. */
function validerPaginering(p, kraev){
  if (p == null) return;
  const ok = p && typeof p === 'object' && !Array.isArray(p);
  kraev('paginering', ok, 'skal være et objekt, eller udelades helt');
  if (!ok) return;

  kraev('paginering.type', TYPER.includes(p.type), `skal være en af: ${TYPER.join(', ')}`);
  kraev('paginering.max_sider',
    Number.isInteger(p.max_sider) && p.max_sider >= 1 && p.max_sider <= ABSOLUT_MAKS_SIDER,
    `mangler eller er ugyldig — skal være et helt tal fra 1 til ${ABSOLUT_MAKS_SIDER} (hårdt loft mod endeløs crawl)`);
  if (p.stop_ved_tom_side != null){
    kraev('paginering.stop_ved_tom_side', typeof p.stop_ved_tom_side === 'boolean', 'skal være true eller false');
  }
  if (p.naeste != null){
    kraev('paginering.naeste', typeof p.naeste === 'string' && p.naeste.trim(), 'skal være en CSS-selector');
  }
  if (p.type === 'knap'){
    kraev('paginering.naeste', typeof p.naeste === 'string' && p.naeste.trim(),
      'mangler — type knap klikker på knappen, og selectoren skal pege på den');
  }
  if (p.type === 'sidetal' && p.parameter != null){
    kraev('paginering.parameter', typeof p.parameter === 'string' && /^[A-Za-z0-9_-]+$/.test(p.parameter),
      'skal være navnet på forespørgselsparameteren, fx page');
  }
  if (p.antal_sider != null){
    const a = p.antal_sider;
    const form = a && typeof a === 'object' && typeof a.css === 'string' && a.css.trim()
      && typeof a.udtraek === 'string' && a.udtraek.trim();
    kraev('paginering.antal_sider', form, 'skal være { css, udtraek } med et regex med én fangstgruppe');
    if (form){
      try {
        const re = new RegExp(a.udtraek);
        kraev('paginering.antal_sider.udtraek', /\((?!\?)/.test(re.source), 'regex mangler en fangstgruppe');
      } catch (e){
        kraev('paginering.antal_sider.udtraek', false, `ugyldigt regex — ${e.message}`);
      }
    }
  }
}

/* URL til side `nr` (nr >= 2). Side 1 er listens egen URL, uændret — det er
   den, kilden selv viser uden parameter og har som canonical. */
function sideUrl(basis, parameter, nr){
  const u = new URL(basis);
  u.searchParams.set(parameter || 'page', String(nr));
  return u.href;
}

/* Gennemgå siderne, serielt.

   hentSide(nr)  -> { kort, advarsel?, antal_sider?, har_naeste? }  (hent.js)
   urlFor(nr)    -> URL eller null (null for knap/scroll: ingen URL pr. side)
   taelNye(side) -> antal NYE, unikke annoncer siden bidrog med (pipelinen
                    dedupper på kilde_annonce_id og fortæller os tallet)
   tilFejl(e,u)  -> kaster, hvis fejlen skal stoppe hele kørslen (kildens nej)
   stopNaar()    -> true, når en ydre grænse (--limit) er nået

   Alt er indsprøjtet, så en test kan køre den uden netværk og uden browser. */
async function gennemgaaSider({
  pag, url, maksSider = null, hentSide, urlFor = () => null, robots = null,
  taelNye = s => s.kort.length, tilFejl = () => {}, stopNaar = () => false, log,
}){
  const loft = Math.min(pag.max_sider, maksSider ?? Infinity, ABSOLUT_MAKS_SIDER);
  const stopVedTom = pag.stop_ved_tom_side !== false;
  const sider = [];
  let komplet = false;
  let grund = null;
  let antalKilde = null;

  for (let nr = 1; nr <= loft; nr++){
    const u = nr === 1 ? url : urlFor(nr);

    // robots.txt for HVER side. Side 1 er allerede tjekket i koerKilde().
    if (nr > 1 && robots && u){
      const dom = await robots.maaHente(u);
      if (!dom.tilladt){
        grund = `robots.txt spærrer side ${nr} (${u})${dom.regel ? ` — ${dom.regel}` : ''}`;
        break;
      }
    }

    let side;
    try {
      side = await hentSide(nr);
    } catch (e){
      tilFejl(e, u || url);   // kildens nej kaster herfra
      log.skriv(`FEJL på side ${nr} (${u || url}): ${e.message}`);
      grund = `side ${nr} kunne ikke hentes`;
      break;
    }

    if (side.advarsel) log.skriv(`side ${nr}: ${side.advarsel}`);
    if (antalKilde == null && Number.isInteger(side.antal_sider) && side.antal_sider > 0){
      antalKilde = side.antal_sider;
      log.skriv(`kilden oplyser ${antalKilde} sider`);
    }

    const nye = taelNye(side);
    sider.push({ nr, url: u, kort: side.kort.length, nye });
    log.skriv(`side ${nr}${antalKilde ? `/${antalKilde}` : ''}: ${side.kort.length} kort i DOM'en, ${nye} nye`);

    if (!side.kort.length){
      if (nr === 1){ grund = 'første side er tom — selectors eller sidestruktur bør efterses'; break; }
      if (stopVedTom){ komplet = true; grund = `side ${nr} er tom — enden nået`; break; }
      continue;
    }
    if (nye === 0){
      // Kilden gentager sig (fx en ugyldig sideparameter, der giver side 1 igen).
      grund = `side ${nr} gav ingen nye annoncer — kilden gentager sig`;
      break;
    }
    if (side.har_naeste === false && nr === 1){ grund = 'side 1 uden "næste" — enden kan ikke bekræftes (sidestrukturen kan være ændret)'; break; }
    if (side.har_naeste === false){ komplet = true; grund = `side ${nr} har ingen "næste" — enden nået`; break; }
    if (antalKilde && nr >= antalKilde){ komplet = true; grund = `side ${nr} af ${antalKilde} — enden nået`; break; }
    if (stopNaar()){ grund = 'grænsen for antal annoncer er nået'; break; }
    if (nr === loft){
      grund = `loftet på ${loft} sider er nået${antalKilde && antalKilde > loft ? ` (kilden har ${antalKilde})` : ''}`;
    }
  }

  return { sider, komplet, grund, antal_sider_kilde: antalKilde };
}

module.exports = { validerPaginering, sideUrl, gennemgaaSider, TYPER, ABSOLUT_MAKS_SIDER };
