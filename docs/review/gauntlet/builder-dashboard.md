# Builder-rapport: strøm dashboard (billede 5)

Branch `gauntlet/dashboard`. Filer: `mine-annoncer.html`, `dashboard.html`, `forhandler.html`, `js/mine-annoncer.js`, `js/dashboard.js`, ny `css/p-dashboard.css`, ny `js/mine-annoncer.test.js`. `login.html`, delt lag og `package.json` er urørt.

## Bygget pr. billedelement
- **Hero med foto, brødkrumme, h1 + undertekst**: alle tre sider (forhandler.html i kortere udgave). Fotoet er forsidens `img/hero-*.webp` (pynt, ikke annoncefoto).
- **Fanelinje + "Opret ny annonce"**: mine-annoncer: Oversigt · Mine annoncer · Favoritter · Søgeagenter · Profilindstillinger (rigtigt tablist, piletaster, `?tab=`). dashboard: Oversigt · Annoncer · Krav på annoncer · Profilindstillinger (link).
- **Statistikkort**: aktive annoncer, kladde, favoritter, søgeagenter (alle beregnet af brugerens data). dashboard: aktive, visninger, henvendelser, gemt, bedømmelse (eksisterende ægte tal, ingen +24 %).
- **Annonceliste**: række pr. annonce med thumbnail + fotoantal, titel, "år | km | type", sted, pris, statusbadge, "Oprettet …", handlinger og "Opret en ny annonce"-stribe. Kladde vises som egen række (Fortsæt / Slet).
- **Handlinger (kun implementerede)**: Rediger, Sæt på pause / Aktivér / Sæt til salg igen (opdaterer `listings.status` hidden/active via `db.updateListing`), Slet (confirm). Kun uuid-annoncer kan skifte status.
- **Sidebjælke**: Min konto (initialer, navn, e-mail fra session; Profilindstillinger, Mine annoncer, Favoritter, Log ud), "Sælg hurtigere" (sande råd, ingen tal), "Brug for hjælp?" (om-bikerbasen.html, sikkerhed.html).
- **Krav-flowet (CLAUDE.md regel 6)** uændret: søg, indsend, statusliste, rediger godkendte (dashboard, fane "Krav på annoncer").
- **Login-gate**: uden session redirect til login som før; privat bruger på dashboard får gate-kort i samme design.

## Matcher IKKE billedet (bevidst)
- Ingen visninger/beskeder/"+24 %"-kort på mine-annoncer og ingen beskeder-fane/-menu (findes ikke).
- Ingen "Udløbet", "Udløber om N dage" eller "Forlæng": annoncer har ingen udløbsdato i databasen. Pause = `status='hidden'`; Solgt vises hvis status er `sold`.
- Primær CTA er brandfarven (orange), ikke grøn. "Sælg hurtigere"-boksen er varm tint i stedet for grøn.
- Pr.-række statistik (visninger/henvendelser, 30 dage) vises som lille linje kun hvor ægte `listing_stats` findes.
- Annoncer på pause/solgt kan ikke "Rediger"-es: `opret-annonce.js startEditing` finder kun aktive annoncer. Se DELT-ØNSKE.

## DELT-ØNSKER
1. `js/icons.js`: ikonerne `logout`, `pause`, `play` (nu lokale i `js/mine-annoncer.js` og `js/dashboard.js`).
2. opret-strømmen: `startEditing()` bør hente egen annonce via `db.myListings()`, så pausede/solgte annoncer kan redigeres.
3. Orchestrator: tilføj `js/mine-annoncer.test.js` til `npm test`; `css/p-dashboard.css` skal med i `udgiv.js`-allowlisten og stemples.
5. Delt header: `.header-actions` er 333 px ved 320 px viewport (vandret overflow på alle sider).
4. Når delt header ændres: `.db-hero` regner med en lys, ikke-gennemsigtig header.

## Test
- Playwright-harness (scratch) med `page.route`-mock af Supabase: session, profil, listings (aktiv/pause/solgt), stats, favoritter, krav, eksterne annoncer. Scenarier: tom bruger, fuld (kladde, 4 annoncer, favoritter, agent), enkel; privat vs. forhandler; ingen session.
- Funktionstest bestået: pause/aktivér sender korrekt PATCH, fejl ændrer ikke status, slet kræver confirm (afvist = intet kald), kladde-slet, favorit-fjern, faner + piletaster, krav-søg/-indsend/-status, gate/redirect.
- Overflow 320/360/390/768/1024/1440 × lys/mørk på 7 faner + forhandler: intet indhold i `main` løber over (98 kontroller grønne). Kendt rest: den DELTE header er 333 px bred ved 320 px (`.header-actions`), så `documentElement.scrollWidth` er 333 på alle sider ved 320 — målt identisk på urørte `sikkerhed.html`. Ikke min fil; DELT-ØNSKE 5. Tabellerne i krav-fanen ligger i egen `.table-scroll`. Konsol: ingen fejl/advarsler (bortset fra Supabase-mock).
- Kontrast: badge-grøn `--db-ok` #176E45 på #E3F5EC (lys); øvrige farver er delte tokens. Fokus: synlig ring på faner, kort og menu.
- Nye tests: `js/mine-annoncer.test.js` (8 tests). `npm test` 364/364 grønne.

## Commits og kendte rest-problemer
- Commit på `gauntlet/dashboard` (ingen push). Se `git log`.
- Rest: ingen udløb/forlæng (ikke i data); pausede annoncer kan ikke redigeres før de aktiveres; `forhandler.html` selve profilkortene er uændret (kun hero); favoritrækker på tværs af eksterne annoncer linker som før til `annonce.html?id=`.
- Visuelle iterationer (viewport-screenshots 1440/390, lys+mørk): 1) første samling — rækker overlappede i 4-kolonne-layout, 2) container-query-breakpoints + kompakt Slet, 3) 5-kolonne KPI + dashboard-rækker + mobil-grid-fix (`main > .container` flex-regel i styles.css overstyres med `.db-page > .db-layout`).

## Runde 2 (rettelser efter blind Critic, 4,0/5)
- **F-1/F-2/F-3/F-4 rettet**: stat-kort stakkes ved ≤400 px (label brydes ikke ud); `.table-scroll{position:relative}` fjerner krav-fane-overflow; 16 px i sorter-/søgefelter under 768 px; tip-link 5,43:1, grøn badge 5,53:1, mørk Aktiv/Ny/"1 ny" 11,2:1, rød tekst ≥5,4:1. Overflow måles nu på `documentElement` (107 kontroller, 320–1440, lys+mørk, alle faner + forhandler): 0 afvigelser. Den delte header var 13 px for bred ved 320 med favoritter; strammet kun på disse sider (`body:has(.db-page) .header-actions`, ≤349 px). DELT-ØNSKE: ret det i `styles.css`.
- **F-5**: fejler hentning af egne annoncer, vises en `role=alert`-banner med "Prøv igen" (ingen tavs skjulning af pausede/solgte).
- **F-6**: UI blokerer genaktivering ved 3 aktive for private, når `FRI_ADGANG` slås fra (test i `mine-annoncer.test.js`). DELT-ØNSKE (DB): `trg_listing_limit` er kun `before insert`; tilføj `before update of status` i supabase-migration (jeg må ikke røre supabase/).
- **F-9**: dashboardet henter 60 dages statistik og sammenligner ægte med de foregående 30 dage; ingen forrige data = ingen procent; 0 % vises som "Uændret" uden pil (`js/dashboard.test.js`).
- **P3**: fane-fade ved ≤719 px; `#krav-panel`/`#ekstern-panel` åbner Krav-fanen; krav-dialog `role=dialog aria-modal`, fokusfælde, Escape, fokus tilbage; forhandler.html bygget om fra original bytes, diff = 14 linjer (mixed CRLF/LF bevaret; dashboard/mine-annoncer.html har kun reelle ændringer).
- **Tættere på billedet**: række-kolonner Visninger / Favoritter / Henvendelser (30 dage, kun når ægte data-kald lykkes) som i billedet; ⋮-menu (Se annonce, Kopiér link, Slet) ved siden af Rediger og Pause; lysere hero-overlay; Profilindstillinger har nu en rigtig formular for det eneste redigerbare felt, `vis_telefon`-samtykket (`db.saetVisTelefon`). Navn/e-mail kan ikke redigeres i dag og vises skrivebeskyttet.
- **Ikke gjort**: rytterfoto i hero (der findes kun forsidens hero-fotos i repoet; ingen ny billedfil må opdigtes/AI-genereres); redesign af forhandler-profilkortene og dashboard-grafernes aksetekst; headset-ikon (kræver `icons.js`).
- **Selv-scores (0–5)**: hero+faner 4,5 · statistikkort 4,5 · rækker+handlinger 4,5 · opret-stribe 5 · sidebjælke 4,5 · dashboard 4 · forhandler 3 · profilindstillinger 4 · mobil 4,5 · tilstande 4,5. Samlet ≈ 4,3.
- Tests: `npm test` 364/364; `js/mine-annoncer.test.js` + ny `js/dashboard.test.js` (12 tests) — begge skal i `npm test`. Mock-suite: 107 grønne.
