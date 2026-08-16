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

async function markerBorte(sb, kilde_id){
  const { data: koersler, error } = await sb
    .from('crawl_koersler')
    .select('startet')
    .eq('kilde_id', kilde_id)
    .not('afsluttet', 'is', null)
    .order('startet', { ascending: false })
    .limit(KOERSLER_FOER_BORTE);
  kastVed(error, 'kunne ikke læse tidligere kørsler');

  // Færre end tre afsluttede kørsler: ingen annonce KAN have manglet i tre.
  if (!koersler || koersler.length < KOERSLER_FOER_BORTE) return 0;

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
  return data?.length || 0;
}

module.exports = {
  klient, projektUrl, sikrKilde, startKoersel, afslutKoersel,
  skrivAnnoncer, markerBorte, KOERSLER_FOER_BORTE,
  // Eksporteres, saa en test kan holde parserens felter op mod kolonnerne
  // uden at have en database. Det er den test, der ville have fanget hk.
  KOLONNER, tilRaekke,
};
