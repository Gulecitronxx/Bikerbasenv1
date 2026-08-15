-- 012: hold profiles.email_verified i sync med den faktiske bekraeftelse
-- ---------------------------------------------------------------
-- Fejlen: handle_new_user() saetter email_verified ud fra
-- new.email_confirmed_at — men den trigger koerer AFTER INSERT paa
-- auth.users, altsaa i det oejeblik brugeren oprettes. Der er
-- email_confirmed_at altid NULL, fordi bekraeftelseslinket foerst klikkes
-- bagefter. Kolonnen blev derfor sat til false og aldrig roert igen.
--
-- Resultat: hver eneste profil stod som ubekraeftet for evigt, ogsaa efter
-- at brugeren havde klikket i mailen. Det saas ikke foer nu, fordi ingen
-- bekraeftelsesmail naaede frem (Supabases indbyggede mailtjeneste sender
-- 2 i timen) — saa ingen naaede at bekraefte og opdage det.
--
-- Loesningen: en trigger mere, paa UPDATE, der fanger overgangen fra
-- ubekraeftet til bekraeftet.

create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Kun ved selve overgangen. Uden old-tjekket ville enhver opdatering af
  -- auth.users skrive til profiles igen og igen.
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- Ret de profiler der allerede har bekraeftet, mens fejlen var der.
update public.profiles p
set email_verified = true
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and p.email_verified = false;

-- Tjek bagefter — de to tal skal vaere ens:
--   select count(*) from auth.users where email_confirmed_at is not null;
--   select count(*) from public.profiles where email_verified;
