/* Tests for normaliseringen. Kør: node --test crawler/

   Hvert tilfælde her er noget, en dansk annonceside faktisk skriver. Det er
   ikke opfundne kanttilfælde — det er formaterne fra mcsyd.dk,
   hmcmotorcykler.dk, bike-shoppen.dk og DBA. */

const test = require('node:test');
const assert = require('node:assert');
const n = require('./normalize');

test('pris: punktum er tusindtal på dansk, ikke decimaler', () => {
  assert.equal(n.parsePris('125.000 kr.'), 125000);
  assert.equal(n.parsePris('125.000,-'), 125000);
  assert.equal(n.parsePris('kr. 125.000'), 125000);
  assert.equal(n.parsePris('Pris: 125.000 DKK'), 125000);
  assert.equal(n.parsePris('125000'), 125000);
  assert.equal(n.parsePris('89.900'), 89900);
});

test('pris: decimaler kastes væk, ikke tusindtal', () => {
  assert.equal(n.parsePris('125.000,50 kr.'), 125000);
  assert.equal(n.parsePris('1.250,00'), 1250);
});

test('pris: "ring for pris" er ikke nul kroner', () => {
  assert.equal(n.parsePris('Ring for pris'), null);
  assert.equal(n.parsePris('Pris efter aftale'), null);
  assert.equal(n.parsePris('Byd!'), null);
  assert.equal(n.parsePris(''), null);
  assert.equal(n.parsePris(null), null);
});

test('pris: urealistiske tal afvises frem for at blive vist', () => {
  assert.equal(n.parsePris('125 kr.'), null);        // fejlparset tusindtal
  assert.equal(n.parsePris('99.000.000'), null);     // sammenløbne felter
});

test('km: dansk og engelsk separator giver samme tal', () => {
  assert.equal(n.parseKm('12.500 km'), 12500);
  assert.equal(n.parseKm('12,500 km'), 12500);
  assert.equal(n.parseKm('12500'), 12500);
  assert.equal(n.parseKm('ca. 12.500 kilometer'), 12500);
  assert.equal(n.parseKm('0 km'), 0);
});

test('km: ukendt er null, ikke nul', () => {
  assert.equal(n.parseKm('Ukendt'), null);
  assert.equal(n.parseKm('ikke oplyst'), null);
  assert.equal(n.parseKm('750.000 km'), null);       // fejlparsning
});

test('årgang: alle danske skrivemåder', () => {
  assert.equal(n.parseAargang('2019'), 2019);
  assert.equal(n.parseAargang('Årg. 2019'), 2019);
  assert.equal(n.parseAargang('årgang 2019'), 2019);
  assert.equal(n.parseAargang('2019-model'), 2019);
  assert.equal(n.parseAargang('1. reg. 03/2019'), 2019);
  assert.equal(n.parseAargang('Nimbus 1968'), 1968);
});

test('årgang: umulige år afvises', () => {
  assert.equal(n.parseAargang('20'), null);
  assert.equal(n.parseAargang('2099'), null);
  assert.equal(n.parseAargang('ingen årgang'), null);
});

test('ccm: kubik og liter', () => {
  assert.equal(n.parseCcm('649 ccm'), 649);
  assert.equal(n.parseCcm('649cc'), 649);
  assert.equal(n.parseCcm('649 cm³'), 649);
  assert.equal(n.parseCcm('1,2 l'), 1200);
  assert.equal(n.parseCcm('0,6 liter'), 600);
  assert.equal(n.parseCcm('125'), 125);
});

test('ccm: bilmotorer og støj afvises', () => {
  assert.equal(n.parseCcm('5 ccm'), null);
  assert.equal(n.parseCcm('3000 ccm'), null);
});

test('postnummer: findes i en adresse', () => {
  assert.equal(n.parsePostnr('8000 Aarhus C'), '8000');
  assert.equal(n.parsePostnr('DK-8000'), '8000');
  assert.equal(n.parsePostnr('Randers, 8900'), '8900');
  assert.equal(n.parsePostnr('0999'), null);         // findes ikke i DK
  assert.equal(n.parsePostnr('København'), null);
});

test('mærke: alle skrivemåder af Harley bliver ét mærke', () => {
  const forventet = 'Harley-Davidson';
  for (const v of ['Harley-Davidson', 'Harley Davidson', 'harley davidson', 'HD', 'H-D', 'harley']){
    assert.equal(n.normaliserMaerke(v), forventet, `"${v}" blev ikke til ${forventet}`);
  }
});

test('mærke: øvrige aliasser', () => {
  assert.equal(n.normaliserMaerke('BMW Motorrad'), 'BMW');
  assert.equal(n.normaliserMaerke('moto guzzi'), 'Moto Guzzi');
  assert.equal(n.normaliserMaerke('CF Moto'), 'CFMoto');
  assert.equal(n.normaliserMaerke('yamaha'), 'Yamaha');
});

test('mærke: ukendt mærke kastes ikke væk', () => {
  assert.equal(n.normaliserMaerke('zündapp'), 'Zündapp');
});

/* ---------- Model, variant og salgsmarkører ----------
   Alle titler herunder er MC Syds egne, kopieret fra databasen. Mærket er
   allerede klippet af, når delModelOgVariant() kaldes — den får kun resten.

   Dommen er ikke "består regexen": det er, om linje 1 og linje 2 læser
   rigtigt for et menneske, der kender motorcykler. */
const delt = (rest) => n.delModelOgVariant(rest);

test('typeordet bliver varianten — også når modelnavnet står EFTER det', () => {
  // "Yamaha XV 750 Cruiser Virago ENGROS/UDEN KLARGØRING"
  // Virago er Yamahas modelnavn, Cruiser er typen. At Cruiser står først,
  // gør den ikke til en del af modellen.
  assert.deepEqual(delt('XV 750 Cruiser Virago ENGROS/UDEN KLARGØRING'), {
    model: 'XV 750 Virago',
    variant: 'Cruiser',
    salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'],
  });
});

test('typeordet bliver varianten — også når modelnavnet står FØR det', () => {
  // "Honda CMX 1100 D Rebel Cruiser" — omvendt rækkefølge af ovenstående.
  // Rebel er Hondas modelnavn; opdelingen må give samme slags resultat.
  assert.deepEqual(delt('CMX 1100 D Rebel Cruiser'), {
    model: 'CMX 1100 D Rebel',
    variant: 'Cruiser',
    salgsmarkoerer: null,
  });
});

test('Diversion er modelnavn, Sportstouring er type', () => {
  // "Yamaha XJ 900 S Sportstouring Diversion BYTTER GERNE"
  assert.deepEqual(delt('XJ 900 S Sportstouring Diversion BYTTER GERNE'), {
    model: 'XJ 900 S Diversion',
    variant: 'Sportstouring',
    salgsmarkoerer: ['BYTTER GERNE'],
  });
});

test('Pan er modelnavn, Touring er type', () => {
  // "Honda ST 1100 Touring Pan BYTTER GERNE" — Pan European.
  assert.deepEqual(delt('ST 1100 Touring Pan BYTTER GERNE'), {
    model: 'ST 1100 Pan',
    variant: 'Touring',
    salgsmarkoerer: ['BYTTER GERNE'],
  });
});

test('GT er ikke et typeord og bliver hos modellen', () => {
  // "BMW K 1200 Touring GT ENGROS". Titlens rækkefølge er Touring FØR GT,
  // men modellen hedder K 1200 GT. Fordi kun kendte typeord flyttes, samler
  // modellen sig rigtigt af sig selv — uden at vi omrokerer noget.
  assert.deepEqual(delt('K 1200 Touring GT ENGROS'), {
    model: 'K 1200 GT',
    variant: 'Touring',
    salgsmarkoerer: ['ENGROS'],
  });
});

test('salgsmarkører midt i titlen splitter ikke modellen', () => {
  // "Suzuki GSX 750 ES ENGROS/UDEN KLARGØRING Klassiker" og
  // "Benelli Tre-K 1130 ENGROS/UDEN KLARGØRING Adventure".
  assert.deepEqual(delt('GSX 750 ES ENGROS/UDEN KLARGØRING Klassiker'), {
    model: 'GSX 750 ES', variant: 'Klassiker', salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'],
  });
  assert.deepEqual(delt('Tre-K 1130 ENGROS/UDEN KLARGØRING Adventure'), {
    model: 'Tre-K 1130', variant: 'Adventure', salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'],
  });
});

test('skråstregen fra "ENGROS/UDEN KLARGØRING" bliver ikke hængende', () => {
  const r = delt('Tre-K 1130 ENGROS/UDEN KLARGØRING Adventure');
  assert.ok(!/[/]/.test(r.model), `modellen har tegnsætning tilbage: ${r.model}`);
});

test('markørerne kommer i kildens rækkefølge, ikke listens', () => {
  assert.deepEqual(delt('X 1 ENGROS/UDEN KLARGØRING').salgsmarkoerer,
    ['ENGROS', 'UDEN KLARGØRING']);
});

test('resten af MC Syds mønstre', () => {
  assert.deepEqual(delt('CBR 1000 F Sportstouring'), {
    model: 'CBR 1000 F', variant: 'Sportstouring', salgsmarkoerer: null });
  assert.deepEqual(delt('ZR-7 Street'), {
    model: 'ZR-7', variant: 'Street', salgsmarkoerer: null });
});

test('ingen type i titlen giver ingen variant — ikke et gæt', () => {
  // "Honda ST 125 DAX". DAX er modelnavnet; der er ingen type at vise.
  assert.deepEqual(delt('ST 125 DAX'), {
    model: 'ST 125 DAX', variant: null, salgsmarkoerer: null });
});

test('titel med kun mærket: seks MC Syd-annoncer mangler modellen', () => {
  // Efter mærket er klippet af, er der ingenting tilbage. Så skal der stå
  // "ikke oplyst" på kortet — ikke en opdigtet model.
  assert.deepEqual(delt(''), { model: null, variant: null, salgsmarkoerer: null });
  assert.deepEqual(delt('   '), { model: null, variant: null, salgsmarkoerer: null });
  assert.deepEqual(delt(null), { model: null, variant: null, salgsmarkoerer: null });
});

test('et typeord som første ord er en del af modelnavnet', () => {
  // Ducati Sport 1000 og Triumph Street Triple 765 er modelnavne. Blev
  // Sport/Street flyttet til varianten, hed modellerne "1000" og "Triple 765".
  assert.deepEqual(delt('Sport 1000'), {
    model: 'Sport 1000', variant: null, salgsmarkoerer: null });
  assert.deepEqual(delt('Street Triple 765'), {
    model: 'Street Triple 765', variant: null, salgsmarkoerer: null });
});

test('består titlen KUN af typeord, er der ingen model at beskytte', () => {
  assert.deepEqual(delt('Touring'), {
    model: null, variant: 'Touring', salgsmarkoerer: null });
});

test('kilden må råbe — kortet skriver typen pænt', () => {
  assert.equal(delt('CBR 1000 SPORTSTOURING').variant, 'Sportstouring');
  assert.equal(delt('CB 1100 classic').variant, 'Klassiker');
});

test('samme type nævnt to gange står én gang', () => {
  assert.equal(delt('ST 1100 Touring Pan Touring').variant, 'Touring');
});

test('modellen uden type og markør er nøglen — fingerprint afhænger af den', () => {
  // Samme motorcykel, hvor kun forhandlerens vilkår er skrevet forskelligt,
  // skal give samme model. Ellers bliver én cykel til to annoncer.
  assert.equal(delt('ST 1100 Touring Pan BYTTER GERNE').model,
               delt('ST 1100 Touring Pan').model);
});

test('sælgertype', () => {
  assert.equal(n.normaliserSaelgertype('Forhandler'), 'forhandler');
  assert.equal(n.normaliserSaelgertype('MC Syd ApS'), 'forhandler');
  assert.equal(n.normaliserSaelgertype('Privat sælger'), 'privat');
  assert.equal(n.normaliserSaelgertype('ukendt'), null);
});

test('uddrag: klipper ved ordskel og aldrig over 200 tegn', () => {
  const lang = 'Velholdt motorcykel med fuld servicehistorik. '.repeat(20);
  const u = n.uddrag(lang);
  assert.ok(u.length <= 201, `uddrag var ${u.length} tegn`);
  assert.ok(u.endsWith('…'));
  assert.ok(!/\s\S+…$/.test(u.slice(-30)) || !u.slice(0, -1).endsWith(' '));
  assert.equal(n.uddrag('Kort tekst'), 'Kort tekst');
  assert.equal(n.uddrag(''), null);
});

test('fingerprint: samme cykel på tre kilder giver samme nøgle', () => {
  const a = { maerke: 'Yamaha', model: 'MT-07', aargang: 2020, km: 12400, pris_dkk: 64900, postnr: '8000' };
  const b = { maerke: 'Yamaha', model: 'MT 07',  aargang: 2020, km: 12600, pris_dkk: 65000, postnr: '8000' };
  assert.equal(n.fingerprint(a), n.fingerprint(b),
    'små forskelle i pris og km må ikke give to annoncer');
});

test('fingerprint: forskellige cykler holdes adskilt', () => {
  const a = { maerke: 'Yamaha', model: 'MT-07', aargang: 2020, km: 12400, pris_dkk: 64900, postnr: '8000' };
  const c = { ...a, aargang: 2021 };
  const d = { ...a, postnr: '2200' };
  assert.notEqual(n.fingerprint(a), n.fingerprint(c));
  assert.notEqual(n.fingerprint(a), n.fingerprint(d));
});
