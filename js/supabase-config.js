/* ============================================================
   Supabase-konfiguration
   ------------------------------------------------------------
   Udfyld de to felter herunder med værdierne fra dit Supabase-projekt:
   Dashboard → Project Settings → API

   OM NØGLEN: "anon public"-nøglen er designet til at ligge i frontend-koden
   og er ikke en hemmelighed. Den er kun sikker, fordi Row Level Security i
   schema.sql bestemmer hvad den må. Kør ALTID schema.sql, før du sætter
   siden i luften.

   Brug ALDRIG "service_role"-nøglen her. Den omgår al RLS og giver fuld
   adgang til hele databasen. Den hører kun hjemme på en server.
   ============================================================ */

const SUPABASE_CONFIG = {
  url: 'https://hkcjrwglwurdjnobewzb.supabase.co',
  anonKey: 'sb_publishable_m_ZXdYaGVARkJRyDyyJJhA_9lgcw-t5', // publishable (offentlig) — ikke secret/service_role
};

/* Så længe felterne er tomme, kører siden videre på localStorage-demodata.
   Det gør at sitet aldrig går ned, fordi backenden ikke er sat op endnu. */
function isSupabaseConfigured(){
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}

/* V7: funktionsflag. `beskeder` er FRA, til ejeren har kørt supabase/025_beskeder.sql, deployet besked-notifikation og
   opdateret privatlivspolitikken (docs/review/gauntlet/v7/besked.md). Test: sæt window.BB_FLAGS før dette script. */
if (typeof window !== 'undefined') window.BB_FLAGS = Object.assign({ beskeder: false }, window.BB_FLAGS || {});
function bbFlag(n){ return typeof window !== 'undefined' && !!(window.BB_FLAGS && window.BB_FLAGS[n]); }

/* Henter js/beskeder.js første gang — kun når flaget er sat. ?v= følger dette scripts eget. */
const BB_V = (() => { try { return ((document.currentScript.src.match(/[?&]v=([a-z0-9]+)/) || [])[1]) || ''; } catch (e) { return ''; } })();
let _bbB = null;
function bbIndlaesBeskeder(){
  if (!bbFlag('beskeder')) return Promise.resolve(null);
  if (typeof Beskeder !== 'undefined') return Promise.resolve(Beskeder);
  return _bbB || (_bbB = new Promise(res => {
    const s = document.createElement('script');
    s.src = 'js/beskeder.js' + (BB_V ? '?v=' + BB_V : '');
    s.onload = () => res(typeof Beskeder !== 'undefined' ? Beskeder : null);
    s.onerror = () => { _bbB = null; res(null); };
    document.head.appendChild(s);
  }));
}
