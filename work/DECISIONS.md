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
