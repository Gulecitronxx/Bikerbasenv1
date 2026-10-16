/* ÉT sted, hvor søgelinks til soegning.html bygges (F2-004, F2-005).

   Før: hver generator satte sine links sammen som tekst (base + "&amp;maxPrice=…", "q=<model>") og
   regnede chippens tal et andet sted. Så kunne et budgetlink få to maxPrice (søgningen læser den
   første -> "Under 30.000 · 55" gav 104), og et modelchip kunne tælle "annoncer med dette modelnavn",
   mens linket (q=) delstrengs-søgte hele mærket ("CRF 110 F · 25" = 1 + 24 Africa Twin).

   Nu: et link er ALTID bygget af ét filterobjekt i søgesidens eget ordforråd (state i js/search.js:
   types, brands, models, regions, koerekort, priceMax, yearMin, kmMax, hkMin …), hver nøgle højst
   én gang, og chippens tal regnes af SAMME objekt med Filtrering.anvendFiltre — den filterkæde
   søgesiden selv bruger. Et tal kan dermed ikke komme fra en anden regel end linket.

   Rene funktioner. Filtrering sendes ind (browserModules()), så filen kan bruges af alle generatorer og
   af testene uden at hente noget. */

/* [filternavn i state, parameternavn i URL'en]. Rækkefølgen er rækkefølgen i linket. */
const PARAMETRE = [
  ['brands', 'brands'], ['models', 'model'], ['types', 'type'], ['regions', 'regions'],
  ['koerekort', 'koerekort'], ['hkMin', 'hkMin'], ['priceMin', 'priceMin'], ['priceMax', 'maxPrice'],
  ['yearMin', 'yearMin'], ['kmMax', 'kmMax'], ['q', 'q'], ['sort', 'sort'], ['agent', 'agent'],
];
const LISTER = new Set(['brands', 'models', 'types', 'regions']);

/* "min"-filtre skærpes opad, "maks"-filtre nedad, når to betingelser lægges sammen. */
const NEDRE = new Set(['hkMin', 'priceMin', 'yearMin']);
const ER_SAT = v => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);

/* a OG b: begge filtres betingelser. En nøgle står kun én gang i resultatet. */
function og(a, b){
  const ud = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})){
    if (!ER_SAT(v)) continue;
    if (!ER_SAT(ud[k])) ud[k] = v;
    else if (LISTER.has(k)) ud[k] = ud[k].filter(x => v.includes(x));   // skæring: begge skal gælde
    else if (NEDRE.has(k)) ud[k] = Math.max(ud[k], v);
    else if (typeof v === 'number') ud[k] = Math.min(ud[k], v);
    else ud[k] = v;
  }
  return ud;
}

/* Kan filteret stå i en URL og læses tilbage uændret? Et modelnavn med komma ville blive delt i to,
   fordi søgesiden læser model=a,b som to modeller. */
function kanStaaIUrl(filtre){
  for (const k of LISTER) for (const v of (filtre && filtre[k]) || []) if (String(v).includes(',')) return false;
  return true;
}

/* 'soegning.html?brands=Honda&amp;model=CB%20500' — html: & skrives som &amp; til brug i markup. */
/* Et modelnavn med komma ("XSR 700, Legacy") kan ikke stå i model= (søgesiden deler på komma og finder 0).
   Så bliver modellen til fritekst q=: et lidt bredere, men ikke tomt resultat. */
function tilUrlFilter(filtre){
  const modeller = (filtre && filtre.models) || [];
  if (!modeller.some(v => String(v).includes(','))) return filtre;
  const { models, ...rest } = filtre;
  const heleNavne = modeller.filter(v => String(v).includes(','));
  const resten = modeller.filter(v => !String(v).includes(','));
  return { ...rest, ...(resten.length ? { models: resten } : {}), q: rest.q || heleNavne[0] };
}

function soegHref(filtre, { html = true } = {}){
  filtre = tilUrlFilter(filtre);
  const dele = [];
  for (const [navn, param] of PARAMETRE){
    const v = filtre && filtre[navn];
    if (!ER_SAT(v)) continue;
    const tekst = Array.isArray(v) ? v.join(',') : String(v);
    dele.push(`${param}=${encodeURIComponent(tekst)}`);
  }
  return 'soegning.html' + (dele.length ? '?' + dele.join(html ? '&amp;' : '&') : '');
}

function antal(Filtrering, alle, filtre){
  return Filtrering.anvendFiltre(alle, filtre, null, null).length;
}

/* Er facettens søgefilter PRÆCIS facettens indhold? Samme annoncer, ikke bare samme antal. Gælder ikke altid:
   kategori A udelukker de annoncer, der kan nedsættes til A2 (søgningen kan ikke spørge om det), en
   by kan søgningen slet ikke filtrere på, og et modelnavn med dobbelte mellemrum matcher facetten
   (normaliseret) men ikke søgningen (eksakt). Er filteret ikke præcist, får siden ingen tal på sine
   søgelinks — hellere intet tal end et løfte, søgningen ikke holder. */
function erPraecis(Filtrering, alle, facet){
  if (!facet || !facet.soeg || !kanStaaIUrl(facet.soeg)) return false;
  const iFacet = new Set(alle.filter(facet.match));
  const iSoeg = Filtrering.anvendFiltre(alle, facet.soeg, null, null);
  return iSoeg.length === iFacet.size && iSoeg.every(l => iFacet.has(l));
}

/* Alt en side behøver til sine chips: ctx.link(extra) -> { href, n, filtre }, hvor n er det antal,
   linket viser, eller null hvis facetten ikke kan udtrykkes præcist i søgningen. */
function lavKontekst(Filtrering, alle, facet){
  const praecis = erPraecis(Filtrering, alle, facet);
  const grund = facet && facet.soeg ? facet.soeg : null;
  return {
    praecis,
    alle,
    Filtrering,
    link(extra, { html = true } = {}){
      const f = grund ? og(grund, extra) : (extra || {});
      return { href: soegHref(f, { html }), n: praecis && kanStaaIUrl(f) ? antal(Filtrering, alle, f) : null, filtre: f };
    },
  };
}

module.exports = { PARAMETRE, og, kanStaaIUrl, soegHref, antal, erPraecis, lavKontekst };
