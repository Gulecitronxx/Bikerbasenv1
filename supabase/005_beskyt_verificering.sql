-- Bikerbasen migration 005: laas verificeringsflagene.
-- Koer hele filen i Supabase SQL Editor. Kan koeres igen uden skade.
-- Ren ASCII.
--
-- HULLET: profil-opdateringspolitikken lader en bruger opdatere sin EGEN
-- raekke. RLS bestemmer hvilke RAEKKER, men ikke hvilke FELTER, saa en
-- bruger kunne kalde databasen direkte og saette
--   mitid_verified = true, cvr_verified = true
-- paa sig selv og fremstaa som "Verificeret forhandler" over for koebere,
-- uden nogen rigtig kontrol. Det underminerer hele tillidssystemet.
--
-- Appen skriver aldrig selv disse flag (verificering er kun UI i prototypen),
-- saa det her braekker ingenting. En rigtig verificering skal ske via en
-- betroet serverproces (service_role / Edge Function), som ikke er bundet af
-- kolonne-privilegier.

-- Fjern den generelle opdateringsret og giv den kun tilbage paa de felter en
-- bruger selv maa aendre. mitid_verified, cvr_verified og email_verified er
-- bevidst udeladt.
revoke update on public.profiles from anon;
revoke update on public.profiles from authenticated;

grant update (name, phone, city, is_dealer, company, cvr)
  on public.profiles to authenticated;

-- Kontrollen af HVILKEN raekke (kun ens egen) ligger stadig i RLS-politikken
-- "profil: opdater egen" fra schema.sql. Kolonne-privilegiet her er laget
-- ovenpaa: selv paa sin egen raekke kan brugeren ikke roere flagene.
