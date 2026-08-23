/* Roegtest af backenden i produktion — kun med den offentlige anon-noegle.

   Hvorfor: audit 23.08.2026 fandt, at alle fem Edge Functions svarede 404,
   og at profiles.plan ikke fandtes, selvom koden i js/ og supabase/ regnede
   med begge dele. Ingen test fangede det, fordi alle tests koerer mod kode,
   ikke mod det, der faktisk er deployet. Det her script spoerger produktionen.

   Intet skrives. Ingen hemmeligheder: URL og anon-noegle laeses fra
   js/supabase-config.js — den noegle ER offentlig, RLS bestemmer hvad den maa.

   Koer:  node scripts/tjek-backend.js          (eller: npm run tjek:backend)
   Afslutter med kode 1, hvis noget mangler, saa den kan staa i en pipeline. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
const URL_ = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
const KEY = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
if (!URL_ || !KEY) { console.error('Kunne ikke laese url/anonKey fra js/supabase-config.js'); process.exit(2); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

/* Funktioner og om de er beskyttet af JWT-tjek i gatewayen. Uden JWT svarer
   en beskyttet funktion 401 — det er et TEGN PAA LIV, ikke en fejl. 404 fra
   gatewayen ({"code":"NOT_FOUND"}) betyder "ikke deployet". */
const FUNKTIONER = ['create-checkout', 'create-portal', 'stripe-webhook', 'verify-profile', 'notify-saved-searches'];

/* Kolonner, der beviser at en migration er koert. Et SELECT paa en kolonne,
   der ikke findes, giver 42703 — uanset RLS. Findes den, giver anon [] (200). */
const KOLONNER = [
  ['006', 'profiles', 'plan'],
  ['006', 'profiles', 'subscription_status'],
  ['006', 'profiles', 'subscription_period_end'],
  ['006', 'profiles', 'stripe_customer_id'],
  ['009', 'listings', 'service_historik'],
  ['010', 'listings', 'vinterklar'],
  ['011', 'listings', 'kan_nedsaettes_a2'],
  ['013', 'saved_searches', 'unsubscribe_token'],
  ['014', 'krav', 'status'],
  ['015', 'eksterne_annoncer', 'udledte_felter'],
];

const resultater = [];
function noter(ok, hvad, detalje){ resultater.push({ ok, hvad, detalje }); }

async function tjekKolonne(mig, tabel, kolonne){
  const r = await fetch(`${URL_}/rest/v1/${tabel}?select=${kolonne}&limit=0`, { headers: H });
  const tekst = await r.text();
  const findes = r.status === 200 || (r.status === 401 && !/42703/.test(tekst));
  noter(findes, `migration ${mig}: ${tabel}.${kolonne}`, findes ? 'findes' : `mangler (${r.status} ${tekst.slice(0, 60)})`);
}

/* 021: kolonnegulv paa kilder. navn/domaene skal stadig kunne laeses (det
   er det, kortene viser); crawl_delay_ms maa IKKE (42501 = permission denied). */
async function tjekKilderGulv(){
  const ok = await fetch(`${URL_}/rest/v1/kilder?select=navn,domaene&limit=1`, { headers: H });
  noter(ok.status === 200, 'migration 021: kilder.navn/domaene laesbar for anon', ok.status === 200 ? 'ja (kortene kan vise kilden)' : `NEJ (${ok.status}) — kortene mister kildenavnet`);
  const r = await fetch(`${URL_}/rest/v1/kilder?select=crawl_delay_ms&limit=1`, { headers: H });
  const tekst = await r.text();
  const lukket = r.status !== 200 && /42501|permission denied/.test(tekst);
  noter(lukket, 'migration 021: kilder.crawl_delay_ms IKKE laesbar for anon', lukket ? 'lukket (42501)' : `aaben (${r.status}) — hele crawlerkonfigurationen er offentlig`);
}

async function tjekDevSetPlanVaek(){
  // Navngivet parameter, saa PostgREST finder funktionen HVIS den findes.
  const r = await fetch(`${URL_}/rest/v1/rpc/dev_set_plan`, { method: 'POST', headers: H, body: JSON.stringify({ p_plan: 'free' }) });
  const tekst = await r.text();
  const vaek = /PGRST202/.test(tekst);
  noter(vaek, 'migration 020: dev_set_plan er fjernet', vaek ? 'findes ikke (rigtigt)' : `FINDES STADIG (${r.status}) — betalingsomgaaelse`);
}

async function tjekFunktion(navn){
  const r = await fetch(`${URL_}/functions/v1/${navn}`, { method: 'POST', headers: H, body: '{}' });
  const tekst = await r.text();
  const gatewayNotFound = r.status === 404 && /NOT_FOUND|Requested function was not found/i.test(tekst);
  noter(!gatewayNotFound, `edge function ${navn}`, gatewayNotFound ? 'IKKE deployet (404 fra gatewayen)' : `svarer ${r.status} (deployet)`);
}

(async () => {
  console.log(`Roegtest mod ${URL_}\n`);
  for (const [m, t, k] of KOLONNER) await tjekKolonne(m, t, k);
  await tjekDevSetPlanVaek();
  await tjekKilderGulv();
  for (const f of FUNKTIONER) await tjekFunktion(f);

  const bredde = Math.max(...resultater.map(r => r.hvad.length));
  for (const r of resultater) console.log(`  ${r.ok ? 'OK  ' : 'FEJL'}  ${r.hvad.padEnd(bredde)}  ${r.detalje}`);
  const fejl = resultater.filter(r => !r.ok);
  console.log(`\n${resultater.length - fejl.length}/${resultater.length} bestaaet.`);
  if (fejl.length){
    console.log('Mangler noget: koer  node scripts/backend-deploy.js  (kraever SUPABASE_ACCESS_TOKEN) — se supabase/DEPLOY.md.');
    process.exit(1);
  }
})().catch(e => { console.error('Roegtesten kunne ikke koere:', e.message); process.exit(2); });
