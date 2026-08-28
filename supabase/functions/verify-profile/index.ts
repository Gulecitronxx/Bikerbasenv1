// Edge Function: verify-profile
// ---------------------------------------------------------------
// Det ENESTE sted verificeringsflagene paa en profil kan saettes.
//
// Hvorfor den findes: migration 005_beskyt_verificering.sql har frataget
// baade anon og authenticated retten til at opdatere mitid_verified,
// cvr_verified og email_verified. En bruger kan altsaa ikke give sig selv et
// "Verificeret"-maerke ved at kalde databasen direkte fra browseren — heller
// ikke paa sin egen raekke. Denne funktion koerer med service_role og er
// dermed ikke bundet af kolonne-privilegierne. Derfor er den ogsaa det sted,
// hvor der SKAL vaere en rigtig kontrol bag hvert flag.
//
// Hvem er brugeren: udledes af JWT'et i Authorization-headeren. Body'en maa
// aldrig kunne fortaelle os hvem afsenderen er — saa kunne enhver verificere
// enhver.
//
// Status lige nu: ingen udbyder er koblet paa, saa funktionen svarer 503 med
// en aerlig besked i stedet for at lade som om. Se supabase/VERIFICERING.md
// for hvad der skal saettes for hver enkelt del.
//
// Secrets:
//   CVR_API_TOKEN   — token til cvrapi.dk (valgfri; uden den er cvr slaaet fra)
//   SITE_URL        — til CORS
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — saettes automatisk

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://bikerbasen.dk';
const CVR_API_TOKEN = Deno.env.get('CVR_API_TOKEN') ?? '';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const svar = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

/* Slaar CVR-nummeret op i det danske virksomhedsregister og kontrollerer, at
   virksomheden findes, er aktiv, og at navnet ligner det, brugeren har
   oplyst. Returnerer null hvis den ikke kan verificeres. */
async function slaaCvrOp(cvr: string, oplystNavn: string){
  if (!/^\d{8}$/.test(cvr)) return { ok: false, grund: 'CVR-nummeret skal være 8 cifre.' };
  if (!CVR_API_TOKEN) return { ok: false, grund: 'CVR-opslag er ikke konfigureret.', ikkeOpsat: true };

  const r = await fetch(`https://cvrapi.dk/api?search=${encodeURIComponent(cvr)}&country=dk&token=${CVR_API_TOKEN}`, {
    headers: { 'User-Agent': 'Bikerbasen/1.0 (https://bikerbasen.dk)' },
  });
  if (!r.ok) return { ok: false, grund: 'Kunne ikke naa CVR-registret lige nu. Prøv igen senere.' };

  const d = await r.json();
  if (d.error) return { ok: false, grund: 'Vi kunne ikke finde en virksomhed med det CVR-nummer.' };
  // Ophoerte og tvangsoploeste virksomheder maa ikke give et gyldigt maerke.
  if (d.enddate) return { ok: false, grund: 'Virksomheden er ophørt ifølge CVR-registret.' };

  // Navnet skal ligne. Ikke identisk — folk skriver "ApS" og "A/S" forskelligt
  // — men de foerste ord skal passe, ellers er det en fremmed virksomhed.
  const rens = (x: string) => (x || '').toLowerCase().replace(/[^a-z0-9æøå ]/g, '').replace(/\b(aps|as|a\/s|ivs|ks|is)\b/g, '').trim();
  const a = rens(d.name), b = rens(oplystNavn);
  if (a && b && !a.startsWith(b.split(' ')[0]) && !b.startsWith(a.split(' ')[0])){
    return { ok: false, grund: `CVR-nummeret tilhører "${d.name}", ikke det virksomhedsnavn du har oplyst.` };
  }
  return { ok: true, navn: d.name };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return svar(405, { error: 'Kun POST.' });

  try {
    // Hvem er afsenderen? Kun JWT'et bestemmer det.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return svar(401, { error: 'Log ind for at verificere din profil.' });

    const { data: { user }, error: authFejl } = await admin.auth.getUser(jwt);
    if (authFejl || !user) return svar(401, { error: 'Din session er udløbet. Log ind igen.' });

    const { kind } = await req.json().catch(() => ({ kind: null }));

    if (kind === 'cvr'){
      // MIGRATION 024: cvr ligger i profiles_private, company/is_dealer i profiles.
      const [{ data: profil }, { data: privat }] = await Promise.all([
        admin.from('profiles').select('company, is_dealer').eq('id', user.id).single(),
        admin.from('profiles_private').select('cvr').eq('id', user.id).maybeSingle(),
      ]);
      if (!profil?.is_dealer) return svar(400, { error: 'CVR-verificering gælder kun forhandlerkonti.' });

      const res = await slaaCvrOp(privat?.cvr ?? '', profil.company ?? '');
      if (!res.ok){
        return svar(res.ikkeOpsat ? 503 : 400, { error: res.grund });
      }
      const { error } = await admin.from('profiles')
        .update({ cvr_verified: true }).eq('id', user.id);
      if (error) return svar(500, { error: 'Kunne ikke gemme verificeringen.' });
      return svar(200, { ok: true, virksomhed: res.navn });
    }

    // Telefon og MitID har endnu ingen udbyder. Sig det, i stedet for at
    // returnere noget der ligner en succes.
    if (kind === 'phone') return svar(503, { error: 'SMS-verificering er ikke sat op endnu.' });
    if (kind === 'mitid') return svar(503, { error: 'MitID-verificering er ikke sat op endnu.' });

    return svar(400, { error: 'Ukendt verificeringstype.' });
  } catch (e) {
    console.error('verify-profile fejlede:', e);
    return svar(500, { error: 'Noget gik galt.' });
  }
});
