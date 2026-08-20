# DECISIONS — delte beslutninger mellem buildere

**Læs denne fil FØR du opfinder noget. Skriv i den, når du beslutter noget,
en anden builder kan komme til at opfinde igen.**

Kritikere må IKKE læse denne fil.

---

## Sådan skriver du her

Én blok pr. beslutning. Kort. Hvad, hvorfor, og hvor det står.

```
### <kort navn>  — <din piece>, <dato>
HVAD: ...
HVORFOR: ...
HVOR: <fil:linje>
```

---

## Låst fra start (ikke til forhandling uden at spørge mennesket)

### Stakken er den, der er
HVAD: Statiske HTML-sider + vanilla JS i `js/*.js` + `css/styles.css`, data fra
Supabase via `js/backend-bridge.js`. Ingen build, intet framework, ingen bundler.
HVORFOR: Siden er live på bikerbasen.dk (GitHub Pages, CNAME). En framework-
migrering er ikke en forbedring, køberen kan se — og den ville koste hele
runden. Gulvet (Lighthouse 95+) er i øvrigt lettere at holde uden framework.
HVOR: `index.html`, `js/`, `css/styles.css`

### Sproget er dansk, skrevet ikke oversat
HVAD: Al brugervendt tekst på dansk. Priser `129.500 kr.`, datoer `16. aug. 2026`.
Kodekommentarer er også danske i dette repo — følg tonen: forklar HVORFOR,
og skriv hvad der gik galt før, hvis du retter noget.
HVOR: hele repoet

### CSS er én fil, og vi deler den
HVAD: Alt ligger i `css/styles.css`. Tilføj i DIN egen sektion nederst med en
kommentarheader `/* ===== <piece> ===== */`. Rør ikke andres sektion.
Ændrer du en delt token eller en delt komponent (`.card`, `.badge`, `.btn`),
SKAL det stå her i filen først.
HVORFOR: Fem buildere i samme fil uden en regel giver merge-konflikter og
tilfældig visuel drift.

### Design-tokens findes allerede — opfind ikke nye
HVAD: `var(--color-surface)`, `--color-fg-muted`, `--color-border`,
`--color-primary`, `--radius-pill`, `--shadow-sm`, `--space-*`, `--font-display`.
Brug dem. Hardcode aldrig en farve.
HVORFOR: Temaskift (lys/mørk) går gennem tokens. En hardcodet farve er en
komponent, der bryder i mørk tilstand.

### Ærlighed slår fuldstændighed
HVAD: Vis aldrig et felt, vi ikke har dækning for. Mangler tallet, skriv
"Ikke oplyst". Er værdien udledt, skal den kunne skelnes fra en oplyst værdi.
HVORFOR: Det er repoets eksisterende linje (se `koerekortForListing()` i
`js/data.js` og `passerKoerekort()`), og det er det, tillidskategorien i
RUBRIC.md måler. Et gættet felt vejer tungere imod os end et manglende.
HVOR: `js/data.js`, `js/components.js`

### Kørekort er vores ene strukturelle fordel
HVAD: A1/A2/A udledes af ccm + hk. Uden hk og over 125 ccm er svaret `null` —
ikke et gæt. Se `koerekortForListing()`.
HVORFOR: Bilbasen har ingen motorcykler og kan slet ikke svare på spørgsmålet
(GAPS.md, gap 1). Det er den ene ting, en bilside aldrig kan tage fra os.
Byg videre på det; lav det ikke om.

---

## Truffet undervejs

<!-- Buildere skriver herunder -->

### Sælgerens identitet er synlig udlogget — kun kontaktvejen er bag login — annoncedetalje, 16.08.2026
HVAD: Udlogget viser annoncesiden nu sælgertype (Forhandler/Privat sælger), by,
bedømmelse, medlem-siden og — for forhandlere — navn og evt. oplyst CVR.
Telefonnummer og kontaktflade er stadig bag login for begge typer. Privat
sælgers NAVN er også bag login.
HVORFOR: Skellet er personoplysningen, ikke sælgertypen. En virksomheds navn og
CVR er offentlige og stod på søgeresultatets kort i forvejen — vi skjulte altså
noget, vi selv viste to klik tidligere, netop på den side hvor beslutningen om
80.000 kr. træffes. Bilbasen viser hele forhandlerkortet udlogget
(bar/03-annonce-detalje-desktop-1440.png). Skrabning og uønskede henvendelser
kommer fra telefonnummeret, ikke fra sælgertypen.
HVOR: `js/annonce.js` — `saelgerKortHTML()`

### Felter, vi ikke har dækning for, får ingen plads — heller ikke en tom
HVAD: Telefonknap vises kun når der ER et nummer (public_profiles udstiller ikke
telefon). "Ring op"-knappen i mobilbjælken forsvinder tilsvarende. Bedømmelse,
anmeldelser og medlem-siden udelades enkeltvis, når tallet mangler — i stedet
for "–". Friskhedslinjen på annoncen vises kun når `createdAt` findes, så
eksterne annoncer (createdAt = null med vilje) ikke får en gættet alder.
HVORFOR: Repoets linje, jf. "Ærlighed slår fuldstændighed". Et "–" i feltet
Bedømmelse ligner en dårlig karakter; et felt, der ikke er der, ligner et felt,
der ikke er der.
HVOR: `js/annonce.js` — `saelgerKortHTML()`, `renderListing()`

### Kontaktformularen kvitterer med det, vi kan bakke op — ikke med "sendt"
HVAD: Efter afsendelse skifter modalen til en kvittering i stedet for en toast
med "Din besked er sendt til sælgeren". Kvitteringen siger, at henvendelsen er
registreret på annoncen (record_listing_event), gentager de ønsker køberen
krydsede af, og giver telefonnummeret som den vej, der virker i dag.
HVORFOR: Der findes ingen beskedtabel i basen — teksten blev ingen steder af,
så den gamle toast var direkte usand, og køberen sad og ventede på et svar, der
aldrig kunne komme. Bygger nogen beskedlevering, er det HER teksten skal sendes
fra (`fuldBesked` er markeret i koden).
HVOR: `js/annonce.js` — submit-handleren; `annonce.html` — `#contact-receipt`

### Ny sektion i styles.css skal registreres i scripts/inline-critical.js
HVAD: `css/styles.css` loades asynkront (preload-swap). En ny sektion når derfor
IKKE første maling, før dens navn står i `PAGES` for den relevante side i
`scripts/inline-critical.js`. `annoncedetalje` er tilføjet for `annonce*.html`.
HVORFOR: Sektionen indeholder `#listing-detail:empty{min-height:100vh}`, som
reserverer pladsen før js/annonce.js fylder kassen. Lå reglen kun i det
asynkrone ark, fandtes den ikke i det øjeblik den skulle virke, og
"Lignende annoncer" + footeren blev skubbet en hel side ned (målt CLS 0,49).
NB: `node scripts/inline-critical.js` skriver til ALLE 14 HTML-sider. Kører du
den midt i en runde, hvor andre buildere har ubyggede CSS-ændringer, ruller den
deres ændringer ud i deres sider. Tjek `git status` bagefter.
HVOR: `scripts/inline-critical.js` — `PAGES`, linjen for `annonce(-.+)?\.html`

### 016 er skrevet, men IKKE koert — backend-sikkerhed, 16.08.2026
HVAD: `supabase/016_luk_skrivehul.sql` laa som utracked fil fra en tidligere
builder. Den er verificeret mod produktion og er stadig ukoert: begge views har
`security_invoker=off`, og alle ni funktioner har stadig `=X/postgres` (EXECUTE
til PUBLIC) og `search_path=public`.
HVORFOR: Vigtigt for den naeste, der laeser advisor-rapporten og tror fundene er
lukkede. De er beskrevet, ikke lukket. 016 skal koeres FOER 017.
HVOR: `supabase/016_luk_skrivehul.sql`

### Sikkerhed i 016, ydelse i 017 — backend-sikkerhed, 16.08.2026
HVAD: 017 duplikerer intet fra 016. 016 tager ERROR + WARN (views, RPC-flade,
search_path, RLS uden politikker). 017 tager de to INFO-ydelsesfund:
syv fremmednoegler uden index og atten RLS-politikker, der genevaluerede
`auth.uid()` pr. raekke.
HVORFOR: To filer med hvert sit formaal kan rulles tilbage hver for sig. Bland
dem, og en fejl i et index tvinger dig til at rulle en sikkerhedsrettelse tilbage.
HVOR: `supabase/017_ydelse.sql`

### public_profiles bliver SECURITY DEFINER — ERROR'en staar aaben
HVAD: Raadgiverens ERROR nr. 1 lukkes IKKE. View'et beholder
`security_invoker=off`; 016 fjerner i stedet skriverettighederne, saa det kun
kan laeses.
HVORFOR: `profiles` har kun politikken "profil: læs egen". Med invoker ville en
udlogget faa nul raekker, og saelgernavnet forsvandt fra hvert annoncekort. En
`using(true)`-politik er vaerre: `js/supabase-api.js:95` henter egen profil med
`select('*')`, saa kolonne-privilegierne kan ikke skrues ned uden at braekke
login. Rigtig loesning: flyt phone, cvr og stripe_*-felterne til en separat
privat tabel — det kraever frontend-aendringer og hoerer ikke til i en migration.
HVOR: `supabase/016_luk_skrivehul.sql` afsnit 3

### Ubrugte indexes roeres ikke — backend-sikkerhed, 16.08.2026
HVAD: De syv indexes med nul scanninger bliver liggende. Kun en note i 017.
HVORFOR: `listings` har én raekke. Planlaeggeren vaelger seq scan uanset hvad, saa
taelleren maaler trafikken — ikke indexet. Hvert af dem svarer til en soegevej,
siden allerede har (filterpanel, udstyrsfilter, A1/A2/A). Samlet pris: 136 kB.
HVOR: `supabase/017_ydelse.sql` afsnit 4

### Saelgerprofilen siger hvad oplysningerne ER VAERD — saelgerprofil, 16.08.2026
HVAD: `forhandler.html` har et fast afsnit "Om saelgeren" med praecis de syv
felter, `public_profiles` udstiller, plus to talte tal (aktive annoncer,
seneste annoncedato). Under listen staar: "Ingen af oplysningerne er
kontrolleret af Bikerbasen. De er tastet ind af saelgeren selv. Vi slaar ikke
op i CVR- eller MitID-registret."
HVORFOR: Bilbasens forhandlerside (bar/04-*.png) viser adresse, aabningstider,
telefon, kort og hjemmeside og lader koeberen SLUTTE, at nogen har tjekket det.
Vi har ingen af de felter og kan ikke vinde paa maengde. Det vi kan, er at
sige hvor tallene kommer fra. Det er samme linje som `verifiedBadgeHTML()` i
`js/components.js` (der returnerer tom streng, fordi ingen verificering er
rigtig) — bare sagt hoejt i stedet for udeladt.
HVOR: `js/forhandler.js` renderOplysninger()

### Telefonknappen paa profilen er FJERNET — saelgerprofil, 16.08.2026
HVAD: "Vis telefonnummer" er vaek fra `forhandler.html`. Der er nu én
kontaktvej: "Skriv om en annonce", som gaar til saelgerens nyeste annonce.
Har saelgeren nul aktive annoncer, staar der ingen knap — kun en linje der
forklarer, at kontakt paa Bikerbasen gaar gennem en annonce.
HVORFOR: `public_profiles` har ingen telefonkolonne, saa `seller.phone` var
altid null. Knappen sendte til login, og efter login var nummeret stadig
null — en blindgyde i to trin. "Skriv besked" pegede paa `listings[0]` og
gjorde bogstavelig talt ingenting, naar listen var tom (alle tre rigtige
profiler har nul annoncer lige nu). Samme regel som paa annoncesiden:
knappen findes kun, naar den kan gennemfoeres.
HVOR: `js/forhandler.js` renderIdentitet()

### Faner er vaek fra saelgerprofilen — saelgerprofil, 16.08.2026
HVAD: De tre faner (Aktive annoncer / Anmeldelser / Om saelgeren) er
erstattet af én side: helt, to spalter (annoncer + oplysninger), anmeldelser
nederst. Paa mobil kommer oplysningsspalten foer annoncerne.
HVORFOR: Tillidsspoergsmaalet i bar/RUBRIC.md er formuleret "uden at klikke",
og to af de tre faner indeholdt netop dét, svaret bestaar af. En fane, der
skjuler svaret, taber spoergsmaalet.
HVOR: `forhandler.html` <main>, `css/styles.css` afsnit `/* ===== sælgerprofil ===== */`

### Forhandlerens FIRMANAVN er overskriften — saelgerprofil, 16.08.2026
HVAD: Er `is_dealer` sat og `company` udfyldt, er firmanavnet sidens titel
(h1, `<title>`, brødkrumme-niveau). Personens navn staar som en raekke
"Navn paa profilen" i oplysningerne.
HVORFOR: Firmanavnet er dét, en koeber genkender, googler og slaar op i
CVR-registret — Bilbasen goer det samme ("NBC Biler ApS"). Personnavnet
forsvinder ikke; det faar bare en plads, hvor det ikke forveksles med
virksomheden. Ingen af delene er udledt: begge felter kommer raat fra
`public_profiles`.
HVOR: `js/forhandler.js` renderIdentitet(), renderProfile()

### Anmeldelsesformularen siger betingelsen FOER man skriver — saelgerprofil, 16.08.2026
HVAD: Er backenden slaaet til og brugeren ikke logget ind, vises et
login-link i stedet for formularen, med begrundelsen ("kun indloggede kan
bedoemme — det holder opdigtede anmeldelser nede"). Er det ens egen profil,
staar der det. Formularen findes kun, naar indsendelsen kan lykkes.
HVORFOR: Foer stod formularen aaben for alle, og databasen afviste foerst
efter tryk paa send. En formular, der er doemt til at fejle, koster brugeren
arbejdet OG siden dens troevaerdighed.
HVOR: `js/forhandler.js` anmeldelsesFormHTML()

### Ingen "–" i bedoemmelsesfeltet — saelgerprofil, 16.08.2026
HVAD: Noegletalsraekken ("– Bedoemmelse / 0 Anmeldelser / N Aktive annoncer")
er vaek. Bedoemmelsen staar som en chip i toppen, KUN naar der findes mindst
én anmeldelse. Annoncetallet staar ét sted i stedet for tre.
HVORFOR: Et "–" i feltet Bedoemmelse ligner en daarlig karakter. Samme regel
som `saelgerKortHTML()` i `js/annonce.js` allerede foelger. Sidegevinst:
mindre JS-udfyldt indhold i helten, og maalt CLS 0,000 paa en ren
indlaesning.
HVOR: `js/forhandler.js` opdaterBedoemmelse()

### Saelgerprofilen kunne slet ikke naas — RETTET I js/annonce.js, 16.08.2026
HVAD: `js/annonce.js` byggede linket som `forhandler.html?id=${s.id}` uden
fallback. `s.id` findes KUN paa annoncer fra databasen
(`normalizeRemoteListing` i js/backend-bridge.js saetter `id: row.seller_id`).
Demosaelgerne i `js/data.js` har navn, men intet id — saa paa alle 51
demoannoncer blev linket bogstaveligt `forhandler.html?id=`, og profilsiden
svarede "Saelgeren findes ikke". Databasen har nul `listings`, saa ALLE
annoncer paa sitet er demoannoncer: profilsiden var uden for raekkevidde.
Noeglen er nu `s.id || s.name`, og knappen falder helt vaek uden begge.
Tilsvarende accepterer `hentSaelger()` i `js/forhandler.js` nu en ikke-uuid
ved at slaa op i de lokalt indlaeste annoncer i stedet for at give op —
en ikke-uuid naar aldrig Postgres, og i drift er `LISTINGS` tom, saa en
opdigtet noegle giver stadig "findes ikke".
HVORFOR: Jeg roerte `js/annonce.js`, selvom den tilhoerte en anden builder.
Orkestratoren frigav filen, den anden agent var faerdig, og `git diff`
viste ingen konflikt med mit indgreb. Rettelsen hoerer til min piece: en
profilside, ingen koeber kan naa, scorer nul paa tillid uanset udseende.
HVOR: `js/annonce.js` saelgerKortHTML() (profilNoegle/profilKnapHTML),
`js/forhandler.js` hentSaelgerLokalt()/hentSaelger()

### "Se saelgerprofil" er nu synlig UDLOGGET — men kun for forhandlere
HVAD: Knappen laa foer udelukkende i den indloggede gren af
`saelgerKortHTML()`. Den staar nu ogsaa paa det udloggede kort, naar
saelgeren er en forhandler. Privatsaelgere faar den fortsat foerst efter login.
HVORFOR: Skellet er `js/annonce.js`' eget, dokumenteret i kommentaren over
funktionen: forhandlerens navn og by er offentlige og staar allerede paa
kortet, mens privatsaelgerens navn er skjult indtil login. Et link til
"Anders Hansen" ville afsloere praecis det, kortet lige havde holdt tilbage.
Og enhver kritiker er udlogget (bar/RUBRIC.md, GAPS.md gap 6) — laa linket
kun bag login, var siden usynlig for dem, der doemmer den.
HVOR: `js/annonce.js` saelgerKortHTML(), udlogget gren

### "Firmanavn: Ikke oplyst" er fjernet — det var et gaet
HVAD: Faktalisten skriver kun "Firmanavn", naar `company` faktisk findes, og
kun "Navn paa profilen", naar navnet er FORSKELLIGT fra sidens overskrift.
HVORFOR: Fundet ved at gaa den rigtige vej ind paa siden: paa en demoforhandler
stod "Firmanavn: Ikke oplyst" direkte under overskriften "Motorcykel Centret
ApS". Linjen modsagde overskriften, og "Ikke oplyst" var en paastand — vi ved
ikke, om forhandleren mangler et firmanavn, eller om navnet ER firmanavnet;
`public_profiles` skelner ikke. Det er forskellen paa `city` (hvor tom vaerdi
ER en manglende oplysning, og "Ikke oplyst" derfor er rigtigt) og et felt, hvor
vi ikke kender spoergsmaalets svar.
HVOR: `js/forhandler.js` renderOplysninger()

### Doed CSS efterladt med vilje: .profile-tabs og .profile-stats-row
HVAD: De to regelsaet i `css/styles.css` (afsnit "Profile / dealer page") har
ingen brugere tilbage, efter fanerne forsvandt fra `forhandler.html`. De er
IKKE slettet.
HVORFOR: De staar ogsaa i den inlinede kritiske CSS i hver eneste HTML-fil
(genereret af `scripts/build-meta.js`), saa en sletning i styles.css rydder
alligevel ikke op — den skaber bare uenighed mellem de to kopier. Ryddes de
op, skal det ske begge steder i samme ombaering.
HVOR: `css/styles.css:1559-1563`

### ALTER POLICY frem for drop + create
HVAD: De atten politikker omskrives med `alter policy`, ikke `drop policy` +
`create policy`.
HVORFOR: Navn, rolle og kommando bevares, og der er intet oejeblik, hvor en
tabel staar uden politik. Et mislykket `create` efter et gennemfoert `drop`
ville efterlade tabellen aaben — praecis det, migrationen skal undgaa.
HVOR: `supabase/017_ydelse.sql` afsnit 2

### Forsidens antal kommer fra lageret — og først når lageret har svaret — forside, 16.08.2026
HVAD: Hero'ens "383 motorcykler til salg i dag", tallet på søgeknappen og
live-tællingen bygger alle på `Store.getAllListings()`. Intet af det skrives,
før `backendReady()` er kørt (flaget `dataKlar` i `js/home.js`).
HVORFOR: Uden gaten talte forsiden det, der tilfældigvis lå i JS'en, mens
netværket kørte — på localhost demolageret (51), mens de 332 indekserede først
kommer med databasen. Forsiden skrev derfor "51 motorcykler til salg i dag" i
cirka et sekund og rettede sig så til 383. Et tal, der retter sig selv, er
værre end intet tal. Højden er reserveret i CSS (`.hero-count`), så ventetiden
ikke koster et layouthop. Efterprøvet: sekvensen er nu tom → 383, uden mellemtrin.
HVOR: `js/home.js` (`dataKlar`, `opdaterHero`), `css/styles.css` `.hero-count`

### Hero'ens tal skal stemme med søgesidens — forside, 16.08.2026
HVAD: `heroListe()` bruger samme tre regler som `anvendFiltre()` i
`js/search.js`: pris uden værdi matcher ikke et maks-filter, ukendt type tælles
ikke med, og kørekort afgøres af `passerKoerekort()`. Tal formateres `da-DK`.
HVORFOR: Et hero-tal på 15 og en resultatside på 12 er en løgn, køberen opdager
med det samme. Efterprøvet i browseren: hero'en og `soegning.html?koerekort=A2`
siger begge 15.
HVOR: `js/home.js` — `heroListe()`

### Hero'en siger, hvor mange vi ikke kan svare for — forside, 16.08.2026
HVAD: Vælger man A1/A2, skriver hjælpelinjen under vælgeren, hvor mange
annoncer der blev valgt fra, fordi oplysningen mangler ("A2: maks. 48 hk. 332
annoncer mangler den oplysning, der afgør det, og vises ikke.").
HVORFOR: `passerKoerekort()` kan kun sige ja eller nej, og et nej dækker både
"for kraftig" og "hk er ikke oplyst". Uden forskellen ligner et fald fra 383 til
15 en tom markedsplads i stedet for en manglende kolonne hos kilden — og så
taber vores ene strukturelle fordel (GAPS.md, gap 1) i stedet for at vinde.
Tallet udledes ved at spørge `passerKoerekort()` igen med de manglende felter
sat til den mindst tænkelige rigtige mc (1 hk, 1 cm³) — ingen grænse gentages.
FÆLDE: `koerekortForListing() === null` duer IKKE som mål for det. En 650 cm³
uden hk har ingen kendt kategori, men er helt sikkert ikke A1 (A1 HAR en
ccm-grænse). Med den første udgave påstod linjen 321, hvor det rigtige tal er 12.
HVOR: `js/home.js` — `skjultAfUvidenhed()`, `uoplysteSkjult()`

### Kuraterede sektioner kræver foto — nyeste gør ikke — forside, 16.08.2026
HVAD: "Udvalgte annoncer" vælger nu annoncer over 60.000 kr. MED foto (egne før
indekserede). "Nyeste annoncer" er urørt og står stadig i datorækkefølge.
Underrubrikken blev rettet fra "Kuraterede fund fra hele landet" til "Et udpluk
af de dyrere modeller, der er til salg lige nu".
HVORFOR: To af de fire "kuraterede fund" var stregtegninger med "Intet foto"
under overskriften — det er ikke et fund, det er et hul, og lageret har 256
annoncer over 60.000 kr. med foto. Det er ikke at skjule noget: de billedløse
tæller stadig i totalen, i søgningen og i "Nyeste", hvor rækkefølgen er et løfte
om dato og derfor ikke må pyntes. Underrubrikken skulle med, fordi udvalget
vælges på pris og foto — ikke på geografi.
HVOR: `js/home.js` bid 7, `index.html` sektionen "Udvalgte annoncer"

### Kun hero-fotoet er eager på forsiden — forside, 16.08.2026
HVAD: Alle annoncekort på forsiden tegnes med indeks forskudt med 1
(`kortHTML`), så `listingCardHTML()` ikke giver kort nr. 0
`loading="eager" fetchpriority="high"`.
HVORFOR: Reglen i `js/components.js` er rigtig på en resultatliste, hvor kort 0
kan ligge over folden. På forsiden fylder hero'en hele første skærm: første kort
ligger målt 2.679 px nede ved 1440×900. Et højprioriteret billede så langt under
folden kan kun konkurrere med hero-fotoet, som ER forsidens LCP. Målt: kun
`.hero-photo` har `fetchpriority="high"`, alle kortbilleder er `lazy`.
HVOR: `js/home.js` — `kortHTML`

### .kk-field må ikke have flex-basis, når rækken bliver en kolonne — forside, 16.08.2026
HVAD: `.kk-field{ flex:0 0 auto }` under `@media (max-width:699px)`.
HVORFOR: `flex:1 1 300px` betyder "300 px bred" i den vandrette desktoprække,
men "300 px høj", når `.search-row-2` skifter til `column` på mobil. Feltet blev
målt til 300 px med 120 px indhold: 180 px dødt luft mellem kørekortpillerne og
søgeknappen. Efter rettelsen er søgekortet 513 px i stedet for 701 px, og den
primære CTA ligger over folden på 390×844 (knappens underkant 684 af 844).
HVOR: `css/styles.css` — hero/søgekort-sektionen

### Standardsorteringen er "Mest relevante", ikke "Nyeste først" — søgning, 16.08.2026
HVAD: Ny sortering `relevans`, valgt som standard. Den rangerer efter, hvor
mange af købers spørgsmål annoncen svarer på (pris, km og kørekort vejer 2;
årgang, ccm, hk, stand og en rigtig beskrivelse vejer 1 — kun oplyste felter,
aldrig et gæt), og FORDELER derefter annoncerne uden foto jævnt ud over
resultatet, så deres andel af hver side svarer til deres andel af lageret.
"Nyeste først" står uændret som næste valg i vælgeren.
HVORFOR: "Nyeste først" sorterede ikke efter alder. 332 af 383 annoncer har
ingen createdAt (de indekserede — vi kender ikke datoen hos kilden og gætter
den ikke), og det ukendte sorteres altid bagest. Standardsiden blev derfor de
51 egne annoncer, og ingen af dem har uploadet foto: side 1 var 24 kort uden
ét billede, altså 13 % af lageret og præcis den del, der ikke kan skannes.
Fordelingen frem for "billedløse bagest", fordi side 1 så ville blive 24 kort,
der alle siger "Hos MC Syd" og alle fører væk fra siden — uden hk, stand,
beskrivelse eller kørekortkategori. Begge yderpunkter er en side, der ikke
ligner det lager, den påstår at vise. Målt efter: 21 med foto og 3 uden pr.
side, hele vejen igennem. Vi opfinder ikke fotos og skjuler ikke, at de
mangler — kortet siger stadig "Intet foto".
HVOR: `js/search.js` — `relevansRaekkefoelge()`, `annonceOplysthed()`,
`SORTERINGER`; `soegning.html` — `#sort-select`

### Pladsholderen for "intet foto" er lavet om — men KUN på søgesiden — søgning, 16.08.2026
HVAD: På `body.srp` er `.card-media`/`.row-media` uden foto nu et panel med én
diagonal farverampe, tegningen som et mindre emblem i midten og "Intet foto"
som billedtekst UNDER emblemet i stedet for en pille oven på det. Tegningens
egen baggrund (`<rect>` i `bikeArtSVG()`) slukkes, så feltet har én flade.
**RETTELSE 17.08.2026 (C-007):** der er ingen tegning mere. `bikeArtSVG()`
kaldes ingen steder — pladsholderen er "Ingen fotos i denne annonce" fra
`listingMediaHTML()`. Sætningen om `<rect>`'en beskriver en afhængighed til en
død fil, og den skal ikke genopfindes. Resten af beslutningen (panelet, ét
flade, teksten under i stedet for oven på) står ved magt.
HVORFOR: Kortet er en delt komponent — `js/components.js` tegner den samme
pladsholder på forsiden, og forsiden har en anden ejer lige nu. Reglerne er
derfor scopet til `.srp` frem for at ændre komponenten for hele sitet.
**Forsidens ejer må gerne overtage dem:** fjern `.srp ` fra selektorerne i
`/* ===== søgning ===== */`, så gælder de overalt. Teksten er uændret; det var
formen, der lignede et hul.
HVOR: `css/styles.css` — `/* ===== søgning ===== */`; `soegning.html` — `<body class="srp">`

### Pladsreservationer for søgesiden ligger i soegning.html, ikke i styles.css — søgning, 16.08.2026
HVAD: `#filter-koerekort:empty`, `#filter-types:empty`,
`#filter-price-quick:empty`, `.results-headline`, `.view-toggle button` og de
tomme ikonpladser får min-højde/-bredde i `<style id="soeg-perf">`.
HVORFOR: `css/styles.css` hentes med `rel=preload` og lander EFTER første
maling. En reservation, der først gælder, når stilarket er kommet, kommer for
sent: lagt i styles.css gav den 0,049 CLS ved 588 ms i stedet for 0,115 ved
1.410 ms. Kun den indlejrede stil gælder ved første maling. Målt efter: CLS
0,016 på 1440×900 og 0,000 på 390×844, og resten er headerens hydrering.
BEMÆRK for den, der rører `scripts/inline-critical.js`: reglerne er med vilje
IKKE i den kritiske blok, fordi de kun gælder søgesiden.
HVOR: `soegning.html` — `<style id="soeg-perf">`

### scripts/build-srp.js forudtegner ikke længere den rigtige rækkefølge — søgning, 16.08.2026
HVAD: Scriptet sorterer `date-desc` og henter kun VORES annoncer fra Supabase.
Med relevans som standard rammer det ikke længere det, `js/search.js` tegner.
Blokken i `soegning.html` står tom i dag (`<!--srp:start--><!--srp:end-->`), så
der er ingen forkert markup lige nu.
HVORFOR: Scriptet kan ikke kende de indekserede annoncer — de kommer fra
`js/backend-bridge.js` i browseren — så en forudtegnet side vil altid være en
anden rækkefølge end den, brugeren ender med. Køres `node scripts/build.js`,
skal build-srp enten lære relevansrækkefølgen at kende (og hente de eksterne)
eller holdes ude af kæden. Ikke rørt her: filen er ikke min, og den skriver i
flere sider end søgesiden.
HVOR: `scripts/build-srp.js`

### Bedømmelsen regnes ét sted — og LØGNEN OPSTOD TO STEDER — sælgerprofil, 16.08.2026
HVAD: `Store.getAverageRating()` i `js/store.js` er nu den eneste kilde til et
stjernetal. Den tager ikke længere et `fallback`-argument, og den giver `null`
under `Store.MIN_ANMELDELSER_FOR_SNIT` (= 3).
HVORFOR: Kritikeren kaldte tallene "aritmetisk umulige". De var det ikke — men
de var uefterviselige, og det er værre, fordi ingen kan modbevise dem. To
uafhængige fejl:
1. **Et opdigtet tal ved siden af de rigtige.** `js/data.js` gav hver demosælger
   `rating: (4 + rnd()*0.9).toFixed(1)` og `reviews: 3 + Math.floor(rnd()*140)`.
   Målt: "Motorcykel Centret ApS" bar `rating: "4.7"` og `reviews: 120` — med
   ÉN anmeldelse i SEED_REVIEWS. `js/annonce.js:801` sendte `seller.rating` ind
   som reservetal, så en sælger uden en eneste anmeldelse fik en bedømmelse.
2. **Billedet rundede op, tallet gjorde ikke.** SEED_REVIEWS gav HALVE stjerner
   (`Math.round((3.5+rnd()*1.5)*2)/2` → 3,5/4/4,5/5), og `starsHTML()` tegnede
   dem med `Math.round()`. En anmeldelse på 4,5 fik fem fyldte stjerner. Derfor
   stod "4,5 af 1 anmeldelse" over noget, der SÅ ud som en femmer, og "3,8 af 2"
   over to firere (de rigtige tal var 4 og 3,5). Gennemsnittet var korrekt hele
   vejen — det var billederne, der løj.
Ingen bruger kan afgive en halv stjerne (stjernevælgeren giver 1-5,
`db.addReview()` sender et helt tal), så demoværdien var en løgn om systemet.
SEED_REVIEWS giver nu hele stjerner 3-5, og `starsHTML()` fylder hver stjerne
proportionalt i stedet for at runde op.
HVOR: `js/store.js` `getAverageRating()`/`MIN_ANMELDELSER_FOR_SNIT`,
`js/data.js` (seller-objektet + SEED_REVIEWS), `js/forhandler.js` `starsHTML()`

### Grænsen er tre anmeldelser — og ANTALLET vises altid — sælgerprofil, 16.08.2026
HVAD: Under tre anmeldelser vises intet gennemsnit. Antallet vises altid, og
anmeldelserne skjules aldrig. Tre tilstande: ingen anmeldelser (som før),
1-2 (chip med antal + linje der siger hvorfor der ikke står et snit), 3+
(tal og antal side om side).
HVORFOR: Et snit af én mening er ikke en statistik, men ser autoritativt ud —
og decimalen ("4,5") lover en præcision, ét datapunkt ikke kan bære. Ved 1 og 2
anmeldelser rummer tallet desuden ikke ét gran mere information end de
anmeldelser, der står lige nedenunder: det er enten selve karakteren eller
midtpunktet mellem to. Tre er det mindste antal, hvor én utilfreds eller
begejstret køber ikke ejer hele tallet. At skjule ANTALLET ville være den
modsatte fejl — det er en oplysning, vi har fuld dækning for — så chippen står
med antal alene og linker ned til anmeldelserne. Ingen "–" nogen steder, jf.
"Ærlighed slår fuldstændighed".
HVOR: `js/forhandler.js` `gennemsnit()`, `renderAnmeldelser()`,
`opdaterBedoemmelse()`; `css/styles.css` `.profil-karakter-uden-snit`

### RETTET I DELT KODE: js/store.js og js/data.js — rammer også annonce og dashboard
HVAD: Rettelsen ligger ved RODEN, ikke på sælgerprofilen. Det rammer tre steder
uden at deres filer er rørt:
- `js/annonce.js` sælgerkort: viser nu "4,3 ★ Bedømmelse / 4 Anmeldelser" hvor
  tallet kan udledes, KUN antallet ved 1-2, og hverken-eller ved 0. Filen er
  ikke ændret — `saelgerKortHTML()` udelod i forvejen felter med `null`, så
  den rigtige adfærd kom af sig selv. Efterprøvet på annonce 1001/1003/1004.
- `js/dashboard.js:219` viser `'–'`, når sælgeren har under tre anmeldelser.
  Samme streg stod der før ved nul. Ikke rørt (ikke min fil), men den, der
  ejer dashboardet, bør fjerne stregen som på profilen.
- `js/components.js` `listingCardHTML()` viser slet ingen bedømmelse — søgesiden
  og forsiden er derfor ikke berørt.
HVORFOR: Kritikeren så de forkerte tal på annoncernes sælgerkort OG på profilen.
Var fejlen rettet i `js/forhandler.js` alene, ville profilen sige ét og annoncen
noget andet om den samme sælger — og annoncefilerne er låst denne runde.
HVOR: `js/store.js`, `js/data.js`

### Demolageret skal vise ALLE tilstande, ikke kun den pæne — sælgerprofil, 16.08.2026
HVAD: SEED_REVIEWS giver nu 0-6 anmeldelser pr. sælger i stedet for 1-4. Målt
fordeling over de 37 demosælgere: 9 med nul, 8 under grænsen, 20 med et snit.
HVORFOR: Før havde HVER demosælger mindst én anmeldelse, så den tomme tilstand
— dén, hver eneste rigtige profil i databasen står i — fandtes ikke noget sted,
en kritiker kunne klikke hen. Et demolager, der kun viser den flatterende
tilstand, er en anden slags løgn: det gør siden umulig at bedømme på det, den
faktisk vil se ud som i drift.
HVOR: `js/data.js` SEED_REVIEWS

### Anmeldelsesformularen var STADIG åben udlogget — gaten greb aldrig
HVAD: Runde 1's login-gate lå bag `if (!db.enabled || !seller.id)`. Alle 51
demosælgere kendes på NAVN og har intet `seller.id` (se `hentSaelgerLokalt()`),
og databasen har nul annoncer — så hver eneste profil, en besøgende faktisk kan
nå, faldt i den ÅBNE gren. Efterprøvet udlogget: formularen stod der, og
`Store.addReview()` skrev anmeldelsen ind uden ét spørgsmål. Login er nu første
betingelse for alle. Dertil: feltet "Dit navn" er væk (navnet kommer fra kontoen
— før kunne man skrive hvad som helst, og skrev man intet, stod der "Anonym
bruger" under en karakter), stjernevælgeren starter på INTET valgt i stedet for
forudfyldte 5 stjerner, og en demosælger får en linje om, at bedømmelsen kun
gemmes i browserens eget lager.
HVORFOR: En betingelse, der kun gælder i en gren, koden aldrig når, er ikke en
betingelse. Lære til næste gang: gaten skal stå på den EGENSKAB, den handler om
(er brugeren logget ind?), ikke på en indirekte omstændighed (er backenden slået
til, og har sælgeren et id?). En forudfyldt femmer er i øvrigt en stemme, siden
lægger i munden på folk — og det er stemmer, tallet øverst regnes af.
HVOR: `js/forhandler.js` `anmeldelsesFormHTML()`, `wireAnmeldelsesForm()`,
`pickedStars`; `css/styles.css` `.anmeld-krav-lokal`

### Bedømmelsen har nu tests — js/bedoemmelse.test.js, 16.08.2026
HVAD: Ny testfil med ni tests, tilføjet til `npm test` i `package.json`.
Testantallet går fra 115 til 124. Den tunge test går HELE demolageret igennem
og kræver, at hver sælgers viste tal enten ikke findes eller er nøjagtig
gennemsnittet af hans egne anmeldelser. To vagthunde forhindrer, at løgnen
genopstår: ingen demoanmeldelse må have en halv stjerne, og intet
seller-objekt må igen bære et `rating`- eller `reviews`-felt.
HVORFOR: Et forkert gennemsnit giver ingen fejlmeddelelse — kun et tal, der ser
rigtigt ud. Efterprøvet ved at gendanne begge gamle fejl i hukommelsen: begge
får testene til at fejle (51 halve stjerner, 51 opdigtede felter).
FÆLDE for den næste: `SHOW_DEMO_DATA` i `js/data.js` er false i Node med vilje,
så `LISTINGS` og `SEED_REVIEWS` er TOMME uden for browseren. Testen låner derfor
en `location` med `hostname: 'localhost'` (`lavData()`) — uden den passerede to
tests på et tomt lager uden at kontrollere noget.
HVOR: `js/bedoemmelse.test.js`, `package.json`

### koerekortSvar() testes fra js/koerekort.test.js — søgning, 16.08.2026
HVAD: Fem tests for `koerekortSvar()` i `js/search.js` lagt i den eksisterende
`js/koerekort.test.js`. Testantallet går fra 110 til 115.
HVORFOR: Regressionen, der udløste dem (prøveværdien `proeve.power = 0`, som
`hkEllerNull()` læser som UKENDT), gjorde ikke noget forkert synligt — den
gjorde en ærlighedsfunktion tavs: ét klik på A2 skjulte 332 annoncer og meldte
0 skjulte. Den slags giver ingen fejlmeddelelse, kun et mindre tal. Testene
ligger i den eksisterende fil frem for i en ny, fordi `package.json` er delt og
filen allerede er i `npm test` — og fordi de to funktioner hører uadskilleligt
sammen: `koerekortSvar()` kender ingen grænser, den spørger `passerKoerekort()`
to gange. Sidste test er en vagthund på selve prøveværdien.
HVOR: `js/koerekort.test.js` nederst; `js/search.js` — `koerekortSvar()`

### Galleriet viser kun fotos, der findes — annoncedetalje, 16.08.2026
HVAD: `buildPhotoSet()` returnerer nu `listing.photoUrls` og intet andet. Feltet
`listing.photos` læses ikke længere: det er et TILFÆLDIGT tal i demodata
(`4 + rnd()*4`, `js/data.js`) og `Math.max(3, photos.length || 4)` i
`js/backend-bridge.js` — altså mindst tre, også når der er nul. Galleriet har
tre tilstande: flere fotos = karrusel; ét foto = billedet alene (ingen tæller
"1 / 1", ingen pile, ingen miniaturer); nul fotos = ét felt med kameraikon og
teksten "Ingen fotos i denne annonce". De manglende dele FJERNES fra DOM'en,
de skjules ikke — en skjult pil kan stadig tabbes til og læses op.
HVORFOR: En annonce uden ét eneste billede stod med "1 / 4", pil frem, fire
miniaturer og knapper mærket "Billede 1"–"Billede 4", der alle var den samme
tegnede motorcykel. Hele siden havde to `<img>`, og begge var logoet. Samme
annonces kort i søgeresultatet sagde ærligt "Intet foto" — vi løj altså præcis
dér, hvor beslutningen om 80.000 kr. træffes, og fortalte sandheden ét klik
tidligere. Det er "Ærlighed slår fuldstændighed", og det er hele tillids-
kategorien i bar/RUBRIC.md. Efterprøvet: `?id=1003` og `?id=1021` har nu to
`<img>` (begge logoet) og ét felt; med tre injicerede fotos har siden seks
(logo x2 + hovedbillede + tre miniaturer), tæller "1 / 3" og pile, der virker.
HVOR: `js/annonce.js` — `buildPhotoSet()`, `fotoHTML()`, `renderGallery()`,
`shiftPhoto()`, galleriblokken i `renderListing()`

### Det tomme fotofelt genbruger .external-detail-photo-tom's udtryk — annoncedetalje, 16.08.2026
HVAD: `.gallery-tom` er kameraikon, stiplet kant, lav kasse (170 px), dæmpet
tekst — den samme form som `.external-detail-photo-tom`, der allerede står på
den her sidetype, når kilden ikke har sendt et foto med. Kant til kant på
telefon som `.gallery`. Hjerteknappen flytter med ind i feltet.
HVORFOR: Der fandtes to ærlige udtryk i forvejen (søgesidens `.srp`-panel og
`.external-detail-photo-tom`), og et tredje ville gøre ærligheden til en
smagssag. Valget faldt på detaljesidens eget, fordi de to felter svarer på
præcis det samme spørgsmål på præcis den samme side. Søgesidens panel beholder
tegningen som emblem; her er der ingen tegning overhovedet — det var netop
tegningen, der blev udgivet for at være fotos. **De to regelsæt hører sammen:**
ejer nogen begge dele, bør de slås sammen til ét.
HVOR: `css/styles.css` — `/* ===== annoncedetalje ===== */`, `.gallery-tom`

### Sælgernavnet er et link — men kun når navnet står der — annoncedetalje, 16.08.2026
HVAD: `.seller-name` er et `<a>` til `forhandler.html?id=<profilNoegle>`, hvor
nøglen er `seller.id` når den findes (databaseannoncer) og ellers navnet
(demoannoncer 1001+, som kun findes på localhost). Knappen "Se sælgerprofil"
står uændret. Er sælgeren privat og brugeren udlogget, står der "Privat sælger",
og så er der intet link — navnet må ikke lække via adressen.
HVORFOR: Kritikeren fandt navnet som en blindgyde; Bilbasens tilsvarende navn
fører til hele forhandlerens lager. Nøglelogikken er den, der allerede stod i
`profilKnapHTML` — den er bare løftet op, så begge veje bruger den samme.
HVOR: `js/annonce.js` — `saelgerKortHTML()`

### Højre spalte følger med ned og har et kort mere — annoncedetalje, 16.08.2026
HVAD: Sidebaren er nu TO lag — `.listing-aside` (gittercellen, strakt) og
`.listing-aside-inner` (indholdet, `position:sticky` fra 960px) — plus et nyt
kort "Søg videre på Bikerbasen" med fire-fem søgninger, der alle findes: mærke,
kørekort, type, landsdel, alle. Kørekortlinjen kommer kun med, når
`koerekortForListing()` faktisk kunne regne kategorien ud.
HVORFOR: Målt af kritikeren: højre spalte tom fra ca. y=1000 og ned, cirka
halvdelen af desktopsiden hvidt felt ved siden af beskrivelsen. Tomhed ved
siden af sidens længste tekst er ikke ro — det er en spalte, der holder op med
at svare. Ingen af linjerne er gættet, og listen er samme opskrift som
`.external-detail-next`.
**De to lag er ikke pynt:** `.listing-detail` har `align-items:start`, og en
gittercelle med start-justering er kun så høj som sit eget indhold. Sætter man
`position:sticky` direkte på cellen — som `.external-detail-aside` gør i dag —
har elementet nul strækning at klæbe i, og det ruller bare med op. Målt på
første forsøg: elementets top var −332 px ved scrollY 800 i stedet for de 84 px,
`top` beder om. Med cellen strakt og indholdet klæbende er travet 472 px, altså
præcis den tomhed, kritikeren så. **`.external-detail-aside` har samme fejl og
virker ikke i dag** — rettelsen dér er den samme, men den hører til en anden hånd.
HVOR: `js/annonce.js` — `videreKortHTML()` og sidebar-blokken i `renderListing()`;
`css/styles.css` — `.listing-aside`, `.listing-aside-inner`, `.listing-next`

### Specifikationstabellen er flex, ikke grid — annoncedetalje, 16.08.2026
HVAD: `.spec-grid` overskrives til `display:flex; flex-wrap:wrap` og
`.spec-item` til `flex:1 1 calc(50% - 1px)` (33,33 % fra 560px). Overskrivningen
står i `/* ===== annoncedetalje ===== */`; grundreglen i den delte del af filen
er urørt. `.spec-grid` bruges kun her og i `scripts/build-listing-pages.js`,
som spejler den her side.
HVORFOR: Ti faste felter i tre spalter gav en sidste række med to huller, og
hullerne var GRÅ: gitteret tegner sine streger med `gap:1px` oven på en
baggrund i `--color-border`, så alt, der ikke er en celle, står som et farvet
felt. En tom celle i en specifikationstabel læses som en oplysning, der
mangler — ikke som et layout, der slap op. Med flex vokser sidste række ud i
bredden uanset antal felter. Målt: 10 felter, sidste række 702 af 704 px, og
1 px tilbage (kanten). Ingen tomme celler på 1440 eller 390.
HVOR: `css/styles.css` — `/* ===== annoncedetalje ===== */`

### To a11y-fejl lukket: avatarkontrast og "Ring op" — annoncedetalje, 16.08.2026
HVAD: 1) `#listing-detail .avatar{ color: var(--color-primary-hover) }` —
målt 4,19 (#C6420E på #FFE6D9), initialerne er 18px fed og altså ikke "stor
tekst", så kravet er 4,5. `--color-primary-hover` giver 5,4 i lys og 5,7 i mørk
tilstand. Ingen ny farve. Scopet, fordi `.avatar`-grundreglen ligger i den
delte del af filen — `.avatar` bruges i dag kun her, så den, der ejer den delte
del, må gerne flytte rettelsen derop og slette min.
2) Knappen i mobilbjælken hed "Ring op" og havde `aria-label="Vis
telefonnummer"`. Den hedder nu "Vis nummer" uden aria-label. To fejl i ét
element: skærmlæseren læste et andet navn op end det synlige (Lighthouse), OG
"Ring op" var usandt — knappen ringer ikke, den ruller ned til sælgerkortet og
afslører nummeret.
HVOR: `css/styles.css` — `/* ===== annoncedetalje ===== */`; `annonce.html` —
`#bar-phone`

### De nye regler behøvede ikke kritisk CSS — men fik det — annoncedetalje, 16.08.2026
HVAD: Jeg kørte IKKE `scripts/inline-critical.js` selv. Ydelsesbuilderen kørte
den fulde build midt i runden, og den inlinede blok i `annonce.html` indeholder
nu `.gallery-tom`, `.listing-aside`, `.listing-next`, `.spec-grid`-flex'en og
avatarfarven. Efterprøvet: kun `annonce.html` fik dem — sektionen er scopet til
`annonce*.html` i `PAGES`, præcis som noten længere oppe beskriver.
HVORFOR: Ingen af reglerne HAR brug for at være kritiske — alt det, de rammer,
skrives af `js/annonce.js` ind i `#listing-detail` EFTER første maling, så de
kan ikke bidrage til CLS hverken før eller efter. At de er der, skader ikke;
den, der måler ydelsen, skal bare vide, at blokken voksede af den her grund og
ikke af en ny reservation.
Første foto får `fetchpriority="high"` og resten `loading="lazy"` i `fotoHTML()`
— det er ikke en ændring af den kritiske sti, kun en prioritet på et billede,
der hentes alligevel. Jeg har ikke målt LCP; ydelsen ejes af en anden.
HVOR: `js/annonce.js` — `fotoHTML()`; `annonce.html` — `<style id="critical">`

### CLS på tomme tilstande rettes med ét gulv under <main>, ikke pr. tomtilstand — ydelse, 16.08.2026
HVAD: `main#main-content{ min-height: calc(100vh - var(--header-h)) }` er lagt i
sektionen "Pladsreservation for JS-gitre (generisk)" i `css/styles.css` — altså
i den KRITISKE CSS på alle 14 sider.
HVORFOR: De eksisterende `:empty`-reservationer løser kun den ene halvdel:
indhold, der ankommer og skubber NEDAD. Den anden halvdel er indhold, der
ankommer og er MINDRE end det reserverede, så alt nedenunder rykker OPAD — det
tæller lige så meget i CLS. `/annonce.html?id=1` reserverer 100vh til
`#listing-detail`, får en fejlkasse på ~300 px og skjuler `.similar-strip`;
`/forhandler.html` uden `?id=` FJERNER `#profil-krop` og `#profil-anmeldelser`
fra DOM'en. Begge steder sprang footeren op i vinduet. Målt før: 0,205 / 0,260 /
0,294 / 0,294 — alle fire røde mod grænsen på 0,10.
Rettelsen gætter ikke på hver enkelt tomtilstands højde (det ville være fire
tal, der skal vedligeholdes hver gang en tomtilstand ændrer tekst). Den giver
dokumentet et gulv: er `<main>` mindst en skærm høj, ligger footeren under
folden både før og efter JS, og et skub uden for vinduet tæller ikke med.
Ingen almindelig side rører grænsen — de er alle højere end 100vh — så reglen
er usynlig, når der ER indhold.
BEMÆRK: den skal blive i "Pladsreservation"-sektionen. Flyttes den til en
sidesektion, falder den ud af den kritiske blok, og så males footeren ét sted
og flytter sig, når det asynkrone ark lander.
HVOR: `css/styles.css` — sektionen "Pladsreservation for JS-gitre (generisk)"

### .facet-n dæmpes med farve, ikke opacity — ydelse, 16.08.2026
HVAD: `.chip .facet-n{opacity:.7}` er slettet og `.chip.active .facet-n` beholder
kun `color:inherit`. `css/styles.css` (delt komponent `.chip` — derfor noteret her).
HVORFOR: Opacity blander teksten med baggrunden. `--color-fg-muted` (#6B6560) har
5,22:1 mod hvid, men ved .7 blev det komposit #979390 = 3,04:1 på 21 noder ved
11 px, hvor kravet er 4,5:1. Det var den ENESTE a11y-fejl på hele sitet og
grunden til, at `soegning.html` desktop stod på 97 i stedet for 100 — gulvet i
bar/RUBRIC.md kategori 3 kræver 100, uanset hastighed. På den aktive chip var
hvid ved .85 oven på `--color-primary` 4,04:1; arvet farve giver 5,01:1.
Rangordningen mellem etiket og tal er uændret: `.facet-n` er `--color-fg-muted`,
etiketten er `--color-fg`. Farveforskellen kostede aldrig kontrast.
HVOR: `css/styles.css` — sektionen `/* ===== søgning ===== */`

### Sider uden data henter ikke Supabase — ydelse, 16.08.2026
HVAD: `sikkerhed.html` og `maerker.html` (og dermed skabelonen i
`scripts/build-brand-pages.js`) henter ikke længere supabase-js fra jsDelivr,
`js/supabase-config.js`, `js/supabase-api.js`, `js/backend-bridge.js` eller
`js/postnumre.js`. `maerker.html` har heller ikke længere `<script
id="boot-listings">` eller de to `preconnect`. `js/postnumre.js` er også taget
ud af `login.html`, `forhandler.html` og mærkesideskabelonen.
HVORFOR: Ingen af siderne kalder `backendReady()`, og `findPostnr()` kaldes kun
fra `js/annonce.js` og `js/opret-annonce.js`. supabase-js alene var 55.453 B
overført (23 % af sikkerhed.html) med 42.210 B målt ubrugt; postnumre.js er
40.050 B rå til sider med nul formularfelter. Lighthouse' Lantern-model lader
alle svar dele den samme simulerede 4G-båndbredde, og LCP'en på de her sider ER
et stykke tekst, der venter bag den kø — 87 % af LCP var ren ventetid.
PRISEN, så den ikke bliver en overraskelse: headerens login-tilstand læses på de
to sider kun fra `Store` (localStorage), ikke fra en frisk Supabase-session.
`syncSessionToStore()` skriver Store på alle datasider, så navnet i toppen er
rigtigt — men udløber sessionen serverside, opdages det først på næste dataside.
Der findes ingen handling på de to sider, der kan lykkes eller fejle på det.
Alle kald til `db` i `js/store.js` og `js/components.js` er i forvejen bag
`typeof db !== 'undefined'`, og `Store` læser `window.REMOTE_LISTINGS || []`.
HVOR: `sikkerhed.html`, `maerker.html`, `login.html`, `forhandler.html`,
`scripts/build-brand-pages.js` (begge skabeloner — `maerker.html` GENERERES,
så rettelsen skal stå begge steder)

### Kategorifliserne er 456×342, ikke 760×570 — ydelse, 16.08.2026
HVAD: De otte `img/type/*.webp` er skaleret fra 760×570 til 456×342 (webp q80).
270.350 B → 115.592 B. `logo-mark.png` er reencodet med 64-farvers palet:
8.396 → 4.292 B, samme 96×96.
HVORFOR: Fliserne vises i 182×137 CSS-px. De var 270 KB på en 571 KB-side — 47 %
af forsidens vægt til otte fliser under folden. 456 px er 2,5× visningsstørrelsen
og dækker både mobil (Lighthouse-emulering: DSF 1,75 → 319 px) og desktopkolonnen
(291 CSS-px). Samme 4:3-forhold, så `width="760" height="570"` i `js/home.js`
holder stadig den rigtige aspect ratio og reserverer den rigtige plads.
TILBAGE AT GØRE, og det hører til forsidens ejer: `js/home.js` — `kortHTML`/
flise-markuppen bør have `srcset` (fx 320w/456w/760w) og `width`/`height` rettet
til 456/342. Heroen har allerede srcset (800/960/1600/2560); fliserne har ingen.
Med srcset kan filerne blive skarpe på en DPR-3-telefon UDEN at koste desktop
båndbredde — det kan én fil ikke.
HVOR: `img/type/*.webp`, `logo-mark.png`

### Forsiden og søgesiden var uenige om, hvor mange der blev valgt fra — forside, 16.08.2026
HVAD: Ét klik (A2 + maks. 60.000 kr.) gav "53 annoncer mangler den oplysning"
på forsiden og "75 annoncer er ikke vist" på soegning.html. Begge tal var
rigtige svar på hvert sit spørgsmål; 75 er det rigtige svar på DET spørgsmål,
begge linjer ser ud til at stille. Forskellen er præcis 22 = antallet af
annoncer uden pris. Søgesiden bogfører hvert filter for sig
(`filtrerMedUoplyst`) og lægger sammen; forsiden talte kun kørekortet, og de 22
forsvandt tavst i `l.price != null && l.price <= maxPrice`. Forsiden førte
altså et halvt regnskab. `heroListe()` bogfører nu alle hero-filtre med samme
feltnavne og samme rækkefølge som `anvendFiltre()` (type → pris → kørekort), og
tallet står i en ny linje `#hs-uoplyst-hint` under søgeknappen. Efterprøvet i
browseren: begge sider siger nu 75 og 14 træf for samme klik.
HVORFOR: To sider, samme spørgsmål, to svar er værre end intet svar — køberen
kan ikke se hvilket der gælder, og så tror han på ingen af dem. At tallene
skulle stemme var i forvejen fastslået ("Hero'ens tal skal stemme med
søgesidens"); det gjaldt bare kun antallet af TRÆF, ikke antallet af fravalgte.
BEMÆRK: forsiden formaterer tallet `da-DK` (fire cifre bliver til "1.234"),
søgesiden skriver rå `${antal}`. Under 1.000 er de ens. Søgesidens ejer må
gerne rette sin til `toLocaleString('da-DK')` — det er repoets regel.
HVOR: `js/home.js` — `heroListe()`, `uoplystTekst()`, `opdaterHero()`;
`index.html` — `#hs-uoplyst-hint`; `css/styles.css` — `/* ===== forside ===== */`

### FORSLAG: koerekortSvar() bør flyttes til js/data.js — forside, 16.08.2026
HVAD: `koerekortSvar()` i `js/search.js` og `skjultAfUvidenhed()` i
`js/home.js` er den samme funktion skrevet to gange: begge spørger
`passerKoerekort()` igen med `power = 1` og `ccm = 1` for at skelne "for
kraftig" fra "vi ved det ikke". Jeg har IKKE slået dem sammen i denne runde —
`js/search.js` er en anden builders færdige fil, og et flyt ville kræve at
røre den. I stedet er home.js' udgave skrevet ordret som search.js'
(`!(Number(l.ccm) > 0)`, `hkEllerNull()` frem for `== null`), og der står en
kommentar begge veje.
FORSLAGET: flyt `koerekortSvar()` og `UOPLYST` til `js/data.js`, ved siden af
`passerKoerekort()` og `koerekortForListing()`, som de bygger på. Så har begge
sider én kilde, og `js/koerekort.test.js` (som allerede tester
`koerekortSvar()`) dækker forsiden med. Den, der rører js/search.js næste
gang, kan tage det med.
HVORFOR: Den tavse regression, der udløste testene i runde 1
(`proeve.power = 0`), kunne opstå netop fordi reglen fandtes to steder. Den
findes stadig to steder.
HVOR: `js/search.js` `koerekortSvar()`, `js/home.js` `skjultAfUvidenhed()`

### "Under markedspris" sammenlignede æbler med pærer — DELT ÆNDRING i js/data.js, 16.08.2026
HVAD: `medianPriceForType()` er væk. `isSuspiciouslyCheap()` bygger nu på
`prisSammenligning(listing)`, der kun sammenligner med SAMME mærke og model
inden for ±3 årgange og med mindst fem sådanne annoncer. Uden grundlag: intet
mærkat. `js/components.js`' forklaringstekst skriver nu grundlaget ud
("under 45 % af medianen for 11 andre Honda CMX 500 Rebel fra 2021-2027 …
median 84.995 kr.").
HVORFOR: Mærkatet var et gæt udgivet som en oplysning. Medianen blev taget
over annoncens TYPE, og en type spænder 125-1800 cm³ og 1968-2026. En Nimbus
Type C fra 1968 til 12.000 kr. blev stemplet "Under markedspris" mod en
classic-median på 50.000 kr. — der findes ikke én anden Nimbus i lageret at
sammenligne med. Årgang indgik slet ikke i udregningen, selvom teksten lovede
"for den type og årgang". Og værst: lageret er 332 forhandlerannoncer (median
129.995 kr.) mod 51 private brugtannoncer (median 64.500 kr.) — præcis faktor
2. Med grænsen på 45 % fandt mærkatet derfor ikke svindel, det fandt "privat
sælger": alle 11 mærkater sad på ærlige private annoncer. Et falsk mærkat er
en anklage mod en sælger, vi ikke kan bakke op. Medianen var oven i købet
forurenet: `price == null` sorterede som 0 og trak den ned.
MÅLT EFTER: 88 annoncer har et rigtigt sammenligningsgrundlag, nul af dem
ligger under grænsen — mærkatet er ikke slået fra, det har bare ikke noget at
sige om DETTE lager. En plantet annonce til 25 % af sin egen models median
bliver fanget, og mærkatet er nu MERE følsomt over for den rigtige svindel
(model-median frem for type-median). Samme linje som `verifiedBadgeHTML()`,
der returnerer tom streng, fordi ingen verificering er rigtig endnu.
RAMMER ANDRE PIECES: `js/search.js:633` og `js/annonce.js:804` tegner samme
mærkat med den gamle tekst "markedsniveau for den type og årgang". Den er
mindre forkert nu (årgang ER med), men den nævner stadig et markedsniveau, vi
ikke kender. Ejerne kan hente grundlaget med `prisSammenligning(l)` og skrive
tallene ud, ligesom `js/components.js` gør.
HVOR: `js/data.js` — `prisSammenligning()`, `isSuspiciouslyCheap()`,
`PRIS_AARSVINDUE`, `PRIS_MISTANKE_FAKTOR`; `js/components.js`
`listingCardHTML()`

### "Lige landet" er væk — rubrikken siger nu det, kortene siger — forside, 16.08.2026
HVAD: Underrubrikken på "Nyeste annoncer" lød "Lige landet på Bikerbasen",
mens alle otte kort stod med "3 uger siden". Den skrives nu fra data: "De
senest oprettede annoncer på Bikerbasen — den nyeste er fra 25. jul. 2026. De
332 indekserede annoncer er ikke med: vi kender ikke deres dato hos kilden."
Rækkefølgen er urørt.
HVORFOR: Samme fejl som "Kuraterede fund fra hele landet" i runde 1 — en
rubrik, indholdet lige nedenunder modbeviser. To ting manglede at blive sagt:
hvor ny "nyeste" faktisk er, og at kun de 51 annoncer, vi selv hoster, er med
i kapløbet (de 332 har med vilje ingen `createdAt` og sorteres derfor altid
bagest). Uden den sidste sætning ville en køber tro, hele markedspladsen har
stået stille i tre uger. Datoen skrives fra annoncen selv, så linjen ikke kan
blive forældet igen.
HVOR: `js/home.js` bid 6; `index.html` — `#newest-sub`

### "Nyeste" beholder datorækkefølgen — det er SEKTIONERNE, der byttede plads — forside, 16.08.2026
HVAD: Beslutningen fra runde 1 står: "Nyeste annoncer" fordeler IKKE de
billedløse jævnt, sådan som søgesiden gør. I stedet er "Udvalgte annoncer"
(hvor foto er et kurateringskriterium) flyttet OP over "Nyeste annoncer" i
`index.html`, og pladsholderen for "intet foto" er gjort site-wide (se næste
blok).
HVORFOR: Søgesidens fordeling virker dér, fordi standardsorteringen ér
"relevans" — en eksplicit ikke-kronologisk rækkefølge, brugeren selv kan bytte
til "Nyeste først". Her har sektionen kun ét løfte, og det er datoen. Ryster
man rækkefølgen for at få et billede ind, er "Nyeste annoncer" ikke længere en
overskrift, det er et udvalg. Tallene er i øvrigt værre end kritikeren
opgjorde: det er ikke halvdelen af kortene uden foto, det er alle otte — alle
51 annoncer vi selv hoster mangler foto, og kun de 51 har en dato. Sektionen
KAN altså ikke indeholde et foto i dag. Rækkefølgen af sektioner lover
derimod ingenting, så den scanbare sektion får førstepladsen. Ingen annonce er
skjult, intet tal er ændret.
HVOR: `index.html` (sektionsrækkefølge), `js/home.js` bid 6 (urørt sortering)

### Pladsholderen for "intet foto" gælder nu overalt — INVITATIONEN TAGET OP, 16.08.2026
HVAD: `.srp `-præfikset er fjernet fra reglerne i `/* ===== søgning ===== */`,
så panelet med diagonal rampe, emblem og billedtekst under gælder alle sider
(forside, annoncedetalje, sælgerprofil, mine annoncer).
HVORFOR: Søgesidens ejer skrev selv invitationen ("Forsidens ejer må gerne
overtage dem: fjern `.srp ` fra selektorerne"). Set fra forsiden er det den
samme sag: alle 51 egne annoncer mangler foto, og de er præcis dem, der står i
"Nyeste annoncer", hvor rækkefølgen ikke må pyntes. Teksten er uændret overalt
— kortet siger stadig "Intet foto". Efterprøvet på forsiden: panelet er flex,
tegningen 312×180 i et 336×252-felt, dens eget `<rect>` slukket,
billedteksten statisk under emblemet og inden for feltet.
BEMÆRK om specificitet: reglerne gik fra (0,2,0)+ til (0,1,0)+, men de ligger
sidst i arket og slår stadig `.card:hover .card-media .ba-svg` (0,3,0) via
`:has()`. `.swipe-card-media` er en anden klasse og rammes ikke.
HVOR: `css/styles.css` — `/* ===== søgning ===== */`

### Ny sektion /* ===== forside ===== */ er IKKE registreret i inline-critical — forside, 16.08.2026
HVAD: `.hero-uoplyst` ligger i en ny sektion nederst i `css/styles.css`.
`scripts/inline-critical.js` er hverken rørt eller kørt.
HVORFOR: Elementet er tomt og `hidden` ved første maling og dukker først op
efter et filterklik, længe efter det asynkrone ark er landet — der er intet at
reservere plads til, og en reservation ville koste 40 px permanent luft i
hero'en, hvor den primære CTA lige akkurat ligger over folden på 390×844.
Målt: CTA'ens underkant er stadig 684 af 844 ved indlæsning, og 707 med A2 +
maks. 60.000 kr. valgt (den gamle, længere kk-hint gav mere). Kører nogen
`node scripts/inline-critical.js`, ruller den 14 sider ud på én gang — se
advarslen længere oppe i denne fil; ydelsen har en anden ejer lige nu.
HVOR: `css/styles.css` nederst; `scripts/inline-critical.js` (urørt)

### Font-preloadene BLIVER — hypotesen er afvist med et tal — ydelse, 16.08.2026
HVAD: De to `<link rel="preload" ... woff2>` i hver sides head er urørte.
HVORFOR: work/LIGHTHOUSE.md hul 1 pegede på, at de to fonte (68.360 B) ligger på
High-prioritet FORAN css'en, og at `font-display:swap` betyder, at de ikke
behøvede komme først. Efterprøvet på en komplet kopi af arbejdstræet med egen
gzip-server: fjerner man dem, stiger FCP fra 1.058 til **1.509 ms** — samme tab
på både forsiden og annoncesiden, altså ikke støj. Uden preload opdages fontene
først, når layoutet beder om dem, og de skubber alt bagefter. Prøv det ikke igen
uden at måle først.
HVOR: `index.html` m.fl. — `<link rel="preload" href="fonts/...">`

### css/styles.css er ikke minificeret ved levering — bevidst udskudt — ydelse, 16.08.2026
HVAD: Filen leveres som den er, med kommentarerne. Målt: rå 180.804 B → gzip
45.459 B; uden kommentarer gzip 22.166 B; minificeret gzip 20.480 B. Altså
**25 KB på hver eneste sideindlæsning**, målt til 148 ms FCP.
HVORFOR IKKE GJORT NU: rettelsen kræver, at siderne peger på et GENERERET
`css/styles.min.css`, og så er `css/styles.css` ikke længere det, browseren
henter. Med fire buildere i filen samtidig betyder det, at deres ændringer ikke
er live før næste byg — en fælde, ingen af dem har bedt om. Dertil: alle fire
regex'er i `scripts/inline-critical.js` matcher `css/styles.css` bogstaveligt;
skifter man filnavnet uden at rette dem, springer scriptet ALLE 14 sider over
uden at fejle. Tag den i en runde, hvor kun én arbejder i CSS'en.
HVOR: `css/styles.css`, `scripts/inline-critical.js`

### Standardsorteringen er MÅLT, og navnet holdt — søgning runde 2, 16.08.2026
HVAD: Ingen kodeændring. Runde 2's omdøbning ("Mest relevante" → "Blandet
udbud") og `blandetRaekkefoelge()` stod færdig og korrekt koblet; det, der
manglede, var efterprøvningen. Målt i browseren på topniveau, side 1:

  Blandet udbud (standard):  24 kort — 4 egne, 20 indekserede,
                             4 uden foto, 0 tegninger.
                             Egne på plads 4, 11, 17, 24.
  Nyeste først (date-desc):  24 kort — 24 egne, 0 indekserede,
                             24 uden foto.
  Fælles i de første 6:      1 af 6.

HVORFOR DET AFGØR KRITIKKEN: kritikeren skrev, at standarden "i praksis er
nyeste-først". De to rækkefølger er hinandens modsætninger — den ene er 83 %
indekserede, den anden 100 % egne. Påstanden er altså modbevist med tal, og
"hele første skærm er tredjeparts MC Syd" gælder ikke længere: første egne
annonce står på plads 4, og egne fylder 4 af 24 (16,7 %) mod 13,3 % af
lageret. De er en anelse OVERrepræsenteret på side 1.
FORBEHOLD, som skal stå: oplystheden GØR noget, men den kan ikke ses på side
1. Målt gennemsnit af metafelter pr. kort: side 1 = 0,50, side 8 = 0,50,
side 16 = 0,00 (23 kort, alle uden km). Gradienten findes altså kun i halen.
Det er præcis derfor navnet ikke må være "Mest oplyste først" — og derfor
`renderSorteringsNote()` nævner BEGGE regler og ikke kun oplystheden.
HVOR: `js/search.js` — `blandetRaekkefoelge()`, `renderSorteringsNote()`

### Tegningen: KORTET holdt op med at tegne — løftet blev stående, 16.08.2026
HVAD: Valget er truffet og efterprøvet, ikke lavet om. `listingMediaHTML()` i
`js/components.js` tegner ikke længere en motorcykel ved nul fotos; feltet er
kameraikon + stiplet kant + "Ingen fotos i denne annonce" — ordret samme
sætning som annoncesidens `.gallery-tom`. Annoncesidens løfte ("Vi viser ikke
en tegning i stedet") er URØRT.
MÅLT: standardsøgningen 0 tegninger af 24 kort; A2 + maks. 60.000 kr. 0
tegninger af 24 kort, hvoraf 12 er uden foto; `annonce.html?id=1003` har 0
tegninger i galleriet og de 3 "Lignende annoncer"-kort på samme side bruger
samme felt med samme sætning. Ét udtryk hele vejen gennem købers sti.
HVORFOR DEN VEJ OG IKKE DEN ANDEN: løftet er det stærkeste, siden siger om
sig selv, og det er gratis at holde — tegningen bar ingen oplysning. Havde vi
i stedet blødt løftet op, ville vi have betalt med tillidskategorien for at
beholde et piktogram, som kritikeren allerede havde talt op som 14 ENS grå
felter. Man skriver ikke løftet om for at redde tegningen.
HVOR: `js/components.js` `listingMediaHTML()`; `css/styles.css` `.foto-tom`

### Resultatlinjen fik sin egen række — og (i) blev bundet til sit led, 16.08.2026
HVAD: To rettelser mod kritikerens mobilfund, begge målt på 390x844.
1) `@media (max-width:620px)`: `.results-headline` gik fra `grid-area:1 / 1`
   (1fr-kolonnen ved siden af Gem søgning + visningsskifteren, MÅLT 149px) til
   `1 / 1 / 2 / 4` — hele bredden. Gitteret er nu `auto auto 1fr`, sorteringen
   har sin egen fulde række, og klokke + visningsskifter + Filtre deler den
   tredje. Kritikeren talte fire linjer; der var i virkeligheden FEM plus (i)
   som en sjette.
2) `renderResultsCount()` pakker kildeleddet og (i)-knappen i én `.mix-tail`
   (`display:inline-flex`), så de ombryder sammen. (i) stod før alene på en
   linje, fordi de to led fyldte bredden præcis.
MÅLT FØR → EFTER: overskrift 149px bred / 120px høj (5 linjer) → 340px / 68px
(2 linjer). Værktøjslinje 175px → 173px. Første kort 494px → 492px. Altså en
række MERE og alligevel lavere — en række koster ingen højde, når indholdet
til gengæld slipper for at brække. Efterprøvet uden vandret scroll og uden
enlig (i) ved 357, 387, 427, 597, 617 og 697px. Desktop er urørt (flex over
620px): sammensætningen står stadig på én linje med (i) 6px efter.
FÆLDE: `.view-toggle` bruges også på annonce.html og forhandler.html, som
ikke har nogen værktøjslinje. Reglen er derfor scopet
`.results-toolbar .view-toggle`, ikke `.view-toggle`.
HVOR: `css/styles.css` — "Mobil: værktøjslinje", `.mix-tail`;
`js/search.js` — `renderResultsCount()`

### Mærkelisten: bekræftet ÉT rullefelt færre — efterprøvet, 16.08.2026
HVAD: Ingen ændring. Runde 2's `.checkbox-list` + `brand-more` virker.
MÅLT på 390 med filterarket åbent: rullebare lag om mærkelisten = 2
(`.filter-body-scroll` + siden selv), mærkelisten selv har ingen. 12 rækker
vises, knappen siger "Vis alle 25 mærker", ét tryk giver 25 og "Vis færre
mærker", næste tryk folder tilbage til 12 — ingen indre rulning i nogen af
tilstandene. Kritikerens tre indlejrede rulleområder er altså to.
FÆLDE FOR DEN, DER MÅLER EFTER: `opdaterMaerkeliste()` skjuler rækker med
`row.hidden = true`. De ligger stadig i DOM'en, så `querySelectorAll(
'.checkbox-row').length` giver 25 og ligner en fejl. Tæl på `!row.hidden`.
HVOR: `js/search.js` `opdaterMaerkeliste()`; `css/styles.css` `.checkbox-list`

### inline-critical.js kørt — hvad den FAKTISK rørte, 16.08.2026
HVAD: `node scripts/inline-critical.js` kørt én gang til sidst. Alle 14
HTML-sider er skrevet, men kun 5 fik ændret kritisk CSS:
  soegning.html      41.211 → 44.756 tegn  (mine regler + eksternt kort)
  forhandler.html    28.839 → 32.192       (eksternt kort)
  maerker.html       26.473 → 29.826       (eksternt kort)
  mine-annoncer.html 27.884 → 31.237       (eksternt kort)
  annonce.html       33.637 → 33.698       (.listing-aside-inner)
De øvrige 9 fik kun en indsat blankline — scriptet er ikke helt idempotent
på whitespace. Det, de fire sider hentede, er `.card-kilde`/`.badge-external`
fra en TIDLIGERE runde: den CSS var committet, men aldrig bygget ind i
siderne. Det var altså en indhentning af committet arbejde, ikke en udrulning
af nogens ubyggede ændringer — `git diff css/styles.css` indeholdt kun mine
to hunks, da scriptet kørte, og det var betingelsen for at turde køre den.
DET, DER VAR FORMÅLET: `soegning.html` manglede som eneste side
`main#main-content{min-height:...}` i sin kritiske blok. Alle 14 har den nu.
HVOR: alle 14 `*.html` — `<style id="critical">`

### UPLOADVEJEN VIRKER — hullet er, at der ikke findes én egen annonce — fotospørgsmålet, 17.08.2026
HVAD: Hypotesen "uploadvejen virker slet ikke" er EFTERPRØVET OG AFVIST. Målt
mod produktion (hkcjrwglwurdjnobewzb):
  - Bucket'en `listing-photos` FINDES: oprettet 27.07.2026, `public = true`,
    `file_size_limit = null`, `allowed_mime_types = null`. Ingen grænse spærrer.
  - Alle fire storage-politikker står i produktion, og alle tre
    `listing_photos`-politikker gør. 017 ER kørt (`auth.uid()` er pakket i
    `(select auth.uid())` i hver politik) — modsat noten længere oppe i filen.
  - RLS accepterer HELE kæden. Efterprøvet med `set local role authenticated`
    + `request.jwt.claims` for en rigtig bruger: `insert into listings` og
    derefter `insert into listing_photos` gik begge igennem. Kørt i en
    transaktion med `rollback` — der er IKKE skrevet noget til produktion.
  - Der ligger ét rigtigt uploadet foto i bucket'en: 50.884 B jpeg,
    28.07.2026, stien `<bruger>/<annonce>/<uuid>.jpg` — altså præcis den form
    `uploadListingPhoto()` bygger. Dens offentlige URL svarer 200 i dag, så
    `photoUrl()` bygger adressen rigtigt. Ejeren (3d71de63…) findes ikke
    længere i `auth.users`; filen er forældreløs affald fra en tidligere
    omgang, ikke et bevis på en fejl.
  - Billedbehandlingen virker i browseren: 2400×1200 jpeg → 1600×800 webp,
    2.844 B. `canvas.toBlob('image/webp')` falder ikke tilbage.
  - CSP på `opret-annonce.html` tillader både `blob:` (miniaturerne) og
    supabase-værten i `img-src` og `connect-src`. Intet blokeres.
DEN RIGTIGE ÅRSAG: `listings` har NUL rækker i produktion, og `listing_photos`
har nul. De 51 "egne" annoncer, tre kritikere har talt, er `js/data.js`'
demolager, og `SHOW_DEMO_DATA` er kun sandt på localhost — på bikerbasen.dk er
der 0 egne annoncer og 332 indekserede, ikke 51 + 332. Demoannoncer har med
vilje ingen `photoUrls` (se blokken om galleriet), og de kan ikke få nogen:
et demofoto ville være et opdigtet foto.
DERFOR: fotospørgsmålet kan IKKE lukkes af en builder. Det kræver, at der
findes annoncer, et menneske har oprettet. Se anbefalingen i rapporten.
HVOR: `supabase/schema.sql` linje 189-216 (uændret — den er korrekt)

### Den eneste rigtige fejl i uploadvejen: filer forsvandt TAVST — fotospørgsmålet, 17.08.2026
HVAD: `handleFiles()` er skrevet om. Tre fejl, alle målt i browseren:
  1. `slice(0, 12 - uploadedPhotos.length)` skar FØR ikke-billeder blev
     sorteret fra, så en PDF blandt de første 12 filer spiste en billedplads.
  2. Filer ud over grænsen forsvandt uden et ord. MÅLT FØR: 17 filer ind, 12 i
     gitteret, 5 væk, nul beskeder. MÅLT EFTER: "4 billeder kom ikke med —
     der er plads til 12 i alt. 1 fil er ikke et billede."
  3. `file.type.startsWith('image/')` smed telefonfotos væk. Windows har ingen
     registrering for .heic, så et iPhone-foto lagt over på en pc kommer med
     `file.type === ''`. MÅLT FØR: `IMG_4711.HEIC` forsvandt tavst. EFTER:
     den lander i gitteret. `erBilledfil()` falder tilbage på endelsen, og
     `validateImage()` i `js/supabase-api.js` gør det samme
     (`billedType()`) — vi afviste før på en oplysning, vi ikke havde.
     `accept` på feltet er også udvidet med `.heic,.heif`, ellers var filen
     grå i filvælgeren i forvejen.
HVORFOR: En annonce uden foto er det dyreste hul på hele sitet (tre domme i
træk). At en sælger, der GJORDE det rigtige, kunne miste tre af sine femten
fotos uden en lyd, er derfor den værste tavse fejl der fandtes. Samme regel som
"en formular, der er dømt til at fejle" fra sælgerprofilen: sig betingelsen.
HVOR: `js/opret-annonce.js` — `erBilledfil()`, `handleFiles()`,
`handleDocFiles()`, `MAX_FOTOS`/`MAX_DOKUMENTER`; `js/supabase-api.js` —
`billedType()`, `validateImage()`, fejlbeskeden i `uploadListingPhoto()`;
`opret-annonce.html` — `#photo-input` accept

### Forsidebilledets position var overladt til tilfældet ved redigering — fotospørgsmålet, 17.08.2026
HVAD: `db.uploadListingPhoto(id, fil, existingPhotos.length + i)` er blevet
`naestePosition + i`, hvor `naestePosition` er den HØJESTE position blandt de
billeder, der bliver liggende, plus én.
HVORFOR: Tre billeder på position 0, 1, 2 — fjern det i MIDTEN, og
`existingPhotos.length` er 2. Det næste nye billede fik altså position 2:
samme position som det billede, der stadig lå der. Rækkefølgen mellem to lige
positioner er udefineret, og position 0 er forsidebilledet — altså var den ene
ting, køberen ser først på kortet, overladt til hvad Postgres leverede først.
Målt på fire tilfælde: ny annonce 0/0, intet fjernet 3/3, MIDTEN fjernet
**3 mod gammel 2 (kollision)**, rækker uden position 1/2.
RØRT EN ANDEN BUILDERS FIL: `js/backend-bridge.js` `photoRows` bærer nu
`position` med. Ét felt, rent additivt — ingen eksisterende læser af
`photoRows` (kun `js/opret-annonce.js`) mister noget. Uden feltet kan
positionen ikke kendes i browseren, og antallet af rækker duer ikke som mål,
fordi der er huller i positionerne efter en sletning. `normalizeRemoteListing()`
sorterede allerede korrekt på `position` (linje 18) — det er dét, der gør
positionen en oplysning og ikke pynt.
HVOR: `js/opret-annonce.js` `publishListing()`; `js/backend-bridge.js` linje 43

### Formularen lovede en illustration, siden ikke længere tegner — fotospørgsmålet, 17.08.2026
HVAD: `#photo-hint` i `opret-annonce.html` lød "Ingen billeder valgt endnu —
vi viser en illustration som eksempel, indtil du uploader dine egne." Den er
nu ORDRET den samme som `renderPhotoGrid()` skriver et øjeblik senere:
"Ingen billeder valgt endnu — annoncer med billeder bliver set markant oftere."
HVORFOR: To fejl i én sætning. Den var USAND — tegningen er fjernet fra hele
sitet, og en annonce uden foto står nu med "Ingen fotos i denne annonce". Og
den fjernede sælgerens eneste grund til at uploade: får man at vide, at siden
tegner en motorcykel, er tolv fotos spildt arbejde. Det er den slags tekst,
der KAN være en del af årsagen til, at der ikke er fotos. Teksten stod kun til
første maling (JS'en overskrev den), men første maling er der, hvor sælgeren
læser, hvad der forventes af ham.
HVOR: `opret-annonce.html` — `#photo-hint`

### Fejlbeskeden ved en mislykket upload sagde ikke hvad eller hvorfor — fotospørgsmålet, 17.08.2026
HVAD: "Annoncen er gemt, men N billede(r) kunne ikke uploades" er nu
"Annoncen er gemt, men N af M billeder kunne ikke uploades: <grunden> Du kan
prøve igen under 'Rediger annonce'." Grunden og filnavnet logges desuden pr.
billede. Ved fejl går der 4.500 ms før viderestillingen i stedet for 1.000.
HVORFOR: `failed.push(withFiles[i].name)` smed `res.error.message` væk, og så
blev sælgeren sendt videre efter ét sekund til en annonce uden billeder — uden
at vide hvad der gik galt, og uden at vide at billederne kan lægges på igen.
Beskeden skal kunne læses, før siden skifter.
HVOR: `js/opret-annonce.js` — `publishListing()`

### Kørekortmærkatet regnes ÉT sted, og det er filterets sted — builder 5, 18.08.2026
HVAD: `koerekortMaerkat(l)` i `js/components.js` er nu den eneste funktion på
sitet, der laver et kørekortmærkat. Den kalder `koerekortForListing()` og
kontrollerer svaret mod `passerKoerekort()`, begge i `js/data.js`. Kaldstederne
er `externalCardHTML()`, `listingCardHTML()`, sammenligningstabellen og
`js/annonce.js` (både den native og den eksterne detaljeside).
Fire tilstande, og kun den første nævner en kategori:
  1. kategori udledt OG filteret enigt → "Kørekort A1/A2/A"
  2. hk og ccm modsiger hinanden (> 0,4 hk/cm³) → "Kørekort ikke afgjort"
  3. over 125 ccm uden hk → "Kørekort ikke afgjort" + den lange ærlige sætning
  4. hverken ccm eller hk → "Kørekort ukendt"
HVORFOR: `eksternKoerekort()` skrev "Kørekort mindst A2" på alt over 125 ccm
uden oplyst effekt, mens `passerKoerekort(l,'A2')` svarede FALSE på nøjagtig de
samme annoncer. MÅLT FØR: **99 kort bar "mindst A2", og alle 99 var filtreret
UD under Kørekort A2.** Mærkat og filter var altså uenige om 99 motorcykler, og
mærkatet var det, der lovede mest. "Mindst A2" er isoleret set sandt — over 125
ccm kræver mindst A2 — men det læses som "A2 er nok", og A2 har ingen
slagvolumengrænse: uden hk kan A2 og A ikke skelnes. En Honda GL 1100 Gold Wing
(1.100 ccm, effekt ikke oplyst) bar mærkatet. Det er den påstand, der kan koste
en tyveårig kørekortet.
MÅLT EFTER: uenige = **0**, "mindst A2" = **0**, på hele lageret (383 annoncer),
tegnet gennem den rigtige `listingCardHTML()` i browseren.
Den lange sætning, kritikeren fremhævede, er URØRT og er nu den ene kilde til
teksten begge steder: "Over 125 ccm kræver mindst A2. Effekten står ikke i
annoncen hos kilden, så vi kan ikke afgøre, om den også kan køres på A2."
FÆLDE FOR DEN NÆSTE: `js/search.js` kalder stadig `koerekortForListing()`
direkte tre steder (`rowSpecsHTML`, `swipeCardHTML`, `OPLYSTHED`). De er ikke
forkerte — de viser kun kategorien, når den ER udledt — men de er en fjerde
indpakning om den samme regel, og det var netop antallet af indpakninger, der
lod de 99 opstå. Søgesidens ejer må gerne kalde `koerekortMaerkat()` i stedet.
HVOR: `js/components.js` — `koerekortMaerkat()`, `HK_PR_CCM_LOFT`,
`KK_OVER_125_EKSTERN`/`KK_OVER_125_EGEN`; `js/annonce.js` — `kkM` begge steder

### "Maks. 48 hk" stod stadig skrevet i hånden på detaljesiden — builder 5, 18.08.2026
HVAD: Kørekortpanelet på den eksterne detaljeside skrev "maks. 48 hk" som ren
tekst. Det er nu `${A2_MAX_HK}` fra `js/data.js`. Overskriften "Du skal mindst
have A2" er samtidig blevet til "Vi kan ikke afgøre, hvilket kørekort der skal
til".
HVORFOR: A2-loftet er 35 kW = 47,59 hk, altså 47. Tallet var rettet i
`js/data.js` og i testene i en tidligere runde, men den ene side, hvor køberen
læser sætningen i ro, sagde stadig 48 — og 48 hk er 35,30 kW, over loftet. To
kilder til det samme tal skrider fra hinanden; nu er der én. Overskriften var
sand og blev læst som "A2 er nok", præcis den forveksling, mærkatet kostede os.
HVOR: `js/annonce.js` — `koerekortPanel`

### Kildens typeord bliver til VORES otte typer — builder 5, 18.08.2026
HVAD: `crawler/normalize.js` har nu `VORES_TYPER` (de otte id'er/etiketter fra
`TYPES` i `js/data.js`) og `TYPE_ALIAS` (kildens ord → vores id), plus
`typeIdFraKildeord()` og `typeLabelFraKildeord()`, som eksporteres.
`KARROSSERITYPER` bygges af de to, så `delModelOgVariant()` skriver VORES
etiket i `variant`. Street → Naked, Sportstouring → Touring, Offroader →
Adventure/Enduro, Klassiker/Veteran → Classic/Veteran, Classic Cruiser →
Cruiser. `js/components.js` `eksternTitel()` skifter desuden den variant, der
allerede ligger i basen, ud med `typeLabel(l.type)` — altså præcis den værdi,
Type-filteret sorterer på.
IKKE KORTLAGT MED VILJE: motard, supermoto, custom og engelsk "classic".
De tre første har ingen kasse hos os; "Classic" står i alle 332 MC Syd-titler
UDELUKKENDE som modelnavn (Softail Classic, Road King Classic, Electra Glide
Ultra Classic — cruisere og tourere), samme måling som `MCSYD_KATEGORI` i
`js/backend-bridge.js` bygger på. Et ukortlægbart ord bliver i modelnavnet, og
der står ingen type. Honest silence, ikke nærmeste nabo.
HVORFOR: Ti af fireogtyve kort viste en type, der ikke findes i vores eget
filter, og et klik på "Naked 64" gav kort mærket "Street". Etiket og filter
brugte hver sin taksonomi.
MÅLT FØR → EFTER på de indekserede kort med variant fra basen:
  Cruiser 75, Street 55, Adventure 41, Touring 29, Sportstouring 21,
  Sport 19, Offroader 18, Klassiker Cruiser 12, Klassiker 7,
  Adventure Offroader 3, Street Cruiser 2, Klassiker Touring 2,
  Sport Sportstouring 1
  →
  Cruiser 89, Adventure/Enduro 62, Naked 55, Touring 53, Sport 19,
  Classic/Veteran 6, ingen etiket 1
Præcis ét kort mistede sin etiket (typen kunne ikke kortlægges). Ingen kort fik
en forkert.
BEMÆRK: `normaliserType()` returnerer stadig KILDENS eget ord og gemmes råt i
kolonnen `type` — `crawler/parse.test.js` låser det, og det er den rigtige
kontrakt: den funktion svarer på "hvad kaldte kilden den?". Oversættelsen er
næste trin. `js/backend-bridge.js` `typeFraKategoriord()` oversætter allerede
kildens ord til vores id'er; de fire fælles oversættelser står ordret ens begge
steder. **Til builder 1 og 4: `l.type` og kortets anden linje er nu garanteret
det samme ord, og det er altid ét af de otte i `TYPES`.**
HVOR: `crawler/normalize.js`; `crawler/normalize.test.js` (7 nye tests);
`js/components.js` — `eksternTitel()`; `js/annonce.js` — `variant`, Type-rækken

### De 162 fabriksnye bliver MÆRKET, ikke sorteret fra — builder 5, 18.08.2026
HVAD: `eksternErNy(l)` i `js/components.js` læser `ny`/`brugt` ud af annoncens
adresse hos kilden. Er den ny, står der en chip "Ny" i prislinjen på kortet, en
sætning i toppen af detaljesiden ("Det her er en fabriksny motorcykel …") og en
række "Stand: Fabriksny". Kan segmentet ikke læses (fx Gul og Gratis), svarer
funktionen null, og der står ingenting.
MÅLT: 162 af de 332 indekserede får "Ny", 170 får ingen markør. Efterprøvet på
den rigtige søgeside (`?sort=price-desc`, side 1): 17 af 24 kort bærer chippen.
HVORFOR MÆRKE OG IKKE EKSKLUDERE: en fabriksny motorcykel hos en forhandler er
en rigtig motorcykel til salg, og en køber, der leder efter en MT-07, vil se
begge dele. At skjule halvdelen af lageret for at få en overskrift til at passe
koster ham udbuddet. Det er overskriften "brugte motorcykler", der er for snæver
— ikke annoncerne, der er forkerte. Og forskellen er ikke kosmetisk: den afgør
garanti kontra reklamationsret og forklarer, hvorfor "Kilometer: Ikke oplyst"
står på en 2025-model. Uden markøren læses det som et hul i dataene.
HVORFOR URL'EN OG IKKE ET FELT — OG HVAD DER MANGLER: crawleren læser allerede
oplysningen (`stand_url_moenster` i `sources/mcsyd.yaml`) og gemmer den i
kolonnen `stand`. Men `js/backend-bridge.js` oversætter den til `condition`, og
"ny" har ingen plads i `CONDITIONS`, så værdien bliver til null og går tabt på
vejen til browseren. **Til den, der ejer `js/backend-bridge.js`: bær `stand`
med som sit eget felt i `normalizeRemoteListing()` — ét additivt felt, ligesom
`position` blev det — så kan URL-aflæsningen i `eksternErNy()` ryge ud.**
HVOR: `js/components.js` — `eksternErNy()`, prislinjen i `externalCardHTML()`;
`js/annonce.js` — `erNy`, `.external-detail-ny`, Stand-rækken;
`css/styles.css` — `/* ===== annoncedetalje ===== */`

### CVR-kontrollen flyttet til js/components.js — annoncesiden havde den ikke — builder 5, 18.08.2026
HVAD: `cvrKontrolOK()` er flyttet fra `js/forhandler.js` til
`js/components.js`, som BEGGE sider indlæser. `js/annonce.js` kalder den nu,
før sælgerkortet tilbyder et opslag i CVR-registret. Består nummeret ikke, står
det der stadig (vi skjuler ikke, hvad sælgeren har skrevet), men uden linket og
med grunden skrevet ud.
HVORFOR: Runde 2's kritiker regnede modulus 11 efter i hånden på 95854101 og
fandt, at det fejlede (sum 146, 146 mod 11 = 3), mens siden roligt tilbød at slå
det op. Sælgerprofilen fik kontrollen; annoncesiden fik den ikke — og det var
DER, nummeret stod, på den ene side hvor køberen beslutter sig. Samme nummer,
to sider, to svar. En regel, der kun findes på den ene af to sider, er ikke en
regel.
BEMÆRK: `js/data.js` fjernede i samme runde CVR fra demolageret helt (med god
begrundelse, se noten dér), så grenen udløses ikke af demodata i dag. Den er
den kontrol, der skal køre den dag et cvr-felt kommer ind ad formularen eller
fra databasen — nu på begge sider. Noten i `js/data.js`, der henviser til
`cvrKontrolOK()` i `js/forhandler.js`, peger efter flytningen det forkerte sted.
HVOR: `js/components.js` — `cvrKontrolOK()`; `js/annonce.js` — `cvrLinje`;
`js/forhandler.js` — kun kommentaren tilbage

### Det tomme fotofelt gav vandret scroll på 390 — builder 5, 18.08.2026
HVAD: `.external-detail-photo-tom{ width:auto }` under `@media (max-width:699px)`.
HVORFOR: `.external-detail-photo` får negativ `margin-inline` på mobil (kant til
kant), og feltet får den positive tilbage — men det arver også `width:100%` fra
reglen, det deler med `<img>`, og `width:100%` regner ikke marginerne fra.
MÅLT FØR: dokumentet 406 px bredt i et 390 px vindue, altså vandret scroll på
hver eneste indekseret annonce uden foto. MÅLT EFTER: 406 → 390, ingen
overløbende element. Et foto rammes ikke — det har ingen margin.
HVOR: `css/styles.css` — `/* ===== annoncedetalje ===== */`

### Fotoløftet er URØRT — efterprøvet, ikke ændret — builder 5, 18.08.2026
HVAD: Ingen kodeændring. Sætningen står ordret på detaljesiden ved både 1440 og
390 på alle tre navngivne egne annoncer: "Sælgeren har ikke lagt billeder op.
Vi viser ikke en tegning i stedet — bed sælgeren om fotos af netop den her
motorcykel, før du kører efter den." Overskriften "Ingen fotos i denne annonce"
er også uændret, og der tegnes ingen illustration noget sted.
HVORFOR DET STÅR HER: jeg rørte `js/annonce.js`' galleriblok og
`js/components.js`' kortmarkup i den her runde. Kritikeren kaldte sætningen den
stærkeste enkeltsætning på sitet, så den skal kunne efterprøves, at den overlevede
— ikke bare antages.
HVOR: `js/annonce.js` — `galleriHTML`; efterprøvet i `work/b5-endelig.json`

### scripts/build.js er IKKE kørt — builder 5, 18.08.2026
HVAD: Jeg har ikke kørt `node scripts/build.js` eller `inline-critical.js`.
HVORFOR: Ingen af mine ændringer konsumeres af byggekæden. JS'en indlæses af
browseren som den er; de fem nye CSS-regler (`.listing-kk-uvis`, `.card-ny`,
`.external-detail-ny`, `.seller-cvr-fejl`, `.external-detail-photo-tom{width}`)
rammer alle elementer, som JS'en skriver EFTER første maling, så de kan ikke
bidrage til CLS hverken før eller efter. Efterprøvet: ingen af de fem
selektorer findes i den inlinede blok i `annonce.html` i dag — heller ikke
grundreglerne — så der er ingen uenighed mellem de to kopier at rette op.
Og fire andre buildere har ubyggede ændringer i træet lige nu; `inline-critical.js`
skriver til ALLE 14 sider og ville rulle deres arbejde ud (advarslen længere oppe
i filen). Kør den, når kun én arbejder i CSS'en.
HVOR: intet ændret

### Kørekortmærkatet har nu tests — js/koerekort.test.js, builder 5, 18.08.2026
HVAD: Ti nye tests i den eksisterende fil. Testantallet går fra 249 til 259.
De dækker de fem motorcykler, kritikeren navngav — GL 1100, Iron 883 ved både
48 og 47 hk, RC 390 mod Svartpilen 401 på samme motor, FXBR Breakout — plus den
egentlige regel som et krydsprodukt: for HVER kombination af de slagvolumener og
effekter, lageret indeholder, gælder at nævner mærkatet en kategori, SKAL
`passerKoerekort()` lukke annoncen ind under netop den. Dertil to vagthunde:
mærkatet må aldrig sige "mindst", og det må aldrig nævne en kategori, når
effekten mangler. Til sidst modulus 11 og ny/brugt-aflæsningen.
HVORFOR: Et forkert kørekortmærkat giver ingen fejlmeddelelse — kun et bogstav,
der ser rigtigt ud. Efterprøvet ved at genindsætte den gamle regel i
hukommelsen: krydsproduktet fejler med 99 uenigheder.
BEMÆRK om de tal, kritikeren skrev: RC 390 med 56 hk og Iron 883 med 48 hk
findes ikke i lageret længere — `js/data.js` blev rettet til 44 og 52 hk i en
tidligere runde. Testene bruger derfor kritikerens tal EKSPLICIT som input, så
de stadig fanger fejlen, hvis fixturen skrider tilbage.
HVOR: `js/koerekort.test.js` nederst

### Ét filterhus: js/filtrering.js — forside, 18.08.2026
HVAD: Filterkæden er flyttet ud af `js/search.js` og ind i en ny delt fil,
`js/filtrering.js`. Den udstiller ét globalt objekt `Filtrering` med
`UOPLYST`, `TOMT_FILTER`, `filtrerMedUoplyst()`, `koerekortSvar()`,
`anvendFiltre(alle, filtre, spring, opsamler)` og `uoplystOpgoerelse(skjult)`.
`js/home.js` bruger den nu til BÅDE knappens tal og "ikke talt med"-linjen;
`heroListe()` er tolv linjer i stedet for firs, og forsidens egen
`skjultAfUvidenhed()` er slettet.
Vanilla, klassisk `<script>`, alt pakket i en IIFE — netop for at filen kan
loades på en side, der allerede har `js/search.js`' topniveau-navne, uden en
redeklarationsfejl. Loades i `index.html` EFTER `js/data.js` (den bruger
`passerKoerekort`/`hkEllerNull`) og FØR `js/home.js`.
HVORFOR: Kritikeren i runde 2 satte det som største hul: "lad knappen og
statuslinjen kalde præcis samme filterberegning som soegning.html". Det var
ikke bare tallene, der var forkerte — det var, at der fandtes to kæder.
Runde 1 rettede træffene (`null <= 60000` er sandt i JS), runde 2 rettede de
fravalgte (53 mod 75), begge gange ved at skrive søgesidens kode af én gang
til. To kopier, der er enige i dag, er ikke to sider, der ikke KAN være
uenige — og fejlen kom igen to runder i træk. Nu er der én kæde, og et nyt
filter på søgesiden rammer forsiden med samme prædikat og samme feltnavn,
eller også rammer det den slet ikke.
MÅLT: 40 filterkombinationer kørt ende til ende i browseren (sæt filtrene på
forsiden, læs knap + hint, klik, læs "annoncer fundet" + "ikke vist"):
**0 uenige**, både på træf og på fravalgte. Kritikerens egen sag,
Type=Scooter + maks. 30.000 kr., går fra "Vis 383 motorcykler" -> "6 fundet /
48 ikke vist" til **"Vis 4 motorcykler" -> "4 annoncer fundet / 48 ikke vist"**
begge steder. Harnessen ligger i `work/forside-vs-soegning.mjs` og kan køres
igen; den slutter med exit 1, hvis to sider nogensinde er uenige.
TIL SØGESIDENS EJER — det halve arbejde mangler: `js/search.js` har STADIG
sine egne `UOPLYST`, `filtrerMedUoplyst()`, `koerekortSvar()` og
`anvendFiltre()`. Jeg har ikke rørt filen (den er ikke min, og en anden
builder skrev i den, mens jeg målte). Kæden i `js/filtrering.js` er ordret
kopieret derfra — samme rækkefølge, samme prædikater, samme feltnavne — så
vejen ind er at slette de fire ting i `js/search.js`, loade
`js/filtrering.js` i `soegning.html` og lade `anvendFiltre(alle, state,
spring, opsamler)` tage `state` som argument. Først dér er dobbeltheden
faktisk væk; indtil da er den bare målt til at være enig.
FÆLDE: rækkefølgen i kæden er en del af svaret. En annonce fjernes ved det
FØRSTE filter, der ikke kan svare for den, og tælles derfor kun én gang — det
er dét, der gør, at tallene i `opsamler` må lægges sammen. Byt om på to led,
og totalen holder, men fordelingen på feltnavne skifter — og feltnavnene er
præcis det, begge siders forklaringslinje skriver ud.
HVOR: `js/filtrering.js` (ny), `js/home.js` (`heroFiltre`, `heroListe`,
`uoplystTekst`), `index.html` (`<script defer src="js/filtrering.js">`),
`work/forside-vs-soegning.mjs`

### "Udvalgte annoncer" hed noget, den ikke var — nu "Dyrere modeller" — forside, 18.08.2026
HVAD: Sektionen har nyt navn, ny udvælgelse og en underrubrik, der skrives fra
data. Fire ændringer i udvælgelsen:
1. Prisgrænsen er lagerets MEDIAN (målt 114.995 kr.) i stedet for 60.000 kr.
2. Annoncer uden modelnavn er ude.
3. Højst ét kort pr. mærke.
4. Antallet af kort fylder hele rækker: 3 kort ved 3 spalter, 4 ved 2 og ved 1.
HVORFOR: Kritikeren målte rubrikken mod indholdet. "Et udpluk af de dyrere
modeller" stod over et billigste kort på 62.200 kr., mens sidens eget
prisfacet talte 131 annoncer over 150.000 kr. — 60.000 var ikke "dyrere", det
var omtrent medianen for en privat brugtannonce. Ét kort hed bare "Honda" til
609.995 kr.; der er seks annoncer i lageret uden modelnavn (fem af dem den
samme Honda), alle med foto, så de vandt let en plads i en række, der kun
sorterede på pris og billede. Og "Udvalgte" lovede en redaktion, der ikke
findes: rækken er en seedet blanding.
MÅLT FØR -> EFTER (localhost, 383 annoncer):
  før:   62.200 / 139.800 / 144.995 / 609.995 kr. — 3 af 4 Honda, ét uden model
  efter: 114.995 / 289.800 / 154.800 kr. — Honda, Harley-Davidson, KTM
Kandidatfeltet gik fra 256 til 169 annoncer. Underrubrikken skriver nu tallet,
grænsen, mærkereglen og kilden ud, så rubrikken kan efterprøves på kortene.
DET, JEG IKKE KUNNE FJERNE, ER SAGT HØJT I STEDET: alle 169 kandidater er fra
MC Syd i Rødding. Det er ikke et valg — det er den eneste kilde i lageret, der
sender billeder med (326 af 383 annoncer har foto, og ingen af vores egne 51
har et). Kritikeren talte "alle fire fra samme forhandler" som en fejl i
udvalget; det er en oplysning om lageret, og så skal den stå der.
DET FABRIKSNYE: kortene bærer allerede mærkatet "Ny" fra `js/components.js`,
så en 2024-model udgiver sig ikke for at være brugt. `<title>` siger stadig
"brugte motorcykler", og 160 af 383 annoncer er fra 2024 eller nyere — se
"Efterladt med vilje" nederst.
FÆLDE (kostede en omgang): `.listings-grid:has(> .card-external)` gør gitteret
tre spalter bredt mellem 1240 og 1559 px, og `:has()` gælder først, NÅR der
ligger et eksternt kort i gitteret. Måler man det tomme gitter, svarer det 4.
Derfor tegnes rækken fuld og trimmes bagefter — `vaelgFeatured(n)` er altid de
n første af den samme rækkefølge, så de tre, der bliver stående, er de samme
tre, en direkte udregning ville have valgt.
HVOR: `js/home.js` bid 7 (`harModel`, `median`, `vaelgFeatured`,
`tegnFeatured`, `skrivFeaturedSub`); `index.html` — `<h2>Dyrere modeller</h2>`,
`#featured-sub`

### "Nyeste annoncer" viste i DRIFT otte annoncer uden dato — forside, 18.08.2026
HVAD: Sektionen må kun indeholde annoncer, der HAR en `createdAt`. Har ingen
det, tegnes en tomtilstand, der siger hvorfor, og underrubrikken skjules.
Hero'ens antalslinje siger "383 motorcykler til salg" i stedet for "… i dag".
HVORFOR: Sorteringen var `new Date(b.createdAt) - new Date(a.createdAt)` over
HELE lageret. `new Date(null)` er ikke NaN, det er 1. januar 1970 — de datoløse
blev altså ikke sorteret bagest, de blev sorteret som ældst. På localhost er
der 51 annoncer med dato, så de faldt tilfældigvis uden for de otte. I DRIFT
er `SHOW_DEMO_DATA` falsk: lageret er 332 indekserede og NUL med dato, og så
stod "Nyeste annoncer" med otte vilkårlige annoncer, hvis alder vi ikke
kender, under en overskrift der lover det modsatte — og med en underrubrik,
der ikke engang kunne skrive en dato (`newest[0]?.createdAt` var null).
"i dag" var den samme slags påstand: vi har intet felt, der siger, at de 332
stadig er til salg netop i dag (`indekseretFoerste` er hvornår VI så dem
første gang). Kritikeren satte hero'ens "i dag" op mod sektionen to skærme
længere nede, hvor det nyeste kort var tre uger gammelt. Tallet bliver
stående — det er ordet, der manglede dækning.
MÅLT (drift simuleret ved at slå `SHOW_DEMO_DATA` fra i serverens svar,
repoet urørt): 332 annoncer, 0 med dato.
  før:   otte kort + "De senest oprettede annoncer på Bikerbasen."
  efter: "Vi kender ikke datoen på nogen af annoncerne endnu" + forklaringen
         + knappen "Se alle 332 annoncer", underrubrik skjult.
På localhost er sektionen uændret: samme otte kort, samme rækkefølge, samme
underrubrik med "den nyeste er fra 26. jul. 2026".
HVOR: `js/home.js` bid 6 (`medDato`, `newest`, tomtilstanden, `nyesteSub`) og
`opdaterHero()` (hero-linjen)

### Kategorifliserne bærer nu et antal — og det er søgesidens eget — forside, 18.08.2026
HVAD: Hver af de otte fliser i "Søg efter type" har et tal øverst til højre
(Sport 27, Touring 55, Cruiser 93, Naked 64, Adventure/Enduro 71, Scooter 8,
Classic/Veteran 14, Cross/MX 3). Tallet regnes med `Filtrering.anvendFiltre()`
— altså den samme kæde som knappen og soegning.html. Underrubrikken siger, at
48 af 383 annoncer ingen type har hos kilden og derfor ikke ligger bag nogen
af fliserne.
HVORFOR: Kritikeren: "Søg efter type lover otte typer". Otte lige store døre,
hvor den ene har 3 annoncer bag sig og den anden 93, er et løfte, der brister
efter klikket. Med tallet kan man se det før. Og de otte tal lægger IKKE
sammen til totalen — uden sætningen om de 48 ville en køber, der lægger
sammen, tro, vi taber annoncer undervejs.
MÅLT: alle otte fliser mod `soegning.html?type=<id>`: 8 af 8 enige.
DEN ANDEN HALVDEL AF KRITIKKEN ER LUKKET AF EN ANDEN BUILDER: kildens
ordforråd ("Street", "Offroader", "Sportstouring", "Klassiker") stod som
annoncekortets anden linje. `eksternTitel()` i `js/components.js` skifter det
nu ud med `typeLabel(l.type)`. EFTERPRØVET på forsiden i dag: de eneste ord,
der optræder som korttitlens anden linje, er Naked, Cruiser, Adventure/Enduro
og Touring — nul fremmede ord. Rå-feltet `listing.variant` bærer stadig
kildens ord (Street 55, Sportstouring 21, Offroader 18, Klassiker 7 af de
332); det er kun visningen, der er oversat. Crawlerens ejer må gerne
normalisere feltet ved roden.
FÆLDE: elementet står SIDST i flisens markup, selvom det tegnes øverst til
højre. Absolut placering er ligeglad med dokumentrækkefølgen, men en
skærmlæser er ikke — lå det først, blev flisen læst op som "93 annoncer,
Cruiser" i stedet for "Cruiser, 93 annoncer".
HVOR: `js/home.js` bid 2 + `fyldTypeAntal()`; `index.html` — `#types-sub`;
`css/styles.css` — `.tile .tile-count` i `/* ===== forside ===== */`

### Efterladt med vilje af forsidens builder — forside, 18.08.2026
HVAD: Tre ting er IKKE gjort, og det er et valg, ikke en forglemmelse.
1. **`js/search.js` beholder sin egen kopi af filterkæden.** Se "Ét filterhus".
   Filen er en anden builders, og der blev skrevet i den, mens jeg målte.
2. **`<title>` siger stadig "Køb og sælg brugte motorcykler"**, mens 160 af
   383 annoncer er fra 2024 eller nyere. Titlen spejles i den GENEREREDE
   meta-blok (`scripts/build-meta.js` skriver og:title og twitter:title), så
   en rettelse kræver et byggegennemløb over alle 14 sider midt i en runde,
   hvor flere buildere har ubyggede ændringer — og "brugte motorcykler" er
   samtidig sidens stærkeste søgeord. Kortene siger allerede "Ny" på de
   fabriksnye, så påstanden modsiges ikke uimodsagt på selve siden. Tag den i
   en runde, hvor kun én rører HTML'en.
3. **`node scripts/build.js` er ikke kørt.** Intet af mit rører det, builden
   forbruger: `.tile-count` behøver ikke at være kritisk CSS (elementet er
   tomt og absolut placeret ved første maling), og `/* ===== forside ===== */`
   er stadig med vilje ude af `scripts/inline-critical.js` — se blokken om det
   længere oppe. At køre den ville rulle andres ubyggede CSS ud i 14 sider.
MÅLT TIL SIDST, så ingen tror det er gættet: `npm test` 259/259 grønne.
CLS 0,0004 på 390x844 og 0,0426 på 1440x900 — sidstnævnte er uændret med og
uden mit nye element (målt begge veje) og består af headerens hydrering
(`main-nav`, `header-actions`) plus 0,0002 fra søgeknappens egen tekst.
Mobilfolden er urørt: CTA'ens underkant 684 af 844 px ved indlæsning og 707
med A2 + maks. 60.000 kr. valgt, chip-rækken slutter 744, og de to
tryghedspunkter ligger inden for 837. Ingen vandret scroll (390 = 390,
1440 = 1440). Ingen sidefejl på nogen af målingerne.
HVOR: —

### Foerste pris over folden paa 390px — soegning, 18.08.2026
HVAD: Ni smaa nedskaeringer over det foerste kort, ingen af dem paa
oplysninger. MAALT paa 390x844, cookievaeg klikket vaek, forrest fane:

  foerste kort   456 px -> 402 px
  foerste PRIS   773 px -> 674 px af 844   (kritikeren maalte 854 i runde 2)
  synligt paa foerste skaerm: pris, model, variant og fire specifikationschips

Hvor de 99 px kom fra: en TOM `.active-filters` tog 16 px margen (nu
`:empty{display:none}`), broedkrummen 9, h1 8, soegefeltet 8, raekkeafstanden i
vaerktoejslinjen 4 — og fotoet paa resultatkortet gik fra 4:3 til 16:10 paa
telefon (356x267 -> 356x223), hvilket alene er 45 px. Sorteringsforklaringen
faldt fra tre-fire linjer til to, fordi den halve saetning, der ikke var sand,
er skaaret vaek (se naeste blok).
HVORFOR 16:10 KUN HER: paa 390 px er kortet fuld bredde, saa 4:3 bliver en
267 px hoej billedflade, og saa er der ét kort pr. skaerm. Reglen er scopet
`.srp` + `max-width:620px`; forsiden og profilen viser ét kort ad gangen i
synsfeltet og har intet at vinde.
FAELDE, som kostede mig en time: hoejder over folden SKAL staa i
`<style id="soeg-perf">` i soegning.html, ikke kun i css/styles.css. Arket
hentes med rel=preload og lander efter foerste maling; en hoejde, der kun
staar dér, gaelder ikke i det oejeblik, siden males. Og selektorerne dér skal
have `.srp` foran: den genererede kritiske blok staar EFTER soeg-perf i head
og kender de samme selektorer med de gamle vaerdier.
ADVARSEL TIL DEN NAESTE: skriv aldrig markoeren for den kritiske blok
(style-taggen med id'et critical) ordret i en kommentar i en HTML-fil.
`scripts/inline-critical.js` finder blokken med en regex; en anden builder
koerte scriptet, mens jeg arbejdede, og min kopi af markoeren inde i en
CSS-kommentar fik den til at slette alt fra kommentaren og ned gennem hele
blokken — stylesheet-linket inklusive. Filen er genskabt fra HEAD.
HVOR: `soegning.html` `<style id="soeg-perf">`; `css/styles.css`
`/* ===== soegning ===== */`

### Sorteringen siger nu kun det, man kan taelle efter — soegning, 18.08.2026
HVAD: Linjen under vaerktoejslinjen lyder "Blandet udbud: de 57 annoncer uden
foto er fordelt jaevnt ud over listen i stedet for at ligge samlet — 4 af de
24 paa denne side." Halvsaetningen "annoncerne med flest oplyste felter staar
foerst" er VAEK fra linjen og staar i stedet i en (i)-knap ved siden af,
sammen med forbeholdet om, at rangeringen sjaeldent kan ses paa side 1.
HVORFOR: Kritikeren maalte de to led som selvmodsigende, og det var de:
kort nr. 4 er uden foto OG uden hk, saa det kan ikke samtidig vaere "flest
oplyste felter foerst". Fejlen var ikke udregningen — oplystheden rangerer
INDEN FOR hver af de to grupper (med og uden foto), ikke paa tvaers — men
saetningen sagde det ikke, og saa var den forkert som skrevet. Fordelingen er
den eneste af de to regler, en laeser kan efterproeve paa skaermen, og den er
nu den eneste, der staar der. MAALT efter: de billedloese ligger stadig paa
plads 4, 11, 17 og 24.
HVOR: `js/search.js` `renderSorteringsNote()`, `forklarSortering()`;
`soegning.html` `#sortering-note`

### "Sortér:" staar som synlig etiket — soegning, 18.08.2026
HVAD: Vaelgeren har faaet et rigtigt `<label for="sort-select">Sortér:</label>`
i en `.sort-felt`, og `aria-label`'en er fjernet.
HVORFOR: Vaelgeren stod bar med teksten "Blandet udbud", og en dansk koeber
kan ikke se paa tre ord, om det er en sortering eller et filter — Bilbasen
skriver "Sortér: Standard" af samme grund. To navne paa samme kontrol (synlig
tekst + aria-label) er ét for meget; nu faar oejet og skaermlaeseren det samme.
BEMAERK: gitterpladsen paa mobil er flyttet fra `#sort-select` til
`.sort-felt`. Den gamle regel `#sort-select{grid-area:...;width:100%}` staar
ogsaa i den genererede kritiske blok i soegning.html, og den er rettet i
haanden dér, saa foerste maling ikke faar en anden bredde end den faerdige
side. Koerer nogen `scripts/inline-critical.js`, skriver den samme vaerdi.
HVOR: `soegning.html` `.sort-felt`; `css/styles.css`

### "Nyeste foerst" var en blindgyde — nu en oplysning — soegning, 18.08.2026
HVAD: To ting. 1) De annoncer, der HAR en dato, staar stadig foerst i
datoraekkefoelge — det er dét, valget hedder — men resten ordnes nu af
`blandetRaekkefoelge()` i stedet for at ligge i lagerets vilkaarlige orden.
2) Linjen over resultatet skriver, hvor mange der overhovedet har en dato:
"Nyeste foerst: kun 51 af 383 annoncer har en oprettelsesdato. De staar
oeverst; de oevrige 332 er indekseret hos en forhandler, hvor vi ikke kender
datoen, og staar derfor efter i blandet raekkefoelge."
HVORFOR: Kritikeren: side 1 var 24 af 24 graa "Ingen fotos"-felter, mens
overskriften sagde 383 fundet. Aarsagen er ikke sorteringen, det er lageret:
de 51 annoncer med dato er praecis de 51, ingen har uploadet foto til. Datoen
er et loefte, saa raekkefoelgen maa ikke pyntes — men brugeren skal kunne se,
hvorfor siden ser ud som den goer, og resten af listen skal vaere brugbar.
MAALT: side 1 er stadig 24 uden foto (og kan ikke vaere andet), men hvert kort
baerer nu effekt, type og stand i billedfeltet, og side 3 er 21 af 24 med foto
mod tidligere en tilfaeldig blanding.
HVOR: `js/search.js` `getFilteredListings()` (date-desc-grenen),
`renderSorteringsNote()`

### Det tomme fotofelt bruger pladsen — DELT FIL js/components.js, 18.08.2026
HVAD: `listingMediaHTML()` kalder en ny `fotoTomFaktaHTML(l)`, der laegger
effekt, type og stand ind i `.foto-tom` som smaa chips. Kun oplyste felter
tegnes; er ingen af de tre oplyst, er feltet praecis som foer. Effekt springes
over paa indekserede annoncer, fordi `externalCardHTML()` allerede viser
"Effekt" i sin spec-liste. Saetningen "Ingen fotos i denne annonce" er UROERT.
HVORFOR: Kritikeren maalte 284x378 px graat felt pr. billedloes annonce brugt
til ingenting, mens EFFEKT/TYPE/STAND laa klar i de samme data og blev vist
paa detaljesiden ét klik senere. De tre er valgt, fordi kortet ikke viser dem
i forvejen (kortet har pris, aargang, km, kubik). Ingen vaerdi opfindes.
MAALT: 24 af 24 kort under "Nyeste foerst" baerer nu fakta ("44 hk · Sport ·
God stand"), 4 af 24 under standardsorteringen. Ingen vandret rulning ved
390, 360 eller 320 px. Feltet er absolut positioneret (inset:0), saa kortets
hoejde er uaendret — CLS maalt 0,0001.
HVOR: `js/components.js` `listingMediaHTML()`, `fotoTomFaktaHTML()`;
`css/styles.css` `.foto-tom-fakta`

### Ti talfelter fik rigtige etiketter — og de 100 var ikke loegn, men heller ikke fortjent
HVAD: `filter-price-min/max`, `-year-min/max`, `-km-max`, `-ccm-min/max`,
`-hk-min/max` og `-ejere-max` har faaet synlige `<label for>`: "Pris fra",
"Pris til", "Aargang fra", "Kilometer hoejst", "Ccm fra", "Hk til",
"Antal ejere hoejst" osv. Pladsholderne er nu eksempler ("fx 30000"), ikke
navne.
HVORFOR, OG EN RETTELSE AF KRITIKERENS FORKLARING: kritikeren skrev, at de
100 point i tilgaengelighed var vundet ved at gemme kontrollerne i lukkede
`<details>`, hvor axe ikke kan se dem. Det er ikke aarsagen — axe accepterer
en pladsholder som tilgaengeligt navn (`non-empty-placeholder` staar i
`label`-reglens any-of-liste), saa felterne bestod ogsaa med grupperne aabne.
KONKLUSIONEN var alligevel rigtig: en pladsholder forsvinder i samme sekund
brugeren taster det foerste ciffer, og saa staar der to identiske tomme
kasser. Etiketten siger baade feltets ende og dets enhed, saa navnet ogsaa
giver mening laest alene.
MAALT MED GRUPPERNE AABNE: axe-core 4.13, wcag2a+2aa+21a+21aa+22aa, alle
filtergrupper `open` paa 1440 OG mobilarket aabent paa 390 — 0 fejl begge
steder. `label`-reglen bestaar paa 38 knuder, `target-size` paa 154.
HVOR: `soegning.html` `.range-felt`; `css/styles.css`

### (i)-knappens trykflade er 44x44, men dens BOKS er stadig 22 px — soegning
HVAD: `.mix-info` og den nye `.sortering-info` har faaet et gennemsigtigt
`::after` paa 44x44 px, centreret. Selve knappen bliver 22 px.
HVORFOR: Knappen sad inde i en broedtekstlinje ("332 indekseret hos MC Syd
(i)"), og et 44 px hoejt element dér ville braekke linjen fra hinanden og
oedelaegge netop den sammenhaeng mellem tekst og knap, kritikeren roste.
Pseudoelementet ligger uden for flowet, men modtager klikket.
TO MAALINGER, der begge er en del af svaret:
1. Kildelinjen passer paa én linje paa 390 px med fire pixels til overs. En
   foerste udgave satte `min-width:24px` paa selve knappen; det braekkede
   linjen til to og kostede 19 px over den foerste pris. Rullet tilbage.
2. Fladen skal vaere FIRKANTET. Med `border-radius:50%` er den en cirkel med
   diameter 44, og `document.elementFromPoint` viste, at hjoernerne (21,21)
   faldt uden for. Uden radius rammer alle otte proevepunkter knappen.
HVOR: `css/styles.css` `.mix-info::after`, `.sortering-info::after`

### Tre bilfelter er FJERNET, ikke skjult — soegning, 18.08.2026
HVAD: Filtergrupperne Braendstof, Traektype og Cylindre er ude af
soegning.html, og `fuels`, `drives` og `cylinders` er ude af `EMPTY_STATE`,
URL-parametrene, filterkaeden, pillerne og opkoblingen i js/search.js.
De fire tilbagevaerende betingede grupper (Servicehistorik, Ejere & syn,
Udstyr, Farve) staar stadig bag `data-krav` og vises, den dag lageret oplyser
feltet.
HVORFOR: Kritikeren laeste de tre som personbilsformularen, der skinner
igennem, og de er oplyst paa NUL af 383 annoncer — kilden sender dem ikke, og
felterne findes kun i vores egen oprettelsesformular, som endnu ikke har
produceret en annonce. En gruppe, der aldrig kan andet end at vaere tom,
hoerer ikke bag en gate; den hoerer ingen steder. Felterne findes stadig i
opret-annonce.html og paa detaljesiden — det er kun filteret, der er vaek.
GATEN ER HAERDET, for kritikeren SAA de syv tomme overskrifter, selv om koden
skjulte dem: `gruppe.hidden = true` alene kan slaas af en hvilken som helst
display-regel i ét af sidens tre stilark. `skjulGruppe()` saetter nu baade
attributten og `style.display`, `visGruppeHvisIndhold()` spoerger DOM'en, om
der overhovedet STAAR en kontrol i gruppen, og `synkroniserKravGrupper()`
koeres igen i render-etape 2, fordi lageret hentes i to omgange.
MAALT: 11 synlige grupper paa 1440 og 11 i mobilarket, alle med kontroller;
0 tomme overskrifter begge steder, ogsaa med alle grupper tvunget `open`.
HVOR: `soegning.html`; `js/search.js` `skjulGruppe()`, `visGruppe()`,
`visGruppeHvisIndhold()`, `synkroniserKravGrupper()`, `KRAV_BYGGERE`

### Maerkelisten viser hvert maerke ÉN gang — soegning, 18.08.2026
HVAD: Raekken med "populaere" maerke-chips er fjernet. Tilbage er én
alfabetisk liste med facettal paa hver raekke, et soegefelt over den og
"Vis alle N maerker" under.
HVORFOR: Seks maerker (BMW, Ducati, Harley-Davidson, Honda, Kawasaki, KTM)
stod to gange i samme filtergruppe med hvert sit facettal. To knapper, der
goer noejagtig det samme, er ikke en genvej — det er et spoergsmaal om,
hvorfor der er to. Listen koster ikke genvejen: hver raekke har sit tal, og
soegefeltet staar lige over den.
NUL-TALS-MAERKER: de er slaaet fra i forvejen (`saetFacet()` saetter
`disabled` + `.facet-empty`), og det er nu maalt paa en filtreret side:
`?koerekort=A1` giver 19 maerker med tallet 0, og alle 19 er baade nedtonede
og `disabled`. Det valg, brugeren staar PAA, faar aldrig klassen — ellers
kunne man ikke komme ud igen.
BEMAERK: `.brand-popular` i css/styles.css har ingen brugere tilbage. Den er
IKKE slettet, af samme grund som `.profile-tabs` laengere oppe i denne fil:
reglen staar ogsaa i den inlinede kritiske CSS i hver HTML-side, saa en
sletning ét sted rydder ikke op, den skaber uenighed mellem to kopier.
HVOR: `js/search.js` `populateFilterUI()`, `renderFacetCounts()`,
`reflectFilterPanel()`, `wireFilterControls()`

### "A (alle mc) 383" forklares nu i synlig tekst — soegning, 18.08.2026
HVAD: Hjaelpelinjen under koerekort-chipsene siger: "Tallet ved A er hele
lageret: A har ingen effektgraense, saa den daekker ogsaa de annoncer, hvor
effekten ikke er oplyst. Det er derfor A1 og A2 kan vaere smaa tal, uden at
der mangler motorcykler."
HVORFOR: Kritikeren laeste "A 383" og "121 mangler koerekortoplysning" som to
tal, der ikke kan vaere rigtige samtidig. De KAN: A har ingen graense, saa
ingen manglende oplysning kan udelukke den. Forklaringen fandtes i forvejen —
men kun som `title` paa chippen, altsaa usynlig paa en telefon. En sandhed,
der kun kan naas med en mus, er ikke fortalt.
HVOR: `soegning.html` `.field-hint` under `#filter-koerekort`

### Koerekortreglen kaldes ÉT sted ogsaa fra soegesiden — soegning, 18.08.2026
HVAD: De tre steder i js/search.js, der kaldte `koerekortForListing()`
direkte (listevisningens celle, swipe-kortet og oplystheden i sorteringen),
gaar nu gennem `koerekortMaerkat()`.
HVORFOR: Builder 5 fandt aarsagen til 99 forkerte maerkater — en anden,
selvstaendig udgave af reglen i `eksternKoerekort()`. Mine tre kald var ikke
forkerte, men de var en fjerde indpakning om den samme regel, og en fjerde
indpakning er praecis maaden, de 99 opstod paa. `koerekortMaerkat()`
kontrollerer sit eget svar mod `passerKoerekort()`, foer det navngiver en
kategori, saa listen og filteret ikke kan komme til at sige hver sit.
MAALT: standardsorteringens fordeling er uaendret (billedloese paa plads 4,
11, 17, 24) efter at oplystheden skiftede kilde.
HVOR: `js/search.js` `rowSpecsHTML()`, `swipeCardHTML()`, `OPLYSTHED`

### Filterkaeden er SLETTET i js/search.js — den bor i js/filtrering.js
HVAD: `UOPLYST`, `filtrerMedUoplyst()`, `koerekortSvar()` og `anvendFiltre()`
(ca. 190 linjer) er vaek fra js/search.js. Siden loader nu
`js/filtrering.js` efter js/data.js og foer js/search.js, og kalder
`Filtrering.anvendFiltre(alle, state, spring, opsamler)`. Regnskabet over de
fravalgte kommer fra `Filtrering.uoplystOpgoerelse()`, saa forsiden og
soegesiden ikke kan naevne de samme skjulte annoncer med hver sine feltnavne.
Den halvdel, builder 1 lod staa, er dermed gjort faerdig.
HVORFOR: Uden det her var reglen skrevet ned to steder igen — praecis den
sygdom, der gav 99 forkerte koerekortmaerkater og tre runders uenighed mellem
forsidens knap og soegesidens overskrift.
MAALT EFTER SWAPPET: `work/forside-vs-soegning.mjs` koert mod min server:
**40 kombinationer, 0 uenige, exit 0**. Facettallene er uaendrede (Sport 27,
Touring 55, Cruiser 93, Naked 64, Adventure/Enduro 71, Scooter 8,
Classic/Veteran 14, Cross/MX 3 = 335 + 48 uden type = 383), fordelingen af
billedloese er uaendret (4, 11, 17, 24), og `npm test` er groen.
TO TESTFILER FULGTE MED, fordi funktionen skiftede fil:
- `js/koerekort.test.js` laeser nu `koerekortSvar`/`UOPLYST` fra
  `js/filtrering.js` i stedet for fra `js/search.js`. Testene er uaendrede;
  de daekker nu begge sider i stedet for én.
- `js/eksternt-kort.test.js` har faaet `filtrering.js` ind i `KILDER` FOER
  `search.js`. Uden den falder hele filen over "Filtrering is not defined",
  foer den naar det, den tester.
HVOR: `js/search.js` (blokken "Filtreringen bor i js/filtrering.js"),
`soegning.html` (script-taggen), `js/koerekort.test.js`,
`js/eksternt-kort.test.js`

### LCP paa soegesiden: builder 3's rute er MAALT OG AFVIST — soegning, 18.08.2026
HVAD: Builder 3 pegede paa "faerre fotos over folden paa side 1" som den
sidste store LCP-rute. Jeg har ikke gjort det, og her er hvorfor, med
vandfaldet fra en rigtig maaling (390x844, 4x CPU, 1,6 Mbit/s, 150 ms RTT):

  487–729 ms    forsidens boot-fetch af VORES annoncer (inline i head)
  527–2129 ms   css/styles.css
  2232 ms       FCP
  2224–4444 ms  de seks js-filer hentes (usminificerede)
  4470–4796 ms  fetch af de 332 INDEKSEREDE annoncer — starter foerst her,
                fordi den venter paa js/backend-bridge.js
  4865 ms       foerste kortfoto begynder
  6463 ms       det er faerdigt  ->  LCP 6472 ms

75 % af LCP er gaaet, FOER billedet overhovedet er opdaget. Soeskendefotoene
starter 4919–5053 ms, altsaa EFTER LCP-billedet, og de kan derfor ikke have
sultet det: fjerner man dem, flytter man i bedste fald 0–300 ms af 6472.
Efterproevet: `fetchpriority="low"` paa alle andre end det foerste kort gav
median 6488 -> 6520 ms over 5 koersler pr. maaling — inden for stoejen.
Attributten er blevet staaende, fordi den er rigtig og gratis, men den er
ikke en rettelse, og den skal ikke taelles som en.
DEN RIGTIGE RUTE ligger i filer, jeg ikke ejer, og den er stor: der findes
allerede en `<script id="boot-listings">` i head, som henter VORES annoncer
ved 487 ms. De 332 indekserede — dem MED fotos — har ingen tilsvarende, og
deres hentning venter derfor 4,5 sekunder paa et script. Flyttes den fetch op
i den inlinede boot, kan det foerste foto begynde omkring 2,3 s i stedet for
4,9 s. Det er `scripts/inline-boot.js` + `js/backend-bridge.js`.
Nummer to er minificering af js (2,2 s ren download).
PRISEN VED MIT EGET ARBEJDE, med det forbehold der hoerer til:
`js/filtrering.js` er én fil mere paa den kritiske sti (15 KB uminificeret,
og js/search.js blev omvendt 190 linjer mindre — netto ca. +7 KB). Maalt
back-to-back mod HEAD blev LCP-fotoet faerdigt 5.910 ms mod 6.723 ms, altsaa
ca. 800 ms senere. DET TAL SKAL IKKE TROS SOM PRODUKTIONSTAL: dev-serveren
(scripts/dev-server.py) svarer HTTP/1.0 UDEN keep-alive, saa hver eneste fil
koster en ny TCP-forbindelse — ved 150 ms emuleret RTT er det ~300 ms pr. fil,
og en fil mere kan skubbe hele koeen en runde. bikerbasen.dk ligger paa GitHub
Pages med HTTP/2, hvor de samme 7 KB er ét multiplekset svar paa en aaben
forbindelse. Byttehandelen er rigtig — ét filterhus frem for to kopier — men
den understreger, at minificering er den naeste ydelsesopgave.
OM TALLENE I DET HELE TAGET: mine 6.472 ms og builder 3's 3.433 ms maaler
ikke det samme. Builder 3 brugte Lighthouse (simuleret Lantern-throttling),
jeg brugte rigtig netvaerksemulering over CDP mod en HTTP/1.0-server. Kun
FORSKELLE inden for den samme opstilling betyder noget her; de absolutte tal
kan ikke sammenlignes paa tvaers.
CLS er uaendret: maalt 0,0001 paa 390x844 gennem hele arbejdet.
HVOR: maalescripts laa i work/_b4-*.mjs (slettet); tallene staar her

### Efterladt til den naeste — soegning, 18.08.2026
HVAD: Tre ting, jeg har set og ikke rettet.
1. Ved 320 px vinduesbredde er dokumentet 333 px bredt. Skyldigheden er
   headerens `.mobile-menu-btn`, ikke soegesiden — den er 390 og 360 ren.
   Det er delt chrome i css/styles.css og hoerer til den, der ejer headeren.
2. `.brand-popular` og `#brand-popular` er doed CSS efter at chipsene
   forsvandt. Se noten i maerkeliste-blokken om hvorfor de ikke er slettet.
3. `js/filtrering.js` indeholder stadig filtergrenene for `fuels`, `drives`
   og `cylinders`. De er harmloese (state har ikke felterne, og
   `TOMT_FILTER` giver dem tomme lister), men de er tre doede led i en kaede,
   der er nem at laese forkert. De boer ud, naeste gang nogen roerer filen.

### D-013: Læsevejen gik gennem et cdn — derfor svarede én URL to ting — data, 18.08.2026
HVAD: `js/backend-bridge.js` henter nu annoncerne med almindelig `fetch()`
direkte mod PostgREST (`restHent()`), ikke gennem Supabase-SDK'et. SDK'et
bruges stadig til session, tokenfornyelse, favoritter og skrivning — men ikke
til at afgøre, HVILKE annoncer siden viser. `db.photoUrl()` er erstattet af
`lagerUrl()`, en ren strengsammensætning, så et fotos adresse heller ikke
afhænger af biblioteket.
HVORFOR: Kritikeren målte, at den samme søge-URL svarede "383 annoncer fundet"
med kildelinjen "51 annoncer på Bikerbasen · 332 indekseret hos MC Syd" på
nogle indlæsninger og "51 annoncer fundet" HELT uden kildelinje på andre.
Kæden, hele vejen ned: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
fejler → `typeof supabase === 'undefined'` → `init()` svarer null →
`db.enabled === false` → `backendReady()` sprang HELE hentningen over →
`Store.getAllListings()` faldt tilbage til demolageret. Ingen fejlbesked nogen
steder. Tallet blev bare mindre og pænere.
EFTERPRØVET, og det er beviset: med `route('**cdn.jsdelivr.net**', abort)` i
playwright rammer HEAD nøjagtig den tilstand, kritikeren beskrev. Der findes
ikke andre tilstande — det er ikke en langsom efterindlæsning, det er et
bibliotek, der enten er der eller ikke er der.

  FØR (HEAD, cdn'et falder ind og ud hver anden indlæsning, 20 indlæsninger):
    /soegning.html            10x  383 · facet 15/39/383 · kildelinje
                              10x   51 · facet  4/15/51  · INGEN kildelinje
    ?priceMax=60000&koerekort=A2
                              10x   28 · facet 14/28/74 · kildelinje · 47 skjult
                              10x   14 · facet  4/14/21 · INGEN kildelinje · 4 skjult

  EFTER (samme mål, 20 indlæsninger pr. tilstand — 120 indlæsninger i alt):
    cdn levende / cdn flakser / cdn HELT dødt — alle tre:
    /soegning.html            20x  383 · facet 15/39/383 · kildelinje  (1 svar)
    ?priceMax=60000&koerekort=A2
                              20x   28 · facet 14/28/74 · kildelinje · 47 skjult  (1 svar)

De 28 er dét, kritikeren fik ved at KLIKKE sig frem. Nu giver adressen det
samme, uanset hvordan man kom til den.
FÆLDE: rettelsen er hverken et gentagelsesforsøg eller en timeout. Begge dele
ville have gjort løgnen sjældnere og dermed sværere at opdage. Vagthunden
`js/lager-determinisme.test.js` fejler, hvis `db.` kommer tilbage i
`loadRemoteListings()`/`loadExternalListings()`, eller hvis `backendReady()`
igen gater hentningen på `db.enabled`.
HVOR: `js/backend-bridge.js` — `restHent()`, `lagerUrl()`, `EGNE_KOLONNER`,
`EKSTERNE_KOLONNER`, `loadRemoteListings()`, `loadExternalListings()`,
`backendReady()`; `js/lager-determinisme.test.js`

### D-013b: Kildelinjen kan ikke stå ubetinget — så siden siger det i stedet — data, 18.08.2026
HVAD: `window.DATA_STATUS` ('ikke-hentet' | 'sprunget-over' | 'ok' | 'fejlet')
sættes pr. kilde i broen og læses via `Store.dataStatus()` /
`Store.harHeleLageret()`. Fejler en hentning, skriver `meldDataafbrud()` en
besked øverst i `<main>`: "Vi kunne ikke hente de annoncer, Bikerbasen har
indekseret hos andre forhandlere. Du ser derfor ikke hele lageret, og hverken
antallet af annoncer eller tallene ved filtrene dækker det, der faktisk er til
salg." + knappen "Prøv igen".
HVORFOR: Kildelinjen over resultaterne tegnes af `renderResultsCount()` ud fra
det resultat, den får — den KAN ikke fortælle om annoncer, der aldrig kom, den
skjuler sig bare (`if (!eksterne){ mix.hidden = true }`). At gøre den ubetinget
ville kræve, at den påstod noget om et lager, siden ikke har set. Beskeden
hører derfor hjemme i datalaget: det er det eneste sted, der ved, om vi spurgte
og ikke fik svar. Vi skriver med vilje IKKE, hvor mange der mangler — det ved
vi ikke, og et gættet tal ville være den samme fejl én gang til.
EFTERPRØVET: med `eksterne_annoncer` blokeret giver 8 af 8 indlæsninger 51
annoncer, ingen kildelinje OG beskeden — i stedet for 51 og tavshed.
HVOR: `js/backend-bridge.js` — `meldDataafbrud()`, `window.DATA_STATUS`;
`js/store.js` — `dataStatus()`, `harHeleLageret()`;
`css/styles.css` — `/* ===== data ===== */`, `.data-afbrud`

### D-013c: backendReady() må aldrig afvise — data, 18.08.2026
HVAD: Hver kilde har sit eget net (`gren()`), og `meldDataafbrud()` står i
try/catch. Funktionen svarer altid.
HVORFOR: `js/search.js`' `boot()` gør `await backendReady()` som allerførste
handling. Afviser den, stopper hele opstarten: ingen filtre bygges, `render()`
kaldes aldrig, og resultatlinjen står tilbage med den STATISKE "0 annoncer
fundet", der er skrevet i `soegning.html:496`. Set i praksis under en
overbelastet dev-server, hvor et script blev serveret halvt: siden så ud som et
tomt marked frem for som en fejl. Den gamle udgave havde ét stort try/catch om
det hele netop derfor; det er bevaret, men delt op, så én kilde, der falder,
ikke river de andre med sig — og så statussen bliver 'fejlet' i stedet for at
blive slugt.
HVOR: `js/backend-bridge.js` — `gren()` i `backendReady()`

### D-014: "A (stor mc) 383" var en etiket, ikke et forkert tal — data, 18.08.2026
HVAD: Chippen hedder nu "A (alle mc)". Hjælpeteksterne siger, at kategorierne
dækker nedad. Ingen udregning er rørt.
HVORFOR: Kritikeren skrev, at "A (stor mc) 383" og "121 annoncer mangler
kørekortoplysning" ikke kan være rigtige samtidig. Tallene KOM allerede fra
samme udregning — `koerekortSvar()` (nu i `js/filtrering.js`) spørger
`passerKoerekort()` to gange, og facettallet er `=== true`, mens
skjult-tælleren er `=== UOPLYST`. Efterprøvet i browseren: facet A1/A2/A =
15/39/383, og `?koerekort=A1/A2/A` giver 15/39/383 fundet med 12/121/0 skjulte.
Tallene går op for hver kategori, og mængderne ligger inden i hinanden
(A1 ⊆ A2 ⊆ A).
Det, der løj, var ETIKETTEN. Tre etiketter i samme form ("lille/mellem/stor")
læses som tre kategorier, altså "383 store motorcykler" — og det modsiger både
A2-linjen og de 121 kort, der selv skriver "Kørekort: Ikke oplyst". "A (alle
mc)" er nøjagtig lige så lang som "A (stor mc)" (målt 117 px mod 117 px), så
ingen chip skifter bredde.
FÆLDE: fristes man til at lade A tælle "kun dem, der KRÆVER A", bliver filteret
ubrugeligt for den, det er skrevet til — en køber med A-kørekort må køre alt og
skal se alt. Tre tests låser det: tallene skal gå op, stigen skal ligge inden i
sig selv, og A-etiketten må ikke påstå en størrelse.
HVOR: `js/data.js` — `KOEREKORT`; `js/lager-determinisme.test.js`

### D-015: En oversættelse må ikke være den eneste kopi — data, 18.08.2026
HVAD: `normalizeExternalListing()` bærer nu `kildeStand`, `kildeTitel` og
`sidstSet` med råt ved siden af de oversatte felter. `eksternErNy()` i
`js/components.js` læser `kildeStand` først og beholder URL-aflæsningen som
nødudgang.
HVORFOR: Builder 5 måtte rekonstruere ny/brugt ved at læse annoncens ADRESSE
hos kilden (`/Produkter/Motorcykel/Ny/`), fordi `stand` blev oversat til
`condition` — og "ny" har ingen plads i CONDITIONS, så 162 af 332 annoncer kom
ud som null. Oplysningen lå i databasen hele tiden; den forsvandt i broen.
Det er den SAMME slags fejl som D-013: ingen fejlmeddelelse, bare mindre
sandhed længere nede. Målt efter: `kildeStand` = 170 brugt / 162 ny på de 332,
og `kildeTitel`/`sidstSet` er sat på alle 332.
Fundet ved at gå `EKSTERNE_KOLONNER` igennem felt for felt mod det, der kom ud
i den anden ende. `status` bæres bevidst IKKE med: forespørgslen filtrerer på
`status=eq.aktiv`, så feltet er den samme værdi på hver eneste række.
HVOR: `js/backend-bridge.js` — `normalizeExternalListing()`;
`js/components.js` — `eksternErNy()`

### D-016: Rækkefølgen af de indekserede er STABIL, men ikke garanteret — data, 18.08.2026
HVAD: `loadExternalListings()` beder om `order=sidst_set.desc` — ordret det
samme som `scripts/shared.js` bruger, når mærkesidernes kort forudtegnes. Der
er IKKE lagt et brydeled på.
HVORFOR: Crawleren stempler hele kørslen med samme `sidst_set`, så Postgres
lover ingen bestemt orden mellem de 332 rækker. Målt over otte indlæsninger kom
de i samme orden hver gang, og resultatrækkefølgen på siden var identisk — så
det er ikke en fejl i dag. Et brydeled (`,id.asc`) ville låse det helt, men det
skal lægges ind BEGGE steder i samme ombæring: gør man det kun i klienten,
omrokerer mærkesiden i det øjeblik javascriptet overtager fra den forudtegnede
markup. `scripts/shared.js` er ikke min fil.
HVOR: `js/backend-bridge.js` — kommentaren over `loadExternalListings()`

### D-017: SDK'et ude af læsevejen gav IKKE LCP — det gav robusthed — data, 18.08.2026
HVAD: Målt, ikke gættet. Sammenligning af den nuværende kode mod nøjagtig den
samme kode med KUN `js/backend-bridge.js` rullet tilbage til SDK-vejen, begge
på 390x844 med Lighthouse' mobilprofil (1,6 Mbit, 150 ms RTT, 4x CPU), median
af 5:
    SDK-vejen:  eksterne_annoncer starter 4.076 ms · LCP 6.364 ms
    REST-vejen: eksterne_annoncer starter 4.142 ms · LCP 6.444 ms
Altså 66 ms senere og 80 ms dårligere — inden for støjen, og i hvert fald ikke
en gevinst.
HVORFOR det ikke virkede, og hvad der SKAL til: `<script defer
src="cdn.jsdelivr.net/...">` står stadig i `soegning.html`. Deferrede scripts
kører i dokumentets orden, så de 55 KB er hentet OG parset, før
`js/backend-bridge.js` overhovedet begynder. At fjerne biblioteket fra
læse-LOGIKKEN fjerner ikke DOWNLOADEN. Gevinsten ligger i at tage script-tagget
af siden — og DET er nu sikkert for annoncerne: søgesidens resultatsæt bruger
ikke SDK'et længere. Session, favoritter og skrivning gør, så tagget skal ikke
slettes, det skal hentes DOVENT (fx efter første maling, eller først når nogen
trykker log ind). Det er en ændring i `soegning.html`, og den fil er ikke min.
ADVARSEL til den, der måler efter: en sammenligning mod `HEAD` er IKKE en
sammenligning mod min ændring. Runde 3's arbejdstræ har bl.a. en ekstra
scriptanmodning (`js/filtrering.js`), og HEAD mod arbejdstræet gav 5.624 mod
6.480 ms LCP — 856 ms, som intet havde med det her at gøre. Isolér ved at
udskifte ÉN fil.
HVOR: `js/backend-bridge.js`; forslaget hører til `soegning.html`

### D-018: Demolageret ligger STADIG i js/data.js i produktion — ikke gjort — data, 18.08.2026
HVAD: Builder 3 bad om, at det localhost-only demolager (`DEMO_LAGER`,
`DEMO_SAELGERE`, `buildListings()`, `SEED_REVIEWS`) blev taget ud af
produktionens `js/data.js`. Det er IKKE gjort.
HVORFOR IKKE: `SHOW_DEMO_DATA` er kun sand på localhost, men filen er statisk —
indholdet leveres uanset flaget, og `const LISTINGS = ...` evalueres synkront,
før noget kan nå at hente en anden fil. De tre veje ud er alle uden for min
hånd eller uden for reglerne: (1) en ekstra `<script>`-linje i 14 HTML-sider,
(2) et byggetrin i `scripts/udgiv.js`, der klipper blokken væk på vej til
`_site/`, (3) at gøre `LISTINGS` asynkron, hvilket rører hver eneste kalder af
`Store.getAllListings()` — netop den kodesti, D-013 lige har stabiliseret, og
en ændring dér uden en ny 120-indlæsningsmåling ville være at bytte en bevist
rettelse for en ubevist besparelse.
ANBEFALING: tag (2). Byggescriptet ejer allerede forskellen mellem repoet og
det, der ryger i luften, og en `/* demo:start */ … /* demo:slut */`-markør i
`js/data.js` gør klipningen triviel og synlig. Størrelsen er 13.912 B gzip af
en side, hvor 250.168 B skal ned, før LCP-billedet overhovedet bliver bedt om.
HVOR: `js/data.js` (urørt), `scripts/udgiv.js` (forslaget)

### Canonical uden ".html" — den ADRESSE, folk lander på, ikke filstien — SEO builder B, 20.08.2026
HVAD: Forsiden kanonicaliserer nu til den bare rod (`https://bikerbasen.dk`,
uden efterfølgende skråstreg — samme streng som bilbasen.dk's egen). Alle
andre statiske sider (soegning, maerker, maerke-*, opret-annonce, sikkerhed,
vilkaar, privatlivspolitik, forhandler, annonce, samt de tre noindex-sider)
mister kun ".html". Ingen fil er omdøbt eller flyttet — kun hvad
`<link rel="canonical">` og `og:url` PEGER på.
HVORFOR: Efterprøvet direkte mod produktion FØR jeg rørte noget: GitHub Pages
løser selv en udvidelsesfri sti om til den tilsvarende .html-fil.
`curl https://bikerbasen.dk/soegning` → 200, samme `<title>` som
`.../soegning.html`; en sti der IKKE findes svarer stadig 404
(`this-does-not-exist-xyz123` → 404). Det er ægte GitHub Pages-adfærd for
HELE sitet, ikke en gætning — testet på soegning, maerker, maerke-bmw,
opret-annonce, sikkerhed, vilkaar, privatlivspolitik, forhandler, annonce,
dashboard, mine-annoncer, login: alle 200 uden ".html". En canonical, der
pegede på filstien, pegede altså aldrig på den adresse, en bruger eller
Google rent faktisk ser — og bilbasen.dk's forside kanonicaliserer netop til
den bare rod, ikke til en filsti.
Rettelsen ligger ÉT sted for de fleste sider: `cleanUrl()` i
`scripts/build-meta.js`'s `metaBlock()` (køres sidst i kæden, så den er den
reelle kilde til canonical/og:url på alle ikke-annonce-*.html-sider) plus en
duplikeret tre-linjers udgave i `scripts/build-brand-pages.js` (samme regel,
men filen skal ikke røre `scripts/shared.js` denne runde). Annonce- og
forhandlersiders EGEN canonical (sat af `js/seo.js`, som jeg ikke rører) er
UÆNDRET — den beholder ".html" (+ evt. "?id="), fordi den fil ejes af en
anden beslutning denne runde (se posten om ekstern canonical nedenfor, fundet
allerede i arbejdstræet, ikke skrevet af mig).
HVOR: `scripts/build-meta.js` — `cleanUrl()`, `metaBlock()`;
`scripts/build-brand-pages.js` — `cleanUrl()`, canonical-linjen,
`breadcrumbLd()`; `index.html`, `soegning.html`, `maerker.html`,
`maerke-*.html` (genereret)

### Sitemappet matcher nu sidens EGEN canonical — og to mærkenavne stoppede med at overskrive hinanden — SEO builder B, 20.08.2026
HVAD: To rettelser i `scripts/build-brand-pages.js`:
1. Sitemap-adresserne for statiske sider og mærkesider bruger samme
   `cleanUrl()` som deres egen canonical (ingen ".html", forsiden er den
   bare rod). Annonce- og forhandler-URL'er i sitemappet BEHOLDER ".html"
   (+ "?id="), fordi DERES canonical (sat af `js/seo.js`, urørt) stadig gør.
   Et sitemap, der er "pænere" end den side, det peger på, er den samme
   fejlklasse som C-015 (en påstand, siden ikke bakker op).
2. Mærker samles nu PÅ SLUG før noget bygges eller tælles, ikke på det
   raa navn. "Royal Enfield" og "Royal-enfield" (to kilder, samme mærke, to
   stavemåder) gav begge slug'et "royal-enfield" — det ene byggeri
   overskrev tavst det andets fil, sitemappet fik SAMME adresse to gange,
   og maerker.html's beskrivelse påstod "21 mærker", hvor der reelt kun lå
   20 filer på disk. Efterprøvet FØR/EFTER på HEAD's data (392 indekserede
   annoncer): "Built 21 brand pages" men `ls maerke-*.html` = 20 filer og
   sitemap.xml havde `maerke-royal-enfield.html` to gange → EFTER: "Built 20
   brand pages", 20 filer, 20 unikke sitemap-URL'er, ingen annoncer tabt
   (Royal Enfield-siden viser nu 4, summen af begge staveformers annoncer).
   Samme fejlklasse som D-010's versalfælde i `maerkerUdenLager()` ovenfor
   — bare på filnavnet i stedet for på søgefiltret.
HVORFOR (opgavens punkt 2 — egne annoncer i sitemappet): den logik fandtes
allerede i filen (`harEgenSide()`, `listingUrls`, `dealerUrls`) fra en
tidligere runde og er urørt — den udelukker allerede eksterne (noindex)
annoncer korrekt og vil tage egne `annonce-<slug>.html`-sider med, den dag
`listings`-tabellen får rækker (0 i dag, derfor 0 annoncesider i sitemappet
lige nu — ikke en fejl, en tom kilde).
KOORDINERING MED BUILDER A: fandt undervejs (i arbejdstræet, ikke skrevet
her endnu af dem) at `js/seo.js` nu sætter en indekseret annonces canonical
til KILDENS egen URL (`sikkerUrl(listing.externalUrl)`), ikke til
bikerbasen.dk, med noindex bevaret. Det bekræfter at `harEgenSide()`s
udelukkelse af eksterne annoncer fra sitemappet er den rigtige side af
beslutningen — en side, hvis canonical peger væk fra sitet, har ingen plads
i vores eget sitemap.
Efterprøvet: alle canonical-mål er hentet direkte mod PRODUKTION (curl) —
200 for forside, soegning, maerker, maerke-bmw, maerke-honda, maerke-yamaha,
opret-annonce, sikkerhed, vilkaar, privatlivspolitik. maerke-royal-enfield
er IKKE deployet endnu (404 på produktion i dag) — det er et NYT mærke fra
den seneste crawl (Rydbergs MC/Gul og Gratis-runden), ikke en fejl i
ordningen; den rene adresse virker for enhver side, der faktisk ligger i
`_site`/roden. `npm test`: 278/278 grønne efter begge rettelser.
HVOR: `scripts/build-brand-pages.js` — `cleanUrl()`, `byg()` (byBrandRaw →
slugGrupper → byBrand), sitemap-blokken (`entries`)

### Indekserede annoncer: canonical til KILDEN, ikke selv-canonical — SEO builder A, 20.08.2026
HVAD: `annonce.html?id=<n>` for en MC Syd- eller Gul og Gratis-annonce forbliver
`noindex, follow` (uændret fra tidligere runde) — men får nu OGSÅ et rigtigt
canonical, sat til KILDENS egen annonce-URL (`sikkerUrl(listing.externalUrl)`),
i stedet for slet ikke at blive sat. Før stod alle 392 sider tilbage med
byggeriets generiske `/annonce.html`-canonical (`build-meta.js`s statiske
blok), fordi ingen kørende kode nogensinde overskrev den for lige netop de
sider. Det var runde 3-dommens punkt 9: "392 af 392 sider, samme kanoniske
URL" — og det var IKKE fordi nogen gættede forkert, men fordi ingen svarede.
HVORFOR (den egentlige afvejning — to reelle svar fandtes):
  A) Selv-canonical (`/annonce.html?id=<n>`) + index. Behandl siden som
     original.
  B) noindex (uændret) + canonical til kildens egen URL. VALGT.
Argumentet for A er reelt: siden LÆGGER noget til kildens annonce —
kørekortsudledningen (A1/A2/A regnet ud fra ccm+hk, med eksplicit "kan ikke
afgøres" når data mangler), "vi gætter aldrig"-linjen ingen andre steder
skriver, og fem tydelige kildeangivelser før første klik (runde 3-dommen
roser alt det, se punkt 4). Det er ikke ingenting.
Men to ting vejer tungere:
1. **Indholdet er stadig overvejende kildens.** Prisen, fotoet og
   beskrivelsens første linje ER MC Syds eller Gul og Gratis' egne ord —
   citeret, ikke omskrevet (se "Beskrivelse"-sektionen i
   `renderExternalListing()`: "Begyndelsen af {kilde}s egen tekst"). 392
   sider, der i det store hele gengiver en andens vareliste under
   Bikerbasens eget navn, er den definition af "thin/aggregator content",
   Googles kvalitetsvejledning specifikt advarer mod at bede om indeksering
   af — og en dømt kvalitetsvurdering rammer HELE domænet, ikke kun de 392
   sider. Med et domæne, der er 9 dage gammelt og har nul oparbejdet
   autoritet (se opgavens præmis), er det den forkerte risiko at tage FØRST.
2. **Vi kan ikke garantere friskheden.** Siden siger det selv: "Pris og
   udstyr kan være ændret, siden vi hentede annoncen." Et selv-canonical,
   der beder Google indeksere og rangere en kopi, som kan være forældet i
   morgen (motorcyklen solgt, prisen ændret), er et løfte, vi ikke kan
   holde. Kildens egen side ER altid frisk; vores er en øjebliksstat.
Hvorfor IKKE bare lade canonical stå tomt (den tredje, ikke-eksplicitte
mulighed): en noindex-side uden canonical overlader gætteriet til Google, og
gætteriet var netop den fælles `/annonce.html`, som er præcis den fejl,
dommen fandt. Et udfyldt canonical til kilden er et STÆRKERE og mere ærligt
signal end et fraværende — det siger "det her ER en kopi, originalen står
der", i stedet for at lade et tomt felt sige ingenting. Det er samme mønster,
Google selv anbefaler til spejlede/syndikerede sider, og det står ikke i
konflikt med noindex: begge signaler peger samme vej (væk fra indeksering af
DENNE url), ingen af dem beder om at blive indekseret her. Se koordineringen
fra SEO builder B ovenfor (`harEgenSide()` i `build-brand-pages.js` udelukker
allerede eksterne annoncer fra sitemappet af samme grund).
Delesiden (Facebook, Messenger, en delt MC-gruppe-tråd) er en ANDEN
beslutning end Googles indeksering — noindex styrer kun søgemaskinen. Titel,
description og og:-billede er derfor STADIG annoncespecifikke (mærke, model,
pris, kilde), uanset canonical-retningen.
HVOR: `js/seo.js` — ny funktion `seoExternalListingPage()`; `js/annonce.js`
— `renderExternalListing()` kalder den nu i stedet for kun at sætte
`document.title` i hånden.

### Google lukkede sit "Vehicle listing"-rige resultat i september 2025 — struktureret data er nu Product + Motorcycle, ikke Motorcycle alene — SEO builder A, 20.08.2026
HVAD: Al JSON-LD på annoncesider (egne OG indekserede) har fået `@type`
ændret fra `"Motorcycle"` alene til `["Product", "Motorcycle"]`.
HVORFOR: Efterprøvet mod Googles egen dokumentation og Search Central-
ændringslog (WebFetch/WebSearch, august 2026): Googles dedikerede
"Vehicle listing"-rige resultat er FJERNET — det står ikke længere i
Search Centrals galleri over struktureret-data-features (efterprøvet:
galleriet lister "Product", "Product snippet", "Merchant listing" under
Shopping; "Vehicle listing" er væk). Google fjernede selve
dokumentationssiden fra Search Central i september 2025 og henviser nu til
almindelig Product-struktureret data. Koden her byggede altså rige
resultater til en funktion, der ikke findes længere.
Ren `"@type": "Product"` alene er ikke løsningen: `mileageFromOdometer`,
`vehicleEngine` og `vehicleModelDate` hører til Vehicle/Motorcycle i
schema.orgs egen egenskabsdomæne (domainIncludes), ikke til Product — en
streng validator ville flage dem som uventede på en ren Product, og opgaven
bad eksplicit om at tjekke ægte gyldighed, ikke bare tilstedeværelse.
Løsningen er en TYPE-LISTE: `["Product", "Motorcycle"]`. Det er gyldig
JSON-LD (schema.org tillader flere typer på samme objekt), og det er ikke en
omgåelse — Motorcycle nedarver alligevel fra Product
(Thing > Product > Vehicle > Motorcycle), så kombinationen gør præcis ét:
hver eneste egenskab i objektet hører nu retmæssigt under mindst én af de to
erklærede typer, og intet Google-specifikt "krav" findes længere at
overholde eller bryde (funktionen er væk, ikke bare ændret).
Sidegevinst — en reel valideringsfejl rettet i samme ombæring: `offers.price`
kunne før blive `null` (en INVALID Offer, price skal være tal/tekst), når
prisen ikke er kendt — det ramte kun de indekserede annoncer (egne har prisen
som obligatorisk felt), men koden byggede `offers` ubetinget uanset. `offers`
udelades nu HELT, når `listing.price == null`, i stedet for at skrive en
ugyldig blok. Efterprøvet direkte i browseren mod en rigtig MC Syd-annonce
uden pris (id `4c8b5adb-…`, "Honda VT 700"): JSON-LD'et har nu intet
`offers`-felt overhovedet, og intet `product:price:amount`-tag — en annonce
uden kendt pris er ikke berettiget til et pris-rigt resultat, og det er den
rigtige pris at betale for en pris, vi ikke har (samme linje som "vi gætter
aldrig").
HVOR: `js/seo.js` — `seoListingPage()` og `seoExternalListingPage()`;
`scripts/build-listing-pages.js` — `jsonLd()` (samme type, samme
price-guard, skal blive ved med at matche js/seo.js's kopi af objektet).

### Titeldublet fundet og rettet under efterprøvning: "1971 1971" — SEO builder A, 20.08.2026
HVAD: `seoExternalListingPage()` tilføjede før altid `listing.year` til
titlen efter mærke+model. På en rigtig Gul og Gratis-annonce
(id `689aab1f-…`, "Triumph Daytona T100R 1971") står årstallet allerede
INDE I kildens eget model-felt ("Daytona T100R 1971"), så titlen blev
"Triumph Daytona T100R 1971 1971 hos Gul og Gratis — …" — samme tal to gange
på række. Årstallet lægges nu KUN til, når navnet ikke allerede slutter på
det (`aarAlleredeINavn`). Samme regel bruges i description-linjens
"Årgang …"-led.
HVORFOR: Fundet ved efterprøvning i browseren (opgavens "VERIFY, DON'T
CLAIM"-krav), ikke ved kodelæsning — det er præcis den slags fejl, der kun
viser sig på rigtige, rodede kildedata. Modellens tekst rettes IKKE (den er
kildens, ordret, som resten af sitens "Tallene står, som {kilde} har skrevet
dem"-princip) — kun vores EGEN tilføjelse af et andet-steds-kendt tal
undertrykkes, når det ville gentage noget, kilden allerede har skrevet.
Beslægtet, IKKE rettet her (uden for opgavens filer): samme annonce har
`itemCondition: NewCondition` ("Stand: Fabriksny") på en motorcykel fra 1971
— det er `eksternErNy()` i `js/components.js`, der læser kildens eget
"stand"-felt uden at stille spørgsmål ved det (samme sted, samme regel, som
allerede viser "Det her er en fabriksny motorcykel" på selve siden). JSON-LD
et er derfor KONSEKVENT med det, siden allerede påstår — det er ikke en ny
løgn, jeg har tilføjet, men det er heller ikke rettet. Værd at kende for
crawler-teamet, hvis det ser mistænkeligt ud i en fremtidig dom.
HVOR: `js/seo.js` — `seoExternalListingPage()`

### Egne annoncers canonical beholder ".html" — rørt IKKE af mig, af en anden grund end SEO builder B's — SEO builder A, 20.08.2026
HVAD: `listingPageUrl()` i `js/seo.js` og `listingSlug()`/canonical-linjen i
`scripts/build-listing-pages.js` er UÆNDREDE — de peger stadig på
`…/annonce-<slug>-<id>.html`, MED ".html". Jeg har bevidst IKKE anvendt SEO
builder B's `cleanUrl()`-mønster her.
HVORFOR: To grunde, ikke én. (1) `js/seo-adresser.test.js` låser den
nøjagtige streng `'https://bikerbasen.dk/annonce-ktm-rc-390-2021-1032.html'`
med ".html" — at fjerne endelsen uden at rette testen ville være en tavs
adfærdsændring af en fil, testen eksplicit vogter, og at rette testen hører
til en beslutning, der skal tages med vilje, ikke som en bivirkning af en
anden opgave. (2) SEO builder B skrev selv i deres note ovenfor at de bevidst
lod annonce- og forhandlersiders EGEN canonical urørt, fordi den "ejes af en
anden beslutning denne runde" — altså mig. At ændre den nu ville modsige
deres allerede-dokumenterede afgrænsning. Der er ingen praktisk hindring i at
gøre det samme skridt her (GitHub Pages-adfærden, B efterprøvede, er
sandsynligvis filnavns-uafhængig) — men det er en beslutning for en fremtidig
builder at tage MED VILJE, ikke en jeg tager i forbifarten på en opgave om
canonical-RETNING, ikke -FORMAT. og:url for de INDEKSEREDE annoncer (min
egen, nye kode) bruger derimod allerede B's mønster (`/annonce?id=…`, uden
".html") — det er en frisk streng, jeg selv skrev, ikke en, der bryder en
låst test.
HVOR: `js/seo.js` — `listingPageUrl()` (urørt); `scripts/build-listing-pages.js`
— `listingSlug()`-brugen (urørt)

### Opret profil-flowet: bekræftelsesmail virker, "glemt kode" fandtes slet ikke — auth-audit, 20.08.2026
HVAD: Bredt gennemsyn af opret profil / log ind (`login.html`, `js/login.js`,
`js/supabase-api.js`, `supabase/schema.sql` + alle migrationer), bestilt
efter et rigtigt fund fra mennesket: bekræftelsesmailen ved oprettelse
ANKOMMER (bekræftet ved en rigtig test mod produktion), men "glemt kode"
gjorde INTET (bekræftet samme vej). Det ene var derfor allerede i orden;
det andet krævede kode, der ikke fandtes.

DEN STØRSTE FEJL — "glemt kode" var ikke en fejl i et kald, det var FRAVÆR
af kald: `git grep -i "glemt|forgot|reset|nulstil"` i `login.html`,
`js/login.js` og `js/supabase-api.js`, på tværs af ALLE grene og HELE
historikken (inkl. `main`, `seo-og-udstyrsfiltre`, alle `claude/*`- og
`worktree-agent-*`-grene), gav nul træf. Ingen knap, intet felt, intet kald
til Supabase — funktionen har aldrig eksisteret i dette repo. Et klik på et
"glemt kode"-link i produktion kunne derfor umuligt have sendt en mail,
uanset dashboard-opsætning. Det er nu bygget (se nedenfor), i de samme tre
filer opgaven i forvejen var afgrænset til — ingen ny side.

FUNDET, MEN IKKE EN FEJL — profilrækken oprettes altid ved signup:
`handle_new_user()` (schema.sql:98-118) er en `after insert on auth.users`-
trigger, `security definer`, som indsætter i `public.profiles` med
`on conflict (id) do nothing`. Ingen orphaned auth-bruger uden profilrække er
mulig via den normale vej. `012_email_verified_synk.sql` retter desuden en
ægte tidligere fejl (email_verified blev sat ud fra `email_confirmed_at` i
SAMME transaktion som insert, hvor feltet altid er null) med en ekstra
`after update of email_confirmed_at`-trigger. Begge er efterprøvet ved
læsning, ikke rørt — ingen ny migration var nødvendig her.

FUNDET OG RETTET — CVR-feltet i formularen tjekkede kun `/^\d{8}$/`, altså
"otte cifre", ikke "et gyldigt CVR-nummer". `js/components.js` har allerede
`cvrKontrolOK()` (modulus-11), bygget efter Runde 2's kritiker regnede
95854101 efter i hånden og fandt at siden roligt tilbød at slå et ugyldigt
nummer op. Den funktion blev aldrig koblet på FORMULAREN, hvor nummeret
først tastes — kun på visningerne bagefter. Samme nummer, nu tre steder,
ét svar. `js/login.js` register-form-handleren kalder nu `cvrKontrolOK()`
(components.js er allerede indlæst på login.html) og skelner mellem "forkert
antal cifre" og "kontrolcifferet stemmer ikke" i fejlteksten.

FUNDET OG RETTET — to felthints i registreringsformularen påstod ting,
koden ikke gør: reg-phone sagde "Bruges til SMS-bekræftelse af din konto"
(der sendes ingen SMS nogen steder i koden), reg-cvr sagde "Bruges til
KYC-verificering af forhandlerkonti" (der slås ikke op i noget register —
`verify-step`'s egen tekst siger det modsatte tre linjer nedenunder: "Ingen
profiler på Bikerbasen er identitetsverificerede"). Samme fejl som dem der
allerede blev fjernet fra verify-step i en tidligere runde (attrap-knapper
for SMS/MitID/CVR), bare glemt i hints-teksten ved siden af. Begge omskrevet
til at sige, hvad felterne faktisk bruges til i dag.

FUNDET OG RETTET — ingen vej ud af "ubekræftet e-mail, aldrig klikket
linket". Lukker man fanen efter `signUp()` (eller mailen aldrig når frem —
Supabases indbyggede afsender sender kun 2/time), var brugeren låst: kan
ikke logge ind (email_not_confirmed), kan ikke oprette på ny (mailen findes
allerede). Ingen kaldte Supabases `auth.resend({type:'signup'})`. Tilføjet:
`db.resend({email})` i `js/supabase-api.js`; en "Send bekræftelsesmailen
igen"-knap i selve verify-trinnet (synlig kun når `needsConfirm`); og
`authError()` tager nu et valgfrit andet argument, der lægger samme knap ind
UNDER login-fejlen, når fejlen er netop `email_not_confirmed` — det er den
vej, en bruger der er gået OG ER KOMMET TILBAGE dagen efter rent faktisk
rammer (pendingUser lever kun i hukommelsen og er væk efter et genbesøg).

FUNDET OG RETTET — `daError()` dækkede reelt kun fem af Supabase Auth's
dokumenterede fejlkoder (supabase.com/docs/guides/auth/debugging/error-codes,
efterprøvet august 2026). Tilføjet uden at ændre de eksisterende: bredere
"allerede oprettet"-genkendelse (`already exists`, ikke kun den gamle
ordlyd), `email_address_invalid` ("test domains..."), en generel
adgangskode-fjeder for `weak_password` (rammer ikke reglen om "at least"),
`signup_disabled`, og — den der peger direkte tilbage på selve
mail-spørgsmålet — en genkendelse af "error sending confirmation email" /
"not authorized", som er den fejl, Supabases STANDARD-afsender giver, når
modtageren ikke står i projektets Team-liste (se dashboardtjeklisten
nedenfor). Kontoen kan være oprettet korrekt, selvom denne fejl vises.

BYGGET FRA BUNDEN — "glemt kode": knap under login-adgangskodefeltet →
trin 1 (`#forgot-step`, e-mail → `db.resetPasswordForEmail()`, neutral
kvittering uanset om e-mailen findes, for ikke at afsløre hvem der har en
profil) → trin 2 (`#new-password-step`, kun synlig når `js/login.js`
opfanger Supabases `PASSWORD_RECOVERY`-hændelse via `onAuthStateChange`,
registreret FØR `backendReady()` rører klienten, fordi Supabase læser
recovery-tokenet af adressen i samme øjeblik klienten oprettes). `redirectTo`
peger tilbage på DENNE side (`location.origin + location.pathname`) i stedet
for en ny — ingen ny fil, ingen ny route, samme filafgrænsning som resten af
opgaven. To nye db-metoder i `js/supabase-api.js`: `resetPasswordForEmail()`,
`updatePassword()`.
IKKE EFTERPRØVET MOD PRODUKTION MED VILJE: at klikke "Send nulstillingslink"
ville sende en rigtig mail til en rigtig adresse. Client-side-stien er
efterprøvet i browseren (knap → trin skifter, ingen netværkskald før
"Send"-knappen, jf. netværkslog); selve turen igennem Supabase og tilbage
kan kun bekræftes af et menneske. redirectTo SKAL stå i projektets
Auth → URL Configuration → Redirect URLs, ellers afviser Supabase linket
tavst — se dashboardtjeklisten.
HVOR: `js/login.js` (`daError`, `authError`, `resendConfirmation`,
`showNewPasswordStep`, hele "glemt kode"-blokken, CVR-tjekket i
register-form-handleren, `showVerifyStep`); `js/supabase-api.js` (`resend`,
`resetPasswordForEmail`, `updatePassword`); `login.html` (`#forgot-step`,
`#new-password-step`, `#verify-resend`, `#forgot-password-btn`, de to
felthints).

### Dashboardtjekliste — mennesket skal bekræfte dette manuelt, kan ikke ses fra kode
Se den fulde tjekliste i agent-rapporten til orkestratoren (den samme tekst,
gengivet her så den ikke går tabt): "glemt kode"-linket sender kun en mail,
hvis redirectTo `https://bikerbasen.dk/login.html` (og `http://127.0.0.1:*/
login.html` til lokal test) står i Authentication → URL Configuration →
Redirect URLs. Uden den linje afviser Supabase kaldet, og symptomet er
PRÆCIS det, mennesket målte: ingen fejl, ingen mail. Dette er den mest
sandsynlige rodårsag, nu hvor koden selv findes — men kan kun bekræftes i
dashboardet, ikke herfra.
HVOR: Supabase-dashboardet, ikke en fil i repoet.
