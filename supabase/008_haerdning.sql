-- Bikerbasen migration 008: input-haerdning (defense-in-depth).
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
-- Ren ASCII.
--
-- BAGGRUND
-- Den primaere XSS-beskyttelse er output-escaping i frontend (alle
-- brugerfelter koeres gennem escapeHTML, foer de saettes via innerHTML).
-- Denne migration er LAGET UNDER: server-haandhaevet validering, saa selv
-- et direkte API-kald (uden om formularen) ikke kan gemme vaerdier der er
-- aabenlyst forkerte eller uforholdsmaessigt store.
--
-- To ting:
--   1. 'condition' skal vaere en af de kendte vaerdier (som 'type' allerede er).
--   2. Fri-tekst-felterne faar rimelige laengdegraenser, saa en angriber ikke
--      kan proppe store nyttelaster ind (begraenser baade misbrug og
--      angrebsfladen, hvis et felt en dag skulle blive vist uescaped).
--
-- Alle constraints er navngivne, saa de kan droppes og gendannes idempotent.

-- ---------- listings: 'condition' som kendt vaerdi ----------
alter table public.listings drop constraint if exists listings_condition_chk;
alter table public.listings add constraint listings_condition_chk
  check (condition in ('Som ny', 'God stand', 'Brugt', 'Defekt/Projekt'));

-- ---------- listings: laengdegraenser paa fri tekst ----------
alter table public.listings drop constraint if exists listings_text_len_chk;
alter table public.listings add constraint listings_text_len_chk check (
      char_length(brand)                    <= 40
  and char_length(model)                    <= 60
  and char_length(coalesce(registration,'')) <= 40
  and char_length(coalesce(afgift,''))       <= 40
  and char_length(coalesce(postnr,''))       <= 8
  and char_length(coalesce(city,''))         <= 80
  and char_length(coalesce(region,''))       <= 40
  and char_length(description)              <= 5000
);

-- ---------- profiles: laengdegraenser paa fri tekst ----------
-- Navn/firma/by vises paa saelgerprofiler og annoncer; en graense holder
-- felterne rimelige og begraenser misbrug.
alter table public.profiles drop constraint if exists profiles_text_len_chk;
alter table public.profiles add constraint profiles_text_len_chk check (
      char_length(name)                 <= 80
  and char_length(coalesce(company,'')) <= 100
  and char_length(coalesce(city,''))    <= 80
  and char_length(coalesce(phone,''))   <= 30
  and char_length(coalesce(cvr,''))     <= 20
);
