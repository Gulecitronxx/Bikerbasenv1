# Critic opret runde 2 (blind)

Branch gauntlet/opret @ 390008e. Playwright mod egen mock (page.route, fiktiv session, ingen produktionskald). Scripts og screenshots ligger i `C:\Users\pasca\Desktop\rod\crit_opret2`. Server på port 8743.

## DOM: ACCEPTER (betinget)

Ingen P0 og ingen P1 i den normale brugerrejse. Ét fund (F-1) er en reel omgåelse af valideringen, men den kræver en kladde med `videreTilTrin:3` og ugyldige tal i localStorage. Jeg har klassificeret den som P2, fordi den ikke kan opstå via normal brug. Den bør rettes før merge, fordi den er billig at rette og er netop den vej, man bad mig forsøge.

## Dom pr. krav

1. **Flow mod mock: PASS.**
   - Udlogget: tom indsendelse giver 10 fejltekster og fokus på typegruppen. Delvist udfyldt giver fejl ved de resterende felter.
   - Kladde gemmes, login-redirect `login.html?redirect=opret-annonce.html` virker, og efter tilbagekomst er alle felter genskabt.
   - En kladde i baseline-format (Harley, ejere, syn, beskrivelse) genskabes fuldt.
   - Logget ind: sektioner, billedupload med mus, Enter og Space, og maks. 12 billeder. Billede nr. 13 og en .txt afvises med besked.
   - Udgiv uden vilkår afvises uden POST. Med vilkår: 1 POST med korrekt payload, 3 fotos på position 0, 1 og 2, og redirect med `udgivet=1`.
   - `?rediger=`: forudfyldt, "Rediger annonce", Gem kladde skjult. 1 PATCH på `id=eq.`, ingen POST. Slettet billede gav DELETE, nyt billede fik position 1, og redirect uden `udgivet`. Kladden er urørt.
   - Konsol: ingen fejl.
2. **Navigation: PASS med forbehold (F-1).**
   - Trinbjælken er kun klikbar til trin 1 og 2 på side 1. Trin 3 og 4 er `div` og kan ikke klikkes. Efter trin 3 er kun bagud klikbart.
   - Scroll-spy skifter korrekt mellem trin 1 og 2. Færdige trin er knapper.
   - Hvis man går tilbage til trin 1, ændrer til ugyldigt (årgang 1800) og trykker Næste, afvises det, og fotos bevares.
   - Enter i et felt navigerer ikke.
   - Genindlæsning midt i flowet giver trin 1 med kladde og en toast.
   - Browserens tilbage-knap forlader siden uden advarsel (F-5).
   - Omgåelse: se F-1.
3. **Validering: PASS med fund.**
   - Ccm: 1, 49, 50 og 3000 godkendes. 3001, 0, -5, 12,5, 1e3 og tom afvises.
   - Pris 0, effekt 301, ejere 0 og årgang 2028 afvises. Pris 1, km 0 og årgang 2027 godkendes.
   - Model og beskrivelse med kun mellemrum afvises.
   - XSS i model og beskrivelse: 0 injicerede elementer, 0 dialoger.
   - El-motorcykel uden ccm kan ikke oprettes. Samme sperre rammer redigering af en eksisterende annonce med ccm=null: Næste giver "Feltet skal udfyldes". Databasen har `ccm > 0`, så en datamodelændring er nødvendig. Konsekvens: el-sælgere er lukket ude. Det er et reelt åbent punkt, men ikke en regression (baseline krævede 50 eller mere).
4. **Mobil og a11y: PASS med P2/P3.**
   - Inputs er 16 px ved 390, 360 og 320.
   - Tilbage-knappen måler 45 px i højden.
   - Fejl-toast ligger øverst (76–167 px), fokusfeltet ligger ved 401 px.
   - Bundark: `<dialog>` med `showModal`, Escape og klik på overlay lukker, fokus går tilbage til knappen.
   - Overflow: 0 af 12 kombinationer (6 bredder × lys/mørk) × trin 1 (tom, fejl og fold åben), trin 3 (tom og med fotos) og trin 4.
   - Kontrast: hero målt pixelvis, h1 ≥6,4:1 og lead ≥7,0:1. Resten af teksten har ingen fund udover artefakter i mit eget værktøj (se noten nedenfor).
   - Fund: F-2, F-3, F-6, F-7.
5. **Intet opdigtet / juridisk: PASS.**
   - Tillidspunkterne er sande mod koden. Vilkår er et afkrydsningsfelt med link og kræves før udgivelse.
   - Jargonen "de indekserede" er uklar for lægfolk (P3, F-8).
6. **Tests: PASS.** `npm test` 364/364. De to testfiler 18/18. `node --check` er rent på js, scripts og crawler.
7. **Match mod billede 4:** se tabellen nedenfor. Samlet ca. 4,0/5 (runde 1: 3,7).

## Fund

- **F-1 (P2) Omgåelse af validering via kladde.** Repro: logget ind, sæt `bb_draft.form` til `{year:1850, km:-5, ccm:99999, power:9999, price:99999999, …, videreTilTrin:3}` og åbn siden.
  - Siden lander direkte på trin 3, fordi `trinUdfyldt()` kun tjekker at feltet er udfyldt og ikke grænserne.
  - Næste, vilkår og Udgiv giver POST med de ugyldige tal.
  - Databasen afviser kun år, km og ccm ≤ 0, så ccm 99999, effekt 9999 og pris 99999999 slipper igennem.
  - Fix: kald `validateStep(1)` eller `OpretValidering.validerTrin` stille i restoren, eller valider alt i `publishListing` før POST. Det sidste fanger også al fremtidig omgåelse.
- **F-2 (P2) Fejl i sammenfoldet "Flere oplysninger" er usynlig.** Repro: ejere=0 i den lukkede fold, tryk Fortsæt.
  - Folden åbnes ikke, og fokus havner på knappen (feltet er skjult).
  - Kun en toast på ca. 2,6 s forklarer fejlen, og den står ikke ved feltet.
  - Fix: åbn `#valgfri-fold`, når en fejl ligger i den.
- **F-3 (P3) Store filer og fil-typer tjekkes først efter Udgiv.** En 13 MB PNG havner i gitteret uden advarsel, selv om teksten siger maks. 12 MB. `validateImage` i `supabase-api.js` afviser den først efter udgivelsen. Annoncen oprettes derfor, og sælgeren får beskeden bagefter. Fix: tjek `file.size` i `handleFiles`.
- **F-4 (P3) Trinbjælken er en `div` uden `nav`/`aria-label`.** Ikke-klikbare trin er `div` med `aria-label`, hvilket ikke annonceres. Brug `<nav aria-label="Trin i annoncen">` og `<ol>`.
- **F-5 (P3) Browserens tilbage-knap på trin 3 forlader siden uden advarsel.** Felter overlever via kladde (ved frem-knap), men valgte fotos er tabt.
- **F-6 (P3) Bundark: ingen scroll-lås.** Siden bagved ruller (scrollY 197 → 797) med hjulet over overlayet. Tab går til browser-UI i stedet for at cirkulere, hvilket er standard for modal `<dialog>`.
- **F-7 (P3) Mobil.**
  - Den flydende "Se forhåndsvisning"-pille dækker footertekst og typepiller.
  - Ved 320 px er "Fortsæt til gennemse" proppet (ingen luft i siderne).
  - Trin 4's infoboks er farvet som en fejlboks (rød).
  - Det store "Pris ikke oplyst" i arket er stadig der.
- **F-8 (P3) Tekst.** "Side om side med de indekserede" er jargon. Advarslen "tit et af de første spørgsmål…" er en ubegrundet påstand. Hero-teksten siger "fire trin", men trin 1 og 2 er én side.

Note om kontrastmåling: mit DOM-værktøj gav ratio 1 på trinbjælkens tekst og på `op-num`. Det er en fejl i værktøjet. Manuel beregning giver step-sub 107/101/96 på hvid ≈ 5,9:1, inaktiv dot ≈ 5,0:1 og aktiv dot ≈ 5,0:1.

## Match mod billede 4 (0–5)

| Element | Score |
|---|---|
| Hero + tillidsboks | 3,5 |
| Trinbjælke | 4,5 |
| Felt-sektioner | 4,0 |
| Tips-bokse | 4,0 |
| Upload | 4,0 |
| Sidebjælke + live-kort | 4,3 |
| Mobil | 3,8 |

**Hero:** stadig mørkt (billedets er lyst og varmt), og motorcyklen skjules delvist af tillidsboksen. Teksten er læselig.

**For at komme tættere (prioriteret):**
1. Lysere hero med synlig motorcykel.
2. Ret F-1 og F-2.
3. Billederne midt på siden som i billedet (kræver en løsning på login-gaten).
4. Titel- og vægtfelter samt rig-tekst-værktøjslinje.
5. Live-kort med rigtigt billede som standard i stedet for en grå "Ingen fotos"-flade.
6. Fjern den flydende pille, når kortet er i syne.
7. Selects med "Vælg model/årgang" som i billedet.
8. Femte trin "Sælgeroplysninger".

## Samlet dom: ACCEPTER

Der er ingen P0/P1 i normal brug. F-1 og F-2 bør rettes, fordi de er billige. Alle ændringer er kun testet mod mock. Ingen produktionskode er ændret. Min server (8743) kører i baggrunden, og jeg har ikke kørt `taskkill`.
