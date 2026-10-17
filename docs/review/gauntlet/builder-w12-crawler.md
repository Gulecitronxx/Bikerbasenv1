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

## Fund (maalt 17.10.2026, renderet DOM, Playwright, 3000 ms mellem kald, UA som crawleren)
- robots.txt: `User-agent: * / Allow: /` — `?page=` er ikke forbudt.
- Kategorisiden viser "Motorcykel 3.489", **59 sider a 60 kort** (side 59 har 9). Synlig paginering: "Side: [n] af 59" + Forrige/Naeste (knapper) og `<link rel="next" href="...?page=2">` i head. Ingen "Vis flere", ingen uendelig scroll (60 kort foer og efter scroll).
- `?page=2` og `?page=3` giver 60 kort hver; naeste side kan overlappe (side 3 havde 1 dublet, koerslen 2) fordi listen skubber sig — derfor dedup. `?page=59`: 9 kort, ingen rel=next, Naeste-knap disabled. `?page=60`: HTTP 200, 0 kort, ingen rel=next.
- Kilden bruger selv `api.guloggratis.dk/graphql` — bruges IKKE (internt, udokumenteret; samme begrundelse som mcsyd.yaml).
- Hvorfor DB'en havde ~220 aktive: den havde kun set side 1 (60) over flere koersler; kilden har 3.489.

## Implementeret
- `crawler/paginering.js`: validering (type, max_sider 1..100 haardt loft), `sideUrl`, `gennemgaaSider` (serielt, robots pr. side, stop: tom side / "af N" / ingen rel=next / ingen nye / loft / limit). Resultat har `komplet`.
- `config.js`: validerer `paginering:`. `hent.js`: laeser `antal_sider`/`har_naeste` fra siden; `knap`-session (klik inde i hastighedskoeen, ikke afproevet live); `scroll` = max_sider som loft paa rul.
- `pipeline.js`: `indsamlAnnoncer` returnerer `komplet`+`stopgrunde`; `koerKilde` kalder `markerBorte` KUN hvis komplet (loft, fejlet side, robots-spaerring, listefejl, --limit, --maks-sider => aldrig borte). Afbrydelse kastede allerede foer markerBorte.
- `run.js`: `--maks-sider=N` (delvis koersel; --limit beskaerer foerst bagefter saa pagineringen kan undersoges med faa detaljekald).
- `sources/guloggratis.yaml`: `paginering: sidetal, max_sider 60, naeste link[rel=next], antal_sider "af N"`.
- Tests: `crawler/paginering.test.js` (29, ingen netvaerk, falsk ur). 192 eksisterende crawler-tests + 29 = 221 groenne; `npm test` 1078 groenne (paginering.test.js staar IKKE i package.json endnu — Orchestratoren skal tilfoeje den).

## Toerloeb mod live
`node crawler/run.js --source=guloggratis --limit=10 --maks-sider=3 --toerloeb` (SUPABASE_SERVICE_ROLE_KEY fjernet):
side 1/59: 60 kort, 59 nye (1 kasseret: annonce uden titel) · side 2/59: 60 kort, 60 nye · side 3/59: 60 kort, 58 nye (2 dubletter) → 177 unikke. 3 listesider + 10 detaljesider, ~1 min. Kilden oplyser 59 sider.

## Fuld koersel (ejeren)
`node crawler/run.js --source=guloggratis` (kraever SUPABASE_SERVICE_ROLE_KEY; i PowerShell uden npm). Tid: 59 listesider (~7 s hver, ~7 min) + ~3.489 detaljesider x 3 s = ca. 3 timer. Markerer kun borte, hvis hele kataloget naas (59 sider, "af 59" eller tom side) — ellers logges "ufuldstaendig koersel". Vil man have en del: `--maks-sider=15` (ca. 900 annoncer, ~45 min, markerer ikke borte). Forsvundne markeres foerst efter 3 afsluttede komplette koersler (db.js) og kun hvis fundet >= 60 % af aktive raekker.
