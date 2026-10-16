# GAUNTLET — projektstatus (læs denne først i en ny session)

Master-Gauntlet for Bikerbasen. Bygger oven på det eksisterende review-loop (`BACKLOG.md`,
`DECISIONS.md`, runde 1–33) — erstatter det ikke. Designreference: `/DESIGN_DNA.md`.
Juridiske regler: `/CLAUDE.md` (ufravigelige).

## Proces (kort)

1. **Orchestrator** vælger næste opgave efter prioritet: funktion/fejl + SEO > design/UX > data/søgning/mobil > indhold > nye funktioner > compliance (laveste).
2. **Detective** (read-only) finder og beviser; adskiller *verificeret* / *hypotese* / *forbedring*. Rapporter: `docs/review/gauntlet/detective-*.md`.
3. **Builder** retter på branch `gauntlet/master` (ét fund = én commit; build-artefakter i separat commit). Verifikationsgate fra CLAUDE.md skal være grøn.
4. **Blind Critic** (frisk kontekst; kun acceptkrav + URL, ikke Builderens forklaring) skriver `docs/review/gauntlet/critic-<ID>.md` med dom ACCEPTER/AFVIS.
5. Først ved ACCEPTER = **verificeret**. AFVIS → ny iteration; ved to afvisninger i træk skal Orchestrator skifte tilgang.
6. **Meta-Gauntlet** hver ~5. fund: tjek om Critic faktisk fandt noget, om agenter gentager arbejde, om fokus drev.

## Værktøjer

- Lokal server: `PORT=8700 python scripts/dev-server.py` · Playwright i `node_modules` · screenshots i viewport (ikke fuldside).
- Gate: `for f in js/*.js crawler/*.js scripts/*.js; do node --check "$f"; done; npm test; node scripts/build.js; node scripts/udgiv.js`
- `git add -A` er farligt (tager `work/`-skærmbilleder med): brug `git add -u` + eksplicitte nye filer.

## Status

| ID | Fund | Sev | Status |
|---|---|---|---|
| G-001 | Forsiden har 16 px vandret overflow på 360–414 px (`.section-eftertekst{padding:X 0}` nulstillede containerpadding) | P1 | **verificeret** (`3c5306b`) — blind Critic ACCEPTER, 4/4 krav PASS ([critic-G-001.md](gauntlet/critic-G-001.md)) |
| S-001 | Kørekortsider: title 75 tegn, H1 "Kørekort A2" | P2 | **verificeret** (Critic ACCEPTER, [critic-S-001-S-002.md](gauntlet/critic-S-001-S-002.md)) |
| S-002 | Footer linkede typer til soegning.html?type= i stedet for statiske sider | P2 | **verificeret** (Critic ACCEPTER, [critic-S-001-S-002.md](gauntlet/critic-S-001-S-002.md)) |
| S-006 | annonce.html uden statisk noindex | P2 | **verificeret** (Critic ACCEPTER, [critic-batch2.md](gauntlet/critic-batch2.md)) |
| S-008 | "kr.." på model- og mærkesider | P3 | **verificeret** (Critic ACCEPTER, [critic-batch2.md](gauntlet/critic-batch2.md)) |
| V-001/F-004 | Annoncesiden 76 px vandret overflow på mobil (grid 1fr) | P1 | **verificeret** (Critic ACCEPTER, [critic-batch2.md](gauntlet/critic-batch2.md)) |
| F-001 | Fritekstsøgning: 17/46 realistiske søgninger gav 0 træf | P1 | **verificeret** (Critic ACCEPTER, [critic-batch2.md](gauntlet/critic-batch2.md)) |
| NF-1 | Mærkesiders intro splittes ved "kr. " → synligt afsnit ender "fra 4.000 kr." | P2 | rettet — afventer Critic |
| G-003 | om-indeksering.html 641 px bred på mobil (`.legal-pre` uden CSS, auto-margener i flex) | P2 | rettet — afventer Critic |
| V-006/V-007 | Formularkanter 1,3:1 og placeholder-kontrast (nyt token `--color-input-border`) | P2 | rettet — afventer Critic |
| F-F1..F3 | Søgning: match hen over ordgrænse (`gs`→"Road King Special"), symbol-only q giver alt, ingen rangering | P3 | åben |
| UX-1 | "Sådan virker Bikerbasen": 4-trins modul over de to spor på forsiden (ejerens favorit; kun sande trin, favoritter udeladt pga. F-005) | P2 | bygget — afventer Critic |
| SAMLET-1 | **P1** Header løb vandret over (73–301 px ved 1024 med favorit/forhandler) | P1 | **rettet** — menuskuffe under 1180 px, sekundære menupunkter skjult under 1500 px; måling 0 px i alle kombinationer (hdr.js) |
| SAMLET-2 | Header hoppede 100 px mellem forside og øvrige sider | P2 | **rettet** — header 1480 px på alle sider |
| SAMLET-3 | Aktiv menu kun på 6 sider, ingen aria-current | P2 | **rettet** — aktiv = sidefamilie, aria-current |
| SAMLET-4 | Forsidens A-flise (655) pegede på koerekort-a (411) | P2 | **rettet** — A-flisen peger på søgningen |
| F-12 | Blokeret localStorage kastede fejl | P2 | **rettet** — hukommelses-shim i store.js (A/B: 0 vs 2–3 fejl) |
| G-002 | Header (`.header-actions`, `.spor-koeber`) klippes ikke under ~269 px viewport | P3 | åben — under WCAG 320 px-grænsen, lav prioritet |

## Prioriteret kø (fra Detective-rapporterne, rangeret efter værdi/indsats)

Funktion/data (`gauntlet/detective-funktion.md`): F-002 falsk "Ny"-mærke (P1) · F-007 ccm/hk læst forkert fra titler (P2) ·
F-003 lager 51–60 dage gammelt vises som aktuelt, dato mangler på forside/søgning (P1; ejer skal beslutte aldersgrænse) ·
F-005 favorit-hjerte kun på 2/604 kort (P1, M) · F-012 blokeret localStorage kaster (P2) · F-013 login viser rå "Failed to fetch" (P2) ·
interne "RUNDE 12"-noter i offentlig HTML (P2) · "ENGROS"-jargon på kort · Sym/SYM-facetter.
Visuel (`gauntlet/detective-visuel.md`): V-009 landingssider uden hero/søgekort/tillidsrække (P2) · V-006/V-007 formularkanter 1,3:1 og placeholder-kontrast (P2, XS) ·
V-002 CLS 0,72 på søgning ved 768 · V-004/V-005 type-fliser: lazy-load + labelkontrast 2,0–3,0:1 · "Sådan virker Bikerbasen"-modul + "Sælg din motorcykel"-CTA-panel (`img/sell-cruiser.webp` ligger ubrugt) ·
V-012 mærkeside viser både 49 og 55 annoncer · V-016 hovednavigation kun Forside + Søg · V-022/V-023 CSS/JS-størrelse.
SEO (`gauntlet/detective-seo.md`): S-005 transient Supabase-fejl kan fjerne annoncesider fra sitemap uden build-fejl · S-003 to URL'er pr. side (.html vs udvidelsesfri; Cloudflare, kræver ejer) ·
S-004 crawl udløser ikke deploy · S-011 sitemap lastmod = byggedato · S-007/015/016/017 nye sidefamilier (modelsider, by, prisintervaller, købsguides).

## Åbent / næste handling

- Detective-rapporter (SEO, funktion/data, visuel/mobil) er bestilt; Orchestrator prioriterer dem i denne fil, når de er landet.
- Foreløbig observation (hypotese): "Søg efter type"-fliserne på forsiden viste ingen fotos i et automatiseret screenshot — skal verificeres af Detective visuel.
- Ejerens favoritter at undersøge særligt: hero + søgekort + tillidsrække, mellemsektionens hierarki, "Sådan virker Bikerbasen"-modul.
- SEO-Routine (cloud, kontinuerlig) er et **separat driftsspor**: opgave og rammer er skrevet i [`docs/seo-routine.md`](../seo-routine.md); selve cloud-routinen er endnu ikke oprettet (kræver ejerens godkendelse af adgang/interval).

## PARALLEL DESIGN GAUNTLET (startet 15.10.2026)

Koordinering: [gauntlet/PARALLEL.md](gauntlet/PARALLEL.md). Design: `/DESIGN_DNA.md` (override: billederne er målet).
9 strømme, hver med egen branch + worktree (`C:\Users\pasca\Desktop\rod\wt\<navn>`) + port: **master** (forside + delt lag, 8700) · soegning 8711 · annonce 8712 · opret 8713 · dashboard 8714 · login 8715 · facet 8716 (kørekort/type/region/model) · maerke 8717 · guides 8718.
Hver strøm: Builder → rapport `gauntlet/builder-<navn>.md` → blind Critic (`gauntlet/critic-<navn>.md`, sammenligner med billedet) → integration i rækkefølge master → soegning → annonce → facet → maerke → opret → dashboard → login → guides, med fuld test + visuel kontrol af det samlede site før push til main.
Genoptag efter afbrydelse: `git worktree list`, `git log --oneline gauntlet/<navn> -5`, læs `builder-<navn>.md`.
Åbne delte opgaver (Orchestrator): tilføj nye testfiler til `npm test`; kobl `build-guides.js` på `build.js`; sitemap for guides; nav-link 'Artikler & guides' når guides er live; integrér DELT-ØNSKER fra rapporterne.

## Beslutninger

- Branch `gauntlet/master` er oprettet fra `claude/aim-loop-runde4` (d199417). Ucommittede buildændringer fra før sessionen ligger i `git stash`.
- Produktionsændringer (merge til `main`/deploy) kræver ejerens autorisation; Gauntlet arbejder på branch og PR.
