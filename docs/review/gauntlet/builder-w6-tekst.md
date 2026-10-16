# Builder w6-tekst — ærlighedsgennemgang af tekstsider

## Acceptkriterier (skrevet før rettelserne)
1. Ingen tekstside lover betaling/escrow ("sikker betaling"), beskedlevering ("skriv via Bikerbasen", "send besked", kontaktformular) eller "helt nyt"-formuleringer. Negationer ("findes ikke") er tilladt.
2. privatlivspolitik.html nævner: localStorage (med nøgleliste), sessionStorage, Supabase som databehandler (EU/Irland), Google Analytics kun med samtykke, kontaktvej (mailto), Datatilsynet, rettigheder, opt-out for annoncører/forhandlere (link til om-indeksering) og at claim kræver verificeret ejerskab.
3. Beskrivelsen af "henvendelser" matcher koden: kun et tryk på "Vis telefonnummer" tælles; ingen besked sendes eller gemmes.
4. vilkaar.html beskriver claim (krav) som manuelt godkendt efter verificeret ejerskab og modsiger ikke sikkerhed/om-siderne.
5. Ingen opdigtet firmanavn, CVR, adresse eller e-mail; kun eksisterende kontakt@bikerbasen.dk. Mangler listes under "Ejer skal levere".
6. Header/footer, css/ og js/ er urørt. scripts/tekstsider.test.js låser 1-5. node --check og npm test grønne.

## Gennemgået
privatlivspolitik, vilkaar, om-bikerbasen, om-indeksering, sikkerhed (afmeld.html er teknisk, 404 uden påstande). Cookies/FAQ/hjælp/kontakt-sider findes ikke; kontaktvej er kontakt@bikerbasen.dk.

## Rettet
- privatlivspolitik: "Henvendelser via kontaktformular" var forkert (formularen er fjernet; tæller = tryk på "Vis telefonnummer", visninger tælles pr. session). Fuld liste over localStorage-/sessionStorage-nøgler (matcher js/store.js), "Bikerbasen sætter selv ingen cookies", opt-out for annoncører/forhandlere + claim kræver verificeret ejerskab, indsigelsesret/tilbagetrukket samtykke, indekserede annoncer fjernes ved kildens ønske, kontaktvej under Dataansvarlig. Supabase EU/Irland verificeret (projekt hkcjrwglwurdjnobewzb = eu-west-1).
- vilkaar: "skrive til en sælger" fjernet; ny afklaring om at beskeder ikke leveres; ny §3-underpunkt om krav (verificeret ejerskab, manuel godkendelse).
- om-bikerbasen: "skrive til sælger / modtage henvendelser" rettet.
- sikkerhed: chip "Skriv via Bikerbasen" -> "Ring til sælger"; "skriver du til sælgeren her" rettet; svindeltegn selvmodsigelse rettet.
- scripts/info-tekst.test.js: de 4 tekst-hashes opdateret (bevidst tekstændring, som filens kommentar kræver).

## Ejer skal levere (opdigtes ikke)
1. Dataansvarlig: juridisk navn, CVR, adresse (privatlivspolitikken siger kun "Bikerbasen").
2. Evt. DPA-/databehandleraftale-status med Supabase, og bekræftelse af GitHub Pages/Fastly-hosting (CNAME bikerbasen.dk; docs/CLOUDFLARE.md antyder Cloudflare foran — afklar om Cloudflare skal nævnes som databehandler).
3. Konkret opbevaringsfrist (nu "rimelig tid") og sletteprocedure/svartid for konti.
4. Sælgerleverede beskeder: beslut om de skal bygges; indtil da må ingen side love dem.
5. Udenfor mit ejerskab: login.html meta description lover "sende beskeder til sælgere" (login-strømmen); opret-annonce/dashboard bør også tjekkes for samme.
6. Vilkår: reklamationsret-/forhandlerformuleringer og DSA-kontaktpunkt bør juridisk gennemlæses.

## Test
scripts/tekstsider.test.js (nyt; Orchestratoren tilføjer til npm test). npm test: 608 pass, 6 fail = crawler/*.test.js (mangler @supabase/supabase-js i worktree, uændret fra baseline).
