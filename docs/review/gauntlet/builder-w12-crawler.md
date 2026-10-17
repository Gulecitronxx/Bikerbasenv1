# Builder w12-crawler — paginering af Gul og Gratis

## Acceptkriterier (sat FOER koden)
1. Den lovlige vej til side 2..N findes i renderet DOM / synlig paginering og dokumenteres med maalinger (ikke et internt API).
2. Generisk `paginering:` i kilde-YAML (type sidetal|knap|scroll, max_sider, stop_ved_tom_side), valideret i config.js med et absolut loft; ingen kildespecifik kode.
3. Alle sidekald gaar gennem hastighed.js (serielt, >= crawl_delay_ms); robots.txt tjekkes for HVER side-URL.
4. Dedup paa kilde_annonce_id paa tvaers af sider.
5. Vaernet: kun en KOMPLET gennemgang (sidste side naaet / tom side / ingen "naeste") maa kalde markerBorte. Max_sider-loft, --limit, fejlet side, afbrydelse eller robots-spaerring => komplet=false => intet markeres borte.
6. crawler/paginering.test.js (node:test, ingen netvaerk, fake clock): rækkefølge, stop ved tom side, stop ved max_sider, dedup, >= 2000 ms mellem kald, delvis koersel markerer ikke borte. Eksisterende 192 crawler-tests forbliver groenne; node --check + npm test groent.
7. Toerloeb mod live (max 5 listesider, max 10 detaljesider, 3000 ms) viser side 2+ og antal sider i kilden. Aldrig uden --toerloeb, aldrig med SUPABASE_SERVICE_ROLE_KEY.
8. CLAUDE.md's seks regler uaendrede.
