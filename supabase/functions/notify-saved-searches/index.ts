// Edge Function: notify-saved-searches
// ---------------------------------------------------------------
// Kaldes af databasen (trigger on_listing_active, migration 013) i det
// sekund en annonce bliver aktiv. Finder de gemte soegninger den matcher,
// og sender mail via Resend.
//
// Hvorfor den findes: soegeagenten lovede "vi giver besked" og gjorde
// ingenting. Paa et site uden lager er den den eneste maade at fange en
// interesseret koeber paa i stedet for at tabe dem.
//
// Matchningen skal foelge js/search.js' getFilteredListings. Goer den ikke
// det, faar folk mails om motorcykler de har filtreret fra — hurtigste vej
// til en afmelding. Parameternavnene er dem currentQueryString() skriver.
//
// Secrets:
//   NOTIFY_SECRET   — samme streng som i migration 013
//   RESEND_API_KEY  — fra resend.com
//   SITE_URL        — https://bikerbasen.dk

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://bikerbasen.dk';
const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const tal = (n: number) => new Intl.NumberFormat('da-DK').format(n);

/* Saelgerens egne felter (brand, model, city) gik uescaped ind i mailens HTML
   og i emnelinjen. En annonce med model sat til
     </h1><a href="https://falsk-bikerbasen.dk/login">Bekraeft din konto</a><h1>
   ville sende et phishing-link ud til ALLE med en matchende soegeagent — fra
   vores eget SPF/DKIM-signerede domaene, i vores eget layout. Der koeres ikke
   scripts i mailklienter, saa det er ikke XSS; det er vaerre, fordi mailen ser
   aegte ud. Felterne er laengdebegraensede i 008, men laengde er ingen
   beskyttelse mod markup. */
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/* Matcher én annonce mod én gemt soegning.

   Bevidst konservativ: kender vi ikke et filter, lader vi det passere frem
   for at kaste annoncen vaek. En mail for meget er til at leve med; en
   manglende mail om praecis den motorcykel man ventede paa, er ikke. */
function matcher(l: Record<string, any>, qs: string): boolean {
  const p = new URLSearchParams(qs);
  const liste = (navn: string) => (p.get(navn) || '').split(',').filter(Boolean);
  const tot = (navn: string) => { const v = p.get(navn); return v == null || v === '' ? null : Number(v); };

  const fritekst = (p.get('q') || '').trim().toLowerCase();
  if (fritekst && !`${l.brand} ${l.model}`.toLowerCase().includes(fritekst)) return false;

  const iListe = (navn: string, vaerdi: unknown) => {
    const v = liste(navn);
    return v.length === 0 || v.includes(String(vaerdi));
  };
  if (!iListe('types', l.type)) return false;
  if (!iListe('brands', l.brand)) return false;
  if (!iListe('model', l.model)) return false;
  if (!iListe('regions', l.region)) return false;
  if (!iListe('conditions', l.condition)) return false;
  if (!iListe('braendstof', l.fuel)) return false;
  if (!iListe('traek', l.drive)) return false;
  if (!iListe('farve', l.color)) return false;
  if (!iListe('service', l.service_historik)) return false;
  if (!iListe('cyl', l.cylinders)) return false;

  const udstyr = liste('udstyr');
  if (udstyr.length){
    const har: string[] = Array.isArray(l.equipment) ? l.equipment : [];
    if (!udstyr.every(u => har.includes(u))) return false;
  }

  const graense = (navn: string, vaerdi: unknown, retning: 'min' | 'max') => {
    const g = tot(navn);
    if (g == null) return true;
    const v = Number(vaerdi);
    if (!Number.isFinite(v)) return true;   // ukendt felt spaerrer ikke
    return retning === 'min' ? v >= g : v <= g;
  };
  if (!graense('priceMin', l.price, 'min')) return false;
  if (!graense('priceMax', l.price, 'max')) return false;
  if (!graense('yearMin', l.year, 'min')) return false;
  if (!graense('yearMax', l.year, 'max')) return false;
  if (!graense('kmMax', l.km, 'max')) return false;
  if (!graense('ccmMin', l.ccm, 'min')) return false;
  if (!graense('ccmMax', l.ccm, 'max')) return false;
  if (!graense('hkMin', l.power, 'min')) return false;
  if (!graense('hkMax', l.power, 'max')) return false;

  if (p.get('billeder') === '1' && !(l.photos?.length)) return false;
  if (p.get('dealer') === '1' && !l.seller?.is_dealer) return false;

  return true;
}

function mailHtml(l: Record<string, any>, sti: string, afmeld: string){
  const titel = esc(`${l.brand} ${l.model}`);
  return `<!doctype html><html lang="da"><body style="margin:0;background:#F7F5F2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1A18;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <p style="font-size:14px;color:#6B6560;margin:0 0 16px;">Der er kommet en motorcykel, der matcher din søgeagent.</p>
    <div style="background:#fff;border:1px solid #E3DED6;border-radius:14px;overflow:hidden;">
      <div style="padding:18px;">
        <h1 style="font-size:20px;margin:0 0 6px;">${titel}</h1>
        <p style="font-size:22px;font-weight:700;color:#C6420E;margin:0 0 10px;">${tal(l.price)} kr.</p>
        <p style="font-size:14px;color:#6B6560;margin:0 0 16px;">${esc(l.year)} · ${tal(l.km)} km · ${tal(l.ccm)} ccm${l.city ? ' · ' + esc(l.city) : ''}</p>
        <a href="${SITE_URL}/${sti}" style="display:inline-block;background:#C6420E;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;">Se annoncen</a>
      </div>
    </div>
    <p style="font-size:12px;color:#6B6560;margin:24px 0 0;">
      Du får denne mail, fordi du har gemt en søgeagent på Bikerbasen.
      <a href="${afmeld}" style="color:#6B6560;">Afmeld denne søgeagent</a>.
    </p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Kun POST.', { status: 405 });

  // Kun databasen maa kalde den. Uden det kunne enhver faa os til at sende
  // mails i vores eget navn.
  if (!NOTIFY_SECRET || req.headers.get('x-bb-secret') !== NOTIFY_SECRET){
    return new Response('Nej.', { status: 401 });
  }
  if (!RESEND_API_KEY){
    console.error('RESEND_API_KEY mangler — ingen mails sendt.');
    return new Response(JSON.stringify({ error: 'ikke konfigureret' }), { status: 503 });
  }

  try {
    const { listing_id } = await req.json();

    const { data: l } = await admin.from('listings')
      .select('*, seller:public_profiles!listings_seller_id_fkey(*), photos:listing_photos(storage_path)')
      .eq('id', listing_id).single();
    if (!l) return new Response(JSON.stringify({ error: 'ukendt annonce' }), { status: 404 });

    // Kun agenter der ikke allerede har faaet netop denne annonce.
    const { data: agenter } = await admin.from('saved_searches')
      .select('id, user_id, query, label, unsubscribe_token')
      .eq('notify', true);
    const { data: sendt } = await admin.from('search_notifications')
      .select('saved_search_id').eq('listing_id', listing_id);
    const alleredeSendt = new Set((sendt || []).map(s => s.saved_search_id));

    const traef = (agenter || []).filter(a => !alleredeSendt.has(a.id) && matcher(l, a.query));
    if (!traef.length) return new Response(JSON.stringify({ sendt: 0 }), { status: 200 });

    // Annoncens adresse: den statiske side hvis den findes, ellers den
    // dynamiske. Byggekaeden laver den statiske ved naeste byg.
    const sti = `annonce.html?id=${l.id}`;

    let antal = 0;
    for (const a of traef){
      // E-mailen ligger i auth.users, ikke i profiles.
      const { data: bruger } = await admin.auth.admin.getUserById(a.user_id);
      const email = bruger?.user?.email;
      if (!email) continue;

      const afmeld = `${SITE_URL}/afmeld.html?token=${a.unsubscribe_token}`;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Bikerbasen <noreply@bikerbasen.dk>',
          to: [email],
          // Emnelinjen taaler ikke markup, men et linjeskift kan injicere headere.
          subject: `${String(l.brand ?? '').replace(/[
]/g, ' ')} ${String(l.model ?? '').replace(/[
]/g, ' ')} — ${tal(l.price)} kr.`,
          html: mailHtml(l, sti, afmeld),
        }),
      });
      if (!r.ok){
        console.error('Resend afviste:', await r.text());
        continue;
      }
      await admin.from('search_notifications').insert({ saved_search_id: a.id, listing_id: l.id });
      antal++;
    }

    return new Response(JSON.stringify({ sendt: antal, matchede: traef.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('notify-saved-searches fejlede:', e);
    return new Response(JSON.stringify({ error: 'fejl' }), { status: 500 });
  }
});
