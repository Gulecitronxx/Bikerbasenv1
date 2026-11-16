# SEO-log

| Dato | Fund | Handling | PR | Næste skridt |
|---|---|---|---|---|
| 2026-11-16 | Routinens sandkasse kunne ikke nå bikerbasen.dk eller Supabase (proxy 403), så live-tjek af sitemap/robots og lagerfriskhed ('bekræftet senest') kunne ikke udføres. `node scripts/build.js` gav SEO_FALD-advarsler (build-listing-pages, build-brand-pages, build-facet-pages, build-srp sprunget over: "fetch failed") — netværksfejl, ikke et reelt lagerfald. `node scripts/seo-audit.js` på de committede sider: 105 sider, 78 indekserbare, 0 fund. Guide 3 (`scripts/guides-data.js`) har allerede teksten om at syn ved ejerskifte ophæves 1. jan 2027 (BEK 259/2026); ikke ændret. | Ingen indholdsændring (SEO_FALD-regel: stop). Kun denne logfil. | (denne PR) | Giv routinens miljø netværksadgang til bikerbasen.dk og Supabase (anon), eller acceptér at kun statisk audit køres. Efter 1. jan 2027: omskriv guide 3 og tjek andre datobundne regler (kilde: Færdselsstyrelsen/retsinformation.dk). |
