/* Tests for datakvaliteten i det indekserede lager (Gauntlet bølge 3, strøm w3-data).
   Kør: node --test js/data-kvalitet.test.js

   Hver gruppe låser ét fund fra docs/review/gauntlet/detective-funktion.md:
   F-002 falsk "Ny", F-003 alder på lageret, F-006 stand-facet "Ny", F-007
   ccm/hk/årgang læst forkert, F-008 tom model/"Ukendt", F-009 "købes"-annoncer,
   F-010 forhandlerjargon, F-011 skrivemåde der splitter facetter.

   BEVIST PÅ FIXTURES. Rækkerne herunder er de navngivne eksempler fra detective-
   rapporten (samme tal), skrevet ind som rå `eksterne_annoncer`-rækker. Testen
   rører aldrig produktion. Ejeren kan køre scripts/sweep-datakvalitet.js på et
   rigtigt snapshot senere.

   Koden prøves, som browseren kører den: scripts/shared.js browserModules()
   samler js/data.js + components.js + backend-bridge.js i ét scope. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { browserModules } = require('../scripts/shared.js');
const crawler = require('../crawler/normalize.js');

const M = browserModules();
const NU = 2026;

function raa(o){
  return Object.assign({
    id: 'x', kilde_annonce_id: '1', url: 'https://example.dk/a/1', titel: 'Honda CB 500', maerke: 'Honda', model: 'CB 500',
    variant: null, type: null, aargang: 2010, km: 20000, ccm: 500, hk: 48, pris_dkk: 50000, stand: null,
    salgsmarkoerer: [], udledte_felter: [], by: 'Aarhus', postnr: 8000, saelgertype: 'privat',
    thumbnail_url: null, uddrag: null, status: 'aktiv', foerst_set: '2026-08-01', sidst_set: '2026-08-24T10:00:00Z',
    kilde: { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' },
  }, o);
}
const norm = o => M.normalizeExternalListing(raa(o));

/* ---------------------------------------------------------------- F-002 / F-006 */
test('F-002: "ny" gælder kun, når kilden er en katalog-kilde og km ikke modsiger det', () => {
  const ny = (o) => M.kildeNyStatus(o, NU);
  const FH = { saelgertype: 'forhandler' };
  // Forhandler / katalog-kilde, ukendt km: bekræftet af /Ny/-stien eller en ung årgang.
  assert.equal(ny({ ...FH, kildeStand: 'ny', km: null, year: 2026 }), true);
  assert.equal(ny({ ...FH, kildeStand: 'ny', km: null, year: 2023 }), true, 'MC Syds 2023-lager (årgang = i år − 3)');
  assert.equal(ny({ kildeStand: 'ny', km: null, year: null, externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20X/1' }), true, '/Ny/-stien er katalogsignalet');
  assert.equal(ny({ kildeStand: 'ny', km: 0, year: 2026 }), true);
  assert.equal(ny({ kildeStand: 'ny', km: 50, year: 2023 }), true);
  // ALDER ALENE modsiger aldrig "ny": en ubrugt lagermaskine fra 2021 er stadig ny. Intet mærke, ikke Brugt.
  assert.equal(ny({ kildeStand: 'ny', km: null, year: 2021, externalUrl: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Yamaha%20MT-07/2' }), true, 'katalogsti + 2021 + km ukendt');
  assert.equal(ny({ ...FH, kildeStand: 'ny', km: null, year: 2021 }), null, 'gammel årgang uden /Ny/-sti: ubevist, ikke Brugt');
  assert.equal(ny({ kildeStand: 'ny', km: 0, year: 2021 }), null, 'km 0 men årgang for gammel til at kalde den fabriksny: intet mærke');
  assert.equal(ny({ kildeStand: 'ny', km: null, year: 1971 }), null, 'Daytona T100R 1971 uden km: ubevist, ikke Brugt');
  // Kun km modsiger "ny".
  assert.equal(ny({ kildeStand: 'ny', km: 53000, year: 2007 }), false, 'Suzuki VZR1800');
  assert.equal(ny({ kildeStand: 'ny', km: 122000, year: 1985 }), false, 'BMW K 100 RT');
  assert.equal(ny({ kildeStand: 'ny', km: 501, year: 2026 }), false);
  assert.equal(ny({ kildeStand: 'ny', km: '4.500', year: 2026 }), false, '"4.500" er 4500 km');
  assert.equal(ny({ kildeStand: 'ny', km: 51, year: 2025 }), null, '51-500 km: demomaskine, intet mærke');
  assert.equal(ny({ kildeStand: 'ny', km: 420, year: 2025 }), null);
  assert.equal(ny({ kildeStand: 'ny', km: 500, year: 2025 }), null);
  // Gul og Gratis (privat/ukendt sælger): "ny" uden km er ikke et katalog — intet mærke.
  assert.equal(ny({ saelgertype: 'privat', kildeStand: 'ny', km: null, year: 2025 }), null);
  assert.equal(ny({ saelgertype: null, kildeStand: 'ny', km: null, year: 2026 }), null);
  assert.equal(ny({ saelgertype: 'privat', kildeStand: 'ny', km: 0, year: 2025 }), true, 'privat med km 0 og ung årgang');
  assert.equal(ny({ kildeStand: 'ny', km: null, year: null }), null, 'Gul og Gratis uden tal: intet mærke');
  // Årgang 0/1 er fejldata (ukendt), ikke en modsigelse.
  assert.equal(ny({ kildeStand: 'ny', km: 0, year: 0 }), true);
  assert.equal(ny({ kildeStand: 'ny', km: null, year: 1 }), null);
  // Brugt og tavs er som før.
  assert.equal(ny({ kildeStand: 'brugt', km: 0, year: 2026 }), false);
  assert.equal(ny({}), null);
  assert.equal(ny({ externalUrl: 'https://www.guloggratis.dk/annonce/abc/en-flot-mc' }), null);
});

test('F-002: den fælles funktion bruges af kort, annonceside, SEO og generatorer', () => {
  const l = M.normalizeExternalListing(raa({ titel: 'Suzuki VZR1800', maerke: 'Suzuki', model: 'VZR1800', aargang: 2007, km: 53000, stand: 'ny', pris_dkk: 189000 }));
  assert.equal(M.eksternErNy(l), false);
  assert.equal(l.condition, 'Brugt');
  const html = M.listingCardHTML(l, 0);
  assert.ok(!/rk-ny/.test(html), 'kortet må ikke bære Ny-mærket');
  const ok = M.normalizeExternalListing(raa({ titel: 'Honda CB 650 R', model: 'CB 650 R', aargang: 2026, km: null, stand: 'ny', url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/2' }));
  assert.equal(M.eksternErNy(ok), true);
  assert.equal(ok.condition, 'Ny');
  assert.match(M.listingCardHTML(ok, 0), /rk-ny/);
  const facet = fs.readFileSync(path.join(__dirname, '..', 'scripts/build-facet-pages.js'), 'utf8');
  assert.ok(!/kildeStand\s*===\s*'ny'/.test(facet), 'build-facet-pages.js må ikke have sin egen ny-test');
});

test('F-002: Gul og Gratis-annonce uden km og årgang får intet ny-mærke og ingen stand', () => {
  const l = norm({ stand: 'ny', aargang: null, km: null, ccm: 600, hk: null });
  assert.equal(M.eksternErNy(l), null);
  assert.equal(l.condition, null);
});

test('F-006: "Ny" er en filterværdi, men ikke en del af CONDITIONS (check constraint i databasen)', () => {
  assert.deepEqual([...M.CONDITIONS], ['Som ny', 'God stand', 'Brugt', 'Defekt/Projekt']);
  assert.deepEqual([...M.FILTER_CONDITIONS], ['Ny', 'Som ny', 'God stand', 'Brugt', 'Defekt/Projekt']);
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase/008_haerdning.sql'), 'utf8');
  assert.ok(/Som ny/.test(sql) && !/'Ny'/.test(sql), 'listings.condition har fire værdier');
  const opret = fs.readFileSync(path.join(__dirname, 'opret-annonce.js'), 'utf8');
  assert.ok(/CONDITIONS\.map/.test(opret) && !/FILTER_CONDITIONS/.test(opret));
  const soeg = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');
  assert.ok(/FILTER_CONDITIONS\.map/.test(soeg), 'søgningens stand-facet renderer FILTER_CONDITIONS');
});

test('F-006: filteret Stand = Ny finder kun de bekræftet nye', () => {
  const liste = [
    norm({ id: 'a', stand: 'ny', aargang: 2026, km: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/1' }),
    norm({ id: 'b', stand: 'ny', aargang: 2007, km: 53000 }),
    norm({ id: 'c', stand: 'brugt' }),
    norm({ id: 'd', stand: null }),
  ];
  const ny = M.Filtrering.anvendFiltre(liste, { conditions: ['Ny'] });
  assert.deepEqual(ny.map(l => l.id), ['a']);
  const brugt = M.Filtrering.anvendFiltre(liste, { conditions: ['Brugt'] });
  assert.deepEqual(brugt.map(l => l.id).sort(), ['b', 'c']);
});

/* ---------------------------------------------------------------- F-007 */
const TAL_CASES = [
  // [navn, input, forventet ccm, forventet hk]
  ['GPZ 500S årg 1992 (ccm = årstal)', { ccm: 1992, hk: null, aargang: 1992, tekst: 'Kawasaki GPZ 500S årg 1992' }, null, null],
  ['XJ 900 årg 90 (ccm = årg-tal)', { ccm: 90, hk: 98, aargang: 1990, tekst: 'Yamaha xj 900 årg 90' }, null, 98],
  ['Bonneville T 120 (1200 læst som 120)', { ccm: 120, hk: 80, aargang: 2027, tekst: 'Triumph Bonneville T 120' }, null, 80],
  ['ccm under 45', { ccm: 12, hk: null, aargang: 2000, tekst: 'x' }, null, null],
  ['44 er for lidt, 45 er grænsen', { ccm: 45, hk: 3, aargang: 2000, tekst: 'x' }, 45, 3],
  ['GL1800 bevares', { ccm: 1832, hk: 125, aargang: 2013, tekst: 'Honda GL 1800 Gold Wing' }, 1832, 125],
  ['Harley 1923 ccm bevares', { ccm: 1923, hk: 90, aargang: 2022, tekst: 'Harley-Davidson Road King' }, 1923, 90],
  ['Hayabusa 1340/190 bevares', { ccm: 1340, hk: 190, aargang: 2015, tekst: 'Suzuki Hayabusa' }, 1340, 190],
  ['2-takt 125 cm3 med 37 hk (0,296) bevares', { ccm: 125, hk: 37, aargang: 1998, tekst: 'x' }, 125, 37],
  ['hk/ccm over grænsen med urealistisk hk nulstiller hk', { ccm: 600, hk: 400, aargang: 2010, tekst: 'x' }, 600, null],
  ['Puch Maxi S årg 50 bevares (modellen nævner ikke tallet, årgangen er en anden)', { ccm: 50, hk: 1.5, aargang: 1978, tekst: 'Puch Maxi S årg 50' }, 50, 1.5],
  ['Honda Super Cub årg 90 bevares', { ccm: 90, hk: 6, aargang: null, tekst: 'Honda Super Cub årg 90' }, 90, 6],
  ['Yamaha DT årg 80 bevares', { ccm: 80, hk: 7, aargang: 1985, tekst: 'Yamaha DT årg 80' }, 80, 7],
  ['Kreidler Florett årg 50 bevares', { ccm: 50, hk: 2, aargang: null, tekst: 'Kreidler Florett årg 50' }, 50, 2],
  ['Zündapp Combinette årg 50 bevares', { ccm: 50, hk: 1.5, aargang: 1970, tekst: 'Zündapp Combinette årg 50' }, 50, 1.5],
  ['Puch Monza årg. 65 bevares', { ccm: 65, hk: 3, aargang: null, tekst: 'Puch Monza årg. 65' }, 65, 3],
  ['XJ 900 årg 90 uden hk: et større tal (900) er beviset', { ccm: 90, hk: null, aargang: null, tekst: 'Yamaha XJ 900 årg 90' }, null, null],
  ['ccm 90 + årgang 1990 + "årg 90" + ingen hk: tallet er årstallet', { ccm: 90, hk: null, aargang: 1990, tekst: 'Honda årg 90' }, null, null],
  ['ccm over 6000 er en fejl', { ccm: 8000, hk: 100, aargang: 2010, tekst: 'x' }, null, 100],
  ['dokumenteret stor: 2458 ccm bevares', { ccm: 2458, hk: 167, aargang: 2019, tekst: 'Triumph Rocket 3' }, 2458, 167],
  ['Honda XR 80 årg 80 bevares (modellen hedder tallet)', { ccm: 80, hk: 6, aargang: 1980, tekst: 'Honda XR 80 årg 80' }, 80, 6],
  ['Honda C90 årg 90 bevares', { ccm: 90, hk: 7, aargang: 1990, tekst: 'Honda C90 årg 90' }, 90, 7],
  ['Honda CB 50 årg 50 bevares', { ccm: 50, hk: 4, aargang: 1975, tekst: 'Honda CB 50 årg 50' }, 50, 4],
  ['Honda Monkey 125 bevares', { ccm: 125, hk: 9, aargang: 2020, tekst: 'Honda Monkey 125' }, 125, 9],
  ['RS125 racer 125 ccm / 55 hk bevares', { ccm: 125, hk: 55, aargang: 2003, tekst: 'Aprilia RS 125' }, 125, 55],
  ['NSR50 50 ccm / 20 hk bevares', { ccm: 50, hk: 20, aargang: 1995, tekst: 'Honda NSR 50' }, 50, 20],
  ['Kawasaki H2R 998 ccm / 310 hk bevares', { ccm: 998, hk: 310, aargang: 2019, tekst: 'Kawasaki Ninja H2R' }, 998, 310],
  ['125 ccm med 70 hk (0,56) er urealistisk: ccm nulstilles', { ccm: 125, hk: 70, aargang: 2005, tekst: 'x' }, null, 70],
  ['ukendte tal er stadig ukendte', { ccm: null, hk: null, aargang: null, tekst: '' }, null, null],
];
for (const [navn, inp, ccm, hk] of TAL_CASES){
  test(`F-007: ${navn}`, () => {
    const u = M.saniterTal(inp);
    assert.equal(u.ccm, ccm);
    assert.equal(u.hk, hk);
  });
}

test('F-007: normalizeExternalListing bruger reglerne på de tre navngivne rækker', () => {
  const gpz = norm({ titel: 'Kawasaki GPZ 500S årg 1992', maerke: 'Kawasaki', model: 'GPZ 500S', aargang: 1992, ccm: 1992, hk: null, pris_dkk: 1900 });
  assert.equal(gpz.ccm, null);
  const xj = norm({ titel: 'Yamaha xj 900 årg 90', maerke: 'Yamaha', model: 'xj 900', aargang: 1990, ccm: 90, hk: 98 });
  assert.equal(xj.ccm, null);
  assert.equal(xj.power, 98);
  const t120 = norm({ titel: 'Triumph Bonneville T 120', maerke: 'Triumph', model: 'Bonneville T 120', aargang: 2027, ccm: 120, hk: 80 });
  assert.equal(t120.ccm, null);
  assert.equal(t120.power, 80);
  const gl = norm({ titel: 'Honda GL 1800 Gold Wing', maerke: 'Honda', model: 'GL 1800 Gold Wing', aargang: 2013, ccm: 1832, hk: 125 });
  assert.equal(gl.ccm, 1832);
});

test('F-007: crawlerens spejl og browserens regel giver det samme svar (drift-test)', () => {
  assert.equal(typeof crawler.renseUrealistiskeTal, 'function');
  const ccms = [null, 0, 6001, 8000, 12, 44, 45, 50, 80, 90, 120, 125, 399, 500, 600, 749, 1200, 1340, 1832, 1923, 1990, 1992, 2000, 2026, 2458];
  const hks = [null, 0, 3, 14, 35, 47, 55, 80, 98, 125, 190, 250, 251, 310, 400];
  const aar = [null, 1978, 1980, 1990, 1992, 2000, 2027];
  const tekster = ['', 'Puch Maxi S årg 50', 'Yamaha XJ 900 årg 90 90.000 km', 'Honda Super Cub årg 90', 'Yamaha xj 900 årg 90', 'Kawasaki GPZ 500S årg 1992', 'Triumph Bonneville T 120', 'Honda CB 500 årg. 1992', 'Honda XR 80 årg 80', 'Honda C90 årg 90', 'Honda CB 50 årg 50'];
  let n = 0;
  for (const ccm of ccms) for (const hk of hks) for (const aargang of aar) for (const tekst of tekster){
    const a = M.saniterTal({ ccm, hk, aargang, tekst });
    const b = crawler.renseUrealistiskeTal({ ccm, hk, aargang, tekst });
    assert.deepEqual({ ccm: b.ccm, hk: b.hk }, { ccm: a.ccm, hk: a.hk }, JSON.stringify({ ccm, hk, aargang, tekst }));
    n++;
  }
  assert.ok(n > 5000);
});

/* ---------------------------------------------------------------- F-008 / F-009 / F-011 */
test('F-008: model udledes af deeplink-stien, når titlen kun er mærket', () => {
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20GL%201800%20Gold%20Wing/165233', 'Honda'), 'GL 1800 Gold Wing');
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=180898&m=1489', 'Honda'), null, 'ingen model i stien: ingen opfindelse');
  assert.equal(M.modelFraDeeplink('https://www.guloggratis.dk/annonce/abc/en-flot-mc', 'Honda'), null);
  const l = norm({ titel: 'Honda', maerke: 'Honda', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20GL%201800%20Gold%20Wing/165233' });
  assert.equal(l.model, 'GL 1800 Gold Wing');
  // Kun MC Syds sti, og stiens mærke skal være rækkens mærke.
  assert.equal(M.modelFraDeeplink('https://www.guloggratis.dk/annonce/123456', 'Honda'), null);
  assert.equal(norm({ titel: 'Honda', maerke: 'Honda', model: null, url: 'https://www.guloggratis.dk/annonce/123456' }).model, '');
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Suzuki%20GSX%20750/1', 'Honda'), null, 'en Suzuki-sti under mærket Honda');
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Demo/Honda%20VFR%20800/7', 'Honda'), 'VFR 800');
  assert.equal(M.modelFraDeeplink('https://evil.example/Produkter/Motorcykel/Brugt/Honda%20VFR%20800/7', 'Honda'), null);
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Harley%20Davidson%20FLH/7', 'Harley-Davidson'), 'FLH');
  const tom = norm({ titel: 'Honda', maerke: 'Honda', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda?p=1&m=2' });
  assert.equal(tom.model, '');
});

test('F-008: mærket "Ukendt" afledes af stien, når den nævner et kendt mærke; ellers bliver det Ukendt', () => {
  assert.equal(M.maerkeFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/CFMOTO%20MTX800/12345'), 'CFMoto');
  assert.equal(M.maerkeFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Ukendt%20DKW%20250/1'), null);
  assert.equal(M.maerkeFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Royal%20Enfield%20Bullet/1'), 'Royal Enfield');
  const a = norm({ titel: 'Ukendt MTX800', maerke: 'Ukendt', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/CFMOTO%20MTX800/12345' });
  assert.equal(a.brand, 'CFMoto');
  assert.equal(a.model, 'MTX800');
  const b = norm({ titel: 'Ukendt DKW 250', maerke: 'Ukendt', model: null, url: 'https://x.dk/a/1' });
  assert.equal(b.brand, 'Ukendt');
  assert.equal(b.model, 'DKW 250');
});

test('F-008/F-011: små bogstaver i stien giver ikke "Mt-07"; kildens skrivemåde fra titlen vinder; mærke-dublet fjernes', () => {
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/yamaha%20mt-07/1', 'Yamaha'), 'MT-07');
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/honda%20gold%20wing/1', 'Honda'), 'Gold Wing');
  assert.equal(M.modelFraDeeplink('https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20Honda%20CB%20500/1', 'Honda'), 'CB 500');
  const l = norm({ titel: 'Yamaha MT-07', maerke: 'Yamaha', model: null, url: 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/yamaha%20mt%2007/1' });
  assert.equal(l.model, 'MT-07', 'titlens skrivemåde vinder over stiens');
});

test('F-011: FB Mondial, HD og CB 12.5', () => {
  assert.equal(norm({ maerke: 'HD', model: 'FLHX' }).brand, 'Harley-Davidson');
  const rk = (id, brand, model) => ({ id, brand, model });
  const a = [rk('1', 'FB-Mondial', 'HPS 125'), rk('2', 'FB Mondial', 'HPS 125')];
  M.harmoniserStavning(a);
  assert.deepEqual([...new Set(a.map(l => l.brand))], ['FB Mondial']);
  const b = [rk('1', 'Honda', 'CB 12.5'), rk('2', 'Honda', 'CB 125'), rk('3', 'Honda', 'CB125')];
  M.harmoniserStavning(b);
  assert.deepEqual(b.map(l => l.model), ['CB 12.5', 'CB 125', 'CB 125'], 'CB 12.5 foldes ikke med CB 125');
});

test('F-009: kun købes / ønskes købt / vil købe / efterlyses i titlens START skjules; alt andet er et salg', () => {
  // Efterspørgsel (skjules).
  for (const t of ['Købes: Honda CBR', 'Købes Yamaha MT-07', 'Købes - Honda CB 500', 'Ønskes købt: CB 500', 'Efterlyses: Honda Monkey', 'Vil købe Honda Hornet', 'KØBES KONTANT', '  Købes'])
    assert.equal(M.erEfterspoergsel(t), true, t);
  // Ægte salg (beholdes): Criticens titler, og alle andre ord end de fire.
  for (const t of ['Honda CB 500', 'Yamaha XV 750 Virago', 'Triumph Bonneville søger ny ejer', 'Kawasaki Z1 sælges, køber betaler omregistrering',
                   'BSA / Triumph / Norton købes',    // slut-"købes" skjules ikke længere (accepteret falsk negativ)
                   'Honda CBR 600 kan købes med 12 mdr garanti', 'Honda VFR - søges nyt hjem', 'Honda VFR søges ny ejer', 'Honda CB 500 – ny ejer søges', 'Honda CB 500 – køber søges',
                   'Søges: kærlig ejer til min Honda', 'Søger efter ny ejer', 'Køb: Honda CB 500 til salg', 'Køb: din næste Harley her', 'Søger du en pæn CB 500? Her er den',
                   'Søges kun seriøse købere', 'Leder efter ny ejer til min Honda', 'Søger bytte', 'Vil købe? Her er min Honda', 'Vil du købe en Honda? Her er den',
                   'Søges ny ejer: Honda VFR', 'Søger et nyt hjem til min Honda', 'Honda kan også købes', 'Honda CB 500 (kan købes)', 'Honda CB 500 – hurtig handel købes',
                   'Købt ny, kan evt. byttes', 'Suzuki Bandit – købesum', 'Triumph søgesæt', 'Købsaftale medfølger: Honda CB 500', 'Søges', 'Leder efter Yamaha XJ 600', 'Søger MT-07'])
    assert.equal(M.erEfterspoergsel(t), false, t);
  // Kendt falsk positiv ved enhver start-regel (accepteret): "Købes og sælges motorcykler".
  const liste = [
    norm({ id: 'k', titel: 'Købes: BSA / Triumph / Norton', maerke: 'BSA', model: null, pris_dkk: null }),
    norm({ id: 's', titel: 'BSA A65', maerke: 'BSA', model: 'A65' }),
  ];
  const { beholdt, dubletter } = M.markerTvaerkildeDubletter(liste);
  assert.deepEqual(beholdt.map(l => l.id), ['s']);
  assert.ok(dubletter.some(l => l.id === 'k'), 'direkte adresse virker stadig via EXTERNAL_DUBLETTER');
});

test('F-011: SYM/Sym og FB Mondial/Fb Mondial er ét mærke', () => {
  assert.equal(norm({ maerke: 'Sym', model: 'Jet 14' }).brand, 'SYM');
  assert.equal(norm({ maerke: 'SYM', model: 'Jet 14' }).brand, 'SYM');
  assert.equal(norm({ maerke: 'Fb Mondial', model: 'HPS 125' }).brand, 'FB Mondial');
  assert.equal(norm({ maerke: 'FB MONDIAL', model: 'HPS 125' }).brand, 'FB Mondial');
});

test('F-011: modeller, der kun adskiller sig på store/små bogstaver og mellemrum, får samme stavemåde', () => {
  const rk = (id, model) => norm({ id, maerke: 'Honda', model, titel: 'Honda ' + model, url: 'https://x.dk/' + id });
  const liste = [rk('1', 'NT 1100 D'), rk('2', 'NT 1100 D'), rk('3', 'Nt 1100 d'),
                 rk('4', 'CBF 1000 A'), rk('5', 'CBF 1000A'), rk('6', 'CBF 1000 A'),
                 rk('7', 'XV 750 Virago'), rk('8', 'Xv 750 virago'),
                 rk('9', 'CB 500'), rk('10', 'CB 650')];
  M.harmoniserStavning(liste);
  const modeller = [...new Set(liste.map(l => l.model))].sort();
  assert.deepEqual(modeller, ['CB 500', 'CB 650', 'CBF 1000 A', 'NT 1100 D', 'XV 750 Virago']);
  // Samme resultat, uanset rækkefølgen.
  const omvendt = liste.map(l => ({ ...l, model: l.model })).reverse();
  M.harmoniserStavning(omvendt);
  assert.deepEqual([...new Set(omvendt.map(l => l.model))].sort(), modeller);
});

test('F-011: ved lige antal vinder stavemåden med bindestreg (MT-07), stabilt', () => {
  const rk = (id, model) => ({ id, brand: 'Yamaha', model });
  for (const orden of [['MT-07', 'MT 07', 'MT07', 'Mt-07'], ['Mt-07', 'MT07', 'MT 07', 'MT-07']]){
    const liste = orden.map((m, i) => rk(String(i), m));
    M.harmoniserStavning(liste);
    assert.deepEqual([...new Set(liste.map(l => l.model))], ['MT-07']);
  }
});

test('F-011: filteret sammenligner mærke og model uden forskel på store/små bogstaver', () => {
  const liste = [norm({ id: 'a', maerke: 'Sym', model: 'Jet 14' }), norm({ id: 'b', maerke: 'Honda', model: 'CB 500' })];
  assert.deepEqual(M.Filtrering.anvendFiltre(liste, { brands: ['SYM'] }).map(l => l.id), ['a']);
  assert.deepEqual(M.Filtrering.anvendFiltre(liste, { brands: ['sym'] }).map(l => l.id), ['a']);
  assert.deepEqual(M.Filtrering.anvendFiltre(liste, { models: ['cb 500'] }).map(l => l.id), ['b']);
});

/* ---------------------------------------------------------------- F-010 */
test('F-010: kildens ord vises overalt — kun versalerne pænnes (ENGROS -> Engros), intet nyt ord', () => {
  assert.equal(M.salgsmarkoerLabel('ENGROS'), 'Engros');
  assert.equal(M.salgsmarkoerLabel('UDEN KLARGØRING'), 'Uden klargøring');
  assert.equal(M.salgsmarkoerLabel('BYTTER GERNE'), 'Bytter gerne');
  assert.equal(M.salgsmarkoerLabel('MED GARANTI'), 'Med garanti');
  const l = norm({ salgsmarkoerer: ['ENGROS', 'UDEN KLARGØRING'], url: 'https://mcsyd.dk/a/1', saelgertype: 'forhandler' });
  const m = M.eksternSalgsmarkoerer(l);
  assert.equal(m.tekst, 'Engros +1');
  const html = M.listingCardHTML(l, 0);
  assert.ok(!/Handelspris/.test(html), 'ingen opfundet omskrivning');
  assert.match(html, />Engros \+1</);
});

/* ---------------------------------------------------------------- F-003 */
test('F-003: friskheden regnes som MEDIANEN af sidstSet, og lageret kaldes gammelt efter 14 dage', () => {
  const nu = new Date('2026-08-30T12:00:00Z');
  const liste = [{ sidstSet: '2026-08-16T12:00:00Z' }, { sidstSet: '2026-08-24T12:00:00Z' }, { sidstSet: '2026-08-24T12:00:00Z' }, { sidstSet: null }, {}];
  const r = M.senesteBekraeftet(liste, nu);
  assert.equal(r.dage, 6);
  assert.equal(r.gammel, false);
  assert.equal(r.datoTekst, '24. aug.');
  assert.equal(r.tekst, 'De fleste annoncer er bekræftet senest 24. aug.');
  assert.equal(r.advarsel, '');
  // Ét friskt opslag må ikke skjule et gammelt lager.
  const gammelt = Array.from({ length: 300 }, () => ({ sidstSet: '2026-07-01T12:00:00Z' })).concat([{ sidstSet: '2026-10-15T12:00:00Z' }]);
  const g = M.senesteBekraeftet(gammelt, new Date('2026-10-16T12:00:00Z'));
  assert.equal(g.datoTekst, '1. jul.');
  assert.equal(g.gammel, true);
  assert.equal(g.advarsel, 'Annoncerne kan være ændret siden.');
  assert.equal(g.samlet, 'De fleste annoncer er bekræftet senest 1. jul. Annoncerne kan være ændret siden.');
  assert.equal(M.senesteBekraeftet(liste, new Date('2026-09-07T12:00:00Z')).gammel, false, '14 dage er stadig inden for grænsen');
  assert.equal(M.senesteBekraeftet([{ sidstSet: '2026-08-24T12:00:00Z' }], new Date('2026-09-08T12:00:00Z')).gammel, true, '15 dage er over');
  assert.equal(M.senesteBekraeftet([{ sidstSet: '2025-12-24T12:00:00Z' }], nu).datoTekst, '24. dec. 2025');
  assert.equal(M.senesteBekraeftet([{ id: 'egen' }], nu), null);
  assert.equal(M.senesteBekraeftet([], nu), null);
});

test('F-003: en sidstSet i fremtiden er ukendt, ikke friskt', () => {
  const nu = new Date('2026-10-16T12:00:00Z');
  assert.equal(M.senesteBekraeftet([{ sidstSet: '2026-12-01T12:00:00Z' }], nu), null);
  assert.equal(M.senesteBekraeftet([{ sidstSet: '2026-12-01T12:00:00Z' }, { sidstSet: '2026-10-10T12:00:00Z' }], nu).datoTekst, '10. okt.');
  assert.equal(M.senesteBekraeftet([{ sidstSet: '2026-12-01T12:00:00Z' }], nu), null);
});

/* ---- Generatorerne (P0 fra Critic 3): de kaldes rigtigt, i det scope de selv bruger. ---- */
const brandGen = require('./../scripts/build-brand-pages.js');
const facetGen = require('./../scripts/build-facet-pages.js');
const nyRaekke = (o) => norm(Object.assign({ stand: 'ny', saelgertype: 'forhandler', aargang: 2026, km: 0, url: 'https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20CB%20500/1', kilde: { navn: 'MC Syd', domaene: 'mcsyd.dk' } }, o));

test('generatorerne: standOpgoerelse tæller nye, ubeviste og rene brugte ens for alle', () => {
  const ny = nyRaekke({});
  const ubevist = norm({ stand: 'ny', aargang: null, km: null, saelgertype: 'privat' });
  const brugt = norm({ stand: 'brugt' });
  assert.deepEqual(M.standOpgoerelse([brugt, brugt]), { antal: 2, nye: 0, ubeviste: 0, renBrugt: true, alleNye: false });
  assert.deepEqual(M.standOpgoerelse([ny, ubevist, brugt]), { antal: 3, nye: 1, ubeviste: 1, renBrugt: false, alleNye: false });
  assert.equal(M.standOpgoerelse([ny]).alleNye, true);
  assert.equal(M.standOpgoerelse([]).renBrugt, true);
});

test('generatorerne: brugtOrd i mærke- og facetsiderne kører (ingen manglende import) og skriver ikke "brugte" over ubeviste ny', () => {
  const ubevist = norm({ stand: 'ny', aargang: null, km: null, saelgertype: 'privat' });
  const brugt = norm({ stand: 'brugt' });
  const ny = nyRaekke({});
  // Mærkesiderne
  assert.equal(brandGen.brugtOrd([brugt, brugt]), 'brugte ');
  assert.equal(brandGen.brugtOrd([brugt, ubevist]), '', 'ubevist ny er hverken ny eller brugt');
  assert.equal(brandGen.brugtOrd([brugt, ny]), '');
  assert.equal(brandGen.nyeAf([brugt, ny, ubevist]), 1);
  // Facetsiderne
  assert.equal(facetGen.brugtOrd([brugt, brugt], 'motorcykel', 'motorcykler'), 'brugte motorcykler');
  assert.equal(facetGen.brugtOrd([brugt], 'motorcykel', 'motorcykler'), 'brugt motorcykel');
  assert.equal(facetGen.brugtOrd([brugt, ubevist], 'motorcykel', 'motorcykler'), 'motorcykler');
  assert.equal(facetGen.brugtOrd([ny, ny], 'motorcykel', 'motorcykler'), 'fabriksnye motorcykler');
  assert.equal(facetGen.brugtOrd([ny, brugt], 'motorcykel', 'motorcykler'), 'motorcykler');
});

test('generatorerne: den fælles opgørelse er tilgængelig i begge generatorers scope (eksporterede hjælpere kaster ikke)', () => {
  for (const [navn, gen] of [['brand', brandGen], ['facet', facetGen]]){
    assert.equal(typeof gen.brugtOrd, 'function', navn);
    assert.doesNotThrow(() => gen.brugtOrd([nyRaekke({})], 'x', 'y'), navn);
    assert.doesNotThrow(() => gen.brugtOrd([], 'x', 'y'), navn);
  }
});

/* ---- Én sandhedskilde: badge, condition, JSON-LD og note giver ALTID samme svar ---- */
function indlaesSeo(){
  const src = fs.readFileSync(path.join(__dirname, 'seo.js'), 'utf8');
  const born = [];
  const doc = {
    head: { querySelector: () => null, querySelectorAll: () => [], appendChild(el){ born.push(el); } },
    getElementById: id => born.find(e => e.id === id) || null,
    createElement: () => ({ id: '', type: '', textContent: '', setAttribute(k, v){ this[k] = v; }, remove(){} }),
    title: '',
  };
  const api = new Function('document', 'console', 'formatKm', 'formatCcm', 'formatPrice', 'typeLabel', 'sikkerUrl', 'eksternErNy',
    src + '\n;return { seoExternalListingPage, Seo };'
  )(doc, { warn(){}, log(){} }, n => n + ' km', n => n + ' ccm', n => n + ' kr.', t => String(t), u => u, M.eksternErNy);
  return { api, born };
}
function jsonLdItemCondition(l){
  const { api, born } = indlaesSeo();
  api.seoExternalListingPage(l, []);
  const el = born.find(e => /jsonld/.test(e.id || '') && /Motorcycle|itemCondition/.test(e.textContent || ''));
  if (!el) return undefined;
  const ld = JSON.parse(el.textContent);
  const c = ld.itemCondition || (ld.offers && ld.offers.itemCondition) || null;
  return c ? c.replace('https://schema.org/', '') : null;
}

test('integration: kortets badge, condition, JSON-LD og annoncesidens note giver ALTID samme svar (60+ kombinationer)', () => {
  const stande = ['ny', 'brugt', null];
  const kms = [null, 0, 40, 420, 800, 53000];
  const aar = [null, 2026, 2022, 1985];
  const typer = ['forhandler', 'privat', null];
  const stier = ['https://mcsyd.dk/Produkter/Motorcykel/Ny/Honda%20CB%20500/1', 'https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20CB%20500/1', 'https://www.guloggratis.dk/annonce/ny/x1', 'https://rydbergsmc.dk/x'];
  let antal = 0; 
  for (const stand of stande) for (const km of kms) for (const aargang of aar) for (const saelgertype of typer) for (const url of stier){ antal++;
    const l = M.normalizeExternalListing(raa({ stand, km, aargang, saelgertype, url, ccm: 500, hk: 48 }));
    const ny = M.eksternErNy(l);
    const k = JSON.stringify({ stand, km, aargang, saelgertype, url });
    const badge = /rk-ny/.test(M.listingCardHTML(l, 0));
    assert.equal(badge, ny === true, 'badge ' + k);
    assert.equal(l.condition === 'Ny', ny === true, 'condition=Ny ' + k);
    if (ny === false) assert.equal(l.condition, 'Brugt', 'condition=Brugt ' + k);
    const ld = jsonLdItemCondition(l);
    assert.equal(ld === 'NewCondition', ny === true, 'JSON-LD new ' + k);
    assert.equal(ld === 'UsedCondition', ny === false, 'JSON-LD used ' + k);
    const note = M.fabriksnyNoteTekst(l, ny, 'Kilden', true);
    assert.equal(note != null, ny === true, 'note ' + k);
    assert.equal(M.erUbevistNy(l), /^ny$/i.test(String(stand || '')) && ny === null, 'ubevist ' + k);
  }
  assert.ok(antal >= 60);
});

test('"katalog over nye motorcykler" står KUN ved MC Syds /Ny/-sti — i noten og i kortets tooltip', () => {
  const alle = [
    nyRaekke({}),                                                                         // MC Syd /Ny/
    nyRaekke({ url: 'https://rydbergsmc.dk/x', saelgertype: 'forhandler' }),              // forhandler, ikke katalog
    norm({ stand: 'ny', km: 0, aargang: 2025, saelgertype: 'privat' }),                   // Gul og Gratis privat
    norm({ stand: 'ny', km: 0, aargang: 2025, saelgertype: null }),
  ];
  const [katalog, ...andre] = alle;
  assert.ok(M.eksternErNy(katalog) === true);
  assert.match(M.fabriksnyNoteTekst(katalog, true, 'MC Syd', true), /katalog over nye motorcykler/);
  assert.match(M.listingCardHTML(katalog, 0), /katalog over NYE motorcykler/);
  for (const l of andre){
    assert.ok(M.eksternErNy(l) === true);
    assert.ok(!/katalog/.test(M.fabriksnyNoteTekst(l, true, 'Kilden', true)));
    assert.match(M.fabriksnyNoteTekst(l, true, 'Kilden', true), /Kilden markerer/);
    assert.ok(!/katalog/.test(M.listingCardHTML(l, 0)));
  }
  // "Kilometerstanden er ikke oplyst" kun når den ikke er det.
  assert.match(M.fabriksnyNoteTekst({ ...katalog, km: null }, true, 'MC Syd', true), /kilometerstanden er derfor ikke oplyst/);
  assert.ok(!/kilometerstanden er derfor ikke oplyst/.test(M.fabriksnyNoteTekst({ ...katalog, km: 0 }, true, 'MC Syd', true)));
});

test('smårettelser: Engros ens overalt, hk > 1000, junk-datoer, 1-2 annoncer', () => {
  assert.equal(M.salgsmarkoerLabel('engros'), 'engros', 'mixed/lowercase kildeord ændres ikke; kun HELT VERSALE pænnes');
  assert.equal(M.salgsmarkoerLabel('ENGROS'), 'Engros');
  assert.equal(M.salgsmarkoerLabel('BYTTER GERNE'), 'Bytter gerne');
  assert.equal(M.saniterTal({ ccm: null, hk: 9999 }).hk, null);
  assert.equal(M.saniterTal({ ccm: 1000, hk: 1001 }).hk, null);
  assert.equal(M.saniterTal({ ccm: 1000, hk: 200 }).hk, 200);
  const nu = new Date('2026-10-16T12:00:00Z');
  assert.equal(M.senesteBekraeftet([{ sidstSet: '0000' }, { sidstSet: '1970-01-01' }], nu), null, 'junk-datoer er ukendte');
  const en = M.senesteBekraeftet([{ sidstSet: '2026-10-10T12:00:00Z' }], nu);
  assert.equal(en.tekst, 'Annoncen er bekræftet senest 10. okt.');
  const to = M.senesteBekraeftet([{ sidstSet: '2026-10-10T12:00:00Z' }, { sidstSet: '2026-06-01T12:00:00Z' }], nu);
  assert.equal(to.datoTekst, '1. jun.', 'ved to annoncer: den ældste dato, ikke "de fleste"');
  assert.match(to.tekst, /^Annoncerne er bekræftet senest/);
  assert.match(M.senesteBekraeftet([1, 2, 3].map(() => ({ sidstSet: '2026-10-10T12:00:00Z' })), nu).tekst, /^De fleste annoncer/);
  const soeg = fs.readFileSync(path.join(__dirname, 'search.js'), 'utf8');
  assert.match(soeg, /salgsmarkoerLabel\(m\)/, 'listerækken bruger samme label-funktion som kort og annonceside (kildetekst-tjek: search.js kan ikke kaldes uden DOM)');
});

test('F-003: forside og søgning viser datoen (kildekode-kontrakt)', () => {
  for (const f of ['home.js', 'search.js']){
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.ok(/senesteBekraeftet\(/.test(src), f + ' skal kalde senesteBekraeftet');
    if (f === 'search.js') assert.match(src, /min-height:/, 'pladsen til #frisk-note er reserveret (CLS)');
  }
});
