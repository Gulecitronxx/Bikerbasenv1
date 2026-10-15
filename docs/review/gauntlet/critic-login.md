# Critic: login (gauntlet/login, HEAD ed56cb6) mod billede 6

Blind test. Server 8715 (worktree), baseline 9fadd59 paa 8716 (worktree udenfor repo). Alle auth-kald mocket med page.route paa supabase.co. Scripts i C:\Users\pasca\Desktop\rod\critic-tmp.

## DOM: ACCEPTER (ingen P0/P1; auth intakt; 364/364 groen)
Stilistisk er det en tydelig, men forsigtig tilnaermelse til billede 6. Strukturen (fuldbredde foto, ét kort i to halvdele, venstre form, hoejre fordele, bundstrimmel) er nu rigtig. Foto-oplevelsen og "wow" er ikke naaet.

## Scores 0-5 (lys / moerk)
| Element | 1440 | 1024 | 768 | 390 |
|---|---|---|---|---|
| Hero/baggrund (foto) | 2.5 / 2.5 | 2 / 2 | 2 / 2 | 1 / 1 |
| To-halvdels kort | 4 / 4 | 3.5 / 3.5 | 3 (stakket) | 3 (stakket) |
| Venstre login-form | 4.5 / 4.5 | 4.5 | 4 | 4 / 4 |
| Hoejre fordele | 3.5 / 3.5 | 3.5 | 3.5 | 3.5 / 3.5 |
| Bundstrimmel | 3.5 / 3.5 | 3.5 | 3 | 3 / 3 |
| Mobil (samlet) | | | | 3 / 3 |
Samlet matcher-billedet: ca. 3,3/5. Baseline var ca. 1/5 (moerk brand-panel + tab-switch + Google-knap, ingen foto).

Hvorfor ikke hoejere
- Fotoet er "primaert maal" men er daempet/sløret bag et fladt beige hoejre-panel; motorcyklen ses kun som en afskaaret stribe yderst til hoejre (1440), uden rytter, og paa 390 naesten ikke (kun en sliver bag kortet). Billedet har et levende foto, der gaar hele vejen gennem hoejre halvdel med motorcyklen som helten. Her er hoejre halvdel ~70 % en lysegraa flade.
- Hoejre halvdels fade starter for sent: panelet er massivt indtil ~x=1090, saa fotoet kun faar ~25 % af kortets bredde.
- Bundstrimmel er hvid, uden for foto (det er ok), men ikonerne er orange outline, ikke billedets ro; "Kilden staar paa hver annonce" brydes til 3 linjer og er hoejere end de andre (skaever baseline paa 1440).
- Mobil: fotoet er reelt skjult; ingen "hero"-foelelse. Billedet er desktop-only, men mobil boer faa en foto-header (fx 140-180 px motorcykel-udsnit over kortet).
- Hvor vi stadig er tæt paa det gamle site: titel-skala, fladt kort, tekst-i-boks. Modigere: lad motorcyklen/fotoet vaere stort og lyst i hoejre halvdel med glasflade kun bag teksten.

## Krav
1. Auth-flows (mock): PASS, 33/33 checks.
 - Login succes -> mine-annoncer; ?redirect=dashboard.html -> dashboard; ?redirect=https://evil.com -> mine-annoncer (blokeret). PASS
 - Forkert kode: "Forkert e-mail eller adgangskode." PASS. Ubekraeftet: dansk tekst + "Send bekraeftelsesmailen igen". PASS
 - Netvaerksfejl (login, glemt, opret): "Vi kunne ikke faa forbindelse..." aldrig 'Failed to fetch'; knap gendannes. PASS
 - Glemt: succes (ikke-afsloerende tekst), rate-limit-fejl dansk, tom e-mail, prefill fra login. PASS
 - Opret: bekraeftelsesmail-tilstand + "Gaa til log ind" (viser besked og forudfylder e-mail), 422 user_already_exists -> "Der findes allerede en profil...", netvaerksfejl, CVR-kontrol. PASS
 - Nulstil: #type=recovery -> trin 2; for kort kode -> "mindst 6 tegn"; gemt -> redirect; ?nulstil=1 uden session -> "Linket er udloebet". PASS
 - Vis/skjul: mus + Enter + Space, aria-pressed og skiftende aria-label. PASS
 - Blokeret localStorage: siden tegner (PASS), men login-fladen virker ikke (se F-2).
2. Intet opdigtet: PASS. Ingen social login, ingen tal; 4 fordele + 4 strimmelpunkter matcher eksisterende funktioner. (Tjek dog "Gem en soegning: Se hvor mange nye annoncer" = tidligere verificeret af builder via O1-3.)
3. Mål:
 - Vandret overflow 320/360/390/768/1024/1440 x lys/moerk x login/login?redirect/afmeld: 0 px i alle 36 kombinationer. PASS
 - Inputs 16px (login-felter, alle bredder). PASS. Labels for= og autocomplete (email, current-password, new-password, name, tel, organization): PASS. Én h1. Fokusring 2px solid #C6420E paa felter og oeje-knap (lys+moerk). PASS. Tab-raekkefoelge logisk.
 - Kontrast (pixel bag tekst, 8 kombinationer): AA-miss paa hoejre halvdel paa 1440/1024 lys: "Markér, at du vil i kontakt..." 4.37, "Log ind her" 4.27/4.30 (orange link paa beige), "Se hvor mange nye annoncer..." 4.49 (15px). Moerk: ingen. (CTA-labels viste artefakt 1.0 i min maaler; builders 5.02/6.45 virker rimelig.) -> FAIL smaat (P2).
 - Touch-mål paa mobil: "Glemt din adgangskode?" 24 px, "Opret en gratis konto" 32 px, "vilkaar/privatlivspolitik" 16 px, "Log ind her" 23 px (under 44). P3.
4. Header/footer: PASS. Samme som baseline; footer uændret. (afmeld har minimal header som baseline.)
5. npm test: 364/364 PASS; node --check js/*.js ok.
6. afmeld.html (mock rpc): token ok -> "Du er afmeldt"; ukendt/allerede -> "Der kommer ikke flere mails"; netvaerk og 500 -> venlig fejl; uden token -> "Linket mangler en kode"; ingen kald uden token. PASS. Visuelt: lille hvidt kort midt paa foto med motorcykel til hoejre; ren, men kortet er lille og "tomt" (3.5/5).

## Fund
- P2 F-1: Opret med allerede-eksisterende e-mail naar Supabase svarer 200 med identities:[] (e-mail-bekraeftelse slaaet til, standardadfaerd mod enumeration) viser "Vi har sendt dig en bekraeftelsesmail" – brugeren venter paa mail, der aldrig kommer. Repro: mock POST /auth/v1/signup 200 {identities:[]}. Gaelder ogsaa baseline (ikke regression) men "allerede oprettet" kunne tages samtidig: vis "Hvis adressen er ny, er mail sendt; ellers log ind / glemt kode".
- P2 F-2: Blokeret localStorage: login-kaldet lykkes, men siden bliver staaende paa login med "Noget gik galt. Proev igen om lidt." (baseline: tavs fejl uden besked). To uncaught `blocked` fra js/store.js; cookiebanneret kan ikke lukkes (Kun nødvendige gør intet synligt, dialogen blokerer pointer events -> formularen kan ikke klikkes med mus). Delt lag (store.js/cookie), builder har selv flagget det. Boer fikses (safeStorage) – ikke P1 fordi privat tilstand uden storage er sjælden, men login er reelt ubrugeligt der.
- P2 F-3: Kontrast under AA paa hoejre halvdel 1440/1024 lys (se krav 3).
- P2 F-4: #error=access_denied&error_code=otp_expired (Supabases link-udloeb) giver intet budskab; brugeren ser blot almindelig login. Skal fanges: "Linket er udloebet. Bed om et nyt under Glemt din adgangskode?".
- P3 F-5: Rate-limit-fejl ved "Glemt kode" siger "bekraeftelsesmails" (forkert ord for nulstilling).
- P3 F-6: Touch-mål under 44 px paa mobil (se ovenfor).
- P3 F-7: css/p-login.css indlaeses uden ?v= (cache-bust stampes først af build).
- P3 F-8: Registrerings-tilstand: hoejre halvdel har stort tomt omraade efter "Allerede medlem" naar formularen er hoej (1440: ~350 px dødt panel).
- P3 F-9: Strimmel: "Kilden staar paa hver annonce" brydes over 3 linjer -> uens hoejder.

## For at komme taettere paa billedet (prioriteret)
1. Lad fotoet (motorcykel) fylde hele hoejre halvdel: fade-in fra ~35 % af panelets bredde i stedet for ~75 %, behold tekstlæsbarhed via en lokal glas/scrim bag fordelslisten, og skaler foto saa motorcyklen er hel og stor (billedets helt).
2. Lysere, mere levende foto (mindre blur/daempning); soloppgangsfarverne er billedets stemning. Moerk tilstand: scrim kun bag tekst.
3. Mobil: foto-header (motorcykel-udsnit 160-200 px) over kortet, så siden har billedfølelse paa 390.
4. Titel stoerre og tyngre (billedet h1 ca. 40 px bold, fordelsrubrik ca. 36 px); fordelsikoner i runde lysegroenne/brandtonede cirkler 44 px (nu 36).
5. Hoejre CTA flyttes til samme baseline som venstre "Log ind"-knap (billedet har dem næsten på linje) og stoerre afstand ned til strimmel.
6. Strimmel: faste lige høje 4 kolonner, kortere titler ("Kilden staar paa annoncen"), ensartet ikonstoerrelse; evt. let skygge/overlap med foto som i billedet.
7. Afmeld: stoerre kort, centreret med ikon/hakket bekræftelse.
8. Ret F-1/F-2/F-3/F-4.
