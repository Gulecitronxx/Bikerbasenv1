// Edge Function: indberet
// ---------------------------------------------------------------
// Den ENESTE vej for en udlogget til at oprette en indberetning (DSA
// notice-and-action) i public.reports.
//
// Hvorfor den findes: migration 022_anonym_skrivegulv.sql har frataget anon
// retten til at INSERTe direkte i reports. Kanalen for udloggede skal dog
// blive ved med at vaere aaben — en notice-and-action-kanal, der kraever
// login, er ikke en notice-and-action-kanal. Saa i stedet for en doer uden
// loft gaar skrivningen nu gennem denne funktion, der koerer med service_role
// og derfor kan skrive, men foerst spoerger taelleren (taeller_tik) om denne
// forbindelse har indberettet mere end 10 gange i dag. Kun DEN IP rammes;
// alle andre kan stadig anmelde.
//
// Afsenderens IP laeses fra gatewayen (observeret, ikke oplyst), hashes med
// dagens dato og et salt, og kun hashen bruges som noegle. Raa IP logges
// aldrig og returneres aldrig.
//
// Fejler taelleren (db-fejl), fejler funktionen AABENT: indberetningen tages
// imod alligevel. En notice-and-action-kanal maa ikke lukke, fordi et
// hjaelpebord er nede (DECISIONS.md C-004).
//
// Deployes UDEN JWT-verificering (anonyme kaldere) — derfor streng validering
// af body. Indloggede brugere bruger ikke denne funktion; de indsaetter
// direkte med reporter_id = auth.uid().
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

const TARGET_TYPES = ['listing', 'profile'];
const REASONS = ['svindel', 'stjaalet', 'falsk', 'upassende', 'andet'];
const GRAENSE_PR_DAG = 10;

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

    const target_type = typeof body.target_type === 'string' ? body.target_type.trim() : '';
    const target_id = typeof body.target_id === 'string' ? body.target_id.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim()
      : (body.comment == null ? '' : null);

    if (!TARGET_TYPES.includes(target_type)) return svar(400, { error: 'Ugyldig type (listing eller profile).' });
    if (!target_id || target_id.length > 64) return svar(400, { error: 'Ugyldigt id paa det indberettede.' });
    if (!REASONS.includes(reason)) return svar(400, { error: 'Ugyldig aarsag.' });
    if (comment === null || comment.length > 2000) return svar(400, { error: 'Kommentaren maa hoejst vaere 2000 tegn.' });

    // Taelleren: hoejst 10 indberetninger pr. IP pr. dag. Fejler AABENT.
    const noegle = `report:${await ipHash(req)}`;
    const { data: ok, error: tikFejl } = await admin.rpc('taeller_tik', { p_noegle: noegle, p_graense: GRAENSE_PR_DAG });
    if (tikFejl) {
      console.warn('indberet: taeller_tik fejlede, tager imod alligevel:', tikFejl.message);
    } else if (ok === false) {
      return svar(429, { error: 'For mange indberetninger fra denne forbindelse i dag. Proev igen i morgen.' });
    }

    const { error } = await admin.from('reports').insert({
      reporter_id: null,     // anonym kanal — indloggede skriver selv med eget id
      target_type,
      target_id,
      reason,
      comment,
    });
    if (error) {
      console.error('indberet: insert fejlede:', error.message);
      return svar(500, { error: 'Indberetningen kunne ikke gemmes.' });
    }
    return svar(201, { ok: true });
  } catch (e) {
    console.error('indberet fejlede:', e);
    return svar(500, { error: 'Noget gik galt.' });
  }
});
