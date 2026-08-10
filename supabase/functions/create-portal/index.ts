// Edge Function: create-portal
// ---------------------------------------------------------------
// Aabner Stripes kundeportal for den indloggede forhandler, saa de selv kan
// opsige abonnementet, skifte betalingskort og se kvitteringer. Vi laver bare
// en portal-session og sender URL'en tilbage; alt det oevrige sker paa Stripe.
//
// Secrets (samme som de andre funktioner):
//   STRIPE_SECRET_KEY, SITE_URL — og SUPABASE_* automatisk.

import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://bikerbasen.dk';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': SITE_URL,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Ikke logget ind' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Ikke logget ind' }, 401);

    // Find brugerens Stripe-kunde. Uden en er der intet abonnement at styre.
    const { data: profil } = await admin
      .from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    if (!profil?.stripe_customer_id) {
      return json({ error: 'Intet abonnement fundet' }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profil.stripe_customer_id,
      return_url: `${SITE_URL}/mine-annoncer.html?tab=konto`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'Kunne ikke aabne kundeportal' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
