/* Vagthund for SC 2.4.11 "Focus Not Obscured (Minimum)". Kør: npm test

   Testen læser css/styles.css som tekst. Det er ikke en adfærdstest — den
   rigtige efterprøvning er Tab og Shift+Tab i en browser, og den er gjort:
   annonce.html?id=1021 ved 390x844, hvor fokus før landede 800-838 under en
   handlingsbjælke, der dækker 775-844, og 0-38 under en header, der dækker
   0-68. Efter reglen: 399-437 begge veje, nul overlap.

   Grunden til at den ALLIGEVEL står her er, at fejlen er usynlig. Der fandtes
   ingen scroll-padding nogen steder i stilarket, og ingen havde bemærket det,
   fordi en fokusring, man ikke kan se, ikke ser ud som en fejl — den ser ud
   som ingenting. En regel, hvis fravær ikke kan mærkes, forsvinder i den
   næste oprydning. Filen ligger i js/ og ikke i css/, fordi gaten kører
   node --check på js/*.js.

   Den anden halvdel er de to tal, der skal være ét: bjælkens højde bruges
   både til body'ens padding-bottom (så footeren ikke ligger under bjælken) og
   til scroll-padding-bottom (så et tastetryk ikke gør det). Stod de som to
   76'ere, ville den næste, der justerede bjælken, rette den ene. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
const komponenter = fs.readFileSync(path.join(__dirname, 'components.js'), 'utf8');

test('html har scroll-padding-top, og den er headerens højde', () => {
  const m = css.match(/(^|\})\s*html\s*\{[^}]*scroll-padding-top:\s*([^;}]+)/m);
  assert.ok(m, 'der er ingen scroll-padding-top på html — så lander Shift+Tab bag den sticky header');
  assert.match(m[2].trim(), /var\(--header-h\)/,
    'højden skal komme fra --header-h, ikke fra et gentaget 68px');
});

test('handlingsbjælkens højde står ét sted og bruges begge steder', () => {
  assert.ok(/--actionbar-h:\s*\d+px/.test(css), '--actionbar-h mangler i :root');

  // Rulningen skal holdes fri af bjælken — og kun dér, hvor bjælken vises.
  assert.match(css, /html:has\(body\.har-actionbar\)\s*\{[^}]*scroll-padding-bottom:\s*var\(--actionbar-h\)/,
    'scroll-padding-bottom mangler, eller bruger et andet tal end bjælkens egen højde');

  // Og footeren skal holdes fri af den samme bjælke med det samme tal.
  assert.match(css, /body\.har-actionbar\s*\{\s*padding-bottom:\s*var\(--actionbar-h\)/,
    'body.har-actionbar skal bruge --actionbar-h, ellers kan de to tal drive fra hinanden');
});

test('scroll-padding-bottom er scopet til den side, der HAR en bjælke', () => {
  /* Uden :has()-scopet ville alle 14 sider holde 76px fri i bunden, hvor der
     ikke er noget at holde fri af — og en fokusring ville hoppe 76px op af
     ingen grund på 13 af dem. Bjælken vises kun under 960px (reglen ved
     .listing-actionbar), så scopet skal have samme grænse. */
  const blok = css.match(/@media \(max-width:959px\)\{\s*html:has\(body\.har-actionbar\)/);
  assert.ok(blok, 'scroll-padding-bottom skal stå i samme @media (max-width:959px), som viser bjælken');
});

/* ---- Cookiebanneret: den tredje faste flade ----
   Målt på annonce.html?id=1021, 390x844, tømt storage, rigtige Tab-tryk:
   18 af 40 tab-stop lå helt eller delvis bag banneret eller den bjælke,
   banneret havde skubbet 195px op. Efter reglerne herunder: 0 af 44.
   Banneret står på ALLE 14 sider ved første besøg, så fejlen var sitets
   bredeste — den var bare usynlig, fordi den forsvinder, så snart man har
   klikket én gang og aldrig kommer igen. */

test('banneret måles på documentElement, ikke på body', () => {
  /* Det her ER hele grunden til, at cookiebanneret stod tilbage, da resten af
     SC 2.4.11 blev lukket: scroll-padding skal stå på html, og et
     html-regelsæt kan ikke læse en variabel, der er sat på body. */
  assert.match(komponenter, /document\.documentElement\.style\.setProperty\('--cookie-h'/,
    '--cookie-h skal sættes på documentElement — på body kan html-reglen ikke læse den');
  assert.ok(!/document\.body\.style\.setProperty\('--cookie-h'/.test(komponenter),
    '--cookie-h må ikke sættes på body: så virker scroll-padding-bottom ikke');
  assert.match(komponenter, /removeProperty\('--cookie-h'\)/,
    'højden skal ryddes igen, når banneret er væk — ellers holdes 187px fri af ingenting');
});

test('rulning og dokument holder plads fri af cookiebanneret', () => {
  assert.match(css, /html:has\(#cookie-banner:not\(\[hidden\]\)\)\s*\{[^}]*scroll-padding-bottom:\s*var\(--cookie-h,\s*\d+px\)/,
    'uden denne regel lander Tab bag banneret på alle 14 sider ved første besøg');
  assert.match(css, /body:has\(#cookie-banner:not\(\[hidden\]\)\)\s*\{[^}]*padding-bottom:\s*var\(--cookie-h,\s*\d+px\)/,
    'scroll-padding kan ikke hjælpe det SIDSTE element: er der ikke mere at rulle, ruller browseren ikke');
});

test('begge faste flader tælles sammen på annoncesiden', () => {
  /* .listing-actionbar skubbes op til --cookie-h + 8px, når banneret er der.
     Den frie zone er derfor summen, ikke den højeste af de to — bjælkens top
     blev målt til at flytte fra y 775 til y 580, mens scroll-padding-bottom
     stod på 76px og altså dækkede en tredjedel af det, der var brug for. */
  const sum = /calc\(var\(--cookie-h,\s*\d+px\)\s*\+\s*8px\s*\+\s*var\(--actionbar-h\)\)/g;
  const fund = css.match(sum) || [];
  assert.equal(fund.length, 2,
    'både scroll-padding-bottom og body-padding skal lægge de to højder sammen (fandt ' + fund.length + ')');
  assert.match(css, /bottom:\s*calc\(var\(--cookie-h,\s*\d+px\)\s*\+\s*8px\)/,
    'de 8px skal være det SAMME mellemrum, som bjælken skubbes op med');
});

test('fallbacken dækker den højeste bannerhøjde, der findes', () => {
  /* Banneret vises af en inline-linje i markuppen, længe før js/components.js
     kan måle det. I det vindue gælder fallbacken. Målt bannerhøjde:
     320px bredde -> 206px, 390 -> 187, 768 -> 119, 1280 -> 80. Fallbacken
     skal være over den højeste; at reservere for meget koster kun nogle få
     pixels ekstra rulning, mens for lidt er selve fejlen igen. */
  const fald = [...css.matchAll(/(scroll-)?padding-bottom:[^;}]*var\(--cookie-h,\s*(\d+)px\)/g)]
    .map(m => Number(m[2]));
  assert.equal(fald.length, 4, 'forventede fire pladsreservationer bygget på --cookie-h');
  for (const v of fald){
    assert.ok(v >= 206, `fallbacken er ${v}px, men banneret måler 206px ved 320px bredde`);
  }
});
