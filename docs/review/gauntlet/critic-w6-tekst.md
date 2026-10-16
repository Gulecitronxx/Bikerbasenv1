# Critic w6-tekst (blind) — gauntlet/w6-tekst, commit 093ec58

Dom: **AFVIS** (1 x P1 i ejerfil, let at rette). Resten er solidt.

Kørt i temp-kopi (git archive HEAD): `node --test scripts/tekstsider.test.js scripts/info-tekst.test.js` = 28/28 grøn. `node scripts/synk-header.js --tjek` = grøn. Header/footer urørt (diff rører kun main-indhold).

## Fund i ejerfilerne

**P1-1 privatlivspolitik.html:186 — "Supabases EU-region (Irland)" er ikke understøttet, og repoet modsiger den.**
`supabase/OPSAETNING.md:15` foreskriver "Central EU (Frankfurt)" og siger, at det er det, privatlivspolitikken lover. Intet i repoet (supabase-config.js har kun ref-URL `hkcjrwglwurdjnobewzb.supabase.co`, ingen region) siger Irland. Forkert land i en privatlivspolitik er en opdigtet faktuel påstand (databehandlers placering). Rettelse: skriv "EU-region" uden land, eller bekræft i Supabase-dashboardet og ret OPSAETNING.md/teksten til samme værdi. Tilføj en test, der forbyder landenavn uden kilde (testen tjekker i dag ikke dette).
Samme linje: "databehandleraftalen indeholder EU's standardkontraktbestemmelser" og "Supabase/GitHub er tilsluttet EU-U.S. DPF" er ikke belagt i repoet (kan være sandt, men er ikke verificeret) — P2, formuler forsigtigere eller verificér.

**P2-1 privatlivspolitik.html (punkt 2 "Visninger og henvendelser") — upræcis + udeladt behandling af IP.**
Teksten siger "én visning pr. annonce pr. browsersession". Faktisk går tælling via edge function `supabase/functions/haendelse/index.ts` (linje 11-16, 56-63), som hasher afsenderens IP (dagligt salt) og dedup'er pr. IP pr. annonce pr. dag (også kontakt-tælling). Browsersession (js/annonce.js:256-258) er kun første led. IP-behandling (selv hashet) bør nævnes under punkt 2/5, og "pr. session" bør være "pr. session og pr. dag". Uden det er "Sælgeren ser kun tallene — ikke hvem du er" sandt, men listen over hvad vi behandler er ufuldstændig.

**P2-2 privatlivspolitik.html punkt 4 — tilbagekald af samtykke kun ved at rydde browserdata.**
Koden har intet indstillingslink til at ændre cookievalg (kun banneret ved første besøg; js/components.js ~1170-1205). GDPR art. 7(3): tilbagekald skal være lige så let som at give. Teksten er ærlig om mekanismen, men beskriver et svagt tilbagekald. Anbefal enten "Cookieindstillinger"-link senere eller formulér som kendt begrænsning. (Adfærd uden for denne branch.)

**P2-3 privatlivspolitik.html — tredjeparts-hotlinking af miniaturebilleder.**
CSP (privatlivspolitik.html:6, img-src) tillader `images.danbase.dk` og `assets.guloggratis.dk`. Siden nævner "link til ét miniaturebillede hos kilden", men ikke at din browser henter billedet direkte fra kildens server (deres servere ser din IP). Skal stå under tredjeparter. Fonts er self-hosted (ingen Google Fonts) — korrekt ikke nævnt.

**P3-1 privatlivspolitik.html punkt 2 "Statistik":** opremser "mærke, type, pris, kørekort", men js/maaling.js:`soegning()` sender også `search_term` (fritekst, op til 80 tegn, state.q). Tilføj "søgeord du selv taster".
**P3-2 privatlivspolitik.html:191** "mails om søgeagenter via Resend … ikke i brug endnu": `supabase/functions/notify-saved-searches` (sender via Resend) og `afmeld.html` findes. Om funktionen er deployet kan repoet ikke afgøre; ejer skal bekræfte, ellers er "ikke i brug" ubekræftet.
**P3-3 vilkaar.html §Krav:** "din konto kan spærres" er en ny sanktion, ikke dækket af øvrige vilkår-afsnit; acceptabelt, men bør stemme med afsnit om spærring (§ anmeldelser).

## Verificeret SANDT (kriterium 1-4)
- localStorage-nøgler: alle 13 i `Store.KEYS` (store.js:21-25) + `sb-<ref>-auth-token` (backend-bridge.js:112) + sessionStorage `bb_set_<id>` (annonce.js:255) og `bb_srp_position` (search.js:1573) er listet; ingen opdigtede. Eneste andre bb_*-streng i js/ er bb_theme/bb_cookie_consent (også listet). Testen "dækker alle nøgler i store.js" er meningsfuld.
- Cookies: ingen `document.cookie` i js/; GA4 indlæses kun via `bbStartAnalytics` ved level==="all" (inline script, components.js:1202). "Kun nødvendige" indlæser aldrig Google. Korrekt. Modal har lige tunge knapper.
- Tredjeparter: GA/GTM (G-RWJZ8NJB0C) + Supabase + billedhosts; fonts self-hosted; ingen kort/CDN. Teksten matcher (bortset fra P2-3).
- Visninger tælles kun for uuid-annoncer (annonce.js:253); "Vis telefonnummer" tæller `contact` (annonce.js:1345); knappen vises kun for indloggede (annonce.js:217 vs 237-239).
- Telefon kun for indloggede: SANDT — `hent_saelger_telefon` (024_profil_opdeling.sql:259-283) kræver `auth.uid()`, `status='active'`, `vis_telefon=true`; revoke fra anon; `profiles_private` revoked fra anon. "Hvis sælgeren viser det" er korrekt.
- Beskeder leveres ikke: contact-modal/bar-contact fjernes (annonce.js:1299-1304); notatet "Beskeder … kan endnu ikke sendes" findes i UI. Teksterne er i overensstemmelse.
- Claim-flow: dashboard.js:295/399/459 + KRAV_GODKENDELSE.md bekræfter indsendelse, status, manuel godkendelse.
- Ingen opdigtet CVR/navn/adresse; kun kontakt@bikerbasen.dk (test håndhæver). Ingen overdrevne garantier ("i overensstemmelse med GDPR" i opdateringslinjen er blød nok men kan tones ned til "efter GDPR" — P3). Rettigheder: indsigt, rettelse, begrænsning, sletning, portabilitet, indsigelse (nyt), tilbagekald (nyt), klage til Datatilsynet — korrekt. Retsgrundlag (kontrakt + legitim interesse + samtykke til statistik) passer. Opbevaringsfrister: ingen tal opdigtet.
- Dansk kvalitet: ingen anmærkninger.

## Tests (kriterium 5)
tekstsider.test.js: blandet. Gode: nøgle-dækning mod store.js (adfærdsinvariant), forbudte løfter, negationskontrol for "sikker betaling", mail-whitelist. Svagt: det meste er `includes`-søgning på ord; dækker ikke sessionStorage-nøgler mod koden, region/landeangivelser (derfor slap P1-1 igennem), tredjepartslisten mod CSP, eller andre sider (login.html). info-tekst.test.js: hash-opdatering for fem sider er begrundet af tekstændringerne (kun disse sider rørt; om-indeksering uændret) — OK.

## Falske løfter uden for ejerfilerne (kriterium 7)
- **P1** login.html:9, :20, :27 — meta/og/twitter description: "…sende beskeder til sælgere…" (falsk; ingen beskedlevering). Vises i søgeresultater/delinger.
- **P2** js/mine-annoncer.js:516 og :504 — "Sikker betaling via Stripe" / Stripe-kundeportal. Stripe er "planlagt, ikke i brug" ifølge privatlivspolitikken; js/data.js:10 antyder flag, der skjuler flowet — ejer skal bekræfte at teksten aldrig renderes live, ellers modsigelse + "sikker betaling"-løfte.
- **P3** js/annonce.js:1007 + dashboard.html:9,20,27 — "henvendelser" bruges for telefon-visninger (dashboard.html:160 forklarer det korrekt); meta description "henvendelser" kan misforstås som beskeder.
- **P3** afmeld.html:10,20,27 "Afmeld beskeder fra en søgeagent" — ok hvis mails sendes (se P3-2).
- Rene: opret-annonce.html:436 (korrekt "Vi videresender ikke beskeder"), index.html "Sådan virker" (4 trin, ingen beskedløfte), soegning.html, guides*.html, mine-annoncer.html, forhandler.js:448 — ingen falske beskedløfter fundet. js/mine-annoncer.js:557 viser MitID-trin ("Identitet (MitID)", `user.mitIdVerified`) — P3, tjek at det ikke vises som tilbudt funktion (login.html:280 siger MitID ikke er sat op).

## Resumé
Branchen retter de væsentlige falske løfter (beskeder, kontaktformular, Stripe, verificering) korrekt og matcher koden på lagring, cookies, tælling og telefonadgang. Blokerende: Irland-påstanden (P1-1) — ret til "EU-region" eller verificér og synk OPSAETNING.md. Anbefalet i samme runde: IP-hash-tælling i politikken (P2-1), billed-hosts (P2-3), login.html meta (P1 uden for scope — send til anden ejer).
