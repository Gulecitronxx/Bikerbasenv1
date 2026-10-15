# Bikerbasen — Design DNA

Autoritativ kilde: den kørende side (`css/styles.css` tokens, `index.html`, `js/components.js`).
Dette dokument er designreferencen for Builder og Critic. Kort med vilje.

## 1. Identitet (bevares)

- **Mørk først, varm sort + kobber.** Dark: bg `#16140F`, flade `#1F1C17`, accent `#FF6A32`.
  Light: varm creme `#F7F5F2`, accent `#C6420E`. Aldrig blåsort, aldrig grøn primær.
- **Én accentfarve** (kobber/orange) til CTA, aktive filtre, links og kort-fremhævning.
  Grøn bruges kun semantisk (ok/verificeret), rød kun til fejl.
- **Typografi:** Space Grotesk til overskrifter (stram, −0.01em), IBM Plex Sans til brødtekst.
- **Form:** radius 8/14/20 px, pille-chips og pille-knapper, kort med 1 px varm kant og blød skygge.
- **Hero:** fuldbredde motorcykelfoto, h1 til venstre, **søgekort der ligger over fotoet**, tillidsrække under (✓ Kilden står på hvert kort …).
- **Tone:** ærlig og datadisciplineret. "Ikke oplyst" frem for gæt. Kilden står på hvert kort. Vi er et indeks, ikke et handelssted.
- **Tokens:** brug `--color-*`, `--space-*`, `--radius-*`, `--font-*`. Ingen nye hårdkodede farver.

## 2. Komponenter der allerede findes (genbrug)

Header m. tema- og login-knap · hero + søgekort · kørekort-segment (Alle/A1/A2/A) · annoncekort
(internt og eksternt med kilde-badge) · popular-chips · facet-/tile-grids (type, mærke, region) ·
FAQ/forklaringsblokke · sammenligning · favoritter · annonceside med handlingsbjælke ·
opret-annonce-trin · dashboard · mærke-/type-/region-/kørekortsider (genereret af `scripts/build-*.js`).

## 3. Hvad inspirationsbillederne understøtter (valgt efter kritisk vurdering)

| Idé (billede) | Vurdering | Handling |
|---|---|---|
| Tillidsrække med 4 ikon+tekst under hero (1, 8, 9) | Passer; findes delvist | Udbyg til ikon-række med ægte løfter (kilde, kørekortfilter, ikke oplyst) |
| **"Sådan virker Bikerbasen"** 4 trin med pile (1, 9) — ejerens favorit | Passer; pædagogisk | Bygges som kompakt 4-trins modul på forside + mærkesider, i eksisterende kortstil |
| Spec-chips på kort: kørekort, ccm, hk, kg (1, 2, 8) | Stærk — kort bliver mere informative | Forbedr kortets datalinje, men kun med oplyste tal |
| Typefliser med foto + antal (1, 8, 9) | Findes; foto manglede i test | Sikr at fliserne altid har billede |
| Aktive filter-chips over resultater + sortering + grid/liste (2) | Passer | Verificér og forbedr i `soegning.html` |
| Annonceside: faktatabel, "Kan du køre denne?", "Det bør du tjekke", lignende (3) | Passer | Kørekort-kort og tjekliste kan genbruge eksisterende data |
| Opret-annonce: trin-bjælke, live-forhåndsvisning, tips-bokse (4) | Passer | Forhåndsvisning og tips; ingen opdigtede tal ("3x flere") |
| Dashboard: stat-kort, annonceliste m. handlinger (5) | Delvist | Kun stats vi faktisk kan måle |
| Kørekort-/type-/mærke-landingssider m. guides-blok (7, 8, 9, 10) | Passer; SEO-værdi | Cross-links, "Det skal du vide", relaterede søgninger |
| Guide/artikel m. indholdsfortegnelse + "Kort fortalt" (10) | Passer; SEO | Skabelon til guides |

## 4. Afvises eller bruges ikke ukritisk

- **Grøn primærfarve, hvidt header, ensartet lys tema:** bryder identiteten.
- **Opdigtede tal og påstande:** "12.842 motorcykler", "120.000+ entusiaster", anmeldelser/stjerner, "svartid inden for 2 timer",
  "3x flere henvendelser", "Autoriseret forhandler", Google/Facebook/Apple-login, beskeder, visninger/+24 %.
  Alt vises kun, hvis det findes i data. Ellers udelades det.
- **Fiktive specifikationer og AI-fotos** i billederne kopieres ikke.
- **Billedgallerier/kontaktdata fra kilder** (bryder repoets ufravigelige regler, se `CLAUDE.md`).

## 5. Principper for nye komponenter og sidefamilier

1. Start fra eksisterende komponent og tokens. Ny komponent kun med navngiven brugerfordel.
2. Mørk og lys tilstand skal begge virke (kontrast ≥ AA), og 360 px bredde må ikke give vandret scroll.
3. Data først: vis det oplyste, skriv "Ikke oplyst" ellers. Intet gæt.
4. Hver sidefamilie (type / mærke / region / kørekort / guide) deler skabelon: hero → søg → udvalgte annoncer → "Sådan virker" / forklaring → cross-links → FAQ.
5. SEO: én h1, unik title/description, canonical, JSON-LD hvor data findes, intern linkning til søsterfamilier.
6. Hver ændring: Builder tester selv → blind Critic med frisk kontekst → først da "verificeret".
