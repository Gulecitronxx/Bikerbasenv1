/* Annoncens livscyklus: hvornår er en indekseret annonce frisk, forsinket,
   midlertidigt utilgængelig, ikke længere aktiv — eller udløbet?

   HVORFOR FILEN FINDES (V7, data). Målt mod produktionen 26.10.2026: af 735
   indekserede annoncer var 332 (45 %) sidst set for mere end 60 dage siden
   (ældste 71 dage). Alle fire kilder blev crawlet ca. 20.-24. august;
   MC Syd og Gul og Gratis blev crawlet igen 17. oktober, de to forhandlere
   (Rydbergs, Jensens) ikke. Ingen annonce blev markeret 'borte', for
   markerBorte() (crawler/db.js) kræver tre kørsler OG at kørslen ses
   som komplet OG at værnet (60 % af referencen) holder — og kørslerne kom
   med to måneders mellemrum. En annonce, ingen har set i 63 dage, stod
   derfor stille og roligt som "aktiv".

   Reglen er ikke "tre kørsler" men tre BEKRÆFTEDE signaler over mindst en
   uge, og den skelner mellem to slags "vi så den ikke":

     findes     Annoncen stod i kildens liste. Nulstiller alt.
     væk        KILDEN sagde, at den er væk: HTTP 404/410 på dens egen side,
                en "solgt/fjernet"-markør, eller at den manglede i en KOMPLET
                kørsel, hvis fund holdt værnet (borte-vurderingen i db.js).
     teknisk    Vi kunne ikke se efter: timeout, 5xx, netværksfejl,
                robots.txt-spærring, en afbrudt eller ufuldstændig kørsel,
                et værn der holdt kørslen tilbage. Det siger intet om
                annoncen og tæller hverken for eller imod.

   EN MIDLERTIDIG TEKNISK FEJL GØR ALDRIG ALENE EN ANNONCE INAKTIV. Det er
   ikke en forsigtighed, det er konstruktionen: `teknisk` rører aldrig
   `vaek_i_traek`, og kun `vaek` kan føre til 'borte'. Samme logik som
   afvisningsvagten i pipeline.js ("tællerne nulstilles KUN af et svar, der
   lykkedes") — en kilde, der svarer 403, timeout, 403, timeout, må hverken
   kunne holde annoncer i live for evigt eller dræbe dem.

   Alt her er rene funktioner på `tilstand` + `signal` + `nu`; ingen netværk.
   Databaselaget (opdaterLivscyklus, udloebGamle) tager en klient ind, så det
   kan prøves mod en attrap. Hele laget er bag FLAGET BB_LIVSCYKLUS=1 og er
   fra som standard, fordi det skriver til kolonner, migrationen
   supabase/030_livscyklus.sql først opretter (se KOLONNER-noten i db.js:
   en kolonne, der ikke findes, vælter hele kørslen). */

const { bortemarkeringVurdering, REFERENCE_KOERSLER } = require('./db');

const DAG_MS = 86_400_000;

/* ---------- Tærskler ----------
   Spejlet i js/data.js (LIVSCYKLUS) og i supabase/030_livscyklus.sql
   (livscyklus_tilstand). crawler/livscyklus.test.js læser alle tre og
   kræver, at de er ens — én regel på tre sprog er en regel, indtil nogen
   retter den ét sted. */
const TAERSKLER = Object.freeze({
  FRISK_DAGE: 14,        // højst så gammel bekræftelse må være for "bekræftet"
  LANG_TID_DAGE: 30,     // derefter er det ikke længere "lidt forsinket"
  UDLOEB_DAGE: 90,       // derefter udløber annoncen (status 'udloebet')
  VAEK_FOER_BORTE: 3,    // N: på hinanden følgende bekræftede væk-signaler ...
  VAEK_MIN_DAGE: 7,      // T: ... fordelt over mindst så mange dage
});

const TILSTANDE = Object.freeze({
  FRISK: 'aktiv_bekraeftet',
  FORSINKET: 'aktiv_forsinket',
  UTILGAENGELIG: 'midlertidigt_utilgaengelig',
  IKKE_AKTIV: 'ikke_laengere_aktiv',
  UDLOEBET: 'slettet_udloebet',
});

/* ---------- Signaler ---------- */
const VAEK_KODER = new Set(['404', '410', 'fjernet_markoer', 'ikke_i_liste']);
const TEKNISKE_KODER = new Set(['timeout', '5xx', 'netvaerk', 'blokeret', 'robots', 'afbrudt', 'ufuldstaendig', 'vaern']);

/* Oversætter udfaldet af ET forsøg på at se efter én annonce til et signal.
   Tager det rå, så pipelinen ikke selv skal afgøre, hvad en 503 er.

   `svarede`:      siden kom tilbage med indhold (så findes den)
   `status`:       HTTP-status, hvis der var en
   `fejlbesked`:   teksten fra en undtagelse uden status (timeout, DNS ...)
   `robotsSpaerret`: robots.txt nægtede, vi spurgte ikke
   `solgtMarkoer`: siden svarede 200, men siger selv "solgt"/"fjernet" */
function klassificerSignal({ svarede = false, status = null, fejlbesked = '', robotsSpaerret = false, solgtMarkoer = false } = {}){
  if (robotsSpaerret) return { art: 'teknisk', kode: 'robots' };
  if (solgtMarkoer) return { art: 'vaek', kode: 'fjernet_markoer' };
  if (Number.isInteger(status)){
    if (status === 404) return { art: 'vaek', kode: '404' };
    if (status === 410) return { art: 'vaek', kode: '410' };
    // 401/403/407/429/451 er kildens nej til OS, ikke til annoncen; 5xx er deres nedbrud.
    if (status >= 500) return { art: 'teknisk', kode: '5xx' };
    if (status >= 400) return { art: 'teknisk', kode: 'blokeret' };
    if (status >= 200 && status < 400 && svarede) return { art: 'findes', kode: 'set' };
  }
  if (svarede) return { art: 'findes', kode: 'set' };
  return { art: 'teknisk', kode: /time(?:d)?\s*out|timeout|etimedout|esockettimedout/i.test(String(fejlbesked)) ? 'timeout' : 'netvaerk' };
}

function dageMellem(fra, til){
  const a = fra instanceof Date ? fra.getTime() : Date.parse(fra);
  const b = til instanceof Date ? til.getTime() : Date.parse(til);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / DAG_MS;
}

/* ---------- Tilstandsovergangen ----------
   tilstand: { status, sidst_set, vaek_i_traek, foerste_vaek_signal,
               teknisk_fejl_i_traek }
   Returnerer en PATCH (kun de kolonner, der ændres) — aldrig hele rækken. */
function anvendSignal(tilstand, signal, nu = new Date(), taerskler = TAERSKLER){
  const t = tilstand || {};
  const nuIso = (nu instanceof Date ? nu : new Date(nu)).toISOString();
  const vaek0 = Number(t.vaek_i_traek) || 0;
  const tekn0 = Number(t.teknisk_fejl_i_traek) || 0;

  if (!signal || signal.art === 'findes'){
    return {
      status: 'aktiv', sidst_set: nuIso, sidst_forsoegt: nuIso,
      vaek_i_traek: 0, foerste_vaek_signal: null, teknisk_fejl_i_traek: 0, sidste_signal: 'set',
    };
  }

  if (signal.art === 'teknisk'){
    // Rører IKKE vaek_i_traek, foerste_vaek_signal, status eller sidst_set.
    return { sidst_forsoegt: nuIso, teknisk_fejl_i_traek: tekn0 + 1, sidste_signal: signal.kode };
  }

  if (signal.art === 'vaek'){
    const foerste = t.foerste_vaek_signal || nuIso;
    const antal = vaek0 + 1;
    const dage = dageMellem(foerste, nuIso);
    const patch = {
      sidst_forsoegt: nuIso, vaek_i_traek: antal, foerste_vaek_signal: foerste,
      // et væk-signal er et SVAR; en tidligere teknisk fejl er hermed overstået
      teknisk_fejl_i_traek: 0, sidste_signal: signal.kode,
    };
    if (antal >= taerskler.VAEK_FOER_BORTE && dage != null && dage >= taerskler.VAEK_MIN_DAGE){
      patch.status = 'borte';
    }
    return patch;
  }
  throw new Error(`Ukendt signalart "${signal.art}"`);
}

/* ---------- Den afledte tilstand ----------
   Beregnes ved LÆSNING, aldrig gemt: alder går af sig selv, og en kolonne,
   som kun opdateres når crawleren kører, ville stå som "bekræftet" præcis
   i det tilfælde, den skal afsløre (crawleren kørte ikke). */
function vurderLivscyklus(r, nu = new Date(), taerskler = TAERSKLER){
  const x = r || {};
  if (x.status === 'udloebet') return TILSTANDE.UDLOEBET;
  if (x.status === 'borte' || x.status === 'solgt') return TILSTANDE.IKKE_AKTIV;
  const dage = x.sidst_set ? dageMellem(x.sidst_set, nu) : null;
  if (dage != null && dage > taerskler.UDLOEB_DAGE) return TILSTANDE.UDLOEBET;
  if ((Number(x.vaek_i_traek) || 0) > 0 || (Number(x.teknisk_fejl_i_traek) || 0) > 0) return TILSTANDE.UTILGAENGELIG;
  if (dage != null && dage > taerskler.FRISK_DAGE) return TILSTANDE.FORSINKET;
  return TILSTANDE.FRISK;
}

/* ---------- Databaselaget ---------- */
function kastVed(fejl, hvad){
  if (fejl) throw new Error(`${hvad}: ${fejl.message || JSON.stringify(fejl)}`);
}

function livscyklusAktiv(env = process.env){
  return env.BB_LIVSCYKLUS === '1';
}

/* Det tredje svar på "hvad skal de usete annoncer have?":
   hverken tæller eller nulstiller — kun hvis noget forhindrede os i at se. */
function signalForUset(id, { fjernede, teknisk, komplet, vaern }){
  const hard = fjernede && fjernede.get(id);
  if (hard) return { art: 'vaek', kode: hard };
  if (teknisk) return { art: 'teknisk', kode: teknisk.kode };
  if (komplet){
    if (vaern && vaern.tilladt) return { art: 'vaek', kode: 'ikke_i_liste' };
    return { art: 'teknisk', kode: 'vaern' };
  }
  return null;   // bevidst delvis kørsel (--limit): ingen mening i at sige noget
}

/* En annonce, kilden SELV har mærket "SOLGT" i titlen (crawler/normalize.js trækker markøren ud i salgsmarkoerer), er et væk-signal fra kilden:
   den tæller som "fjernet_markoer" og IKKE som "set". RESERVERET er ikke et væk-signal (den kan stadig blive solgt til en anden).
   Returnerer et Map kilde_annonce_id -> 'fjernet_markoer'. */
function fjernedeFraMarkoerer(annoncer){
  const m = new Map();
  for (const a of annoncer || []){
    if (Array.isArray(a.salgsmarkoerer) && a.salgsmarkoerer.some(x => String(x).toUpperCase() === 'SOLGT')) m.set(a.kilde_annonce_id, 'fjernet_markoer');
  }
  return m;
}

/* Læser grundlaget til værnet: samme forespørgsler som markerBorte() i db.js. */
async function laesVaernGrundlag(sb, kilde_id){
  const { data: koersler, error } = await sb
    .from('crawl_koersler').select('startet, fundet').eq('kilde_id', kilde_id)
    .not('afsluttet', 'is', null).order('startet', { ascending: false }).limit(REFERENCE_KOERSLER);
  kastVed(error, 'kunne ikke læse tidligere kørsler');
  const { count, error: taelFejl } = await sb
    .from('eksterne_annoncer').select('id', { count: 'exact', head: true })
    .eq('kilde_id', kilde_id).eq('status', 'aktiv');
  kastVed(taelFejl, 'kunne ikke tælle kildens aktive annoncer');
  return { historik: (koersler || []).map(k => k.fundet), aktive: count };
}

/* Anvender signalerne for én kørsel.

   fundet     Set af kilde_annonce_id, der stod i listen OG ikke gav 404/410
   fjernede   Map kilde_annonce_id -> '404'|'410'|'fjernet_markoer'
   komplet    kørslen har set hele kataloget (se indsamlAnnoncer)
   teknisk    null, eller { kode } når noget forhindrede os i at se efter
   nu         Date (injiceres, så en test kan spole tiden)

   Der sendes ÉT signal pr. annonce pr. kørsel — tælleren tæller kørsler med
   bekræftet væk, ikke hvor mange gange vi spurgte. */
async function opdaterLivscyklus(sb, kilde_id, { fundet, fjernede = new Map(), komplet = false, teknisk = null, nu = new Date() }){
  const { data: raekker, error } = await sb
    .from('eksterne_annoncer')
    .select('id, kilde_annonce_id, status, sidst_set, vaek_i_traek, foerste_vaek_signal, teknisk_fejl_i_traek, manuelle_felter')
    .eq('kilde_id', kilde_id).eq('status', 'aktiv');
  kastVed(error, 'kunne ikke læse kildens aktive annoncer');

  let vaern = null;
  if (komplet && !teknisk){
    const g = await laesVaernGrundlag(sb, kilde_id);
    vaern = bortemarkeringVurdering(fundet.size, g.historik, g.aktive);
  }

  const ud = { vaek: 0, teknisk: 0, borte: 0, sprunget_over: 0, vaern: vaern ? vaern.grund : null, vaern_holdt: Boolean(vaern && !vaern.tilladt) };
  const grupper = new Map();   // json(patch) -> { patch, ider }
  for (const r of raekker || []){
    if (fundet.has(r.kilde_annonce_id)) continue;
    // Ejeren har selv sat status: det er ejerens felt (som i markerBorte).
    if (Array.isArray(r.manuelle_felter) && r.manuelle_felter.includes('status')){ ud.sprunget_over++; continue; }
    const signal = signalForUset(r.kilde_annonce_id, { fjernede, teknisk, komplet, vaern });
    if (!signal){ ud.sprunget_over++; continue; }
    /* "Kunne ikke tjekke" er kun interessant for en annonce, der ikke allerede er
       frisk: en annonce, vi så for en uge siden, skal ikke melde "utilgængelig",
       fordi én kørsel fejlede. */
    if (signal.art === 'teknisk'){
      const alder = dageMellem(r.sidst_set, nu);
      if (alder == null || alder <= TAERSKLER.FRISK_DAGE){ ud.sprunget_over++; continue; }
    }
    const patch = anvendSignal(r, signal, nu);
    if (signal.art === 'vaek') ud.vaek++; else ud.teknisk++;
    if (patch.status === 'borte') ud.borte++;
    const noegle = JSON.stringify(patch);
    if (!grupper.has(noegle)) grupper.set(noegle, { patch, ider: [] });
    grupper.get(noegle).ider.push(r.id);
  }

  for (const { patch, ider } of grupper.values()){
    for (let i = 0; i < ider.length; i += 200){
      const { error: opdFejl } = await sb.from('eksterne_annoncer').update(patch).in('id', ider.slice(i, i + 200));
      kastVed(opdFejl, 'kunne ikke skrive livscyklus');
    }
  }
  return ud;
}

/* Udløb: en annonce, intet har bekræftet i UDLOEB_DAGE dage, vises ikke mere.
   Rækken slettes ALDRIG (kan sættes til aktiv igen, når kilden ses næste gang:
   skrivAnnoncer() skriver status 'aktiv' på alt, den ser).

   VÆRN: udløber det mere end halvdelen af alle aktive rækker på én gang, er
   det ikke annoncerne, der er gamle — det er crawleren, der har stået stille.
   Så gør vi ingenting og siger det. (Samme tankegang som BORTE_MIN_ANDEL.) */
const UDLOEB_MAKS_ANDEL = 0.5;
async function udloebGamle(sb, nu = new Date(), taerskler = TAERSKLER){
  const graense = new Date(nu.getTime() - taerskler.UDLOEB_DAGE * DAG_MS).toISOString();
  const { data: aktive, error } = await sb.from('eksterne_annoncer')
    .select('id, sidst_set, manuelle_felter').eq('status', 'aktiv');
  kastVed(error, 'kunne ikke læse aktive annoncer');
  const alle = aktive || [];
  const gamle = alle.filter(r => r.sidst_set && r.sidst_set < graense
    && !(Array.isArray(r.manuelle_felter) && r.manuelle_felter.includes('status')));
  if (!gamle.length) return { antal: 0, sprunget_over: false, grund: 'ingen er udløbet' };
  if (gamle.length > alle.length * UDLOEB_MAKS_ANDEL){
    return {
      antal: 0, sprunget_over: true,
      grund: `${gamle.length} af ${alle.length} aktive ville udløbe på én gang (grænse ${Math.round(UDLOEB_MAKS_ANDEL * 100)} %) `
           + '— det ligner en crawler, der har stået stille, ikke gamle annoncer',
    };
  }
  for (let i = 0; i < gamle.length; i += 200){
    const { error: opdFejl } = await sb.from('eksterne_annoncer')
      .update({ status: 'udloebet', sidste_signal: 'udloebet' }).in('id', gamle.slice(i, i + 200).map(r => r.id));
    kastVed(opdFejl, 'kunne ikke udløbe annoncer');
  }
  return { antal: gamle.length, sprunget_over: false, grund: `${gamle.length} annoncer ubekræftet i over ${taerskler.UDLOEB_DAGE} dage` };
}

module.exports = {
  TAERSKLER, TILSTANDE, VAEK_KODER, TEKNISKE_KODER, UDLOEB_MAKS_ANDEL,
  klassificerSignal, anvendSignal, vurderLivscyklus, dageMellem,
  livscyklusAktiv, signalForUset, fjernedeFraMarkoerer, opdaterLivscyklus, udloebGamle, laesVaernGrundlag,
};
