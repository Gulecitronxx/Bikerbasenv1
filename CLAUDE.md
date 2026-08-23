# Bikerbasen

## BikerBasen — ikke-forhandlelige regler

Projektet er en aggregator for danske MC-annoncer. Vi hoster ikke annoncer, vi indekserer
dem og linker til kilden.

Følgende må ALDRIG ændres uden eksplicit accept fra mig, uanset hvad en review- eller
optimeringsskill foreslår:

1. robots.txt og Crawl-delay respekteres pr. domæne.
2. Vi gemmer kun: titel, mærke, model, årgang, km, ccm, pris, postnummer, sælgertype,
   ét thumbnail, kilde-domæne, deeplink, maks. 200 tegns uddrag. Ingen fuld annoncetekst,
   ingen billedgallerier, ingen kontaktoplysninger.
3. Rate limit maks. 1 request/2 sek. pr. domæne, ingen parallelle requests mod samme domæne.
4. Identificerbar User-Agent med kontakt-URL.
5. Opt-out pr. kilde skal virke med ét flag.
6. Claim af en annonce kræver verificeret ejerskab (domæne-match på e-mail, kode på egen
   side, eller manuel godkendelse). Aldrig claim uden verifikation.

Baggrund: EU-databaseret (ophavsretslovens §71) og kildernes vilkår. Disse regler er
juridiske, ikke tekniske præferencer.

### Hvor reglerne står i koden

Efterprøvet 17.08.2026. Det her afsnit er ikke en del af reglerne — det er en
optegnelse af, hvor de håndhæves, så den næste kan finde spærren i stedet for at
lede. En regel, koden ikke bakker op, er en hensigt.

| Regel | Håndhæves i | Status |
|---|---|---|
| 1 robots.txt | `crawler/robots.js` — hentes og parses efter RFC 9309 ved hver kørsel, pr. **vært** (ikke pr. domænefelt: guloggratis.yaml siger `guloggratis.dk`, men henter fra `www.guloggratis.dk`) | håndhævet |
| 1 Crawl-delay | `crawler/robots.js` læser `Crawl-delay` og hæver forsinkelsen, hvis kilden beder om mere | håndhævet |
| 2 feltliste | `crawler/db.js` felt-whitelist + `eksterne_annoncer`s kolonner. `uddrag` sættes til `null` i `crawler/parse.js:294` — vi gemmer altså **slet ingen** annoncetekst, hvilket er strengere end reglen | håndhævet, strengere |
| 2 ingen kontaktoplysninger | `crawler/normalize.js` `fjernPersonoplysninger()` fjerner telefonnumre, mails og adresser fra titlen, før den gemmes | håndhævet |
| 3 rate limit | `crawler/hastighed.js`, kø pr. domæne. Databasen har `check (crawl_delay_ms >= 2000)` i `supabase/014_aggregator.sql` | håndhævet i to lag |
| 3 ingen parallelle | `crawler/hastighed.js` serialiserer pr. domæne; `crawler/hastighed.test.js` låser det | håndhævet |
| 4 User-Agent | `crawler/hent.js:22` — `Bikerbasen-indeksering/1.0 (+https://bikerbasen.dk/om-indeksering)` | **halvt** — se nedenfor |
| 5 opt-out | `aktiv: false` i `sources/<domaene>.yaml`. `crawler/config.js` springer kilden over | håndhævet |
| 6 claim | `krav`s INSERT-politik kræver `status='afventer'`, `behandlet_af is null`, `behandlet is null` (migration 018). Godkendelse kan kun ske via `service_role` | **delvist** — se nedenfor |

**Regel 4 er halvt indfriet.** User-Agent'en identificerer os korrekt, men
`https://bikerbasen.dk/om-indeksering` svarer **404**. En forhandler, der ser trafikken i
sin log og følger linket, finder ingenting — altså er kontaktvejen en påstand, ikke en vej.
Siden skal skrives, eller URL'en skal pege et sted hen, der findes.

**Regel 6 er delvist indfriet.** Selvgodkendelse er lukket i databasen, og der kan kun være
ét godkendt krav pr. annonce. Men *verifikationen* — domæne-match på e-mail, kode på egen
side, manuel godkendelse — er ikke bygget endnu, og frontenden bruger slet ikke `krav`
(nul træf i `js/`). Reglen holder, fordi ingen kan claime overhovedet; den er ikke afprøvet
af en rigtig claim.

**Til den, der vil ændre noget her:** spærrerne i `crawler/config.js` er ikke stil. De
nægter at køre en kilde uden `tilladelse_modtaget` OG en dato for den. Et review, der
foreslår at fjerne en kontrol, fordi den "aldrig fejler", har misforstået, hvad den er til.

## Arbejdsgang

Ét review-loop med tre roller ligger i `.claude/agents/`: `designer`, `critic` og `dev`.
Findings, beslutninger og runde-logs står i `docs/review/`. `dev` er den eneste rolle, der
må skrive produktionskode, og en afvist finding kræver en skriftlig begrundelse med måling
i `docs/review/DECISIONS.md` — ikke bare et ord i en tabel.

Verifikationsgaten før hver commit:

```
for f in js/*.js crawler/*.js scripts/*.js; do node --check "$f" || exit 1; done
npm test
node scripts/build.js
node scripts/udgiv.js
```

`scripts/udgiv.js` bygger `_site/` fra en allowlist og afbryder, hvis en udgivet side
peger på en fil, der ikke kom med. Deployet udgiver `_site/`, ikke repoet — `supabase/`,
`crawler/`, `sources/`, `work/`, `docs/` og `.claude/` hører ikke på et handelsdomæne.
