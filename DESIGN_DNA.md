# Bikerbasen — Design DNA

## ⚠ DESIGN PRIORITY OVERRIDE (15.10.2026, ejeren) — gælder FØR resten af dokumentet

De 10 billeder i `C:\Users\pasca\Desktop\Bikerbasen billeder` er nu det **primære visuelle og strukturelle mål**, ikke løs inspiration.
Ved konflikt mellem nuværende layout og billedets layout **vælges billedets**, medmindre der er stærk teknisk, UX- eller forretningsmæssig grund.

**Billede → sidefamilie** (filnavnenes endelse -1…-10): 1 Forside · 2 Søgeresultater · 3 Annoncedetalje · 4 Opret annonce · 5 Mine annoncer/profil · 6 Login/opret konto · 7 Kørekort A2 · 8 Typeside (Sport) · 9 Mærkeside (Yamaha) · 10 Guide/artikel.
Prioriteret rækkefølge: Forside → Søgning → Annonce → Kørekort → Mærke → Type → Guide → Opret annonce → Login → Profil.

**Tages fra billederne (så tæt som muligt):** sidekomposition og sektionsrækkefølge · hero med foto + overlappende søgekort + 4-ikon tillidsrække · mere informative annoncekort (kørekortbadge, ccm/hk/kg-chips, sted, kildetype) · typefliser med foto og antal · "Sådan virker Bikerbasen" · CTA-panel ved siden af annoncerækken · populære mærker / kørekort / region som tre kolonner · filtersidebar + aktive filter-chips + sortering + grid/liste · annoncedetalje med galleri, faktatabel, sælgerboks, "Kan du køre denne?", "Det bør du tjekke", lignende · trinbaseret opret-annonce med live-forhåndsvisning og tips-bokse · login/opret to-kolonne · dashboard med statkort og annonceliste · guide med indholdsfortegnelse og "Kort fortalt".
Hvid/lys sidekrop, hvid topbar, kort med rolig skygge og runde hjørner, grønne ✓ til positive punkter.

**Bevares (brandet):** navn "Bikerbasen" + logo · tone (ærlig, dansk, ingen overdrivelser) · domæne/indhold/data/funktion · den orange/kobber **brandfarve som primær CTA-farve** (billedernes grønne CTA erstattes af brandfarven; grøn kun til ✓/verificeret) · både lys og mørk tilstand skal virke (lys er målet at ligne billederne mest) · de juridiske regler i `CLAUDE.md`.

**Stadig forbudt at kopiere fra billederne (opdigtet):** konkrete tal ("12.842", "120.000+", "3x flere"), anmeldelser/stjerner, "svartid", "autoriseret forhandler", Google/Facebook/Apple-login, beskeder, visningstal/+24 %, fiktive specs, AI-fotos som annoncebilleder. Moduler uden ægte data **udelades eller bygges som ærlig version** (fx tal beregnes fra lageret). Ingen billedgallerier/kontaktdata fra kilder.

**Critic spørger nu også:** "Matcher dette tydeligt billedets opsætning?" · "Er vi tæt nok på billedets struktur?" · "Er vi stadig for tæt på det gamle site, hvor vi burde have været mere modige?"

---
(Resten er det oprindelige DNA; hvor det modsiger overriden, gælder overriden.)

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
