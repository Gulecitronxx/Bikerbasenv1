/* Tests for annoncesidens tre-kolonne-skal (js/annonce.js, .an-*). Kør: npm test

   Låser de ting, der ikke må glide, når siden bygges om:
   - "Fakta om motorcyklen" skjuler rækker uden værdi, men markerer "Ikke oplyst",
   - kørekortkortet siger "ikke udelukket ud fra de oplyste tal", aldrig "kan køres",
   - tjeklisten har fem punkter og peger på den reserverede guide-adresse,
   - "Handl trygt"-boksen indeholder kun påstande, siden kan stå inde for
     (ingen "verificeret", ingen anmeldelser, ingen svartid).

   Mønstret er det samme som js/eksternt-kort.test.js: browserscripts uden
   module.exports evalueres i en funktion; stubbene dækker kun det, filerne
   rører ved indlæsning. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const læs = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const KILDER = ['icons.js', 'data.js', 'filtrering.js', 'components.js', 'annonce.js'];

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
const window = { location:{href:'',search:'',pathname:'/annonce.html'}, addEventListener:noop,
  matchMedia:()=>({matches:false,addEventListener:noop}), scrollTo:noop, history:{} };
const history = { scrollRestoration:'auto', replaceState:noop, pushState:noop };
const location = { href:'', search:'', pathname:'/annonce.html', origin:'http://localhost' };
const localStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const sessionStorage = { getItem:()=>null, setItem:noop, removeItem:noop };
const Store = { isComparing:()=>false, isFavorite:()=>false, getUser:()=>null };
`;

const { anFakta, anKoerekortKort, anTjekKort, anTrygtKort, anNoegletal, koerekortMaerkat } = new Function(
  STUB + KILDER.map(læs).join('\n') +
  '\nreturn { anFakta, anKoerekortKort, anTjekKort, anTrygtKort, anNoegletal, koerekortMaerkat };')();

/* W14 runde 3 (bevidst ændring): uoplyste felter står ikke længere som rækker med "Ikke oplyst", men samlet i én linje under tabellen. */
test('faktatabellen skjuler tomme rækker og samler "Ikke oplyst" i én linje', () => {
  const html = anFakta([['<i></i>', 'Mærke', 'Yamaha'], ['<i></i>', 'Farve', null], ['<i></i>', 'Type', ''], ['<i></i>', 'Ydelse', 'Ikke oplyst']]);
  assert.match(html, /Mærke/);
  assert.doesNotMatch(html, /Farve/, 'null-række må ikke tegnes');
  assert.doesNotMatch(html, /Type/, 'tom række må ikke tegnes');
  assert.doesNotMatch(html, /<dd class="an-na">/, 'ingen "Ikke oplyst"-række i tabellen');
  assert.match(html, /<p class="an-fakta-io">Ikke oplyst: Ydelse<\/p>/);
});

test('kørekortkortet påstår aldrig mere end tallene kan bære', () => {
  const l = { ccm: 689, power: 45, isExternal: true };
  const kkM = koerekortMaerkat(l);
  const html = anKoerekortKort(l, kkM, false);
  assert.match(html, /Kan du køre denne motorcykel\?/);
  assert.match(html, /Ikke udelukket/);
  assert.doesNotMatch(html, /Du kan køre/i);
  assert.match(html, /koerekort-a2\.html/);
});

test('kørekortkortet siger "kan ikke afgøres", når effekten mangler over 125 ccm', () => {
  const l = { ccm: 1200, isExternal: true };
  const html = anKoerekortKort(l, koerekortMaerkat(l), true);
  assert.match(html, /Kan ikke afgøres/);
  assert.match(html, /A2\/A/);
});

test('tjeklisten har fem nummererede punkter og peger på guiden', () => {
  const html = anTjekKort();
  assert.equal((html.match(/<li>/g) || []).length, 5);
  assert.match(html, /href="guide-brugt-motorcykel\.html"/);
});

test('"Handl trygt" indeholder kun sande punkter og linker til sikkerhed.html', () => {
  for (const html of [anTrygtKort(true, 'MC Syd'), anTrygtKort(false)]){
    assert.match(html, /sikkerhed\.html/);
    assert.doesNotMatch(html, /verificer|anmeldelse|svartid|stjerne/i);
    assert.match(html, /rører aldrig pengene/);
  }
  assert.match(anTrygtKort(true, 'MC Syd'), /Vi hoster ikke annoncen/);
});

test('nøgletalsrækken viser kun oplyste tal', () => {
  const html = anNoegletal({ km: null, year: 2020, ccm: 0 }, null);
  assert.match(html, /2020/);
  assert.doesNotMatch(html, /Kørt/);
  assert.doesNotMatch(html, /Motor/);
  assert.equal(anNoegletal({ km: null, year: null, ccm: 0 }, null), '');
});
