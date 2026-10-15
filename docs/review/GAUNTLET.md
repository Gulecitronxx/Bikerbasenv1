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
| G-002 | Header (`.header-actions`, `.spor-koeber`) klippes ikke under ~269 px viewport | P3 | åben — under WCAG 320 px-grænsen, lav prioritet |

## Åbent / næste handling

- Detective-rapporter (SEO, funktion/data, visuel/mobil) er bestilt; Orchestrator prioriterer dem i denne fil, når de er landet.
- Foreløbig observation (hypotese): "Søg efter type"-fliserne på forsiden viste ingen fotos i et automatiseret screenshot — skal verificeres af Detective visuel.
- Ejerens favoritter at undersøge særligt: hero + søgekort + tillidsrække, mellemsektionens hierarki, "Sådan virker Bikerbasen"-modul.
- SEO-Routine (cloud, kontinuerlig) er et **separat driftsspor**; forberedes efter de første produktforbedringer, må ikke blokere dem.

## Beslutninger

- Branch `gauntlet/master` er oprettet fra `claude/aim-loop-runde4` (d199417). Ucommittede buildændringer fra før sessionen ligger i `git stash`.
- Produktionsændringer (merge til `main`/deploy) kræver ejerens autorisation; Gauntlet arbejder på branch og PR.
