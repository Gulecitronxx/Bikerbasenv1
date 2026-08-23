/* Deployer backenden til produktions-Supabase: de migrationer, der mangler,
   og de fem Edge Functions. Een kommando, idempotent, med roegtest til sidst.

   Hvorfor: migrationerne blev hidtil koert ved at klistre SQL ind i dashboardet,
   og funktionerne blev aldrig deployet. Audit 23.08.2026: alle fem funktioner
   404, profiles.plan fandtes ikke, 020 var skrevet mod en funktion, der aldrig
   var oprettet. Koden og produktionen var to forskellige systemer.

   Kraever:
     SUPABASE_ACCESS_TOKEN   personlig access token (supabase.com -> Account ->
                             Access Tokens). Bruges til Management API og CLI.
                             Laeses KUN fra miljoeet — laeg den aldrig i en fil her.
   Valgfrit:
     SUPABASE_PROJECT_REF    standard: udledt af url i js/supabase-config.js
     NOTIFY_SECRET           hvis sat, erstattes <<PROJEKT_URL>>/<<HEMMELIGHED>>
                             i 013's trigger (notify_saved_searches), saa
                             soegeagent-mails faktisk kaldes. Samme streng skal
                             ligge som secret paa funktionen (se DEPLOY.md).
   Flag:
     --dry-run        vis planen, skriv intet
     --kun-sql        spring Edge Functions over
     --kun-funktioner spring SQL over

   Koer:  node scripts/backend-deploy.js           (eller: npm run deploy:backend)
   Se supabase/DEPLOY.md for hele koereplanen inkl. Stripe og secrets. */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ARGS = new Set(process.argv.slice(2));
const DRY = ARGS.has('--dry-run');
const KUN_SQL = ARGS.has('--kun-sql');
const KUN_FN = ARGS.has('--kun-funktioner');

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN){
  console.error('SUPABASE_ACCESS_TOKEN mangler i miljoeet.\n' +
    'Opret en paa https://supabase.com/dashboard/account/tokens og koer fx:\n' +
    '  PowerShell:  $env:SUPABASE_ACCESS_TOKEN="sbp_..."; node scripts/backend-deploy.js\n' +
    '  bash:        SUPABASE_ACCESS_TOKEN=sbp_... node scripts/backend-deploy.js');
  process.exit(2);
}

const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
const PROJECT_URL = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
const REF = process.env.SUPABASE_PROJECT_REF || (PROJECT_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
if (!REF){ console.error('Kunne ikke udlede projekt-ref fra js/supabase-config.js'); process.exit(2); }

const API = `https://api.supabase.com/v1/projects/${REF}`;

/* ---------- Management API: koer SQL ---------- */
async function sql(query, hvad){
  const r = await fetch(`${API}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const tekst = await r.text();
  if (!r.ok) throw new Error(`${hvad}: HTTP ${r.status} — ${tekst.slice(0, 400)}`);
  try { return JSON.parse(tekst); } catch { return tekst; }
}

async function preflight(){
  const r = await fetch(API, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (r.status === 401) throw new Error('Access token afvist (401). Er den udloebet eller forkert?');
  if (!r.ok) throw new Error(`Kunne ikke slaa projektet op: HTTP ${r.status}`);
  const p = await r.json();
  console.log(`Projekt: ${p.name || REF} (${REF}) region ${p.region || '?'}`);
}

/* ---------- Hvad findes i produktionen? ---------- */
async function tilstand(){
  const rows = await sql(`
    select
      exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='profiles' and column_name='plan') as plan_kolonne,
      exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='enforce_listing_limit') as limit_fn,
      exists (select 1 from pg_trigger where tgname='trg_listing_limit' and not tgisinternal) as limit_trigger,
      exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='dev_set_plan') as dev_set_plan,
      coalesce((select prosrc like '%<<PROJEKT_URL>>%' or prosrc like '%<<HEMMELIGHED>>%'
                from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                where n.nspname='public' and p.proname='notify_saved_searches' limit 1), false) as notify_placeholder,
      exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and p.proname='notify_saved_searches') as notify_fn
  `, 'tilstand');
  return rows[0];
}

/* ---------- Migrationerne i raekkefoelge ----------
   006: plan/subscription-kolonner + enforce_listing_limit + (midlertidig) dev_set_plan
   007: slaar annoncegraensen fra (dropper triggeren) — gratis adgang indtil videre
   019: dev_set_plan saetter ogsaa is_dealer (samme rettelse som i stripe-webhook)
   020: dropper dev_set_plan — betalingsomgaaelsen maa ikke findes i produktion
   Alle fire er skrevet til at kunne koeres igen uden skade; de springes kun over,
   naar tilstanden beviser, at de allerede er koert. */
function migrationsplan(t){
  const plan = [];
  if (!t.plan_kolonne || !t.limit_fn) plan.push('006_forhandler_abonnement.sql');
  if (t.limit_trigger || plan.includes('006_forhandler_abonnement.sql')) plan.push('007_fri_adgang.sql');
  if (plan.length) plan.push('019_dealer_ved_betaling.sql'); // kun meningsfuld foer 020
  if (t.dev_set_plan || plan.length) plan.push('020_fjern_dev_set_plan.sql');
  return plan;
}

async function koerMigrationer(t){
  const plan = migrationsplan(t);
  if (!plan.length){ console.log('SQL: alle migrationer er allerede koert — intet at goere.'); }
  for (const fil of plan){
    const tekst = fs.readFileSync(path.join(ROOT, 'supabase', fil), 'utf8');
    console.log(`SQL: ${DRY ? '(dry-run) ville koere' : 'koerer'} ${fil}`);
    if (!DRY) await sql(tekst, fil);
  }

  // 013's trigger kalder Edge Function'en med en delt hemmelighed. Staar
  // pladsholderne der endnu, kaldes ingenting — og det ses foerst den dag,
  // en soegeagent skulle have faaet mail.
  if (t.notify_fn && t.notify_placeholder){
    if (!process.env.NOTIFY_SECRET){
      console.log('ADVARSEL: notify_saved_searches() har stadig <<PROJEKT_URL>>/<<HEMMELIGHED>>.\n' +
        '  Saet NOTIFY_SECRET i miljoeet og koer igen, saa udfyldes de (samme vaerdi skal ligge som secret paa funktionen).');
    } else {
      const kilde = fs.readFileSync(path.join(ROOT, 'supabase/013_soegeagenter.sql'), 'utf8');
      const m = kilde.match(/create or replace function public\.notify_saved_searches\(\)[\s\S]*?\$\$;/);
      if (!m) throw new Error('Kunne ikke finde notify_saved_searches() i 013_soegeagenter.sql');
      const fn = m[0].replace(/<<PROJEKT_URL>>/g, PROJECT_URL).replace(/<<HEMMELIGHED>>/g, process.env.NOTIFY_SECRET);
      console.log(`SQL: ${DRY ? '(dry-run) ville udfylde' : 'udfylder'} pladsholderne i notify_saved_searches()`);
      if (!DRY) await sql(fn, '013 notify_saved_searches');
    }
  }
}

/* ---------- Edge Functions via Supabase CLI ----------
   stripe-webhook og notify-saved-searches kaldes uden bruger-JWT (Stripe hhv.
   pg_net fra databasen) og beskyttes af hhv. Stripe-signatur og x-bb-secret.
   De SKAL deployes uden JWT-tjek — ellers svarer gatewayen 401 foer koden koerer.
   supabase/config.toml siger det samme; flaget her er bælte og seler. */
const FUNKTIONER = [
  { navn: 'create-checkout',       verifyJwt: true  },
  { navn: 'create-portal',         verifyJwt: true  },
  { navn: 'verify-profile',        verifyJwt: true  },
  { navn: 'stripe-webhook',        verifyJwt: false },
  { navn: 'notify-saved-searches', verifyJwt: false },
];
const SECRETS_KRAEVET = {
  'create-checkout':       ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'SITE_URL'],
  'create-portal':         ['STRIPE_SECRET_KEY', 'SITE_URL'],
  'stripe-webhook':        ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  'verify-profile':        ['SITE_URL'],                 // CVR_API_TOKEN er valgfri (se VERIFICERING.md)
  'notify-saved-searches': ['NOTIFY_SECRET', 'RESEND_API_KEY', 'SITE_URL'],
};

function cli(args){
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const r = spawnSync(npx, ['--yes', 'supabase@2', ...args], {
    cwd: ROOT, stdio: 'pipe', encoding: 'utf8', shell: process.platform === 'win32',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: TOKEN },
  });
  return r;
}

function deployFunktioner(){
  for (const f of FUNKTIONER){
    const args = ['functions', 'deploy', f.navn, '--project-ref', REF];
    if (!f.verifyJwt) args.push('--no-verify-jwt');
    console.log(`FN:  ${DRY ? '(dry-run) ville koere' : 'koerer'} supabase ${args.join(' ')}`);
    if (DRY) continue;
    const r = cli(args);
    if (r.status !== 0){
      console.error((r.stdout || '') + (r.stderr || ''));
      throw new Error(`Deploy af ${f.navn} fejlede (exit ${r.status})`);
    }
  }
  if (DRY) return;

  // Hvilke secrets mangler? Kun navne listes — aldrig vaerdier.
  const r = cli(['secrets', 'list', '--project-ref', REF, '-o', 'json']);
  let satte = [];
  try { satte = JSON.parse(r.stdout).map(s => s.name); } catch { /* aeldre CLI: parse tabellen */
    satte = (r.stdout || '').split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean);
  }
  const mangler = [];
  for (const [fn, liste] of Object.entries(SECRETS_KRAEVET))
    for (const s of liste) if (!satte.includes(s)) mangler.push(`${s} (${fn})`);
  if (mangler.length){
    console.log('\nSecrets, der IKKE er sat (funktionen svarer, men fejler ved brug):');
    for (const m of [...new Set(mangler)]) console.log('  - ' + m);
    console.log('Saet dem med:  npx supabase@2 secrets set NAVN=vaerdi --project-ref ' + REF + '   (se supabase/DEPLOY.md)');
  } else {
    console.log('Alle kraevede secrets er sat.');
  }
}

(async () => {
  await preflight();
  const t = await tilstand();
  console.log('Tilstand:', JSON.stringify(t));
  if (!KUN_FN) await koerMigrationer(t);
  if (!KUN_SQL) deployFunktioner();
  if (DRY){ console.log('\nDry-run: intet er aendret.'); return; }

  console.log('\nRoegtest:');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'tjek-backend.js')], { stdio: 'inherit' });
  process.exit(r.status || 0);
})().catch(e => { console.error('\nAFBRUDT:', e.message); process.exit(1); });
