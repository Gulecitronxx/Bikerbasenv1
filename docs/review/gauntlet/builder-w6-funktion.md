# Builder W6 – funktion (branch gauntlet/w6-funktion, fra e5eaa90)

## Acceptkriterier (skrevet FØR koden; bevis pr. kriterium i js/w6-*.test.js)

1. **Datoer/tal uden NaN.** `timeAgoDa(null|undefined|''|'ugyldig'|NaN)` giver tom streng (aldrig "NaN måneder siden", aldrig "674 måneder siden" fra epoch-0). Listerækken (`listingRowHTML`) uden `createdAt` har intet `.row-when`-element og ingen "NaN/undefined/null". `formatPrice/Km/Ccm/Power` og øvrige tal-formatter giver "ikke oplyst"-tekst ved NaN/Infinity/tekst, aldrig "NaN kr.".
2. **Telefonnote, ét budskab pr. tilstand.** Sælgerkortet har tre tilstande (har nummer/knap, intet nummer, sælger har afvist efter klik); der står kun ÉN note ad gangen, og efter null-svar erstattes den eksisterende note (ikke en ekstra) og knappen/actionbar fjernes. Testet via en ren funktion `telefonNoteTekst(tilstand)` + DOM-lignende simulering.
3. **Tomt backend-svar.** Når begge kilder svarer 'ok' men lageret er tomt, viser sider uden egen fejltilstand (forside, mærke-, type-/facetsider) den ærlige fejl med "Prøv igen" (via `meldDataafbrud` i backend-bridge) – ikke "Ingen X til salg" og ikke "helt nyt". Mærkesiden (js/maerke.js) siger ikke "Ingen X til salg", når HELE lageret er tomt. Søg + annonce uændret (egen tilstand, ingen dobbelt banner).
4. **Sport Glide.** Kildetype "Sport" på en titel hvor "Sport" kun står som del af "Sport Glide" tilsidesættes (type cruiser via modeltabel). Trailing kategoriord, der svarer til rækkens egen type ("… Sport Glide Touring" + type Touring), fjernes fra modelnavnet. Rigtige modeller uændrede.
5. **Privat sælger uden telefon.** Annoncesiden siger kort og sandt "Sælgeren har ikke oplyst telefon. Annoncen kan ikke kontaktes via Bikerbasen endnu." – ingen løfte om beskedlevering, ingen tom handlingsflade.
6. **Ingen løfter.** Ingen klientside-tekst (js/) lover betaling, beskedlevering eller "helt nyt"; dokumenteret med gennemgang i rapporten.
7. `node --check` på alle js/crawler/scripts og `npm test` grønne.
