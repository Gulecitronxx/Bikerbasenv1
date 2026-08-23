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

test('Diversion er modelnavn, Sportstouring bliver til VORES Touring', () => {
  // "Yamaha XJ 900 S Sportstouring Diversion BYTTER GERNE"
  // En sportstourer er en tourer med kaabe, ikke en supersport. Kildens ord
  // staar ikke i vores filter, og varianten skal kunne klikkes paa.
  assert.deepEqual(delt('XJ 900 S Sportstouring Diversion BYTTER GERNE'), {
    model: 'XJ 900 S Diversion',
    variant: 'Touring',
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
    model: 'GSX 750 ES', variant: 'Classic/Veteran', salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'],
  });
  assert.deepEqual(delt('Tre-K 1130 ENGROS/UDEN KLARGØRING Adventure'), {
    model: 'Tre-K 1130', variant: 'Adventure/Enduro', salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'],
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
    model: 'CBR 1000 F', variant: 'Touring', salgsmarkoerer: null });
  // "Street" er MC Syds ord for en naked bike. Fandtes ikke i vores filter,
  // og et klik paa "Naked" gav derfor kort maerket "Street".
  assert.deepEqual(delt('ZR-7 Street'), {
    model: 'ZR-7', variant: 'Naked', salgsmarkoerer: null });
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

test('kilden må råbe — kortet skriver VORES type', () => {
  assert.equal(delt('CBR 1000 SPORTSTOURING').variant, 'Touring');
  assert.equal(delt('KLASSIKER').variant, 'Classic/Veteran');
});

/* ---------- Kildens ordforråd -> vores otte typer ----------

   Runde 2's kritiker talte ti af fireogtyve kort med en type, der ikke
   findes i vores eget filter — Street (5), Sportstouring (2), Offroader,
   Adventure Offroader, Klassiker — og fandt, at et klik paa "Naked 64" gav
   en side fuld af kort maerket "Street". Etiketten og filteret brugte hver
   sin taksonomi. Testene her laaser oversaettelsen, saa den ikke kan skride
   tilbage uden at nogen ser det. */
const OTTE = ['Sport','Touring','Cruiser','Naked','Adventure/Enduro','Scooter','Classic/Veteran','Cross/MX'];

test('hvert ord i kildens ordforråd lander i én af VORES otte typer', () => {
  // Ordforraadet er MC Syds egen liste fra sources/mcsyd.yaml.
  const par = [
    ['Street', 'Naked'], ['Sportstouring', 'Touring'], ['Offroader', 'Adventure/Enduro'],
    ['Klassiker', 'Classic/Veteran'], ['Classic Cruiser', 'Cruiser'], ['Adventure', 'Adventure/Enduro'],
    ['Touring', 'Touring'], ['Cruiser', 'Cruiser'], ['Scooter', 'Scooter'], ['Sport', 'Sport'],
    ['Enduro', 'Adventure/Enduro'], ['Veteran', 'Classic/Veteran'], ['Cross', 'Cross/MX'],
  ];
  for (const [kilde, vores] of par){
    assert.equal(n.typeLabelFraKildeord(kilde), vores, `${kilde} skal blive til ${vores}`);
    assert.ok(OTTE.includes(n.typeLabelFraKildeord(kilde)), `${vores} er ikke en af vores otte`);
  }
});

test('kildens ord maa raabe, staves med bindestreg og have mellemrum', () => {
  assert.equal(n.typeIdFraKildeord('SPORTSTOURING'), 'touring');
  assert.equal(n.typeIdFraKildeord('classic cruiser'), 'cruiser');
  assert.equal(n.typeIdFraKildeord('  Offroader '), 'adventure');
});

test('et ord uden en kasse hos os giver null — ikke den naermeste nabo', () => {
  // Det er hele reglen: en type, vi ikke kan kortlaegge, er en oplysning vi
  // ikke har. Et forkert maerkat vejer tungere imod os end et manglende.
  for (const ord of ['Motard', 'Supermoto', 'Custom', 'Trike', 'Quad', '', null, undefined, 'Virago']){
    assert.equal(n.typeIdFraKildeord(ord), null, `${JSON.stringify(ord)} maa ikke faa en type`);
    assert.equal(n.typeLabelFraKildeord(ord), null, `${JSON.stringify(ord)} maa ikke faa en etiket`);
  }
});

test('et ukortlaegbart typeord bliver i modelnavnet frem for at blive en forkert etiket', () => {
  // "Motard" har ingen kasse hos os. Foer stod der "Motard" paa kortets
  // anden linje — et ord, ingen kunne klikke paa. Nu bliver ordet, hvor det
  // kom fra, og der staar ingen type.
  assert.deepEqual(delt('DR-Z 400 Motard'), {
    model: 'DR-Z 400 Motard', variant: null, salgsmarkoerer: null });
  assert.deepEqual(delt('XV 535 Custom'), {
    model: 'XV 535 Custom', variant: null, salgsmarkoerer: null });
});

test('engelsk "Classic" er et modelnavn hos Harley, ikke en kategori', () => {
  /* Maalt paa alle 332 MC Syd-titler i js/backend-bridge.js: "Classic"
     optraeder UDELUKKENDE som modelnavn — Softail Classic, Road King
     Classic, Electra Glide Ultra Classic. Alle er cruisere og tourere, ikke
     veteraner. Kildens eget ord for kategorien er det danske "Klassiker".
     Foer blev "Road King Classic Cruiser" til modellen "Road King" med
     varianten "Klassiker Cruiser" — to typer paa én linje, og den forkerte
     foerst. */
  assert.deepEqual(delt('Road King Classic Cruiser'), {
    model: 'Road King Classic', variant: 'Cruiser', salgsmarkoerer: null });
  assert.deepEqual(delt('CB 1100 classic'), {
    model: 'CB 1100 classic', variant: null, salgsmarkoerer: null });
});

test('to ord, samme kasse, én etiket', () => {
  // "Adventure Offroader" stod ordret paa tre kort. Begge ord er vores
  // 'adventure', saa etiketten skal staa én gang.
  assert.equal(delt('Tiger 900 Adventure Offroader').variant, 'Adventure/Enduro');
  assert.equal(delt('V-Strom 650 Offroader Adventure').variant, 'Adventure/Enduro');
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

/* DEN HER TEST BEVISER, AT NØGLEN IKKE MÅ BRUGES TIL AT SLÅ SAMMEN.

   Kommentaren over fingerprint() lovede engang "ÉN annonce hos os med tre
   kilde-links". Målt på driftlageret: 332 aktive annoncer fra én kilde giver
   238 unikke fingerprints — 41 grupper deler nøgle og dækker 135 rækker
   (40,7 %), største gruppe 13, og 128 af de 135 har stand 'ny'. Det er ens
   nye maskiner på samme lager hos samme forhandler, ikke samme maskine flere
   steder. Testen holder det mønster fast i et minimalt eksempel, så det står
   i suiten og ikke kun i en kommentar: nogen, der senere vil "færdiggøre"
   dedupliseringen, fejler her først. Se docs/review/DECISIONS.md, C-010. */
test('fingerprint kan IKKE skelne ens nyt lager — derfor er den en kandidat, ikke en identitet', () => {
  // Syv ens Honda CMX 500 Rebel 2024 til listepris hos samme forhandler.
  // Hver har sit eget lagernummer hos kilden og sit eget stelnummer.
  const nyPaaLager = (kildeAnnonceId) => ({
    kilde_annonce_id: kildeAnnonceId,
    maerke: 'Honda', model: 'CMX 500 Rebel', aargang: 2024,
    km: null, pris_dkk: 84995, postnr: '6630',
  });
  const lager = ['108939', '110578', '132964', '132965', '150352', '150353', '150354'].map(nyPaaLager);
  const noegler = new Set(lager.map(n.fingerprint));
  assert.equal(noegler.size, 1,
    'syv forskellige motorcykler deler én nøgle — det er derfor sammenlægning ville skjule seks af dem');

  // Og km i nøglen ville ikke redde det: nye maskiner har ingen km at skelne på.
  assert.equal(new Set(lager.map(l => n.fingerprint(l) + '|' + (l.km ?? ''))).size, 1);
});

test('fingerprint: forskellige cykler holdes adskilt', () => {
  const a = { maerke: 'Yamaha', model: 'MT-07', aargang: 2020, km: 12400, pris_dkk: 64900, postnr: '8000' };
  const c = { ...a, aargang: 2021 };
  const d = { ...a, postnr: '2200' };
  assert.notEqual(n.fingerprint(a), n.fingerprint(c));
  assert.notEqual(n.fingerprint(a), n.fingerprint(d));
});

/* ---------------------------------------------------------------
   Personoplysninger i titler
   ---------------------------------------------------------------
   Gul og Gratis' annoncer er skrevet af privatpersoner, og overskriften er
   sælgerens egen sætning. Vi gemmer titlen; derfor skal den renses, før den
   rammer databasen. Vi linker til kilden — køberen kontakter sælgeren dér,
   hvor sælgeren selv har lagt sine oplysninger.

   Anden halvdel af testen er lige så vigtig som den første: en rensning, der
   æder årstal og slagvolumen, ødelægger titlen på hver eneste ærlige annonce. */

test('telefonnumre fjernes, uanset hvordan danskere skriver dem', () => {
  const f = n.fjernPersonoplysninger;
  for (const nr of ['12 34 56 78', '12345678', '1234 5678', '12-34-56-78',
                    '12.34.56.78', '+45 12 34 56 78', '+4512345678']){
    const ud = f(`BMW R1150RT, ring ${nr}`);
    assert.ok(!/\d{8}|\d{2}[\s.\-]\d{2}[\s.\-]\d{2}[\s.\-]\d{2}/.test(ud),
      `nummeret overlevede i "${ud}" (input: ${nr})`);
    assert.match(ud, /BMW R1150RT/, 'selve motorcyklen skal stå tilbage');
  }
});

test('mailadresser og links fjernes', () => {
  const f = n.fjernPersonoplysninger;
  assert.ok(!/@/.test(f('Yamaha MT-07 — skriv til anders@eksempel.dk')));
  assert.ok(!/https?:|www\./.test(f('Se flere billeder på www.eksempel.dk/mc')));
  assert.match(f('Yamaha MT-07 — skriv til anders@eksempel.dk'), /Yamaha MT-07/);
});

test('tal, der IKKE er telefonnumre, overlever', () => {
  // Det her er den dyre fejl: æder rensningen årstal og ccm, ødelægger den
  // titlen på hver eneste ærlige annonce i kataloget.
  const f = n.fjernPersonoplysninger;
  for (const titel of [
    'BMW R1150RT 2005 — 92.600 km',
    'Honda CBR 1000 F, 989 ccm, 1993',
    'Harley-Davidson Iron 883 fra 2019',
    'Yamaha XVS 1100 Drag Star',
    'Suzuki GSX-R750 — 148 hk',
    'Nimbus Type C 1948, 750 ccm',
    //  duer ikke som ordgraense paa dansk: i JS er OE ikke et ordtegn, saa
    // ring ramte "RING" inde i "KLARGOERING". Den her titel er fra MC Syd.
    'Yamaha XV 750 Cruiser Virago ENGROS/UDEN KLARGØRING',
    'Suzuki GSX-R750 med ny forsikring',
    'BMW efter klargøring og syn',
  ]){
    assert.equal(f(titel), titel, `rensningen aad noget i "${titel}"`);
  }
});

test('tegnsætningen ryddes op, så en renset titel ikke ligner en fejl', () => {
  const f = n.fjernPersonoplysninger;
  assert.equal(f('Sælges for min far, ring 12 34 56 78'), 'Sælges for min far');
  assert.equal(f('12 34 56 78 — BMW R1150RT'), 'BMW R1150RT');
  assert.equal(f('Honda (ring 12345678)'), 'Honda');
});

test('uddrag() renser FØR den klipper', () => {
  // Ellers kunne et nummer overleve, fordi det stod efter tegn 200, og først
  // dukke op i databasen den dag nogen haevede graensen.
  const lang = 'Flot motorcykel. ' .repeat(20) + 'Ring 12 34 56 78';
  const u = n.uddrag(lang);
  assert.ok(!/\d{2}\s\d{2}\s\d{2}\s\d{2}/.test(u), 'nummeret slap igennem uddrag()');
});

test('erKildensPladsholder: kildens egen "intet foto"-grafik er ikke et foto af motorcyklen (B3)', () => {
  assert.equal(n.erKildensPladsholder('https://www.guloggratis.dk/assets/files/default-listing.JA5KSJHG.svg'), true);
  assert.equal(n.erKildensPladsholder('https://kilde.test/img/no-image.png'), true);
  assert.equal(n.erKildensPladsholder('https://kilde.test/static/missing_photo.jpg?v=3'), true);
  // rigtige fotos rammes aldrig
  assert.equal(n.erKildensPladsholder('https://images.danbase.dk/Content/Resellers/321/180898/Honda_CB_1000_0_2.jpg?v=2'), false);
  assert.equal(n.erKildensPladsholder('https://assets.guloggratis.dk/images/2ba2f5f5/2ba2f5f5-320x240.webp'), false);
  assert.equal(n.erKildensPladsholder('https://www.jensensmc.dk/image/cachewebp/catalog/x-cropresize-768x540.webp'), false);
  assert.equal(n.erKildensPladsholder(''), false);
  assert.equal(n.erKildensPladsholder(null), false);
});
