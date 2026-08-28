// Edge Function: create-checkout
// ---------------------------------------------------------------
// Starter et Stripe Checkout-forloeb for den indloggede bruger og returnerer
// URL'en, som klienten sender brugeren hen til. Selve betalingen sker paa
// Stripes egen hostede side — kortoplysninger roerer aldrig vores kode.
//
// Hemmeligheder (saettes som secrets paa funktionen, ikke i koden):
//   STRIPE_SECRET_KEY   - Stripes hemmelige noegle (sk_test_... / sk_live_...)
//   STRIPE_PRICE_ID     - pris-id'et paa forhandler-abonnementet (price_...)
//   SITE_URL            - fx https://bikerbasen.dk (til retur-links)
// SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY findes automatisk paa funktionen.

import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://bikerbasen.dk';

// service_role bruges KUN til at gemme stripe_customer_id paa profilen. Det er
// en betroet server-kontekst; noeglen forlader aldrig funktionen.
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
    // Identificer brugeren ud fra deres eget JWT (sendt af supabase-js).
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return json({ error: 'Ikke logget ind' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Ikke logget ind' }, 401);

    // Genbrug brugerens Stripe-kunde hvis den findes, ellers opret en.
    // MIGRATION 024: navnet ligger i profiles, kunde-id'et i profiles_private.
    const [{ data: profil }, { data: privat }] = await Promise.all([
      admin.from('profiles').select('name').eq('id', user.id).single(),
      admin.from('profiles_private').select('stripe_customer_id').eq('id', user.id).maybeSingle(),
    ]);

    let customerId = privat?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profil?.name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      // upsert: den private raekke findes ikke noedvendigvis endnu.
      await admin.from('profiles_private')
        .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: 'id' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/mine-annoncer.html?tab=konto&abonnement=ok`,
      cancel_url: `${SITE_URL}/mine-annoncer.html?tab=konto`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'Kunne ikke starte betaling' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
