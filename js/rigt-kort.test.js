/* Tests for det rige annoncekort (forsiden, referencebillede 1): listingCardHTML(l, i, { rich: true }).

   Kortet er en tættere opstilling af de samme data som de to andre korttyper.
   Det, der må holde, er reglerne, ikke pixelerne:
   - kun oplyste tal bliver til chips; et manglende tal siges højt som "ikke oplyst"
   - ingen vægt (kg): ingen annonce bærer et vægttal, og en chip ville være et gæt
   - kørekortchippen er den samme udregning som filteret (koerekortMaerkat)
   - det indekserede kort har intet gem-hjerte og ingen vej ud af sitet (D-008, CLAUDE.md regel 2)
   - uden opts er kortene uændrede

   Samme harness som js/eksternt-kort.test.js: browserscripts uden module.exports evalueres i en
   funktion, så testen kører den kode, browseren kører. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const KILDER = ['icons.js', 'data.js', 'filtrering.js', 'components.js'];

const STUB = `
const noop = () => {};
const elStub = () => ({
  classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}, style:{},
  appendChild:noop, setAttribute:noop, getAttribute:()=>null, addEventListener:noop,
  querySelector:()=>null, querySelectorAll:()=>[], dataset:{}, hidden:true,
  textContent:'', innerHTML:'', firstElementChild:null,
});
const document = {
  addEventListener:noop, querySelector:()=>null, querySelectorAll:()=>[],
  getElementById:()=>null, createElement:elStub, documentElement:elStub(),
  body:{classList:{add:noop,remove:noop,toggle:noop},appendChild:noop,style:{}},
  readyState:'loading', title:'',
};
const window = { location:{href:'',search:'',pathname:'/index.html'}, addEventListener:noop,
  matchMedia:()=>({matches:false,addEventListener:noop}), scrollTo:noop, history:{} };
const history = { scrollRestoration:'auto', replaceState:noop, pushState:noop };
const location = { href:'', search:'', pathname:'/index.html', origin:'http://localhost' };
const localStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const sessionStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const Store = { isComparing:()=>false, isFavorite:()=>false, getUser:()=>null };
`;

const { listingCardHTML, externalCardHTML, koerekortMaerkat } = new Function(
  STUB + KILDER.map(læs).join('\n') +
  '\nreturn { listingCardHTML, externalCardHTML, koerekortMaerkat };')();

const KILDE_URL = 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=180898&m=1489';
const rig = (l, i = 1) => listingCardHTML(l, i, { rich: true });
const linje = html => html.match(/<p class="rk-linje">([\s\S]*?)<\/p>/)[1];
const chipsAf = html => html.match(/<ul class="rk-chips">([\s\S]*?)<\/ul>/)[1];

function ekstern(extra){
  return Object.assign({
    id: '42410d86-c150-4ce9-8e0f-8ca744bb4e0c',
    isExternal: true, brand: 'Honda', model: 'CB 1000 Hornet', type: 'naked',
    price: 124800, year: 2024, km: 8100, ccm: 1000, power: 150,
    city: 'Rødding', postnr: 6630, isDealer: true,
    externalUrl: KILDE_URL, source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
  }, extra || {});
}
function egen(extra){
  return Object.assign({
    id: 1021, brand: 'KTM', model: 'RC 390', type: 'sport', price: 44900, year: 2021,
    km: 9100, ccm: 373, power: 44, city: 'Aarhus', isDealer: false,
  }, extra || {});
}

test('titel og pris står på samme linje, titlen først', () => {
  const html = rig(ekstern());
  const top = html.match(/<div class="rk-top">([\s\S]*?)<\/div>/);
  assert.ok(top, 'kortet skal have en .rk-top');
  assert.match(top[1], /<h3 class="rk-titel">Honda CB 1000 Hornet<\/h3>\s*<span class="rk-pris">124\.800 kr\.<\/span>/);
});

test('linjen "år | km | type" bærer de tre felter — og et manglende tal siges højt', () => {
  assert.match(linje(rig(ekstern())), /<span>2024<\/span><span>8\.100 km<\/span><span>Naked<\/span>/);
  const udenKm = linje(rig(ekstern({ km: null })));
  assert.match(udenKm, /Km ikke oplyst/);
  assert.ok(!/0 km|null|NaN/.test(udenKm), 'et manglende km må aldrig blive til "0 km"');
});

test('chips: kun de tal annoncen oplyser — og aldrig kg', () => {
  const chips = chipsAf(rig(ekstern()));
  assert.match(chips, /1\.000 ccm/);
  assert.match(chips, /150 hk/);
  assert.ok(!/\bkg\b/i.test(chips), 'ingen vægt: ingen annonce i lageret oplyser den');
  assert.ok(!/ikke oplyst/.test(chips), 'intet mangler her, så ingen "ikke oplyst"-chip');
});

test('mangler hk, siger en dæmpet chip det; mangler begge, siger den begge', () => {
  const udenHk = chipsAf(rig(ekstern({ power: null })));
  assert.match(udenHk, /rk-chip-mangler">hk ikke oplyst</);
  assert.ok(!/<li class="rk-chip">[^<]* hk</.test(udenHk), 'ingen opdigtet hk-chip');
  const udenBegge = chipsAf(rig(ekstern({ power: null, ccm: null })));
  assert.match(udenBegge, /ccm og hk ikke oplyst/);
  assert.ok(!/<li class="rk-chip">[^<]*(ccm|hk)</.test(udenBegge), 'ingen ccm- eller hk-chip uden tal');
});

test('kørekortchippen er filterets udregning, ordret', () => {
  for (const l of [ekstern(), ekstern({ power: 30, ccm: 373 }), egen(), ekstern({ power: null, ccm: 650 })]){
    const k = koerekortMaerkat(l);
    const vist = k.kode === 'A' ? 'A' : k.tekst;   // chippen er smal: 'Kørekort A' vises som 'A', teksten ligger i skærmlæsertekst og title
    assert.ok(rig(l).includes(`>${vist}<span class="visually-hidden">. ${k.kode === 'A' ? 'Kørekort A. ' : ''}${k.forklaring}</span></li>`),
      `chippen skal sige "${k.tekst}" med forklaringen i klartekst`);
  }
  assert.match(rig(egen()), /rk-kk kk-a2/, 'A2-klassen følger med som CSS-klasse');
});

test('det indekserede rige kort: intet hjerte, ét internt link, ingen vej ud af sitet, kilden nævnt', () => {
  const html = rig(ekstern());
  assert.ok(!/fav-btn|data-fav-toggle/.test(html), 'D-008: en favorit, databasen afviser, må ikke se ud som om den virker');
  assert.match(html, /data-compare-toggle/);
  const links = html.match(/<a\b[^>]*>/g) || [];
  assert.equal(links.length, 1);
  assert.match(links[0], /href="annonce\.html\?id=42410d86-c150-4ce9-8e0f-8ca744bb4e0c"/);
  assert.ok(!/href="https?:/.test(html) && !/target="_blank"/.test(html));
  assert.match(html, /Kilde: mcsyd\.dk/);
  assert.match(html, /title="Annoncen ligger hos MC Syd/);
});

test('en indekseret annonce uden brugbar kilde-URL vises ikke', () => {
  assert.equal(rig(ekstern({ externalUrl: 'javascript:alert(1)' })), '');
  assert.equal(rig(ekstern({ externalUrl: '' })), '');
});

test('vores egen annonce: hjerte og "Kilde: Privat" / "Forhandler"', () => {
  const html = rig(egen());
  assert.match(html, /class="fav-btn [^"]*" aria-pressed="false" aria-label="Gem annonce" data-fav-toggle="1021"/);
  assert.match(html, /Kilde: Privat/);
  assert.match(rig(egen({ isDealer: true })), /Kilde: Forhandler/);
});

test('uden pris står der "Pris ved henvendelse", aldrig "null kr."', () => {
  const html = rig(ekstern({ price: null }));
  assert.match(html, /Pris ved henvendelse/);
  assert.ok(!/null|NaN|undefined/.test(html));
});

test('uden opts er de to eksisterende korttyper uændrede', () => {
  const e = ekstern();
  assert.equal(listingCardHTML(e, 1), externalCardHTML(e, 1));
  assert.ok(!/card-rich/.test(listingCardHTML(egen(), 1)));
  // .map(listingCardHTML) sender (element, indeks, liste): listen må ikke læses som opts
  assert.ok(!/card-rich/.test([egen()].map(listingCardHTML)[0]));
});

test('kun de lovlige felter står på kortet — ingen annoncetekst, ingen kontaktoplysninger', () => {
  const html = rig(ekstern({ description: 'RING 12345678 for pris', phone: '12345678', email: 'a@b.dk', uddrag: 'tekst' }));
  assert.ok(!/12345678|a@b\.dk|RING|uddrag/i.test(html));
});
