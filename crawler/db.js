/* Databaselaget.

   OM NØGLEN: eksterne_annoncer er lukket for anon og authenticated
   (014_aggregator.sql revoke'er insert/update/delete). Crawleren skriver med
   service_role, som omgår al RLS. Den nøgle læses fra miljøet og findes
   ingen steder i repoet — ikke i en .env, ikke i en konstant, ikke i en log.
   Bliver den skrevet ned én gang, er den kompromitteret for altid.

   URL'en er derimod offentlig og står allerede i js/supabase-config.js. Den
   læses derfra, så en kørsel kun kræver ÉN miljøvariabel. */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function projektUrl(){
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  const fil = path.join(__dirname, '..', 'js', 'supabase-config.js');
  const m = fs.existsSync(fil) && fs.readFileSync(fil, 'utf8').match(/url:\s*'([^']+)'/);
  if (m) return m[1];
  throw new Error('Kan ikke finde Supabase-URL. Sæt SUPABASE_URL.');
}

function klient(){
  const noegle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!noegle){
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY er ikke sat i miljøet.\n' +
      'eksterne_annoncer kan kun skrives med service_role. Sæt variablen i den\n' +
      'shell, kørslen startes fra — skriv den aldrig ind i en fil i repoet.'
    );
  }
  return createClient(projektUrl(), noegle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function kastVed(fejl, hvad){
  if (fejl) throw new Error(`${hvad}: ${fejl.message || JSON.stringify(fejl)}`);
}

/* ---------- Kilder ---------- */
/* Kilden oprettes ud fra YAML'en, så konfigurationen er sandheden ét sted.
   aktiv skrives IKKE ved opdatering: slår nogen kilden fra i databasen
   (opt-out-kravet, "ét flag og de forsvinder"), må næste kørsel ikke sætte
   den til igen, fordi YAML'en stadig siger aktiv: true. */
async function sikrKilde(sb, kilde){
  const { data: eksisterende, error: laesFejl } = await sb
    .from('kilder').select('id, aktiv').eq('domaene', kilde.domaene).maybeSingle();
  kastVed(laesFejl, 'kunne ikke læse kilder');

  const felter = {
    navn: kilde.navn,
    domaene: kilde.domaene,
    crawl_delay_ms: kilde.crawl_delay_ms,
    konfig_fil: kilde.konfig_fil,
    robots_hentet: kilde.robots_tjekket ? new Date(kilde.robots_tjekket).toISOString() : null,
  };

  if (eksisterende){
    const { error } = await sb.from('kilder').update(felter).eq('id', eksisterende.id);
    kastVed(error, 'kunne ikke opdatere kilden');
    return { id: eksisterende.id, aktiv: eksisterende.aktiv };
  }

  const { data, error } = await sb
    .from('kilder').insert({ ...felter, aktiv: kilde.aktiv !== false }).select('id, aktiv').single();
  kastVed(error, 'kunne ikke oprette kilden');
  return { id: data.id, aktiv: data.aktiv };
}

/* ---------- Kørsler ---------- */
async function startKoersel(sb, kilde_id){
  const { data, error } = await sb
    .from('crawl_koersler').insert({ kilde_id }).select('id, startet').single();
  kastVed(error, 'kunne ikke oprette kørslen');
  return data;
}

async function afslutKoersel(sb, koersel_id, tal, log){
  const { error } = await sb.from('crawl_koersler').update({
    afsluttet: new Date().toISOString(),
    fundet: tal.fundet | 0,
    nye: tal.nye | 0,
    opdaterede: tal.opdaterede | 0,
    borte: tal.borte | 0,
    fejl: tal.fejl | 0,
    log: log ? String(log).slice(0, 20_000) : null,
  }).eq('id', koersel_id);
  kastVed(error, 'kunne ikke afslutte kørslen');
}

/* ---------- Annoncer ----------
   Manuelle felter er hellige. Har en forhandler gjort krav på sin annonce og
   rettet prisen i hånden, må crawleren aldrig skrive henover den — det er
   hele pointen med manuelle_felter i 014. Derfor slås eksisterende rækker op
   først, og de manuelt rettede kolonner fjernes fra det, vi skriver.

   Rækker uden manuelle felter — langt de fleste — skrives i ét kald.
   Resten opdateres én ad gangen med et beskåret felt-sæt. */
const BATCH = 500;

/* Kolonnerne crawleren skriver. Listen er ikke pynt, og den er ikke et
   dubleret skema — den er graensen mellem parseren og tabellen.

   Uden den spredes hele annonceobjektet ind i upserten, og saa gaelder to
   ting, der begge har kostet os noget:

     1. Tilfoejer en parser et felt, tabellen ikke har, fejler HELE koerslen
        med "column does not exist" — 343 annoncer tabt, fordi nogen skrev én
        linje i parse.js. Ingen test fanger det, fordi ingen test gaar i
        databasen.
     2. Den modsatte fejl er vaerre, fordi den er tavs: hk blev parset fra
        kortet i maaneder og forsvandt, fordi der ikke var en kolonne. Intet
        fejlede. Feltet var der bare ikke.

   Nu er "ny kolonne" én bevidst handling to steder — en migration og en linje
   her — og alt andet, en parser vil regne med undervejs, kan ligge frit paa
   annonceobjektet uden at ramme tabellen.

   foerst_set, ejet_af og manuelle_felter staar med vilje IKKE paa listen.
   De hoerer til raekken, ikke til kilden, og crawleren ejer dem ikke. */
const KOLONNER = [
  'kilde_annonce_id', 'url', 'titel',
  'maerke', 'model', 'variant', 'type',
  'aargang', 'km', 'ccm', 'hk', 'pris_dkk',
  'stand', 'salgsmarkoerer',
  'by', 'postnr', 'saelgertype',
  'thumbnail_url', 'uddrag', 'fingerprint',
  // Crawlerens egne gæt, fx en ccm udledt af modelnavnet. Modstykket til
  // manuelle_felter, som crawleren netop IKKE ejer.
  'udledte_felter',
];

/* Skaer et annonceobjekt ned til de kolonner, tabellen faktisk har, og
   fortael hvad der blev skaaret fra. Det sidste er pointen: et felt, der
   bliver droppet i stilhed, er praecis den fejl, listen er lavet for at
   fange. */
function tilRaekke(annonce, ukendte){
  const raekke = {};
  for (const [k, v] of Object.entries(annonce)){
    if (KOLONNER.includes(k)) raekke[k] = v;
    else ukendte.add(k);
  }
  return raekke;
}

async function skrivAnnoncer(sb, kilde_id, annoncer){
  if (!annoncer.length) return { nye: 0, opdaterede: 0, ukendte_felter: [] };

  const ider = annoncer.map(a => a.kilde_annonce_id);
  const kendte = new Map();
  for (let i = 0; i < ider.length; i += BATCH){
    const { data, error } = await sb
      .from('eksterne_annoncer')
      .select('id, kilde_annonce_id, manuelle_felter')
      .eq('kilde_id', kilde_id)
      .in('kilde_annonce_id', ider.slice(i, i + BATCH));
    kastVed(error, 'kunne ikke slå eksisterende annoncer op');
    for (const r of data) kendte.set(r.kilde_annonce_id, r);
  }

  const nu = new Date().toISOString();
  const frie = [];      // ingen manuelle felter -> kan skrives i batch
  const beskyttede = [];
  const ukendte = new Set();

  for (const a of annoncer){
    const raekke = { ...tilRaekke(a, ukendte), kilde_id, sidst_set: nu, status: 'aktiv' };
    const kendt = kendte.get(a.kilde_annonce_id);
    if (kendt && kendt.manuelle_felter?.length){
      const beskaaret = { sidst_set: nu };
      for (const [k, v] of Object.entries(raekke)){
        if (k === 'kilde_id' || k === 'kilde_annonce_id') continue;
        if (!kendt.manuelle_felter.includes(k)) beskaaret[k] = v;
      }
      /* Har ejeren rettet et felt i hånden, er det ikke længere udledt.
         Uden det her ville rækken sige "ccm er gættet", mens den viste
         forhandlerens egen rettelse — og en visning, der skriver "ca." ud
         fra listen, ville sætte et forbehold på et tal, der er præcist. */
      if (Array.isArray(beskaaret.udledte_felter)){
        beskaaret.udledte_felter = beskaaret.udledte_felter
          .filter(f => !kendt.manuelle_felter.includes(f));
      }
      beskyttede.push({ id: kendt.id, felter: beskaaret });
    } else {
      frie.push(raekke);
    }
  }

  // foerst_set er bevidst ikke med i payloaden: den sættes af default'en ved
  // insert og skal ikke røres ved opdatering. Det samme gælder ejet_af og
  // manuelle_felter — kolonner crawleren ikke ejer.
  for (let i = 0; i < frie.length; i += BATCH){
    const { error } = await sb.from('eksterne_annoncer')
      .upsert(frie.slice(i, i + BATCH), { onConflict: 'kilde_id,kilde_annonce_id' });
    kastVed(error, 'kunne ikke skrive annoncer');
  }

  for (const b of beskyttede){
    const { error } = await sb.from('eksterne_annoncer').update(b.felter).eq('id', b.id);
    kastVed(error, `kunne ikke opdatere annonce ${b.id}`);
  }

  const nye = annoncer.filter(a => !kendte.has(a.kilde_annonce_id)).length;
  return { nye, opdaterede: annoncer.length - nye, ukendte_felter: [...ukendte] };
}

/* ---------- Forsvundne annoncer ----------
   Aldrig hard delete. En annonce, der ikke er set i TRE kørsler, sættes til
   'borte' og forsvinder fra den offentlige politik i 014 — men rækken bliver
   liggende, så et krav, en statistik eller en fejlfinding stadig kan se den.

   Tre kørsler frem for én, fordi en enkelt kørsel kan misse en side af
   grunde, der intet har med annoncen at gøre: en timeout, en tom
   efterindlæsning, et hikke hos kilden. Ville vi skjule 500 annoncer, hver
   gang en side var langsom, var kataloget ubrugeligt.

   Tærsklen udledes af crawl_koersler frem for en tæller-kolonne: starten på
   den tredjesidste afsluttede kørsel. Er en annonce sidst set før det
   tidspunkt, har den manglet i alle tre. */
const KOERSLER_FOER_BORTE = 3;

/* VÆRNET: tre kørsler beskytter mod et hikke, ikke mod et DOM-skift.
   ------------------------------------------------------------------
   Markeringen kørte før uanset hvor lidt kørslen havde fundet. Fem linjer
   tidligere logges "ingen annoncer fundet. Selectors eller sidestruktur bør
   efterses" — og så kørte markeringen alligevel, i samme gennemløb. Tre
   kørsler med nul kort, og alle 332 rækker har `sidst_set` ældre end
   grænsen: hele kataloget til 'borte', hvorefter politikken "ekstern:
   offentlig laesning" (status <> 'borte') skjuler dem. Sitet fra 332
   annoncer til 0, og det kræver kun, at MC Syd omdøber en CSS-klasse.
   Tre kørsler er ikke et værn mod det: et DOM-skift er ikke et hikke, det
   er permanent, og det gentager sig hver gang.

   Reglen: fundet skal være mindst 60 % af REFERENCEN, og referencen er det
   højeste af to tal — det største fund i de sammenlignede kørsler OG antallet
   af aktive rækker, kilden har i dag.

   HVORFOR DE AKTIVE RÆKKER ER MED (C-011, genåbnet efter baa7add).
   Første udgave af værnet så kun på tidligere kørsler, og den lavede selv det
   hul, den skulle lukke:

     fundet=0  historik=[332,332,332]  -> BLOKERER   (kørsel 1 efter DOM-skiftet)
     fundet=0  historik=[0,332,332]    -> BLOKERER   (kørsel 2)
     fundet=0  historik=[0,0,332]      -> BLOKERER   (kørsel 3)
     fundet=1  historik=[0,0,0]        -> TILLADT — og 327 rækker gik til 'borte'

   En blokeret kørsel bliver stadig afsluttet i `crawl_koersler` med `fundet:
   0` — og det SKAL den, en kørsel der skete, skal kunne ses. Men efter tre af
   dem var historikken bare nuller, nullerne blev filtreret fra, og den tomme
   mængde blev læst som "ny kilde, intet at falde fra". Jo længere værnet holdt,
   jo tættere kom historikken på den tilstand, der lukkede op.

   Fejlen var, at "ny kilde" blev udledt af kørselshistorikken. Historikken kan
   ikke skelne "kilden har aldrig fundet noget" fra "kilden svarede ikke tre
   gange" — de to giver samme tal. Antallet af aktive rækker KAN: nul for en
   ægte ny kilde, 332 for MC Syd. Derfor er det tal med i referencen, og derfor
   afgøres "der er intet at falde fra" nu af rækkerne, ikke af historikken.

   Hvilken vej fejlen skal falde, er valgt med vilje. Værnet kan holde en
   annonce synlig én kørsel for længe — det koster en forkert annonce i
   søgeresultatet, og den er stadig i kildens system. Det modsatte koster
   hele kataloget. Der ER en pris: lukker en forhandler og tømmer sit lager
   for ægte, bliver de gamle annoncer stående, indtil et menneske ser
   logbeskeden. Det er den rigtige, fordi "kilden har nul annoncer" og
   "vores parser er brækket" ser ens ud fra vores side — og bare ÉN af dem
   må afgøres af en maskine. */
const BORTE_MIN_ANDEL = 0.6;

/* Hvor mange afsluttede kørsler referencen hentes fra. Fire gange så mange som
   markeringsvinduet, og det er en bevidst forskel:

   Værnet er en HASTIGHEDSBEGRÆNSER, ikke et gulv — hvert fald på under 40 %
   slipper igennem, og når det har gjort det, er både de aktive rækker og
   kørselshistorikken faldet med. Med et referencevindue på tre kørsler kan et
   40 %-fald derfor gentage sig hver tredje kørsel: 332 -> 200 -> 120 -> 72 ->
   44 -> 27 på tretten kørsler, med markering tilladt hele vejen (målt af
   critic i runde 1). Med tolv kørslers hukommelse koster hvert trin tolv
   kørsler i stedet for tre: de samme fem trin tager 49 kørsler, og efter
   fjorten står kilden på 120 i stedet for 27. Tallene er låst i
   crawler/borte.test.js.

   Det er stadig ikke et gulv, og der findes ikke et ærligt et: et ægte
   udsalg og en langsomt smuldrende parser ser ens ud i tallene. Vi køber tid
   til, at et menneske når at læse loggen. Se docs/review/DECISIONS.md. */
const REFERENCE_KOERSLER = 12;

/* aktiveRaekker er ikke valgfri. Et værn, man kan slå fra ved at glemme et
   argument, er ikke et værn — og det var præcis dét tal, hullet manglede. */
function bortemarkeringVurdering(fundet, tidligereFundet, aktiveRaekker){
  if (!Number.isFinite(aktiveRaekker) || aktiveRaekker < 0){
    throw new Error(
      'bortemarkeringVurdering(): aktiveRaekker skal være et tal >= 0. ' +
      'Det er tallet, der skelner en ny kilde fra en kilde, hvis parser er brækket.'
    );
  }
  const antal = Number(fundet) || 0;
  if (antal <= 0){
    return { tilladt: false, grund: 'kørslen fandt nul annoncer' };
  }

  const kendte = (tidligereFundet || []).map(n => Number(n) || 0).filter(n => n > 0);
  const hoejesteFund = kendte.length ? Math.max(...kendte) : 0;
  const reference = Math.max(hoejesteFund, aktiveRaekker);

  /* Kun her er "der er intet at falde fra" sandt: kilden har hverken fundet
     noget før ELLER rækker i tabellen. En markering kan pr. definition ikke
     ramme noget, og en ægte ny kilde kommer videre fra første kørsel. */
  if (reference === 0){
    return { tilladt: true, grund: 'ny kilde: hverken tidligere fund eller aktive rækker at falde fra' };
  }

  const referenceTekst = aktiveRaekker > hoejesteFund
    ? `${aktiveRaekker} aktive rækker i databasen`
    : `højeste fund i de seneste ${REFERENCE_KOERSLER} kørsler`;
  // Nedad, ikke nærmeste: 199 af 332 er 59,9 %, og "60 % — grænsen er 60 %"
  // læses af en operatør som "den var på grænsen og blev afvist alligevel".
  const procent = Math.floor((antal / reference) * 100);

  if (antal < reference * BORTE_MIN_ANDEL){
    return {
      tilladt: false,
      grund: `kørslen fandt ${antal}, hvor kilden står med ${reference} `
           + `(${procent} % — grænsen er ${Math.round(BORTE_MIN_ANDEL * 100)} %; `
           + `referencen er ${referenceTekst})`,
    };
  }
  return {
    tilladt: true,
    grund: `${antal} fundet mod ${reference} (${procent} % — referencen er ${referenceTekst})`,
  };
}

async function markerBorte(sb, kilde_id, fundet){
  const { data: koersler, error } = await sb
    .from('crawl_koersler')
    .select('startet, fundet')
    .eq('kilde_id', kilde_id)
    .not('afsluttet', 'is', null)
    .order('startet', { ascending: false })
    .limit(REFERENCE_KOERSLER);
  kastVed(error, 'kunne ikke læse tidligere kørsler');

  // Færre end tre afsluttede kørsler: ingen annonce KAN have manglet i tre.
  if (!koersler || koersler.length < KOERSLER_FOER_BORTE){
    return { antal: 0, sprunget_over: false, grund: 'færre end tre afsluttede kørsler' };
  }

  /* Det andet tal værnet dømmer på: hvor mange rækker kilden HAR lige nu.
     Samme filter som opdateringen nedenfor bruger, så referencen er præcis den
     mængde, markeringen kan ramme. */
  const { count: aktive, error: taelFejl } = await sb
    .from('eksterne_annoncer')
    .select('id', { count: 'exact', head: true })
    .eq('kilde_id', kilde_id)
    .eq('status', 'aktiv');
  kastVed(taelFejl, 'kunne ikke tælle kildens aktive annoncer');

  /* Kan vi ikke tælle rækkerne, kan vi ikke skelne en ny kilde fra en brækket
     parser — og så markerer vi ikke. Værnet fejler lukket. */
  if (!Number.isFinite(aktive) || aktive < 0){
    return { antal: 0, sprunget_over: true, grund: 'kunne ikke tælle kildens aktive rækker' };
  }

  /* Værnet ligger HER og ikke i pipeline.js, fordi det er den samme
     forespørgsel, der bærer begge svar: kørslerne, referencen regnes ud fra,
     ER kørslerne, grænsen for `sidst_set` tages fra. Lå de to steder, kunne de
     komme til at se på hver sit vindue. */
  const dom = bortemarkeringVurdering(fundet, koersler.map(k => k.fundet), aktive);
  if (!dom.tilladt) return { antal: 0, sprunget_over: true, grund: dom.grund };

  const graense = koersler[KOERSLER_FOER_BORTE - 1].startet;
  const { data, error: opdFejl } = await sb
    .from('eksterne_annoncer')
    .update({ status: 'borte' })
    .eq('kilde_id', kilde_id)
    .eq('status', 'aktiv')
    .lt('sidst_set', graense)
    // Har ejeren selv sat status i hånden, er det ejerens felt.
    .not('manuelle_felter', 'cs', '{status}')
    .select('id');
  kastVed(opdFejl, 'kunne ikke markere forsvundne annoncer');
  return { antal: data?.length || 0, sprunget_over: false, grund: dom.grund };
}

module.exports = {
  klient, projektUrl, sikrKilde, startKoersel, afslutKoersel,
  skrivAnnoncer, markerBorte, KOERSLER_FOER_BORTE,
  // Vurderingen er ren og eksporteres, saa vaernet kan testes uden en
  // database. Det er hele pointen: den betingelse, der staar mellem et
  // kosmetisk skift hos kilden og et tomt katalog, skal have en test.
  bortemarkeringVurdering, BORTE_MIN_ANDEL, REFERENCE_KOERSLER,
  // Eksporteres, saa en test kan holde parserens felter op mod kolonnerne
  // uden at have en database. Det er den test, der ville have fanget hk.
  KOLONNER, tilRaekke,
};
