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
/* Selve samtykke-markuppen genereres af scripts/inline-cookie.js og bages ind i
   hver side. Vi laeser generatoren, saa testen ikke afhaenger af, at et byg lige
   har koert. */
const cookieMarkup = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'inline-cookie.js'), 'utf8');

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

/* ---- Cookiesamtykket: fra bundbjaelke til modal (runde 14) ----
   HER STOD FIRE TESTS, der vogtede WCAG SC 2.4.11 for en BUNDBJAELKE: at et
   Tab-tryk ikke kunne lande bag banneret. Maalt dengang: 18 af 40 tab-stop laa
   helt eller delvis bag banneret. Reglerne loeste det ved at reservere
   bannerets hoejde (--cookie-h) som scroll-padding og body-padding.

   Samtykket er nu en <dialog>.showModal() efter menneskets beslutning, og saa
   findes den fejlmulighed ikke laengere: browseren goer HELE baggrunden inert,
   saa der er intet tab-stop at gemme bag noget. Maskineriet er fjernet frem
   for at staa som doed kode.

   De gamle tests er ikke bare slettet — de er erstattet af dem, der vogter det,
   modalen skal kunne. Særligt den sidste: at fravalget er lige saa let som
   tilvalget er et JURIDISK krav (frivilligt samtykke), ikke en smagssag, og
   det er praecis den slags, der stille kan skride, naar nogen senere vil have
   "Accepter alle" til at skille sig ud. */

test('samtykket er en aegte modal — baggrunden er inert, ikke bare daempet', () => {
  assert.match(cookieMarkup, /<dialog[^>]*id="cookie-banner"/,
    'samtykket skal vaere et <dialog>: fokusfaelde og inert baggrund kommer fra browseren');
  assert.match(cookieMarkup, /showModal\(\)/,
    'showModal() (ikke show() og ikke open-attributten) er det, der giver top-lag og inert baggrund');
  assert.match(komponenter, /addEventListener\('cancel',\s*e\s*=>\s*e\.preventDefault\(\)\)/,
    'Escape maa ikke kunne afvise dialogen uden et svar — begge svar staar aabne');
});

test('de to samtykkeknapper er lige lette at vaelge', () => {
  /* Juridisk krav bag "frivilligt samtykke": fravalget skal vaere lige saa
     tilgaengeligt som tilvalget. Konkret betyder det, at ingen af de to baerer
     primaerfarven, og at de deler den samme klasse — saa de ikke kan skride fra
     hinanden ved en senere aendring. */
  const knapper = [...cookieMarkup.matchAll(/<button[^>]*id="cookie-(accept-all|necessary-only)"[^>]*>/g)]
    .map(m => m[0]);
  assert.equal(knapper.length, 2, 'der skal vaere praecis to svarknapper');
  for (const k of knapper){
    assert.match(k, /class="[^"]*cookie-modal-knap/, 'begge knapper skal dele samme klasse');
    assert.ok(!/btn-primary/.test(k),
      'ingen af svarene maa baere primaerfarven: det ville goere fravalget til det svaere valg');
  }
});

test('statistik starter kun ved et udtrykkeligt ja', () => {
  assert.match(komponenter, /level === 'all' && typeof window\.bbStartAnalytics === 'function'/,
    '"Kun noedvendige" maa aldrig starte statistikken');
});

