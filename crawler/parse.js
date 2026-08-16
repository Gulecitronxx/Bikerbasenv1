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
      const el = rod.querySelector(s);
      if (!el) return null;
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return t || null;
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
      thumbnail: sel.thumbnail
        ? (kort.querySelector(sel.thumbnail)?.currentSrc || kort.querySelector(sel.thumbnail)?.src || null)
        : null,
    }));
  }, selectors);
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
    // Forhandlerens vilkår, ikke motorcyklens. Eget felt, så det kan vises
    // som et mærkat og aldrig forurener model eller variant.
    salgsmarkoerer,
    aargang: n.parseAargang(raa.aargang),
    km: n.parseKm(raa.km),
    ccm: n.parseCcm(raa.ccm),
    pris_dkk: n.parsePris(raa.pris),
    by: faste.by || null,
    postnr: n.parsePostnr(faste.postnr),
    saelgertype: n.normaliserSaelgertype(faste.saelgertype),
    thumbnail_url: raa.thumbnail || null,
    // Kortene i gitteret har ingen beskrivelse, og vi henter ikke detaljesiden
    // for at få én. Vi gemmer med vilje kun det, der skal til for at finde og
    // videresende — resten hører hjemme hos kilden.
    uddrag: null,
  };

  // hk står på kortet, men eksterne_annoncer har ingen kolonne til den.
  // Hellere droppe den end at presse den ned i et felt, den ikke hører til.

  annonce.fingerprint = n.fingerprint(annonce);
  return { ok: true, annonce };
}

module.exports = { udtraekKort, tilAnnonce, delTitel };
