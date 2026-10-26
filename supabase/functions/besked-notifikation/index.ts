// Edge Function: besked-notifikation
// ---------------------------------------------------------------
// Kaldes af databasen (trigger on_besked_oprettet, migration 025) naar en ny
// besked er gemt, og (hoejst) hver 30. minut pr. modtager pr. traad. Sender
// EN kort mail til modtageren via Resend: "du har faaet en ny besked om
// <annonce>. Log ind for at laese og svare."
//
// Bevidste valg:
//   * Mailen indeholder ALDRIG beskedteksten og aldrig afsenderens navn,
//     e-mail eller telefon. Brugerindhold i en mail fra vores SPF/DKIM-
//     signerede domaene er en phishing-flade, og modparten skal ikke faa
//     oplysninger, afsenderen ikke selv har valgt at dele. Det eneste
//     brugerstyrede felt er annoncens titel (maerke/model/aarstal), og den
//     bliver HTML-escapet (samme laering som notify-saved-searches).
//   * Kun databasen maa kalde den (x-bb-secret = NOTIFY_SECRET, samme
//     hemmelighed som 013_soegeagenter.sql).
//   * Modtageren kan slaa mails fra (besked_indstillinger.mail_ved_ny_besked,
//     default til). Valget styres i Mine annoncer -> Beskeder.
//   * Mangler RESEND_API_KEY eller NOTIFY_SECRET, sendes intet; beskeden er
//     allerede gemt og kan laeses i Mine annoncer.
//
// Deployes MED JWT-verificering slaaet fra (kaldet kommer fra pg_net uden
// bruger-JWT; hemmeligheden er adgangskontrollen):
//   supabase functions deploy besked-notifikation --no-verify-jwt
//
// Secrets:
//   NOTIFY_SECRET   - samme streng som i migration 013/025
//   RESEND_API_KEY  - fra resend.com (kraever databehandleraftale, se doku)
//   SITE_URL        - https://bikerbasen.dk
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY - saettes automatisk

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://bikerbasen.dk';
const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Et linjeskift i emnelinjen kan injicere mailheadere.
const enLinje = (v: unknown) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();

function mailHtml(titel: string, link: string, erSaelger: boolean) {
  const hvem = erSaelger
    ? 'Nogen har skrevet til dig om din annonce'
    : 'Du har fået et svar på din henvendelse om';
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"></head><body style="margin:0;background:#F7F5F2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C1A18;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border:1px solid #E3DED6;border-radius:14px;overflow:hidden;">
      <div style="padding:20px;">
        <p style="font-size:14px;color:#6B6560;margin:0 0 6px;">${esc(hvem)}</p>
        <h1 style="font-size:20px;margin:0 0 14px;">${esc(titel)}</h1>
        <p style="font-size:15px;line-height:1.5;margin:0 0 18px;">Log ind på Bikerbasen for at læse beskeden og svare. Vi sender ikke selve teksten i mailen.</p>
        <a href="${esc(link)}" style="display:inline-block;background:#C6420E;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;">Læs beskeden</a>
      </div>
    </div>
    <p style="font-size:12px;color:#6B6560;margin:24px 0 0;">
      Du får denne mail, fordi du har en profil på Bikerbasen. Åbn Mine annoncer og vælg Beskeder for at slå mails om nye beskeder fra.
      Kender du ikke afsenderen, kan du blokere eller anmelde tråden dér.
    </p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Kun POST.', { status: 405 });

  if (!NOTIFY_SECRET || req.headers.get('x-bb-secret') !== NOTIFY_SECRET) {
    return new Response('Nej.', { status: 401 });
  }
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY mangler - ingen mails sendt.');
    return new Response(JSON.stringify({ error: 'ikke konfigureret' }), { status: 503 });
  }

  try {
    const { besked_id } = await req.json();
    if (typeof besked_id !== 'string' || !UUID_RE.test(besked_id)) {
      return new Response(JSON.stringify({ error: 'ugyldigt besked_id' }), { status: 400 });
    }

    const { data: b } = await admin.from('beskeder')
      .select('id, afsender_id, samtale_id').eq('id', besked_id).single();
    if (!b) return new Response(JSON.stringify({ error: 'ukendt besked' }), { status: 404 });

    const { data: s } = await admin.from('samtaler')
      .select('id, annonce_titel, seller_id, buyer_id').eq('id', b.samtale_id).single();
    if (!s) return new Response(JSON.stringify({ error: 'ukendt samtale' }), { status: 404 });

    const modtagerId = b.afsender_id === s.seller_id ? s.buyer_id : s.seller_id;
    const erSaelger = modtagerId === s.seller_id;

    // Har modtageren slaaet mails fra? (ingen raekke = til)
    const { data: valg } = await admin.from('besked_indstillinger')
      .select('mail_ved_ny_besked').eq('user_id', modtagerId).maybeSingle();
    if (valg && valg.mail_ved_ny_besked === false) {
      return new Response(JSON.stringify({ sendt: 0, grund: 'frameldt' }), { status: 200 });
    }

    // E-mailen ligger i auth.users, ikke i profiles - og forlader aldrig denne funktion.
    const { data: bruger } = await admin.auth.admin.getUserById(modtagerId);
    const email = bruger?.user?.email;
    if (!email) return new Response(JSON.stringify({ sendt: 0, grund: 'ingen mail' }), { status: 200 });

    const link = `${SITE_URL}/mine-annoncer.html?tab=beskeder&samtale=${encodeURIComponent(s.id)}`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Bikerbasen <noreply@bikerbasen.dk>',
        to: [email],
        subject: `Ny besked om ${enLinje(s.annonce_titel)}`,
        html: mailHtml(String(s.annonce_titel ?? ''), link, erSaelger),
      }),
    });
    if (!r.ok) {
      console.error('Resend afviste:', await r.text());
      return new Response(JSON.stringify({ error: 'mail afvist' }), { status: 502 });
    }
    return new Response(JSON.stringify({ sendt: 1 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('besked-notifikation fejlede:', e);
    return new Response(JSON.stringify({ error: 'fejl' }), { status: 500 });
  }
});
