# Discovery — Bikerbasen

Kortlægning af Claude Code-opsætningen og af kodebasen, lavet uden at ændre
noget. Dato: 2026-08-19. Alt under "Faktisk tilstand" er verificeret i denne
session — ikke antaget ud fra kommentarer i koden.

**Vigtigste konstatering før resten:** brugerens oplæg til denne opgave
antog "nul live annoncer". Det er forkert. Produktionsdatabasen har **392
aktive annoncer** lige nu — men **0** af dem er brugerens egne
("gratis for private"-tilbuddet har endnu ingen brugere). Se afsnittet
"Faktisk tilstand" for bevis og kildehenvisning.

---

## 1. Setup

### 1.1 MCP-servere

| Server | Værktøjer (udvalgt, ved navn) | Relevans for Bikerbasen | Vurdering |
|---|---|---|---|
| **Claude_Browser** (indbygget preview-browser) | `navigate`, `computer`, `read_page`, `get_page_text`, `read_console_messages`, `read_network_requests`, `preview_start/stop/logs/list`, `resize_window`, faner | Direkte koblet til `.claude/launch.json` (`bikerbasen` → `python scripts/dev-server.py`, port 8532). Naturligt førstevalg til at se siden køre. | Behold — er allerede projektets indgang. |
| **claude-in-chrome** | `navigate`, `computer`, `find`, `read_page`, `read_console_messages`, `read_network_requests`, faner, `javascript_tool` m.fl. | Samme opgave som Claude_Browser (styring af en Chrome-fane). | **Overlappende** med Claude_Browser — vælg én, ikke begge, i en given arbejdsprompt. |
| **playwright** (MCP) | `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_network_requests`, `browser_evaluate`, `browser_run_code_unsafe` m.fl. | Playwright er allerede et projektafhængighed (`package.json`) og formentlig det, `crawler/hent.js` bruger til selve crawlet. MCP-udgaven er endnu en tredje browserstyring. | **Overlappende** med de to ovenfor til almindelig QA. Har relevans kun hvis en prompt specifikt skal efterligne crawlerens egen renderingsvej. |
| **plugin:supabase:supabase** (id `33178c79…`) | `execute_sql`, `list_tables`, `apply_migration`, `get_advisors`, `list_migrations`, `get_project_url`, `get_publishable_keys`, `query_logs`, m.fl. | Det rigtige værktøj til migrationer, RLS-tjek og "advisor"-rapporter (samme slags som fandt C-002…C-006 i `BACKLOG.md`). | **Kræver godkendelse.** Denne session fik besked om, at serveren "requires authentication" og kunne ikke bruges. Alle live-tal i dette dokument er derfor hentet via et direkte, læse-kun REST-kald mod PostgREST med den offentlige `anon`-nøgle (se afsnit 3), ikke via MCP'en. **Skal godkendes af brugeren (`/mcp` eller `claude mcp`) før en session kan køre migrationer eller læse advisor-rapporter.** |
| **context7** | `resolve-library-id`, `query-docs` | Relevant, men smalt: stakken er stort set ramme-fri (ingen React/Next/Django). Nyttig til Supabase-JS-SDK'et, Playwright og Postgres/RLS-specifika. | Behold, brug sparsomt. |
| **firecrawl** | `firecrawl_scrape`, `firecrawl_crawl`, `firecrawl_map`, `firecrawl_search`, `firecrawl_monitor_*`, `firecrawl_agent` m.fl. (30+ værktøjer, plus et helt skillbibliotek `firecrawl-*`) | Kraftfuldt scraping-værktøj. | **Risiko, ikke bare overflødighed.** Projektets egen regel (og denne opgaves regel) er "skrab ikke konkurrenters sider — annoncer fra andre portaler er ikke en datakilde". Firecrawl gør det trivielt at bryde den regel ved en fejl. Se Risici. |
| **6df6241e…** (kreativt medie-/websitebygger-værktøj) | `generate_image/video/audio`, `create_website`, `publish_website`, `tiktok_*` m.fl. | Ingen. Ingen billede/video/lyd-generering eller ny "website"-oprettelse hører til denne opgave — sitet findes allerede. | **Overflødig for dette projekt.** `publish_website`/`create_website` er decideret farlige at have liggende ved siden af et rigtigt, allerede-udgivet site. |
| **21st** | `search`, `generate`, `get_component`, bookmarks | UI-komponentgenerering/-søgning. | **Overflødig** — projektet har intet komponent-framework (ren HTML/CSS/JS), og har allerede sit eget etablerede designsprog (`css/styles.css`, dokumenteret i `work/DECISIONS.md`). |
| **plugin:figma:figma** | `get_design_context`, `generate_figma_design`, `create_new_file` m.fl. | Ingen Figma-filer refereret noget sted i repoet. | Overflødig indtil nogen rent faktisk designer i Figma. |
| **mcp-registry** | `list_connectors`, `search_mcp_registry`, `suggest_connectors` | Meta-værktøj til at *finde* flere MCP'er. | Skal ikke bruges — opgavens egen regel siger "foreslå ikke nye værktøjer". |
| **scheduled-tasks** | `create/list/update/delete_scheduled_task` | Kunne i princippet planlægge fremtidige, tilladte crawls. | Ikke overflødig, men farlig at bruge uden meget stram scoping — en tidsstyret opgave, der "bare crawler videre", kan let ende med at røre en kilde uden tilladelse. |
| **terminal** | `read_terminal` | Diagnostik. | Neutral. |
| **ccd_session / ccd_session_mgmt / ccd_directory** | `mark_chapter`, `spawn_task`, `dismiss_task`, `list_sessions`, `send_message` m.fl. | Selve Claude Code-sessionsstyringen. | Ikke projektspecifik — hører til værktøjet, ikke til Bikerbasen. |

`ListPlugins`-kaldet (claude.ai-plugin-katalog) gav et tomt resultat — det er
den forkerte liste for et Claude Code-projekt som dette. Den rigtige kilde er
`~/.claude/settings.json` og `~/.claude/plugins/installed_plugins.json` (se
1.2).

### 1.2 Plugins

Fra `~/.claude/plugins/installed_plugins.json` og `~/.claude/settings.json`
(bruger-niveau) + `.claude/settings.json` (projekt-niveau):

| Plugin | Scope | Leverer | Relevans |
|---|---|---|---|
| `security-guidance@claude-plugins-official` | **projekt** (kun Bikerbasen) | Sikkerhedsvejledning (agent/hooks-baseret) | Relevant — projektet har en aktiv sikkerhedslog (`docs/review/BACKLOG.md`, migration 016/018 om RLS-huller). |
| `supabase@claude-plugins-official` | **projekt** | MCP-serveren ovenfor + skills `supabase:supabase`, `supabase:supabase-postgres-best-practices` | Meget relevant, men **MCP'en kræver godkendelse** (se 1.1). |
| `superpowers@claude-plugins-official` | bruger (globalt) | Skills: `brainstorming`, `test-driven-development`, `systematic-debugging`, `writing-plans`, `using-git-worktrees`, `finishing-a-development-branch`, `requesting/receiving-code-review`, `verification-before-completion` m.fl. | Generisk god praksis. Overlapper delvist med gstack's egne review-/plan-skills (se nedenfor). |
| `frontend-design@claude-plugins-official` | bruger | Skill `frontend-design:frontend-design` | Overlapper med de 7 projekt-lokale designskills under `.claude/skills/` (banner-design, brand, design, design-system, slides, ui-styling, ui-ux-pro-max) og med gstacks `impeccable`/`design-review`. Fire-fem forskellige "gør UI'et bedre"-indgange på samme projekt. |
| `figma@claude-plugins-official` | bruger | Figma MCP + `figma:*`-skills | Overflødig her (se 1.1). |
| `github@claude-plugins-official` | bruger | GitHub-integration/agenter | Relevant kun hvis PR-flow via `gh` skal automatiseres — projektet bruger allerede almindelig `git`/`gh` direkte. |
| `feature-dev@claude-plugins-official` | bruger + projekt (dobbelt-registreret) | Agenterne `code-architect`, `code-explorer`, `code-reviewer` | Relevant. Bemærk **den dobbelte registrering** (både "project: C:\Users\pasca" og "user") — det er ikke Bikerbasen-specifikt, men peger på at pluginnet er installeret to gange i praksis. |
| `code-review@claude-plugins-official` | bruger + projekt (dobbelt-registreret) | Skill/slash-kommando `/code-review`, `/simplify` | Samme dobbelt-registrering som ovenfor. Overlapper med `feature-dev:code-reviewer`-agenten og med gstacks `review`/`autoplan`. Tre forskellige "kodegennemgang"-veje. |
| `storybook@storybook` (tredjeparts-marketplace) | bruger | `storybook:stories`, `storybook-init/setup/upgrade` | **Uanvendelig på denne stak.** Storybook forudsætter et komponent-framework; Bikerbasen er statisk HTML/CSS/vanilla JS. Ren støj her. |

Derudover findes en **stor mængde skills uden formel plugin-registrering** —
`~/.claude/skills/gstack*` og en snes `firecrawl-*`-skills ligger direkte
som filer under `~/.claude/skills/`, ikke i `installed_plugins.json`. De
stammer sandsynligvis fra den registrerede, men ikke plugin-sporede,
markedsplads `omc` (`extraKnownMarketplaces.omc` →
`github.com/Yeachan-Heo/oh-my-claudecode.git`) i `~/.claude/settings.json`.
Konsekvens: **~60 gstack-skills** (`ship`, `land-and-deploy`, `canary`,
`benchmark`, `ios-*`, `retro`, `office-hours`, `tiktok`-relateret via
6df6241e-serveren, osv.) er tilgængelige uden at stå i den formelle
plugin-liste. Langt de fleste er **irrelevante for dette projekt** — der er
ingen iOS-app, ingen kontinuerlig deploy-kanary at overvåge (statisk GitHub
Pages), og "ship"/"land-and-deploy" dækker det samme som almindelig
`git commit`/`git push`, som projektet allerede bruger direkte (jf.
commit-historikken).

### 1.3 Subagenter

Fra systemets liste over tilgængelige agent-typer:

| Agent | Værktøjer | Overlap? |
|---|---|---|
| `claude` | alle | Catch-all. |
| `claude-code-guide` | Glob, Grep, Read, WebFetch, WebSearch | Kun til spørgsmål om selve Claude Code/SDK/API — ikke om Bikerbasen. |
| `Explore` | alle undtagen Agent/Artifact/Edit/Write/NotebookEdit | Hurtig, skrivebeskyttet søgning — god til "find hvor X står". |
| `feature-dev:code-architect` | Glob/Grep/Read/WebFetch/WebSearch (ingen skriv) | Arkitekturplaner. |
| `feature-dev:code-explorer` | samme værktøjssæt | Dybere kodeforståelse end Explore. |
| `feature-dev:code-reviewer` | samme værktøjssæt | Overlapper med `code-review`-pluginnets `/code-review`-kommando. |
| `general-purpose` | alle | Bred research/multi-trins-opgaver. |
| `Plan` | alle undtagen skriveværktøjer | Implementeringsplaner. |
| `statusline-setup` | Read, Edit | Irrelevant for Bikerbasen. |

**Ingen navnekonflikter** — alle otte navne er entydige, og plugin-leverede
agenter er alle navngivet med præfiks (`feature-dev:…`), så de kan ikke
forveksles med et bart `code-reviewer` fra et andet plugin. Det eneste
reelle overlap er **funktionelt**, ikke navngivningsmæssigt:
`feature-dev:code-reviewer`, `/code-review`-kommandoen og gstacks
`review`/`autoplan`-skills løser stort set samme opgave (gennemgå en diff og
find fejl) ad tre forskellige veje.

### 1.4 Skills og slash-kommandoer

- **Projekt-lokale skills** (`.claude/skills/`, kun Bikerbasen):
  `banner-design`, `brand`, `design`, `design-system`, `slides`,
  `ui-styling`, `ui-ux-pro-max` — alle designorienterede, generiske (ikke
  skrevet til MC-branchen eller til dette sites eksisterende
  designsprog). De overlapper indbyrdes og med `frontend-design`-pluginnet
  og gstacks `impeccable`.
- **Globale slash-kommandoer** (`~/.claude/commands/`): kun
  `gauntlet-loop.md` — ikke Bikerbasen-relateret.
- **Globale regler** (`~/.claude/rules/context7.md`): påbyder brug af
  Context7 til alt om biblioteker/frameworks/SDK'er/CLI'er — relevant, men
  som nævnt smalt anvendeligt på en ramme-fri stak.
- Resten af de ~150 skills i den globale liste (firecrawl-familien,
  gstack-familien, `anthropic-skills:*` til docx/pptx/xlsx,
  `obsidian-*`, `figma:*`) er generiske værktøjer uden projektspecifik
  binding. De vigtigste for denne opgave er dem, der direkte kan bruges på
  koden: `code-review`, `simplify`, `investigate`,
  `systematic-debugging`, `test-driven-development`, `run` (til at starte
  og screenshotte selve appen via `.claude/launch.json`).

### 1.5 `CLAUDE.md`, `settings.json`, hooks

- **Der findes ingen `CLAUDE.md` i selve Bikerbasen-repoet.** Al styring af
  Claude Code-adfærd for dette projekt kommer udefra (bruger-niveau).
- `~/.claude/CLAUDE.md` (bruger-globalt, gælder alle projekter, inkl.
  Bikerbasen): definerer `/graphify`-triggeret og henviser til
  `~/.claude/skills/graphify/SKILL.md`.
- `~/.claude/rules/context7.md`: Context7-påbuddet, se 1.4.
- `.claude/settings.json` (**projekt**): kun
  `{"enabledPlugins": {"security-guidance@claude-plugins-official": true, "supabase@claude-plugins-official": true}}`.
  Ingen hooks, ingen permissions her.
- `.claude/settings.local.json` (**projekt**): fire tilladelser
  (`find`-kald på skills-mapper, `claude plugin *`, `gh repo *`,
  `WebFetch(domain:github.com)`) — ingen hooks.
- `~/.claude/settings.json` (**bruger, globalt**): dette er hvor de
  resterende plugins er slået til (se 1.2), og hvor **den eneste hook i
  hele opsætningen** står:
  ```
  "hooks": { "Stop": [{ "_gstack_source": "gstack-timeline-stop",
    "hooks": [{ "type": "command",
      "command": "C:/Users/pasca/.claude/skills/gstack/hosts/claude/hooks/timeline-stop-hook",
      "timeout": 5 }] }] }
  ```
  Kører ved hver session-`Stop` — en gstack-timeline-logning, ikke noget
  Bikerbasen-specifikt.
- `.claude/launch.json` (**projekt**): definerer dev-serveren
  (`python scripts/dev-server.py`, port 8532, `autoPort: true`) — det
  Claude_Browser-preview'et kobler sig til.
- **Observation, ikke en handling i denne session:** `.claude/worktrees/`
  indeholder seks efterladte git-worktrees fra tidligere
  parallel-agent-runder (`hopeful-thompson-a62fd3`, `loving-cannon-78cbac`,
  `lucid-kirch-84820a`, `musing-kilby-4a63f5`, `pensive-volhard-4c49e4`,
  `vigorous-cohen-dc1032`). `vigorous-cohen-dc1032` matcher branchen, der
  blev merget i commit `e2fb221` ("runde 1's kodegennemgang"). De er ikke
  rørt her, men er værd at rydde op i en senere session — hver indeholder
  sin egen `node_modules`.

---

## 2. Kodebase

### 2.1 Stack

- **Frontend:** ren HTML/CSS/vanilla JavaScript. Intet
  framework (ingen React/Vue/Next osv. i `package.json`). 28 JS-filer i
  `js/` (~17.000 linjer inkl. tests, jf. `wc -l`).
- **Byggekæde:** Node-scripts i `scripts/` —
  `build.js` (orkestrerer), `build-brand-pages.js` (mærkesider),
  `build-listing-pages.js` (statiske annonce-sider pr. egen annonce),
  `build-srp.js`, `build-meta.js`, `build-postnumre.js`,
  `stamp-version.js`, `inline-critical.js`/`inline-boot.js`/`inline-cookie.js`/
  `inline-analytics.js` (inliner kritisk CSS/JS), samt `udgiv.js` (samler
  `_site/` fra en allowlist, se 2.3 og Risici).
- **Database/backend:** Supabase (Postgres + Auth + Storage + Edge
  Functions). Projekt-URL `hkcjrwglwurdjnobewzb.supabase.co`
  (`js/supabase-config.js:17`). RLS er den eneste adgangskontrol —
  ingen separat serverkode ud over fire Edge Functions
  (`supabase/functions/create-checkout`, `create-portal`,
  `stripe-webhook`, `verify-profile`).
- **Betaling:** Stripe, kun forberedt til forhandlerabonnement
  (`supabase/006_forhandler_abonnement.sql`,
  `supabase/STRIPE_OPSAETNING.md`) — ikke aktiveret i drift (se 3).
- **Hosting/deploy:** GitHub Pages, domæne `bikerbasen.dk`
  (`CNAME`). `.github/workflows/deploy.yml` kører
  `node scripts/build.js` og `node scripts/udgiv.js` ved hvert push til
  `main`, uploader kun `_site/`.
- **Dev-server:** `scripts/dev-server.py` (Python), port 8532
  (`.claude/launch.json`).
- **Test:** `node --test` over 15 filer, kørt her: `crawler/normalize.test.js`
  + `crawler/parse.test.js` gav **101/101 grønne**. `package.json`
  `"test"`-scriptet dækker desuden `crawler/hastighed.test.js`,
  `crawler/detalje.test.js`, `crawler/borte.test.js`,
  `crawler/afbryd.test.js`, `crawler/robots.test.js`,
  `js/koerekort.test.js`, `js/bedoemmelse.test.js`,
  `js/eksternt-kort.test.js`, `js/favoritter.test.js`,
  `js/scroll-padding.test.js`, `js/seo-adresser.test.js`,
  `js/soegning-tom.test.js`, `js/lager-determinisme.test.js`,
  `scripts/maerkeside.test.js`. Testene dækker **crawlerens
  parsing/normalisering/kildevalidering** grundigt og en række specifikke,
  tidligere fundne fejl (favoritter, kørekortsberegning) — der er ingen
  ende-til-ende-test af selve opret-annonce- eller betalingsflowet.

### 2.2 Datamodel — to adskilte slags annoncer

Bikerbasen har **to helt forskellige annonce-tabeller** (bevidst adskilt,
`supabase/014_aggregator.sql:1-13`): egne, hostede annoncer
(`public.listings`) og indekserede annoncer fra andre sider
(`public.eksterne_annoncer`).

**`public.listings`** (`supabase/schema.sql:42-69`) — brugerens egne:
```
id            uuid primary key
seller_id     uuid not null references profiles(id)
brand         text not null
model         text not null
type          text not null check (type in ('sport','touring','cruiser','naked','adventure','scooter','classic','cross'))
year          int  not null check (year between 1900 and extract(year from now())+1)
km            int  not null check (km >= 0)
ccm           int  not null check (ccm > 0)
power         int  check (power >= 0)          -- NULLABLE, ingen "not null"
price         int  not null check (price >= 0) -- heltal, IKKE nullable
condition     text not null
vin           text check (vin is null or vin ~* '^[A-HJ-NPR-Z0-9]{11,17}$')  -- NULLABLE, INGEN unik-constraint
registration  text                              -- NULLABLE, INGEN unik-constraint, intet formatkrav overhovedet
...
```
- **Effekt (`power`) er nullable** — matcher "vi gætter aldrig": findes
  ingen check i databasen for at kræve den udfyldt.
- **Pris (`price`) er et heltal og `not null`.**
- **Der er ingen unikt indeks på hverken stelnummer (`vin`) eller
  registreringsnummer (`registration`)** — kun tre almindelige indekser
  (`listings_seller_idx`, `listings_active_idx`, `listings_facets_idx`,
  `schema.sql:67-69`). Intet forhindrer to annoncer med samme stelnummer.

**`public.eksterne_annoncer`** (`supabase/014_aggregator.sql:36-63`, udvidet
i `015_eksterne_felter.sql`) — indekseret fra MC-forhandlere med skriftlig
tilladelse:
```
id, kilde_id, kilde_annonce_id, url, titel, maerke, model, variant,
aargang, km, ccm, hk, pris_dkk, stand, salgsmarkoerer[], udledte_felter[],
by, postnr, saelgertype, thumbnail_url, uddrag (maks. 200 tegn),
fingerprint, status, foerst_set, sidst_set, ejet_af, manuelle_felter[]
unique (kilde_id, kilde_annonce_id)
```
- `hk` (effekt) er **nullable** (`015_eksterne_felter.sql:49-50`) og kun
  ~66 % udfyldt hos MC Syd (samme fil, linje 33) — igen "vi gætter aldrig":
  `koerekortForListing()` svarer bevidst `null`, når effekten er ukendt.
- **Ingen kolonne for stelnummer/registreringsnummer overhovedet** — kun
  `unique(kilde_id, kilde_annonce_id)`, som forhindrer at samme kilde
  importeres to gange, men **intet forhindrer, at samme fysiske motorcykel
  optræder to gange, hvis den står annonceret hos to forskellige
  forhandlere** (fx både MC Syd og Gul og Gratis). `fingerprint`-kolonnen
  har et indeks (`eksterne_fingerprint_idx`), men ikke en unik-constraint
  på tværs af kilder.
- Bevidst minimalt: ingen fuld annoncetekst, intet galleri, ingen
  kontaktoplysninger gemmes (kommentar `014_aggregator.sql:15-18`).

### 2.3 Routing / URL-struktur

Blandet — og med et bevidst SEO-designvalg midt i:

- **Query-parametre** til den *dynamiske* visning: `soegning.html?brands=X&priceMax=…`,
  `annonce.html?id=…` (`js/annonce.js:9`).
- **Rene, genererede sider** til det, der skal indekseres:
  `scripts/build-listing-pages.js` genererer en **statisk HTML-fil pr.
  egen annonce** (`annonce-<mærke>-<model>-<år>-<8 tegn af id>.html`,
  `scripts/shared.js:31-34`) — netop fordi `annonce.html?id=…` bygges rent
  klientsidet og en crawler ellers kun ser "115 ord og
  `<!-- filled by JS -->`" (kommentar øverst i `build-listing-pages.js`).
  `maerke-<slug>.html` for mærkesider samme princip
  (`scripts/build-brand-pages.js`).
- **Bevidst noindex på eksterne annoncer:** individuelle detaljesider for
  *indekserede* (eksterne) annoncer sættes til
  `<meta name="robots" content="noindex, follow">`
  (`js/annonce.js:350` og `:797`) — Bikerbasen hoster hverken teksten eller
  billederne, så de individuelle sider skal bevidst ikke konkurrere i Google
  med kildens egen side. Kun mærkesiderne (Bikerbasens egen aggregering: et
  antal, et prisspænd, en vej ind i søgningen) er tiltænkt at blive
  indekseret.
- **Konsekvensen af dette valg + at `listings` har 0 rækker:** der findes
  lige nu **ingen** individuelle, indekserbare annoncesider overhovedet —
  hverken egne (ingen findes) eller eksterne (bevidst noindex). Kun
  forside, søgeside og 18 mærkesider er reelt indekserbare i dag
  (se 3 og Huller).

### 2.4 Findes disse flows?

| Flow | Findes? | Hvor |
|---|---|---|
| Forhandlertilmelding | **Delvist.** `forhandler.html` findes og linkes i sitemap, `profiles.is_dealer`/`cvr`/`cvr_verified` findes i skemaet, `supabase/006_forhandler_abonnement.sql` findes. Men der er intet flow, der får en ekstern kildes forhandler til rent faktisk at *overtage* sine 392 aggregerede annoncer — det kræver `krav`-tabellen (se nedenfor), som er uafprøvet i drift. |
| Feed-import | **Ja, men kun for aftalte kilder.** `crawler/` (config.js, pipeline.js, parse.js, normalize.js, hent.js, db.js) + `sources/*.yaml`. Kræver skriftlig `tilladelse_modtaget` med dato og `robots_tjekket` med dato, håndhævet hårdt i `crawler/config.js:171-207`. |
| Søgeagent med e-mailopsamling | **Findes i skemaet og har en Edge Function** (`saved_searches` fra `002_favorites_reviews.sql`, udvidet i `013_soegeagenter.sql` med afmeldingstoken og `notify-saved-searches`-funktionen). **Men triggeren, der sender mails, sidder kun på `public.listings`** (`013_soegeagenter.sql`: `create trigger on_listing_active … on public.listings`) — **ikke** på `eksterne_annoncer`. Da `listings` har 0 rækker i produktion, kan søgeagenter i praksis **aldrig udløses** af de 392 rigtige annoncer, der findes på sitet i dag. |
| Oprettelsesflow med kladde | **Ja.** `js/opret-annonce.js` har `save-draft`-knap og `Store.getDraft()` (linje ~705-817) — gemmer til `localStorage`, ikke til databasen. Billedupload strippes for EXIF/GPS før upload (`js/supabase-api.js:25-55`) — god privatlivspraksis. |

---

## 3. Faktisk tilstand (verificeret denne session)

Supabase MCP'en kunne ikke bruges (kræver godkendelse, se 1.1). I stedet
blev produktionsdatabasen læst **direkte via PostgREST med den offentlige,
RLS-begrænsede `anon`-nøgle** fra `js/supabase-config.js:17-18` — samme
metode som `crawler/tjek.js` selv bruger til verifikation
("Læsning kræver ikke service_role", `crawler/tjek.js:7`). Ingen skrivning
foretaget.

- **Antal aktive annoncer i alt: 392.**
  `GET .../rest/v1/eksterne_annoncer?status=eq.aktiv` →
  `Content-Range: 0-391/392`.
- **Egne annoncer (`public.listings`): 0 rækker, alle statusser.**
  `GET .../rest/v1/listings?select=id` → `Content-Range: */0`.
  Dette bekræfter projektets egen interne log
  (`work/DECISIONS.md` linje ~1010: "der [er] 0 egne annoncer og 332
  indekserede, ikke 51 + 332. Demoannoncer [51 stk.] har med vilje ingen
  photoUrls … `SHOW_DEMO_DATA` er kun sandt på localhost").
  **De "51 annoncer", der nævnes mange steder i `work/`-loggen, er
  demodata på localhost — IKKE produktionsdata.** Forveksl dem ikke.
- **Aktive kilder (`public.kilder`): to.**
  `MC Syd` (`mcsyd.dk`, aktiv) og `Gul og Gratis` (`guloggratis.dk`, aktiv).
  392 = 332 (MC Syd, jf. `015_eksterne_felter.sql` linje 7-8 og 33) + 60
  (Gul og Gratis, jf. commit `8e2e48a` "Gul og Gratis crawlet foerste gang —
  60 annoncer"). Regnestykket går op.
- **To kildekonfigurationer mere findes, men er endnu ikke aktive:**
  `sources/jensensmc.yaml` og `sources/rydbergsmc.yaml` blev tilføjet i
  commit `e3ca556` ("to nye dealerkilder — Rydbergs MC og Jensens
  Motorcykler"), men optræder **ikke** i `kilder`-tabellen endnu — de er
  konfigureret, men der er ikke kørt en crawl mod dem. (Denne session har
  ikke kørt `npm run crawl` — det ville have været en skrivning.)
- **Canonical på forsiden peger på `https://bikerbasen.dk/index.html`, ikke
  på den rene rod.** (`index.html:11`:
  `<link rel="canonical" href="https://bikerbasen.dk/index.html">`.) Samme
  mønster på `soegning.html:11` og `forhandler.html:11`. GitHub Pages
  serverer roden som `index.html` via `CNAME`, så begge URL'er virker — men
  canonical burde efter almindelig praksis pege på den rene rod
  (`https://bikerbasen.dk/`) for at undgå to indekserbare varianter af
  samme side.
- **Meta-description overclaimer.** `index.html:9` og `og:description`
  (`:19`): *"Bikerbasen er Danmarks mødested for køb og salg af brugte
  motorcykler. Søg blandt hundredvis af annoncer fra private og
  forhandlere."* Faktisk: 392 annoncer findes (så "hundredvis" er teknisk
  sandt), men **0 er fra private**, og ingen af de 392 er "annoncer" i den
  forstand sætningen antyder — de er aggregerede, eksterne opslag fra to
  forhandlere, som Bikerbasen hverken hoster eller kan garantere er
  ajourførte ud over `sidst_set`. Løftet "fra private og forhandlere" holder
  ikke i dag.
- **Søgeagent uden profil?** Nej. `saved_searches`-tabellens RLS-politik
  (`"søgeagent: kun egne"`, `013_soegeagenter.sql` via `018_rettighedsgulv.sql`)
  kræver `auth.uid() = user_id` for `insert`, dvs. et logget ind bruger.
  Der er ingen anonym indsættelsesvej. (Se dog ovenfor: selv med en konto
  udløses agenten reelt aldrig i dag, fordi triggeren kun ser
  `public.listings`.)
- **Er sælgers kontaktinfo i API/HTML før frigivelse?** Nej — men af to
  forskellige grunde, ikke én samlet mekanisme. (1) For egne annoncer:
  `public.profiles` er RLS-begrænset til egen række
  (`schema.sql:130-132`), og det offentlige view `public_profiles`
  eksponerer bevidst **ikke** telefon (`schema.sql:141-147`, kun
  `id, name, city, is_dealer, company, member_since, verified`). (2) For
  eksterne annoncer gemmes der slet ingen sælgerkontakt i databasen
  overhovedet (`014_aggregator.sql:15-18`) — køberen sendes videre til
  kildens egen side. Der findes ingen "beskeder"-tabel eller
  kontakt-frigivelses-flow endnu (`work/status.json`: piecen "beskeder" har
  status `"afventer"`, ingen reference-implementering).
- **`docs/` bliver ikke publiceret på bikerbasen.dk.** `scripts/udgiv.js`
  linje 1-33 dokumenterer, at hele repoet tidligere blev uploadet råt
  (`path: .` i `deploy.yml`) og at `docs/`, `supabase/`, `sources/`,
  `crawler/`, `work/` alle svarede HTTP 200 på handelsdomænet, inklusive
  auditrapporter med linjenumre på sårbarheder. Det er rettet med en
  allowlist. **Konsekvens for denne opgave:** de to filer, denne session
  skriver, havner ikke på det offentlige site.

---

## 4. Huller — sorteret efter hvad der blokerer mest

1. **Søgeagenten kan aldrig udløses af den annoncemængde, der faktisk findes.**
   Trigeren i `013_soegeagenter.sql` sidder kun på `public.listings` (0
   rækker); de 392 rigtige annoncer ligger i `eksterne_annoncer`, som ikke
   har nogen tilsvarende trigger. E-mailopsamling er derfor et løfte uden
   dækning lige nu — uanset hvor mange der tilmelder sig.
2. **Nul indekserbare, individuelle annoncesider.** `build-listing-pages.js`
   kan kun bygge sider for `listings` (0 rækker); eksterne annoncer er
   bevidst `noindex`. Kun 18 mærkesider + forside + søgeside er reelt
   indekserbare i dag. Det er en direkte hindring for at komme forbi
   123mc.dk på organisk søgning.
3. **"Gratis for private, ingen kommission" har endnu 0 brugere.** Hele
   forretningsmodellens kerne (private annoncer) er uafprøvet i produktion.
   `opret-annonce.html`-flowet (inkl. kladde og EXIF-strip) findes og
   virker teknisk, men ingen har brugt det i drift endnu.
4. **Ingen dedup på tværs af kilder.** Uden en unik-mekanisme udover
   `(kilde_id, kilde_annonce_id)` kan samme fysiske motorcykel dukke op to
   gange, når flere forhandlerkilder er aktive samtidig (relevant nu, hvor
   Jensens og Rydbergs venter på at blive koblet på).
5. **Forhandler-overtagelse af egne annoncer er ubevist.** `krav`-tabellen
   og `ret_ekstern_annonce()`-funktionen findes i skemaet, men ingen UI-flow
   er identificeret, der lader en forhandler faktisk gøre krav på sine
   eksterne annoncer og rette dem.
6. **Meta-description og canonical stemmer ikke overens med virkeligheden**
   (se afsnit 3) — mindre alvorligt end 1-3, men direkte i strid med
   projektets eget "vi gætter aldrig"-løfte, fordi det er et løfte om
   private annoncer, der ikke findes.
7. **Betalings-/forhandlerabonnement er forberedt, ikke aktiveret.**
   Stripe Edge Functions findes (`create-checkout`, `create-portal`,
   `stripe-webhook`), men ligger korrekt sidst i prioritetsrækkefølgen —
   der er intet at tage betaling for, før der er udbud.
8. Backloggen i `docs/review/BACKLOG.md` har derudover 17 øvrige åbne
   findings (design/kodefejl/sikkerhed, P1-P3) — se den fil for fuld liste;
   de er ikke gentaget her, fordi de allerede er dokumenteret og
   sporet af projektet selv.

---

## 5. Risici

**Persondata**
- Billedupload strippes for EXIF/GPS før upload (`js/supabase-api.js:25-55`)
  — det er allerede gjort rigtigt.
- `public.reports` har `reporter_id` nullable "fordi udloggede må
  indberette" (`017_ydelse.sql`-kommentar) — en anonym indberetningskanal,
  som i sig selv er fint, men bør holdes øje med for misbrug, når trafik
  kommer.
- `public_profiles`-viewet lækker ikke telefon (verificeret i skemaet), men
  det er ét view — enhver ny query, der læser rå `profiles` direkte, skal
  huske RLS'en. `018_rettighedsgulv.sql` dokumenterer, at Supabase' default
  privileges tidligere gav `anon`/`authenticated` skriverettigheder på
  **alle** nye tabeller i `public`-skemaet med det samme (rettet i samme
  migration) — værd at kende, hvis en fremtidig migration glemmer at
  granulere rettigheder eksplicit.

**Forhandlersamtykke**
- Kildekonfigurationen håndhæver hårdt, at `tilladelse_modtaget` **skal**
  have en dato, ikke bare `true` (`crawler/config.js:171-207`, skærpet af
  finding C-013). Det er en god kontrol — men den beviser kun, at et
  menneske *engang* læste en tilladelse ind i en YAML-fil; den beviser ikke,
  at tilladelsen stadig gælder. `robots_tjekket` tjekkes til gengæld ved
  hver kørsel (`crawler/robots.js`).
- To kilder mere (Jensens, Rydbergs) er konfigureret, men det er ikke
  verificeret i denne session, at deres `tilladelse_modtaget`-datoer rent
  faktisk er udfyldt korrekt i deres YAML-filer — kun at filerne findes.
  **Ikke verificeret.**

**Ophavsret til billeder**
- `eksterne_annoncer` gemmer bevidst kun `thumbnail_url` — et link til
  kildens eget billede, ikke en kopi. Bikerbasen hoster ikke billederne for
  eksterne annoncer, hvilket reducerer ophavsretsrisikoen markant
  sammenlignet med at kopiere dem. For **egne** annoncer uploader sælgeren
  selv, og der er intet i skemaet, der registrerer samtykke/ejerskab til
  billedet ud over uploadhandlingen selv.

**Steder koden kan komme til at gætte**
- `power`/`hk` er nullable begge steder, og `koerekortForListing()` er
  allerede rettet til at svare `null` ved ukendt effekt
  (`015_eksterne_felter.sql:38-41`) — det er "vi gætter aldrig" i praksis,
  og det er værd at bruge som mønster andre steder.
- `udledte_felter[]`-kolonnen (`015_eksterne_felter.sql:118-146`) er et
  eksplicit, gennemtænkt modstykke: når crawleren **udleder** ccm fra
  modelnavnet i stedet for at læse det, markeres feltet som udledt, så en
  visning kan skrive "ca. 750 ccm" i stedet for at foregive en måling. Et
  godt mønster at kræve andre steder i kodebasen, hvis flere felter
  begynder at blive gættet.
- **Risiko fremadrettet, ikke fundet i dag:** hvis `krav`/
  `ret_ekstern_annonce()`-flowet bygges ud uden omhu, er der en indbygget
  fare for, at en forhandler kan overskrive felter, crawleren senere
  overskriver tilbage (eller omvendt) — `manuelle_felter[]` findes netop
  for at forhindre det, men mekanismen er ikke afprøvet i drift endnu.

**Værktøjsrisiko (fra Setup-afsnittet)**
- `firecrawl`s scraping-værktøjer og -skills står i klar spænding med
  projektets "skrab ikke konkurrenters sider"-regel. En arbejdsprompt, der
  ikke eksplicit forbyder det, kan ende med at bruge firecrawl til at hente
  konkurrentdata "for at sammenligne", hvilket ville være i strid med
  reglen.
- Supabase MCP'en (den rigtige vej til migrationer) er **ikke godkendt** i
  denne session. Enhver kommende arbejdsprompt, der skal ændre skemaet
  (fx rette søgeagent-triggeren, tilføje dedup), skal enten få brugeren til
  at godkende MCP'en først, eller skrive og lade brugeren selv køre
  SQL-filen i Supabase Dashboard (som resten af `supabase/*.sql` allerede
  gør).
