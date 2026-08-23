// Edge Function: haendelse
// ---------------------------------------------------------------
// Den ENESTE vej til at taelle en visning ('view') eller en kontakt
// ('contact') paa en annonce i listing_stats.
//
// Hvorfor den findes: migration 022_anonym_skrivegulv.sql har frataget anon
// og authenticated retten til at kalde RPC record_listing_event direkte. Foer
// kunne enhver (ogsaa en udlogget) pumpe taelleren op uden graense. Nu gaar
// kaldet gennem denne funktion, der koerer med service_role (og derfor stadig
// maa kalde RPC'en), men foerst spoerger taelleren (taeller_tik): én visning
// pr. IP pr. annonce pr. dag, én kontakt pr. IP pr. annonce pr. dag
// (per-day unique). Gentagelser taelles stille ikke — det er normalt, ikke
// en fejl.
//
// Afsenderens IP laeses fra gatewayen (observeret, ikke oplyst), hashes med
// dagens dato og et salt, og kun hashen bruges som del af noeglen. Raa IP
// logges aldrig og returneres aldrig.
//
// Fejler taelleren (db-fejl), fejler funktionen AABENT og taeller alligevel
// (DECISIONS.md C-004). Fejler selve taellingen, svares stadig 200 med
// { talt: false } — en mislykket taelling maa aldrig blive en fejl for
// brugeren.
//
// Deployes UDEN JWT-verificering (anonyme kaldere) — derfor streng validering
// af body. Klienten (js/supabase-api.js) kalder denne funktion.
//
// Secrets:
//   TAELLER_SALT    — salt til IP-hashen (valgfri; default 'bikerbasen')
//   SITE_URL        — til CORS
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — saettes automatisk

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://bikerbasen.dk';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const svar = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const KINDS = ['view', 'contact'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Daglig saltet sha256 af afsenderens IP. Skifter hver dag, saa hashen ikke
   kan slaas op paa tvaers af dage. Raa IP forlader aldrig denne funktion. */
async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '')
    .split(',')[0].trim() || 'ukendt';
  const salt = Deno.env.get('TAELLER_SALT') ?? 'bikerbasen';
  const dag = new Date().toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${ip}|${dag}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return svar(405, { error: 'Kun POST.' });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return svar(400, { error: 'Ugyldig forespoergsel.' });

    const listing_id = typeof body.listing_id === 'string' ? body.listing_id.trim().toLowerCase() : '';
    const kind = typeof body.kind === 'string' ? body.kind.trim() : '';

    if (!UUID_RE.test(listing_id)) return svar(400, { error: 'Ugyldigt annonce-id.' });
    if (!KINDS.includes(kind)) return svar(400, { error: 'Ugyldig haendelse (view eller contact).' });

    // Taelleren: én pr. IP pr. annonce pr. slags pr. dag. Fejler AABENT.
    const noegle = `${kind}:${listing_id}:${await ipHash(req)}`;
    const { data: ok, error: tikFejl } = await admin.rpc('taeller_tik', { p_noegle: noegle, p_graense: 1 });
    if (tikFejl) {
      console.warn('haendelse: taeller_tik fejlede, taeller alligevel:', tikFejl.message);
    } else if (ok === false) {
      // Set foer i dag fra denne forbindelse — stille ikke talt.
      return svar(200, { talt: false });
    }

    // service_role bypasser revoke'en fra 022.
    const { error } = await admin.rpc('record_listing_event', { p_listing: listing_id, p_kind: kind });
    if (error) {
      console.warn('haendelse: record_listing_event fejlede:', error.message);
      return svar(200, { talt: false });
    }
    return svar(200, { talt: true });
  } catch (e) {
    console.error('haendelse fejlede:', e);
    return svar(200, { talt: false });
  }
});
