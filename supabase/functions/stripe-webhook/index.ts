// Edge Function: stripe-webhook
// ---------------------------------------------------------------
// Stripe kalder denne funktion, naar noget sker med et abonnement (betalt,
// fornyet, opsagt). Vi verificerer at kaldet FAKTISK kommer fra Stripe med
// signaturen, og saetter derefter brugerens plan i databasen.
//
// Det er den ENESTE vej til at aendre plan/abonnement-felterne: de er laast
// for almindelige brugere (migration 005/006), og kun service_role — som kun
// findes her paa serveren — kan skrive dem. En bruger kan altsaa ikke give
// sig selv forhandler-status.
//
// Secrets:
//   STRIPE_SECRET_KEY        - sk_test_... / sk_live_...
//   STRIPE_WEBHOOK_SECRET    - whsec_... (fra Stripe, naar webhooken oprettes)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY - automatisk.
//
// VIGTIGT: denne funktion skal deployes UDEN JWT-tjek (--no-verify-jwt),
// for Stripe sender ikke et Supabase-login med. Signaturen er beskyttelsen.

import Stripe from 'https://esm.sh/stripe@16?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Saet planen ud fra abonnementets tilstand.
async function opdaterPlan(customerId: string, opts: { userId?: string; status?: string; periodEnd?: number | null }) {
  const aktiv = opts.status === 'active' || opts.status === 'trialing';
  const patch: Record<string, unknown> = {
    plan: aktiv ? 'dealer' : 'free',
    subscription_status: opts.status ?? null,
    subscription_period_end: opts.periodEnd ? new Date(opts.periodEnd * 1000).toISOString() : null,
    stripe_customer_id: customerId,
  };
  // Find profilen enten paa user-id (foerste betaling) eller paa kunde-id.
  const q = admin.from('profiles').update(patch);
  if (opts.userId) await q.eq('id', opts.userId);
  else await q.eq('stripe_customer_id', customerId);
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, WEBHOOK_SECRET);
  } catch (e) {
    console.error('Ugyldig signatur:', (e as Error).message);
    return new Response('Ugyldig signatur', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await opdaterPlan(s.customer as string, {
          userId: s.client_reference_id ?? undefined,
          status: sub.status,
          periodEnd: sub.current_period_end,
        });
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await opdaterPlan(sub.customer as string, {
          status: sub.status,
          periodEnd: sub.current_period_end,
        });
        break;
      }
    }
  } catch (e) {
    console.error('Fejl i haandtering:', e);
    return new Response('Fejl', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
