-- Bikerbasen migration 007: gratis, ubegraenset adgang for alle (midlertidigt).
-- Koer i Supabase SQL Editor. Ren ASCII. Kan koeres igen uden skade.
--
-- Fjerner annoncegraensen fra 006, saa baade private og forhandlere kan
-- oprette ubegraenset. Sat mens betalingsmodellen endnu ikke er valgt.
--
-- Klienten har en tilsvarende kontakt: FRI_ADGANG i js/data.js.
--
-- SAADAN AKTIVERES ABONNEMENTET IGEN:
--   1. saet FRI_ADGANG = false i js/data.js
--   2. koer supabase/006_forhandler_abonnement.sql igen (genskaber triggeren)
--
-- Abonnement-kolonnerne og funktionerne fra 006 bevares (uroerte) — det er
-- KUN graensen, der slaas fra her.

drop trigger if exists trg_listing_limit on public.listings;
