/* Tests for maerkesidens egne ord og dens interne adresser. Kør: npm test

   Hvorfor lige de her:

   Mærkesiderne fandtes ikke i drift. `fetchListings()` læste kun `listings`,
   som har 0 rækker, så byggekæden producerede nul mærkesider og et sitemap
   med syv adresser, mens 332 indekserede annoncer lå ulæste i
   `eksterne_annoncer` (findingen C-014). Nu bygges siderne af begge kilder —
   og dermed af data med huller: målt på lageret har 22 af 332 annoncer ingen
   pris og 163 af 332 ingen kilometerstand.

   Det er præcis dér, en genereret side begynder at påstå noget. Den gamle
   indledning skrev prisspændet ubetinget ("null kr.") og
   `l.km.toLocaleString()` ubetinget — sidstnævnte ville have kastet en
   TypeError midt i byggeriet. Og `brandItemListLd()` navngav en
   annonce-<slug>.html for hver annonce, også de indekserede, som ikke HAR en
   (samme fejl som C-015 i js/seo.js: struktureret data, der peger på 404).

   Den sidste gruppe er D-010 og handler om det samme et niveau højere:
   mærkeindekset linkede alle 60 kendte mærker til soegning.html?brands=X, og
   44 af de links gav nul træf. Et link er en påstand om, at der er noget for
   enden. Reglen — nævn mærket, men link det først når der er lager — er en
   linje kode, og den er nem at "forenkle" tilbage.

   De fire ting er små nok til at blive "ryddet op" af en senere runde og dyre
   nok til at blive låst her. */

const test = require('node:test');
const assert = require('node:assert');

// require.main-gaten i build-brand-pages.js gør, at det her IKKE kører et byg.
const { introFor, noscriptLinje, brandItemListLd, harEgenSide, internAdresse, maerkerUdenLager, splitIntro, vaelgFremhaevede }
  = require('./build-brand-pages.js');

function ekstern(extra){
  return Object.assign({
    id: '42410d86-c150-4ce9-8e0f-8ca744bb4e0c',
    isExternal: true, brand: 'Honda', model: 'VT 700', year: 1986,
    price: 34800, km: 67000, type: 'cruiser', city: 'Rødding',
    source: { navn: 'MC Syd', domaene: 'mcsyd.dk' },
  }, extra || {});
}
function egen(extra){
  return Object.assign({
    id: 1017, brand: 'Suzuki', model: 'GSX-R750', year: 2017,
    price: 79800, km: 21000, type: 'sport', city: 'Aarhus',
    createdAt: '2026-08-01T10:00:00Z',
  }, extra || {});
}

/* ---- Indledningen må ikke opfinde det, kilden ikke har oplyst ---- */

test('en annonce uden pris giver hverken "null kr." eller NaN', () => {
  const tekst = introFor('Honda', [ekstern({ price: null }), ekstern({ price: null })]);
  for (const skidt of ['null', 'NaN', 'undefined']){
    assert.ok(!tekst.includes(skidt), `indledningen indeholdt "${skidt}": ${tekst}`);
  }
  // Ingen pris hos nogen => intet prisspaend paastaas overhovedet.
  assert.ok(!/\bfra .* til .*kr\./.test(tekst), 'der blev skrevet et prisspænd uden priser');
});

test('delvis prisdækning siges højt i stedet for at blive rundet væk', () => {
  const tekst = introFor('Honda', [ekstern({ price: 34800 }), ekstern({ price: null })]);
  assert.match(tekst, /34\.800 kr\./);
  assert.match(tekst, /1 annonce oplyser pris ved henvendelse/);
});

test('manglende årgang giver ikke "mellem NaN og NaN"', () => {
  const tekst = introFor('Honda', [ekstern({ year: null }), ekstern({ year: null })]);
  assert.ok(!tekst.includes('NaN'), tekst);
  assert.ok(!/årgang/.test(tekst), 'der blev skrevet en årgang, kilden ikke har oplyst');
});

test('indekserede annoncer nævner kilden — siden er ikke stedet, handlen sker', () => {
  const tekst = introFor('Honda', [ekstern(), ekstern()]);
  assert.match(tekst, /indekseret fra MC Syd/);
  assert.match(tekst, /handlen sker hos kilden/);
});

test('egne annoncer får IKKE en kildesætning på sig', () => {
  const tekst = introFor('Suzuki', [egen(), egen()]);
  assert.ok(!/indekseret fra/.test(tekst), tekst);
  assert.match(tekst, /privat sælger eller forhandler/);
});

/* ---- <noscript>-listen ---- */

test('noscript-linjen kaster ikke på en annonce uden km', () => {
  const linje = noscriptLinje(ekstern({ km: null }));
  assert.ok(!/km/.test(linje), `km blev nævnt uden et tal: ${linje}`);
  assert.ok(!linje.includes('null') && !linje.includes('NaN'), linje);
});

test('noscript-linjen skriver "pris ved henvendelse", ikke "0 kr."', () => {
  assert.match(noscriptLinje(ekstern({ price: null })), /pris ved henvendelse/);
});

/* ---- Adresser: kun sider, der findes ---- */

test('kun egne annoncer har en forrenderet side', () => {
  assert.equal(harEgenSide(egen()), true);
  assert.equal(harEgenSide(ekstern()), false);
});

test('en indekseret annonce peges til annonce.html?id=, aldrig til en annonce-slug', () => {
  const adresse = internAdresse(ekstern());
  assert.equal(adresse, 'annonce.html?id=42410d86-c150-4ce9-8e0f-8ca744bb4e0c');
  assert.ok(!adresse.startsWith('annonce-'),
    'annonce-<slug>.html findes ikke for indekserede annoncer — det ville være en 404');
});

test('ItemList udelader annoncer uden egen side — og bortfalder, når ingen har en', () => {
  // Det var C-015-fejlen: hvert ListItem fik en url, der svarede 404.
  assert.equal(brandItemListLd('Honda', [ekstern(), ekstern()]), null,
    'et ItemList over sider, der ikke findes, er værre end intet ItemList');

  // T-007: en delmængde (1 af 3) er en misvisende ItemList — kun en liste, der dækker alle, skrives.
  assert.equal(brandItemListLd('Suzuki', [ekstern(), egen(), ekstern()]), null);
  const alleEgne = brandItemListLd('Suzuki', [egen()]);
  assert.equal(alleEgne.numberOfItems, 1, 'numberOfItems skal tælle det, listen faktisk indeholder');
  assert.equal(alleEgne.itemListElement.length, 1);
  assert.equal(alleEgne.itemListElement[0].position, 1);
  assert.match(alleEgne.itemListElement[0].url, /\/annonce-suzuki-gsx-r750-2017-1017\.html$/);
});

/* ---- Mærkeindekset: intet link uden noget for enden (D-010) ---- */

test('et mærke uden lager bliver ikke til et link', () => {
  const uden = maerkerUdenLager(['Honda', 'Vespa', 'Nimbus'], ['Honda']);
  assert.deepEqual(uden, ['Nimbus', 'Vespa'],
    'de to uden lager nævnes stadig — de skal bare ikke være links til nul træf');
});

test('Sym og SYM er samme mærke — ellers står det begge steder', () => {
  // Mærkefiltret er versalfølsomt: soegning.html?brands=SYM gav 0 annoncer,
  // ?brands=Sym gav 1. Listen i js/data.js skriver "SYM", lageret "Sym".
  // Uden en versalufølsom sammenligning ville Sym stå både i grid'en over
  // mærker MED annoncer og på listen over mærker UDEN.
  assert.deepEqual(maerkerUdenLager(['SYM', 'Vespa'], ['Sym']), ['Vespa']);
});

test('et mærke, listen ikke kender, dukker ikke op blandt dem uden lager', () => {
  // Rewaco har lager, men står ikke i BRANDS_BY_MODEL. Den hører hjemme i
  // grid'en ovenfor, ikke på nogen af de to lister her.
  assert.deepEqual(maerkerUdenLager(['Honda'], ['Honda', 'Rewaco']), []);
});

test('rækkefølgen er dansk, og tomme lister vælter ikke', () => {
  assert.deepEqual(maerkerUdenLager(['Ural', 'Beta', 'Zontes'], []), ['Beta', 'Ural', 'Zontes']);
  assert.deepEqual(maerkerUdenLager([], ['Honda']), []);
  assert.deepEqual(maerkerUdenLager(['Honda'], null), ['Honda']);
});

/* ---- NF-1: den synlige første sætning deles ikke midt i "kr." ---- */

test('NF-1: indledningen deles ikke ved "kr. " midt i prisspændet', () => {
  const tekst = introFor('Honda', [ekstern({ price: 4000, year: null }), ekstern({ price: 59900, year: null })]);
  // Uden årgang og typer ender sætningen først efter prisspændet — og
  // "fra 4.000 kr. til 59.900 kr." indeholder to "kr. " før sætningsslut.
  const { foerste, rest } = splitIntro(tekst);
  assert.match(foerste, /fra 4\.000 kr\. til 59\.900 kr\./, `det synlige afsnit blev skåret midt i prisen: ${foerste}`);
  assert.ok(!/fra 4\.000 kr\.$/.test(foerste), `det synlige afsnit slutter på "fra 4.000 kr.": ${foerste}`);
  assert.equal(`${foerste} ${rest}`.trim(), tekst, 'ingen tekst må gå tabt eller fordobles ved delingen');
});

test('NF-1: "kr. " tæller ikke som sætningsslut — heller ikke når årgang og typer følger', () => {
  const tekst = introFor('Honda', [ekstern({ price: 4000 }), ekstern({ price: 59900, year: 2001 })]);
  const { foerste, rest } = splitIntro(tekst);
  assert.match(foerste, /til 59\.900 kr\./, `første sætning er skåret før prisspændets slutning: ${foerste}`);
  assert.ok(!/fra 4\.000 kr\.$/.test(foerste), `første sætning slutter midt i prisspændet: ${foerste}`);
  assert.match(`${foerste}${rest}`, /årgange mellem 1986 og 2001/);
});

test('NF-1: "m.fl. " er heller ikke sætningsslut', () => {
  const { foerste, rest } = splitIntro('Der er 9 motorcykler. Udvalget dækker Sport, Naked, Touring m.fl. Næste sætning.');
  assert.equal(foerste, 'Der er 9 motorcykler.');
  assert.ok(rest.startsWith('Udvalget dækker Sport, Naked, Touring m.fl. Næste'), rest);
  // Én sætning med "m.fl. " midt i: ingen deling overhovedet.
  assert.deepEqual(splitIntro('Se Sport, Naked, Touring m.fl. og Cross.'),
    { foerste: 'Se Sport, Naked, Touring m.fl. og Cross.', rest: '' });
});

test('splitIntro: en intro uden sætningsskifte bliver helt stående', () => {
  assert.deepEqual(splitIntro('Der er 1 motorcykel.'), { foerste: 'Der er 1 motorcykel.', rest: '' });
});

/* ---- Fremhævet række: annoncer med foto først, aldrig flere end bedt om ---- */

test('fremhævet række: annoncer med foto går foran fotolose, og rækkefølgen ellers bevares', () => {
  const uden = id => ekstern({ id: `u${id}`, photoUrls: [] });
  const med = id => ekstern({ id: `m${id}`, photoUrls: ['https://x.example/a.jpg'] });
  const liste = [uden(1), med(1), uden(2), med(2), med(3)];
  assert.deepEqual(vaelgFremhaevede(liste, 5).map(l => l.id), ['m1', 'm2', 'm3', 'u1', 'u2']);
  assert.deepEqual(vaelgFremhaevede(liste, 2).map(l => l.id), ['m1', 'm2']);
  assert.deepEqual(vaelgFremhaevede([uden(1)], 5).map(l => l.id), ['u1'], 'har mærket få annoncer, vises de alle');
  assert.deepEqual(vaelgFremhaevede([], 5), []);
});

/* ---- Runde 2: modeltal = søgeantal, titler er ikke modeller, mærkespecifik hero/panel ---- */

const { erModelnavn, modelTal, heroVariant, ctaFoto, monogram, typeFoto, maerkeFakta } = require('./build-brand-pages.js');
const { Filtrering } = require('./shared').browserModules();

test('P2-3: en sælgertitel er ikke et modelnavn — ægte modeller består', () => {
  for (const titel of ['God velkørende custom med lav. KM', 'Sælges billigt pga. plads', 'meget pæn og velholdt maskine', 'Flot stand, nysynet og klar til sæsonen']){
    assert.equal(erModelnavn(titel), false, `"${titel}" blev regnet for en model`);
  }
  for (const model of ['FJR 1300 A', 'XV 1900', 'Ténéré 700 World Raid T7', 'Super Meteor 650 Astral', 'Gs katana', 'Xv 750 virago', 'Fzr 600', 'MT-09', 'CB 1000 Hornet', 'Z 900 RS', 'R 1250 GS Adventure']){
    assert.equal(erModelnavn(model), true, `ægte model "${model}" blev kasseret`);
  }
  assert.equal(erModelnavn(''), false);
  assert.equal(erModelnavn(null), false);
});

test('P2-2 / F2-005: modelflisens tal er præcis det antal, soegningen viser (eksakt model, ikke delstreng)', () => {
  const m = (id, model) => ekstern({ id: `x${id}`, brand: 'BMW', model, type: 'touring' });
  // "K 1200" er en delstreng af "K 1200 GT" og "K 1200 RS" — men en eksakt model er kun sig selv.
  const items = [m(1, 'K 1200'), m(2, 'K 1200 GT'), m(3, 'K 1200 GT'), m(4, 'K 1200 RS'), m(5, 'R 1200'), m(6, 'God velkørende custom med lav. KM'), m(7, 'Cb 500'), m(8, 'CB 500')];
  const liste = modelTal(items);
  for (const { m: navn, n } of liste){
    assert.equal(n, Filtrering.anvendFiltre(items, { models: [navn] }, null, null).length, `${navn}: flisen og soegningen er uenige`);
  }
  assert.equal(liste.find(x => x.m === 'K 1200').n, 1, 'K 1200 er kun de annoncer, der hedder K 1200');
  assert.equal(liste.find(x => x.m === 'K 1200 GT').n, 2);
  assert.equal(liste.filter(x => x.m.toLowerCase() === 'cb 500').length, 1, 'Cb 500 og CB 500 er ét søgefilter og dermed én flise');
  assert.equal(liste.find(x => x.m.toLowerCase() === 'cb 500').n, 2);
  assert.ok(!liste.some(x => x.m.startsWith('God velkørende')), 'sælgertitlen kom med som model');
  // Samme tal findes i det genererede markup.
  const fakta = maerkeFakta('BMW', items);
  assert.deepEqual(fakta.modeller.map(x => [x.m, x.n]), liste.slice(0, 30).map(x => [x.m, x.n]));
});

test('hero: cruisere beholder hero-fotoet, alle andre typer faar deres egen illustration', () => {
  const med = type => [ekstern({ type }), ekstern({ type }), ekstern({ type: 'sport' })].slice(0, 2);
  assert.deepEqual(heroVariant(med('cruiser')), { foto: true, type: null });
  assert.deepEqual(heroVariant(med('scooter')), { foto: false, type: 'scooter' });
  assert.deepEqual(heroVariant(med('sport')), { foto: false, type: 'sport' });
  // Ingen kendt type: hverken forkert foto eller forkert illustration.
  assert.deepEqual(heroVariant([ekstern({ type: null })]), { foto: false, type: null });
});

test('panelfoto: et ægte thumbnail fra lageret, aldrig samme som første kort, og intet at vise ved ét kort', () => {
  const l = (id, foto) => ekstern({ id, photoUrls: foto ? [`https://x.example/${id}.jpg`] : [] });
  assert.equal(ctaFoto([l('a', true), l('b', true)]), 'https://x.example/b.jpg');
  assert.equal(ctaFoto([l('a', true)]), null, 'ét kort: ingen dublet af kortets eget foto');
  assert.equal(ctaFoto([l('a', true), l('b', false)]), null);
  assert.equal(ctaFoto([]), null);
});

test('typeflisens foto er mærkets eget — helst fra en kilde uden skilt på billedet', () => {
  const foto = (id, dom) => ekstern({ id, type: 'sport', photoUrls: [`https://x.example/${id}.jpg`], source: { navn: dom, domaene: dom } });
  assert.equal(typeFoto([foto('a', 'mcsyd.dk'), foto('b', 'guloggratis.dk')], 'sport'), 'https://x.example/b.jpg');
  assert.equal(typeFoto([foto('a', 'mcsyd.dk')], 'sport'), 'https://x.example/a.jpg', 'ingen anden mulighed: brug det der er');
  assert.equal(typeFoto([foto('a', 'mcsyd.dk')], 'touring'), null);
});

test('monogram: første bogstav, to for sammensatte mærkenavne', () => {
  assert.equal(monogram('Yamaha'), 'Y');
  assert.equal(monogram('Harley-Davidson'), 'HD');
  assert.equal(monogram('Royal Enfield'), 'RE');
  assert.equal(monogram('Moto Guzzi'), 'MG');
});

/* ---------- samlet Critic P2: ubevist "ny" er hverken ny eller brugt ---------- */
{
  const { titelFor, metaBeskrivelseFor } = require('./build-brand-pages.js');
  const stats = { min: 20000, max: 90000 };

  test('titel og beskrivelse siger kun "brugt", når ALLE er bevist brugte', () => {
    // rent brugt (default) — som før
    assert.equal(titelFor('Kawasaki', 51, 0), 'Brugte Kawasaki-motorcykler til salg — Bikerbasen');
    assert.match(metaBeskrivelseFor('Kawasaki', 51, stats, 0), /51 brugte Kawasaki/);
    // ubeviste "ny" blandt dem: ingen påstand om "brugt"
    assert.ok(!/brugt/.test(titelFor('Kawasaki', 51, 0, false)), 'titlen må ikke sige brugt');
    assert.ok(!/brugte/.test(metaBeskrivelseFor('Kawasaki', 51, stats, 0, false, 28)), 'beskrivelsen må ikke sige brugte');
  });

  test('"N brugte" i beskrivelsen tæller ikke ubeviste "ny" med', () => {
    const tekst = metaBeskrivelseFor('KTM', 21, stats, 7, false, 3);
    assert.match(tekst, /7 fabriksnye og 11 brugte/, 'brugte = 21 − 7 nye − 3 ubeviste');
  });
}

/* ---------- F2-004 / F2-005: mærkesidens chips lover præcis det, linket giver ----------
   Detective runde 2: "CRF 110 F · 25" (1 CRF 110 F + 24 Africa Twin), "CB 1000 · 29" (Fireblade/CBR med).
   Rod: modelfliserne linkede `q=` (ordsøgning over "mærke model"). Nu linkes `model=` (eksakt), og
   tallet regnes af samme filterobjekt som linket. Testen bygger mærkesidens link-blokke over fixturelageret og kører
   hver chip gennem søgesidens egen URL-læser og Filtrering.anvendFiltre mod HELE lageret. */
{
  const CHIP = require('./seo-chip-tjek.js');
  const { facetLinksFor, treKolonnerHTML, typeFlisersHTML } = require('./build-brand-pages.js');

  test('F2-005: hver chip og flise på mærkesiden lover præcis det antal, dens link giver', () => {
    const alle = CHIP.lagerFixture();
    const ctx = { alle, facetter: [], Filtrering };
    const fejl = [], dubletter = [];
    let tjekket = 0, modelfliser = 0;
    for (const brand of [...new Set(alle.map(l => l.brand))]){
      const items = alle.filter(l => l.brand === brand);
      const fakta = maerkeFakta(brand, items);
      const html = facetLinksFor(brand, items) + treKolonnerHTML(brand, fakta, items) + typeFlisersHTML(brand, fakta);
      for (const chip of CHIP.udtraekChips(html)){
        if (!/^soegning\.html\?/.test(chip.href)) continue;
        const d = CHIP.dubletNoegler(chip.href);
        if (d.length) dubletter.push(`${brand}: ${chip.href} gentager ${d.join(', ')}`);
        if (chip.tal === null) continue;
        tjekket++;
        if (/model=/.test(chip.href)) modelfliser++;
        const n = CHIP.traefFraHref(chip.href, ctx);
        if (n !== chip.tal) fejl.push(`${brand}: "${chip.tekst}" lover ${chip.tal}, ${chip.href} giver ${n}`);
      }
    }
    assert.ok(tjekket >= 80, `kun ${tjekket} chips tjekket`);
    assert.ok(modelfliser >= 15, `kun ${modelfliser} modelfliser tjekket`);
    assert.deepEqual(dubletter, []);
    assert.deepEqual(fejl, []);
  });

  test('F2-005: Honda-fliserne i fixturen — CRF 110 F er 1, Africa Twin 24, CB 1000 er ikke Fireblade', () => {
    const alle = CHIP.lagerFixture();
    const honda = alle.filter(l => l.brand === 'Honda');
    const tal = Object.fromEntries(modelTal(honda).map(x => [x.m, x.n]));
    assert.equal(tal['CRF 110 F'], 1);
    assert.equal(tal['CRF 1100 L Africa'], 24);
    assert.equal(tal['CB 1000'], 8);
    assert.equal(tal['CBR 1000 F'], 3);
  });
}

/* ---------- T-002: én titelformel for alle mærkesider ---------- */
{
  const { titelFor, metaBeskrivelseFor } = require('./build-brand-pages.js');
  const MAERKER = ['BMW', 'Honda', 'Yamaha', 'KTM', 'Harley-Davidson', 'Royal Enfield', 'Moto Guzzi', 'MV Agusta', 'FB Mondial', 'Lauge Jensen', 'Husqvarna', 'Triumph', 'Hyosung', 'Kawasaki'];

  test('T-002: titlen er "{Brugte }{Mærke}-motorcykler til salg — Bikerbasen" for alle mærker, højst 60 tegn', () => {
    for (const m of MAERKER){
      const rent = titelFor(m, 31, 0, true), blandet = titelFor(m, 31, 4, false), ubevist = titelFor(m, 31, 0, false);
      assert.equal(rent, `Brugte ${m}-motorcykler til salg — Bikerbasen`);
      assert.equal(blandet, `${m}-motorcykler til salg — Bikerbasen`, 'nye imellem: intet "brugte"');
      assert.equal(ubevist, blandet, 'ubevist "ny" er hverken ny eller brugt: intet "brugte"');
      for (const t of [rent, blandet]) assert.ok(t.length <= 60, `${t} er ${t.length} tegn`);
      assert.ok(!/[0-9]/.test(rent), 'antal og pris står i beskrivelsen, ikke i titlen');
    }
  });

  test('T-002: et meget langt mærkenavn afkortes pænt — først " — Bikerbasen", så "Brugte", aldrig midt i et ord', () => {
    const langt = 'Zundapp Spezialmotorenwerke';   // 27 tegn
    const t = titelFor(langt, 12, 0, true);
    assert.ok(t.length <= 60, t);
    assert.match(t, /Zundapp Spezialmotorenwerke-motorcykler til salg/);
    assert.ok(!/ —$/.test(t) && !/-$/.test(t), 'ingen hængende tegnsætning: ' + t);
    // Selv det længste navn giver en hel titel, ikke en afkortet streng.
    assert.ok(titelFor('Et Meget Langt Fabrikantnavn Som Ingen Kender', 3, 0, true).endsWith('motorcykler til salg'));
  });

  test('T-002: beskrivelsen bærer antal og pris (flyttet fra titlen)', () => {
    const d = metaBeskrivelseFor('BMW', 31, { min: 20000, max: 190000 }, 0, true, 0);
    assert.match(d, /31 brugte BMW/);
    assert.ok(d.includes('fra 20.000 kr. til 190.000 kr.'), d);
  });
}
