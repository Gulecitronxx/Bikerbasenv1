/* Parse: fra renderet DOM til en normaliseret annonce.

   To trin, med vilje adskilt:

     udtraekKort()  kører INDE i browseren og rører kun DOM'en. Den kender
                    ingen forretningsregler og laver ingen konvertering — den
                    henter rå strenge, præcis som de står på siden.

     tilAnnonce()   kører i Node og er ren funktion af de rå strenge. Derfor
                    kan den testes uden browser og uden netværk, og det er dér
                    de fejl, der koster penge, faktisk opstår.

   Al talkonvertering går gennem crawler/normalize.js. Der bliver ikke parset
   noget her. */

const n = require('./normalize');
const { byggeRegex } = require('./config');

/* ---------- Trin 1: DOM -> rå strenge ----------
   Funktionen serialiseres til browseren, så den må ikke lukke over noget fra
   Node. Alt kommer ind via argumentet.

   querySelector giver FØRSTE træf pr. kort. Det er netop det, YAML'ens
   tag_foerste_traef kræver: titlen står i to varianter (hidden-xs og
   visible-xs) med samme data-key, og tages begge, står teksten to gange. */
async function udtraekKort(page, selectors){
  return page.evaluate((sel) => {
    const tekst = (rod, s) => {
      if (!s) return null;
      // Et felt kan enten være en ren CSS-selector-streng (det normale),
      // eller { css, udtraek }: hele elementets tekst læses via css, og et
      // regex trækker ÉT tal ud af den. Se config.js for hvorfor — Rydbergs
      // MC pakker årgang/km/ccm/hk i ét tekstnode, ikke i fire.
      const css = typeof s === 'string' ? s : s.css;
      const el = rod.querySelector(css);
      if (!el) return null;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!t) return null;
      if (typeof s === 'object' && s.udtraek){
        // Ingen fangst -> ingen værdi. Vi gætter aldrig et tal, vi ikke kan
        // pege på i selve teksten — samme regel som resten af crawleren.
        const m = t.match(new RegExp(s.udtraek));
        return m ? (m[1] || null) : null;
      }
      return t;
    };

    return Array.from(document.querySelectorAll(sel.kort)).map(kort => ({
      // .href og .src giver den absolutte URL, uanset om attributten er
      // relativ. En relativ href gemt som den står bliver et dødt link.
      url:       kort.querySelector(sel.url)?.href || null,
      titel:     tekst(kort, sel.titel),
      pris:      tekst(kort, sel.pris),
      aargang:   tekst(kort, sel.aargang),
      km:        tekst(kort, sel.km),
      ccm:       tekst(kort, sel.ccm),
      hk:        tekst(kort, sel.hk),
      /* Sted pr. annonce. MC Syd har ét lager på én adresse og siger det i
         faste_felter; en markedsplads har en sælger pr. annonce, og så står
         byen på kortet. Begge veje findes derfor — se tilAnnonce(). */
      by:        tekst(kort, sel.by),
      postnr:    tekst(kort, sel.postnr),
      thumbnail: sel.thumbnail
        ? (kort.querySelector(sel.thumbnail)?.currentSrc || kort.querySelector(sel.thumbnail)?.src || null)
        : null,
    }));
  }, selectors);
}

/* ---------- Trin 1b: detaljesidens specfelter ----------
   MC Syd har alt på kortet. Gul og Gratis har næsten ingenting: kortet er
   titel, pris, postnummer og dato. Ccm, hk, kilometer, årgang og stand står
   KUN på annoncens egen side.

   Derfor det her trin — og derfor er det valgfrit. En kilde uden `detalje:`
   i YAML'en henter aldrig en detaljeside, præcis som før.

   Feltet aflæses på ETIKETTEN, ikke på en CSS-klasse. Gul og Gratis er bygget
   i Tailwind, og deres specfelter står som
     <dl class="border-gray-mid m-0 block border-t"><dt>Hestekræfter</dt><dd>95 HK</dd></dl>
   Klassestrengen er genereret og skifter, når nogen ændrer en margin; ordet
   "Hestekræfter" skifter kun, hvis de skriver om på dansk. Et opslag på
   etiketten overlever altså et designskift, og det er dét, en crawler skal. */
async function udtraekDetalje(page, detalje){
  return page.evaluate((d) => {
    const ud = {};
    for (const par of document.querySelectorAll(d.par)){
      const label = par.querySelector(d.label);
      const vaerdi = par.querySelector(d.vaerdi);
      if (!label || !vaerdi) continue;
      const navn = (label.textContent || '').replace(/\s+/g, ' ').trim();
      const tekst = (vaerdi.textContent || '').replace(/\s+/g, ' ').trim();
      // Første træf vinder. Står "Mærke" to gange, er den anden en
      // gentagelse i en mobiludgave, ikke en ny oplysning.
      if (navn && tekst && !(navn in ud)) ud[navn] = tekst;
    }
    return ud;
  }, detalje);
}

/* Hvilken normalisering hvert felt skal igennem. Listen er samtidig den
   eneste tilladte nøglemængde i YAML'ens detalje.felter — config.js afviser
   et feltnavn, der ikke står her, så en tastefejl bliver en fejl ved
   opstart og ikke en kolonne, der stille bliver ved med at være tom. */
const DETALJE_NORMALISERING = {
  maerke: n.normaliserMaerke,
  aargang: n.parseAargang,
  km: n.parseKm,
  ccm: n.parseCcm,
  hk: n.parseHk,
  stand: n.normaliserStand,
  pris_dkk: n.parsePris,
};

/* Detaljesiden vinder over kortet.

   Ikke af princip, men fordi de to ting ikke er lige gode. På kortet er
   mærket et GÆT: delTitel() læser det ud af en fritekst, som sælgeren selv
   har skrevet, og "Perfekt veteran motorcykel til langtur" giver mærket
   "Perfekt". På detaljesiden er Mærke et felt, sælgeren har valgt i en
   rulleliste. Et valgt felt slår en gætning på en overskrift.

   Derfor genudleder vi også model og variant, når mærket kom fra
   detaljesiden: delTitel() klipper mærket af titlen, og med det rigtige
   mærke bliver resten en anden — og rigtigere — model. */
function berigMedDetalje(annonce, par, kilde){
  const felter = kilde.detalje?.felter || {};
  const laest = [];

  for (const [felt, label] of Object.entries(felter)){
    const norm = DETALJE_NORMALISERING[felt];
    if (!norm) continue;
    const vaerdi = norm(par[label]);
    if (vaerdi == null) continue;
    annonce[felt] = vaerdi;
    laest.push(felt);
  }

  if (laest.includes('maerke')){
    const delt = delTitel(annonce.titel, annonce.maerke);
    annonce.model = delt.model;
    annonce.variant = delt.variant;
    annonce.salgsmarkoerer = delt.salgsmarkoerer || [];
  }

  /* Et oplyst tal slår vores eget gæt ihjel — også mærkatet om, at det VAR
     et gæt. Blev ccm udledt af modelnavnet på kortet, og siger detaljesiden
     nu 1.150 ccm, er tallet ikke længere udledt, og så må det ikke stå på
     udledte_felter og se ud som noget, vi har fundet på. */
  for (const felt of laest){
    annonce.udledte_felter = (annonce.udledte_felter || []).filter(f => f !== felt);
  }

  /* Mærke og model indgår i fingerprint(). Ændrer detaljesiden dem, peger
     den gamle nøgle på en motorcykel, der ikke findes mere. */
  annonce.fingerprint = n.fingerprint(annonce);
  return { annonce, laest };
}

/* ---------- Mærke og model ----------
   Kortet har én titel, "Harley-Davidson XL883 Standard Cruiser", men
   databasen har både maerke og model — og fingerprint() bruger dem hver for
   sig. Uden opdelingen ville modellen indeholde mærket, og samme cykel hos to
   forhandlere ville aldrig få samme fingerprint.

   Kender vi mærket fra liste-URL'en (YAML'ens maerke:), er DET sandheden.
   Det er hele grunden til, at mærkesiderne foretrækkes frem for
   /alle-motorcykler/. Ellers genkender vi mærket i starten af titlen.

   Længste træf vinder: "Moto Guzzi V7" må ikke blive mærket "Moto" med
   modellen "Guzzi V7". */
const MAX_MAERKE_ORD = 2;

function delTitel(titel, kendtMaerke){
  const ord = String(titel || '').trim().split(/\s+/).filter(Boolean);
  if (!ord.length) return { maerke: kendtMaerke ? n.normaliserMaerke(kendtMaerke) : null, model: null };

  let fundet = null;
  for (let laengde = Math.min(MAX_MAERKE_ORD, ord.length); laengde >= 1; laengde--){
    const kandidat = ord.slice(0, laengde).join(' ').toLowerCase().replace(/[^\wæøå\s-]/gi, '');
    if (n.MAERKE_ALIAS[kandidat]){ fundet = { navn: n.MAERKE_ALIAS[kandidat], ord: laengde }; break; }
  }

  /* Ukendt mærke. Aliaslisten i normalize.js er ikke udtømmende, og et mærke,
     der mangler dér, må ikke få hele kataloget til at tabe mærket — derfor
     tages første ord, ligesom normaliserMaerke selv gør for ukendte navne.

     Men KUN hvis ordet ligner et mærkenavn: bogstaver, ingen cifre. Ellers
     ville titlen "XL883 Standard Cruiser", hvor forhandleren har glemt
     mærket, give mærket "Xl883" — en løgn på et kort og en ny post i
     mærkefilteret. Uden mærke står der "ikke oplyst", og det er sandt. */
  if (!fundet && !kendtMaerke && /^[\p{L}][\p{L}.-]*$/u.test(ord[0])){
    fundet = { navn: n.normaliserMaerke(ord[0]), ord: 1 };
  }

  // Titlen starter med mærket: klip det af, uanset om mærket kom fra URL'en.
  const rest = fundet ? ord.slice(fundet.ord).join(' ') : ord.join(' ');
  const maerke = kendtMaerke ? n.normaliserMaerke(kendtMaerke) : (fundet ? fundet.navn : null);

  /* Det, der bliver tilbage, er ikke bare modellen. MC Syd klistrer
     karrosseritypen og sine egne salgsvilkår ind i samme streng, og de tre
     ting hører tre forskellige steder hen — se delModelOgVariant() i
     normalize.js, som ejer den opdeling ligesom al anden parsning af danske
     annoncedata. */
  const { model, variant, salgsmarkoerer } = n.delModelOgVariant(rest);

  return { maerke, model, variant, salgsmarkoerer };
}

/* Bynavnet, uden det layout der stod rundt om det. */
function reniStednavn(raa){
  if (raa == null) return null;
  const s = String(raa).replace(/[·|,;\-\s]+$/u, '').replace(/^[·|,;\-\s]+/u, '').trim();
  return s || null;
}

/* ---------- Ny eller brugt ----------
   Kategorien står som eget segment i produktlinkets sti:
     /Produkter/Motorcykel/Brugt/Sym%20XS%20125/181552?p=…
     /Produkter/45-Scooter-knallert/Ny/Honda%20NSC%20110%20…/165596?p=…

   Mønsteret ligger i YAML'en, fordi stien er kildens, ikke vores. Mangler
   det, står feltet tomt — vi gætter ikke ud fra kilometerstanden. En brugt
   udstillingsmodel kan også have 0 km, og "ny" er en garantipåstand. */
function udledStand(url, kilde){
  if (!url || !kilde.stand_url_moenster) return null;
  const traef = String(url).match(byggeRegex(kilde.stand_url_moenster));
  return traef ? n.normaliserStand(traef[1] ?? traef[0]) : null;
}

/* ---------- Trin 2: rå strenge -> annonce ----------
   Returnerer { ok: true, annonce } eller { ok: false, grund } . En annonce
   uden url, id eller titel kastes væk med en grund, der kan logges — ikke i
   stilhed. En kilde, der pludselig leverer 200 grunde af samme slags, er et
   designskift, og det skal kunne ses i loggen. */
function tilAnnonce(raa, kilde, listeMaerke = null){
  if (!raa.url) return { ok: false, grund: 'intet produktlink i kortet' };

  const moenster = byggeRegex(kilde.detalje_url_moenster);
  const traef = String(raa.url).match(moenster);
  const kilde_annonce_id = traef?.[kilde.id_gruppe ?? 1];
  if (!kilde_annonce_id) return { ok: false, grund: `url matcher ikke detalje_url_moenster: ${raa.url}` };

  const titel = n.uddrag(raa.titel, 200);
  if (!titel) return { ok: false, grund: `annonce ${kilde_annonce_id} har ingen titel` };

  const { maerke, model, variant, salgsmarkoerer } = delTitel(titel, listeMaerke);
  const faste = kilde.faste_felter || {};

  const annonce = {
    kilde_annonce_id: String(kilde_annonce_id),
    url: raa.url,
    titel,
    maerke,
    model,
    // Bilbasens anden linje: det, der præciserer modellen. Null når titlen
    // ikke siger noget — kortet skriver hellere ingenting end et gæt.
    variant,
    /* Forhandlerens vilkår, ikke motorcyklens. Eget felt, så det kan vises
       som et mærkat og aldrig forurener model eller variant.

       ALTID et array, aldrig null. delModelOgVariant() bruger internt null
       som "ingen markører", men kolonnen er `not null default '{}'`, og en
       eksplicit null slår en default fra i stedet for at udløse den. Første
       rigtige kørsel efter migrationen døde på præcis det: 332 annoncer
       parset, 0 gemt.

       Tom liste frem for null er også det rigtigere svar. Vi VED, at
       annoncen ingen markører har — vi mangler ikke oplysningen. */
    salgsmarkoerer: salgsmarkoerer || [],
    aargang: n.parseAargang(raa.aargang),
    km: n.parseKm(raa.km),
    ccm: n.parseCcm(raa.ccm),
    hk: n.parseHk(raa.hk),
    pris_dkk: n.parsePris(raa.pris),
    /* Typen står ikke i sit eget felt hos kilden — den er skrevet ind i
       titlen, som er dét kortet viser. Vokabularet står i YAML'en, ikke her:
       en anden forhandler kan bruge andre ord, og så skal der rettes i en
       konfiguration, ikke i pipelinen.

       Vi læser typen UD af titlen, men klipper den ikke AF modellen. Det er
       med vilje: model indgår i fingerprint(), og en beskæring ville give
       alle 332 eksisterende annoncer et nyt fingerprint — samme motorcykel
       ville stå som to på tværs af en kørsel. Vil man rydde op i modelnavnet,
       er det en selvstændig opgave med en gennemskrivning af nøglerne. */
    type: n.normaliserType(titel, kilde.type_vokabular),
    /* Ny eller brugt. Kilden har det ikke som felt i kortet, men som segment
       i produktlinkets sti. Vi har allerede URL'en, så det koster ingen ekstra
       hentning — kun et mønster i YAML'en. */
    stand: udledStand(raa.url, kilde),
    /* Kortets sted vinder over kildens faste adresse. En markedsplads' kort
       siger, hvor DEN her motorcykel står; faste_felter siger, hvor kilden
       ligger. Har kortet intet sted, falder vi tilbage — så virker MC Syd
       præcis som før.

       "Fredericia · " kommer med separatoren, fordi den står inde i samme
       <span> som bynavnet hos Gul og Gratis. Den hører til layoutet, ikke
       til byen. */
    by: reniStednavn(raa.by) || faste.by || null,
    postnr: n.parsePostnr(raa.postnr ?? faste.postnr),
    saelgertype: n.normaliserSaelgertype(faste.saelgertype),
    // Kildens egen pladsholdergrafik gemmes IKKE som foto — se
    // erKildensPladsholder() i normalize.js.
    thumbnail_url: raa.thumbnail && !n.erKildensPladsholder(raa.thumbnail) ? raa.thumbnail : null,
    // Kortene i gitteret har ingen beskrivelse, og vi henter ikke detaljesiden
    // for at få én. Vi gemmer med vilje kun det, der skal til for at finde og
    // videresende — resten hører hjemme hos kilden.
    uddrag: null,
    /* Felter vi har UDLEDT frem for læst. Modstykket til manuelle_felter:
       dér står, hvad et menneske har rettet; her står, hvad vi har gættet.
       En værdi, der ikke kan skelnes fra en måling, er en løgn — og den, der
       om et halvt år undrer sig over en ccm, skal kunne se hvorfor. */
    udledte_felter: [],
  };

  /* ---- ccm: udled af modelnavnet, men kun når kilden tier ----
     109 af 332 annoncer havde ingen ccm, og uden ccm OG hk svarer
     koerekortForListing() null — så forsvinder A1/A2/A-mærkatet fra kortet.
     Modelnavnet ved det som regel godt: "MSX 125", "CBR 1000 F".

     En oplyst kubik vinder ALTID over et gæt. Vi supplerer kilden, vi
     retter den ikke. Og årgangen sendes med, så et årstal i modelnavnet
     ikke bliver til slagvolumen. */
  if (annonce.ccm == null){
    const gaet = n.udledCcmFraModel(annonce.model, { aargang: annonce.aargang });
    if (gaet != null){
      annonce.ccm = gaet;
      annonce.udledte_felter.push('ccm');
    }
  }

  /* hk, type, stand og de udledte felter er nye i supabase/015. fingerprint()
     rører dem IKKE: nøglen skal blive ved med at pege på den samme
     motorcykel efter migrationen, ellers ville hele kataloget fremstå som
     nyt. Bemærk at ccm heller ikke indgår i fingerprint() — havde den gjort
     det, ville et udledt tal have flyttet annoncer rundt. */
  annonce.fingerprint = n.fingerprint(annonce);
  return { ok: true, annonce };
}

module.exports = {
  udtraekKort, tilAnnonce, delTitel, udledStand,
  udtraekDetalje, berigMedDetalje, DETALJE_NORMALISERING,
};
