# PARALLEL DESIGN GAUNTLET — fælles regler (læses af alle strømme)

Mål: de 10 designbilleder i `C:\Users\pasca\Desktop\Bikerbasen billeder` er det PRIMÆRE mål for layout/struktur/komponenter/hierarki.
Design DNA + override: `/DESIGN_DNA.md` (i din worktree). Juridiske regler: `/CLAUDE.md` (ufravigelige). Status: `docs/review/GAUNTLET.md`.

## Strømme, branches, porte

| Strøm | Billede | Branch / worktree | Port | Ejer filer (kun disse må du redigere frit) |
|---|---|---|---|---|
| Forside + DELT LAG (Design Orchestrator) | 1 (+9 hero) | `gauntlet/master` i `C:\Users\pasca\Desktop\rod\Claude code` | 8700 | `index.html`, `js/home.js`, **`css/styles.css`**, **`js/components.js`**, header/footer, tokens, `js/icons.js` |
| soegning | 2 | `gauntlet/soegning` · `C:\Users\pasca\Desktop\rod\wt\soegning` | 8711 | `soegning.html`, `js/search.js`, `js/sortering.js`, `css/p-soegning.css` |
| annonce | 3 | `gauntlet/annonce` · `...\wt\annonce` | 8712 | `annonce.html`, `js/annonce.js`, `scripts/build-listing-pages.js`, `css/p-annonce.css` |
| opret | 4 | `gauntlet/opret` · `...\wt\opret` | 8713 | `opret-annonce.html`, `js/opret-annonce.js`, `css/p-opret.css` |
| dashboard | 5 | `gauntlet/dashboard` · `...\wt\dashboard` | 8714 | `dashboard.html`, `mine-annoncer.html`, `forhandler.html`, `js/dashboard.js`, `js/mine-annoncer.js`, `js/forhandler.js`, `css/p-dashboard.css` |
| login | 6 | `gauntlet/login` · `...\wt\login` | 8715 | `login.html`, `js/login.js`, `afmeld.html`, `css/p-login.css` |
| facet | 7 + 8 | `gauntlet/facet` · `...\wt\facet` | 8716 | `scripts/build-facet-pages.js` (type-, kørekort-, region-, model-sider), evt. ny `koerekort-a.html`, `css/p-facet.css` |
| maerke | 9 | `gauntlet/maerke` · `...\wt\maerke` | 8717 | `scripts/build-brand-pages.js` (maerke-*.html, maerker.html), `js/maerke.js`, `css/p-maerke.css` |
| guides | 10 | `gauntlet/guides` · `...\wt\guides` | 8718 | NYE filer: `scripts/build-guides.js`, `guides.html`, `guide-*.html`, `css/p-guides.css` |

Reserverede guide-adresser (alle må linke til dem; guides-strømmen opretter dem): `guides.html`, `guide-foerste-motorcykel.html`, `guide-a2-koerekort.html`, `guide-brugt-motorcykel.html`.

## Regler for samtidigt arbejde

1. **Du arbejder KUN i din egen worktree/branch** (se tabellen) og kun i dine ejer-filer. Rediger aldrig en anden strøms filer eller hovedmappen `C:\Users\pasca\Desktop\rod\Claude code`.
2. **Delt lag er låst:** `css/styles.css`, `js/components.js`, header/footer (på ALLE sider), `js/icons.js`, design-tokens, `package.json`, `scripts/build.js`, `scripts/udgiv.js`, `scripts/stamp-version.js` ændres IKKE af dig. Har du brug for en delt ændring (ny token, ny delt komponent, ændring i annoncekortet): skriv en linje i din egen rapport under "DELT-ØNSKE" — Orchestratoren integrerer. Bygger du noget, der kunne være delt, så navngiv klasser med din prefix (`.so-…`, `.an-…`, `.op-…`, `.db-…`, `.lg-…`, `.fa-…`, `.mk-…`, `.gd-…`).
3. **Din side-specifikke CSS** lægges i din egen fil `css/p-<strøm>.css`, linket fra DINE sider med `<link rel="stylesheet" href="css/p-<strøm>.css">` efter styles.css-linket (for genererede sider: i generatorens skabelon). Genbrug eksisterende klasser og tokens (`--color-*`, `--space-*`, `--radius-*`, `--font-*`) og eksisterende komponenter (`.btn .btn-primary/.btn-outline`, `.input`, `.field`, `.popular-chip`, listing-kortet, `.saadan-trin`, `.container`, `.section`). **Opfind ikke nye knapper, farver, kort, navigation eller afstandsskalaer.** Primær CTA = brandfarven (orange/kobber), ikke billedernes grønne; grøn kun til ✓.
4. **Intet opdigtet** (se DESIGN_DNA override): ingen hårdkodede tal, anmeldelser/stjerner, 'verificeret forhandler', 'svartid', social login, beskeder, visningstal, fiktive specs, AI-fotos som annoncebilleder, opdigtede forfatternavne/citater. Alle tal beregnes fra lageret/data. Moduler uden ægte data udelades eller bygges ærligt. Fakta om kørekort/regler SKAL verificeres mod officiel dansk kilde (fx Færdselsstyrelsen/borger.dk/retsinformation.dk) og kilden noteres i din rapport.
5. **Både LYS og MØRK tilstand**; lys er målet der skal ligne billedet mest. 320/360/390/768/1024/1440 px uden vandret overflow (scrollWidth==clientWidth), AA-kontrast, tastaturnavigation, ingen konsolfejl (bortset fra kendte lokale Supabase CORS/401), ingen regression af funktioner/data/SEO (title, én h1, canonical, JSON-LD, interne links).
6. **Build/commit-disciplin (vigtigt for at undgå merge-kaos):**
   - Kør IKKE `node scripts/build.js`, `stamp-version.js` eller `udgiv.js` i din worktree og commit aldrig `?v=`-stempler, CSP-hash-ændringer eller `_site/`. Dev-serveren (`PORT=<din port> python scripts/dev-server.py` i DIN worktree, baggrund) serverer filerne direkte. Genererede sider i din familie bygges med din egen generator (fx `node scripts/build-facet-pages.js`); commit generatorens ÆNDRING og kun de genererede filer i din familie, hvis de er committed i forvejen.
   - Inline scripts forbudt (CSP-hashes): al JS i js/-filer.
   - Rediger ikke `package.json`; skriv nye tests som `js/<navn>.test.js` / `scripts/<navn>.test.js` (node:test) og list filnavnene i din rapport — Orchestratoren tilføjer dem til `npm test`. Kør dem selv med `node --test <fil>` og kør hele `npm test` for regression.
   - Syntakskontrol: `for f in js/*.js scripts/*.js crawler/*.js; do node --check "$f"; done`.
   - Linjeskift: repoet har blandet CRLF/LF; bevar hver fils eksisterende linjeskift. Commit med `git add <eksplicitte filer>` — ALDRIG `git add -A`. Commit-beskeder på dansk, slut med `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Du må IKKE pushe og IKKE merge ind i andre branches.
   - Ressourcer: maks. ÉN headless Chromium ad gangen i din strøm; luk den efter brug; dev-server kun på din port.
7. **Test på den renderede side**, ikke kun kildekoden: tag VIEWPORT-screenshots (ikke fuldside-miniaturer) i flere scroll-positioner, lys+mørk, 1440 og 390; afvis cookiebanneren med 'Kun nødvendige'; LÆS screenshots og sammenlign direkte med referencebilledet; iterér mindst 3 gange (forskelle → ret → igen). Playwright: `require('C:/Users/pasca/Desktop/rod/Claude code/node_modules/playwright')` (junction findes også i din worktree). Scripts skrives UDENFOR repoet (scratch/temp).
8. **Login-beskyttede sider** (dashboard, mine-annoncer, opret-annonce trin der kræver login): test med Playwright `page.route` der mocker Supabase-svar og sætter en fiktiv session lokalt. Opret ALDRIG konti, skriv ALDRIG til produktion (hkcjrwglwurdjnobewzb), og brug ingen rigtige legitimationsoplysninger.
9. **Rapport:** skriv `docs/review/gauntlet/builder-<strøm>.md` (max ~40 linjer): hvad er bygget pr. billedelement, hvad matcher IKKE billedet og hvorfor, DELT-ØNSKER, nye testfiler, målte tal (overflow/kontrast), commits, kendte rest-problemer. Commit rapporten.

## Integration (Orchestrator)
Rækkefølge: gauntlet/master (forside + delt lag) → soegning → annonce → facet → maerke → opret → dashboard → login → guides. Efter hver merge: fuld `npm test` + `build.js` + `udgiv.js` + visuel kontrol af samlet site (konflikter mellem individuelt korrekte ændringer). Kun verificerede (Critic ACCEPTER) strømme integreres og pushes til main.
