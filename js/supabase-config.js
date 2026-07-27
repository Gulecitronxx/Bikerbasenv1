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
