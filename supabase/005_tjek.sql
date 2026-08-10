-- Tjek at verificeringsflagene er laast. Kun laesning. Ren ASCII.
-- Viser hvilke kolonner rollen 'authenticated' maa opdatere paa profiles.
-- Forventet: name, phone, city, is_dealer, company, cvr — og INGEN af de tre
-- *_verified kolonner.

select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'profiles'
  and grantee = 'authenticated'
  and privilege_type = 'UPDATE'
order by column_name;
