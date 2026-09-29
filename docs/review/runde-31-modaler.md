# Runde 31 — info-, rapport- og sammenligningsmodalerne var ikke dialoger (29.09.2026)

Bruger: "kør loopet igen og push og så kør igen." Fortsættelse af runde 30, som
rettede menuskuffen og lod (i)-forklaringen stå urørt. Den blev taget nu.

## Cookie-samtykket er i orden

`<dialog>` med `showModal()` (`initCookieConsent()` i `js/components.js`): fokus,
fokusfælde og inert baggrund kommer fra browseren, og de to knapper er lige
store — det er et juridisk krav, ikke stil (kommentaren i koden). Ikke rørt.

## Fundet: tre overlays, der så ud som dialoger

Målt på "Hvor kommer annoncerne fra?" (klik på (i) i søgesidens kildelinje),
før rettelsen: en `.modal-box`-div uden `role`, uden `aria-modal`, uden navn;
fokus blev på (i)-knappen bag den; Escape lukkede den ikke; baggrunden var
tabbar. Samme mønster gælder de andre to:

| overlay | åbnes fra | rolle/navn | fokus ind | Escape | inert | fokus tilbage |
|---|---|---|---|---|---|---|
| `#info-modal` | 4 steder (kilder, rækkefølge, betaling, gratis-grænsen) | nej | nej | nej | nej | nej |
| `#report-modal` | "Anmeld annonce" | nej | nej | nej | nej | nej |
| sammenligningen | "Sammenlign" i bjælken | ja | nej | ja | nej | nej |

Info-modalens række er målt; rapport- og sammenligningsrækkerne er læst i
koden (`ensureReportModal`, `openModal`) og bekræftet for sammenligningens
vedkommende af, at panelet allerede har `role` og `aria-modal` i markup'en.

Alle tre åbnes og lukkes af, at en klasse (`open`) eller `hidden` skiftes fra flere
steder — info-modalen lukkes tre forskellige steder, rapporten også ved
indsendelse. Ingen af dem sagde noget til en skærmlæser om, at siden bag nu
var uden for rækkevidde.

## Rettet

`goerOverlayTilgaengelig(overlay, { erAaben, luk, boks, titelId })` i
`js/components.js`, kaldt ved oprettelsen af hver af de tre. Den bruger en
`MutationObserver` på overlayets `class` og `hidden`, så ingen af de mange
åbne- og lukkesteder skal rettes:

- `role="dialog"`, `aria-modal="true"` og `aria-labelledby` på panelet (info:
  `info-modal-title`; rapport: den nye `report-modal-title`; sammenligningen
  havde dem allerede, og tegner panelet forfra ved hver åbning);
- baggrunden `inert` (søskende op ad træet), og fjernet igen ved lukning;
- fokus ind på første knap (luk-knappen), og tilbage på det, der havde fokus, da
  overlayet åbnede — hvis det stadig findes;
- Escape lukker; Tab og Shift+Tab løber rundt inde i overlayet.

Det er samme sæt opførsel som menu- og filterskuffen (runde 30 / `search.js`),
nu samlet i én funktion i stedet for skrevet en fjerde gang.

## Målt efter

Info: `role="dialog"`, `aria-modal="true"`, navn "Hvor kommer annoncerne fra?",
fokus på "Luk", header og main `inert`, Tab-fælde virker. Escape, luk-knappen og
klik på baggrunden lukker, ingen `inert` tilbage, fokus tilbage på (i). Rapport:
`role="dialog"`, navn "Anmeld annonce", fokus på "Luk", Escape lukker, fokus
tilbage, ingen `inert` tilbage. Sammenligning: fokus på "Luk sammenligning",
main `inert`, Escape lukker, ingen `inert` tilbage, `body.style.overflow` nulstillet.

## Ikke gjort

Ingen automatisk test: hjælperen hænger på `document`, `MutationObserver` og
`inert`, og `npm test` har ingen browser. Målingerne ovenfor er beviset.
Fokus tilbage efter sammenligningen er ikke målt: bjælkens knap tegnes forfra
(`innerHTML`), så den oprindelige knap findes ikke længere, og fokus ryger til
siden — hjælperen springer bevidst over at fokusere et element, der er væk.
Betalingsinfo og gratis-grænsen (de to andre `openInfoModal`-kald, på
annoncesiden og opret-siden) er ikke åbnet enkeltvis; de deler modal og
hjælper med den målte. Sammenligningens Escape blev før håndteret af en egen
lytter, der stadig står; de to kalder begge `closeModal()`, som er idempotent.

## Aggregator-reglerne

Ingen berørt. Kun overlays' tastatur- og skærmlæseropførsel.

## Verifikation

**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
