# Runde 21 — P1 rettet: forhandler-vandmærker (27.09.2026)

Fortsættelse af runde 20's Impeccable-kritik (`.impeccable/critique/2026-09-27T19-18-18Z__index-html.md`).
Bruger valgte: "fix næste finding, vandmærkerne" — P1, dealer-watermarks
obscuring most of the featured grid.

## Historik tjekket først

Før noget blev kodet, blev `js/components.js`s eksisterende kommentarer og
`js/eksternt-kort.test.js` læst igennem, fordi et tidligere forsøg på et
kilde-mærke på/over fotoet allerede findes i historikken:

- **Runde 5 (D5-S2):** en fuld-bredde "Annonce fra `<kilde>`"-stribe over
  fotoet (`.card-kilde`, stadig i CSS'en, ubrugt) blev fjernet for at være
  "34px identisk tekst på 24 af 24 kort" — informationsredundans, ikke et
  visuelt problem. En test (`js/eksternt-kort.test.js:127`) låser, at
  `.card-kilde` ikke må komme tilbage.
- **Tidligere kontrasttest:** en gennemsigtig pille direkte over et vilkårligt
  forhandlerfoto målte 2,64:1 kontrast — under AA's 4,5:1 — fordi
  fotobaggrunden er uforudsigelig.

Dette er et andet problem (et vandmærke, der visuelt dækker motorcyklen —
ikke gentaget tekst), men løsningen ligner nok til, at brugeren blev spurgt
først, i stedet for stiltiende at genindføre noget, projektet allerede har
trukket tilbage én gang. Svar: lille hjørne-badge, solid baggrund.

## Hvad blev rettet

`js/components.js` (`externalCardHTML`): et nyt `<span class="card-source-badge">`
i `.card-media`, øverste venstre hjørne — det ene hjørne, det eksterne kort
ikke allerede bruger (sammenlign-knappen sidder nederst til højre). Viser
domænet (fx "mcsyd.dk") med det eksterne-link-ikon. Udelades helt, hvis
domænet ikke er oplyst — intet tomt mærke.

`css/styles.css`: `.card-source-badge` — solid baggrund
(`rgba(255,255,255,.92)` lys / `rgba(31,28,23,.92)` mørk, samme mønster som
`.card-compare`), ikke gennemsigtig, med vilje efter kontrast-lektien
ovenfor. Genbruger `--radius-pill`, `--shadow-sm`, `--color-dark` — ingen ny
farve.

`js/eksternt-kort.test.js`: to nye tests — badgen viser domænet uden at
tilføje en ny `<a>` (den eksisterende "kun ét link"-test holder stadig), og
badgen udelades helt uden et domæne.

**Lille sidefund, rettet med det samme:** `.problem-item-minor h3` stod på
15px fra runde 20 — samme størrelse som brødteksten under den
(`.problem-item p{font-size:15px}`). Detektoren fangede det som
`flat-type-hierarchy`. Fjernet (falder tilbage til basens 17px) — nedtoningen
af de tre mindre punkter kommer allerede fra stregen væk og bundkanten, den
behøvede ikke også dele størrelse med brødteksten.

**Ikke rettet, hører ikke til denne runde:** detektoren rapporterer stadig
`flat-type-hierarchy` med "h2 14px" — det er `.footer-col-title` (14px),
ikke noget i problem-sektionen, og var der efter alt at dømme allerede før
runde 20. Sidefund til en senere runde, ikke en del af vandmærke-fixet.

## Verifikation

Browser (Playwright, da denne sessions egen browser-rude ikke rendrer
brugerdefinerede desktop-bredder korrekt): lys + mørk tema, 390px + 1440px.
Badgen er læsbar på alle otte stikprøvede kort, uanset hvad der ligger under
den i fotoet.

**Gate:** `node --check` (alle js/crawler/scripts), `npm test` 335/335
(333 + 2 nye), `node scripts/build.js`, `node scripts/udgiv.js` — alle grønne.

## Resterende findings fra runde 20's kritik

| Sev | Hvad | Status |
|---|---|---|
| P1 | "Mulig A2" kan læses som bekræftet ved et skim | åben |
| P2 | Ubalancerede sidste rækker i type- og mærke-gitrene | åben |
| P2 | Peak-end svækket af en SEO-blok efter den afsluttende CTA | åben |
| — | `flat-type-hierarchy` på footer-h2 (14px) — nyt sidefund, ikke fra kritikken | åben |
