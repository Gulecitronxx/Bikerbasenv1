/* Indlæsning og validering af en kildekonfiguration (sources/<navn>.yaml).

   Konfigurationen er kontrakten. Alt hvad crawleren gør mod en kilde står i
   YAML'en — URL'er, selectors, forsinkelse, faste felter. Der er ingen
   kildespecifik kode i pipelinen, og det skal blive ved med at være sådan:
   næste forhandler skal koste en YAML-fil, ikke en if-sætning.

   Validering sker HER og hårdt. En kilde med en stavefejl i en selector skal
   fejle med det samme og med navnet på feltet — ikke gemme 500 annoncer med
   tom pris, fordi '[data-key="Pirce"]' bare matchede ingenting. */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const KILDE_MAPPE = path.join(__dirname, '..', 'sources');

/* Selectors vi ikke kan undvære. Uden url og titel er der ingen annonce, og
   uden pris er kortet ikke værd at vise. De tre skal stå på KORTET — de er
   det, gitteret viser, og de skal være der, før vi beslutter os for at bruge
   et kald på annoncen. */
const PAAKRAEVEDE_SELECTORS = ['kort', 'url', 'titel', 'pris'];

/* Årgang og km skal vi HAVE, men ikke nødvendigvis fra kortet.
   Kravet stod før som en selector, og det passede, dengang MC Syd var den
   eneste kilde: deres kort har alle fire specrækker. Gul og Gratis har ingen
   af dem på kortet og alle sammen på annoncens egen side. Kravet er altså
   ikke "de skal stå i gitteret", men "vi skal kunne skaffe dem" — ellers
   ville reglen tvinge os til enten at afvise en brugbar kilde eller at lyve
   en selector ind i YAML'en for at komme forbi valideringen. */
const PAAKRAEVEDE_FELTER = ['aargang', 'km'];

/* Hvilke feltnavne detalje.felter må bruge, hentet fra parse.js, som ejer
   normaliseringen af dem. Kaldet er med vilje LAZY: parse.js henter
   byggeRegex herfra, og en require den anden vej på topniveau ville lukke
   ringen — den af de to moduler, der blev indlæst først, ville stå med et
   halvt udfyldt modul, og byggeRegex ville være undefined på det første
   kort, ikke ved opstart. */
function detaljeFeltNavne(){
  return Object.keys(require('./parse').DETALJE_NORMALISERING);
}

// Databasen håndhæver crawl_delay_ms >= 2000 (014_aggregator.sql). Vi
// håndhæver det samme her, så en kilde ikke kan crawles hurtigere end
// tabellen tillader den at blive registreret.
const MINIMUM_DELAY_MS = 2000;

function laesKilde(navn){
  const fil = path.join(KILDE_MAPPE, `${navn}.yaml`);
  if (!fs.existsSync(fil)){
    const findes = fs.existsSync(KILDE_MAPPE)
      ? fs.readdirSync(KILDE_MAPPE).filter(f => f.endsWith('.yaml')).map(f => f.replace(/\.yaml$/, ''))
      : [];
    throw new Error(`Ukendt kilde "${navn}". Findes i sources/: ${findes.join(', ') || '(ingen)'}`);
  }
  const k = YAML.parse(fs.readFileSync(fil, 'utf8'));
  k.slug = navn;
  k.konfig_fil = `sources/${navn}.yaml`;
  return validerKilde(k);
}

function alleKilder(){
  if (!fs.existsSync(KILDE_MAPPE)) return [];
  return fs.readdirSync(KILDE_MAPPE)
    .filter(f => f.endsWith('.yaml'))
    .map(f => f.replace(/\.yaml$/, ''));
}

function validerKilde(k){
  const fejl = [];
  const kraev = (felt, ok, hvorfor) => { if (!ok) fejl.push(`${felt}: ${hvorfor}`); };

  kraev('navn', typeof k.navn === 'string' && k.navn.trim(), 'mangler');
  kraev('domaene', typeof k.domaene === 'string' && k.domaene.trim(), 'mangler');
  if (typeof k.domaene === 'string'){
    // Samme regel som constraint domaene_uden_skema i 014_aggregator.sql.
    kraev('domaene', !/^https?:\/\//i.test(k.domaene), 'skal stå uden http(s)://');
  }

  kraev('liste_urler', Array.isArray(k.liste_urler) && k.liste_urler.length > 0, 'mindst én liste-URL kræves');
  for (const [i, l] of (k.liste_urler || []).entries()){
    kraev(`liste_urler[${i}].url`, typeof l?.url === 'string' && /^https:\/\//.test(l.url),
      'skal være en absolut https-URL');
  }

  kraev('detalje_url_moenster', typeof k.detalje_url_moenster === 'string', 'mangler');
  if (typeof k.detalje_url_moenster === 'string'){
    try { byggeRegex(k.detalje_url_moenster); }
    catch (e){ fejl.push(`detalje_url_moenster: ugyldigt regex — ${e.message}`); }
  }

  kraev('selectors', k.selectors && typeof k.selectors === 'object', 'mangler');
  for (const s of PAAKRAEVEDE_SELECTORS){
    kraev(`selectors.${s}`, typeof k.selectors?.[s] === 'string' && k.selectors[s].trim(), 'mangler');
  }

  /* Felter UD OVER de fire påkrævede må godt være et sammensat udtræk:
     { css: '<selector>', udtraek: '<regex med én fangstgruppe>' } — hele
     elementets tekst læses via css, og udtraek trækker ét tal ud af den.

     Grunden til at det her findes: Rydbergs MC pakker årgang, km, ccm og hk
     i ÉT tekstnode ("2015, 30452 km, 999 ccm, 167 hk"), ikke i fire — der
     er ingen detaljeside med separate felter at falde tilbage på, deres
     "detalje" er den samme kortliste vist i et overlay. Uden det her ville
     kilden slet ikke kunne bruges.

     kort/url/titel/pris er med VILJE holdt uden for undtagelsen: url skal
     blive ved med at være .href og ikke tekst (se udtraekKort i parse.js),
     og at splitte titel eller pris ud af en blanding er en anden slags
     risiko end at splitte ét tal ud af et andet tal — den skal vurderes
     for sig, ikke glide med her.

     Regex'en har INGEN (?flags)-præfiks, i modsætning til
     detalje_url_moenster og stand_url_moenster — parse.js bygger den med
     rent `new RegExp(...)`, fordi den kører inde i page.evaluate() og ikke
     må lukke over noget fra Node (heller ikke byggeRegex herfra). Skriv
     mønsteret store/små-bogstav-følsomt, som teksten faktisk står. */
  for (const [felt, vaerdi] of Object.entries(k.selectors || {})){
    if (PAAKRAEVEDE_SELECTORS.includes(felt)) continue;
    if (typeof vaerdi === 'string' || vaerdi == null) continue;
    const sammensatForm = vaerdi && typeof vaerdi === 'object'
      && typeof vaerdi.css === 'string' && vaerdi.css.trim()
      && typeof vaerdi.udtraek === 'string' && vaerdi.udtraek.trim();
    kraev(`selectors.${felt}`, sammensatForm,
      'skal enten være en CSS-selector-streng eller { css, udtraek } med et regex, der har præcis én fangstgruppe');
    if (sammensatForm){
      try {
        const re = new RegExp(vaerdi.udtraek);
        kraev(`selectors.${felt}.udtraek`, /\((?!\?)/.test(re.source),
          'regex mangler en fangstgruppe — udtraek skal have (…) om det tal, der skal gemmes');
      } catch (e){
        fejl.push(`selectors.${felt}.udtraek: ugyldigt regex — ${e.message}`);
      }
    }
  }

  /* ---- detalje: hent felter fra annoncens egen side ----
     Valgfrit blok. Er den der, skal den være komplet: en halvt udfyldt
     detalje-konfiguration henter en side pr. annonce og kaster resultatet
     væk, og det er både det dyreste og det mest tavse, en kilde kan gøre. */
  const detaljeFelter = k.detalje?.felter || {};
  if (k.detalje != null){
    kraev('detalje', typeof k.detalje === 'object', 'skal være et objekt, eller udelades helt');
    for (const felt of ['par', 'label', 'vaerdi']){
      kraev(`detalje.${felt}`, typeof k.detalje?.[felt] === 'string' && k.detalje[felt].trim(),
        'mangler — uden den kan et etiket/værdi-par ikke findes');
    }
    kraev('detalje.felter', k.detalje?.felter && Object.keys(detaljeFelter).length > 0,
      'mindst ét felt kræves, ellers er der ingen grund til at hente siden');
    const kendte = detaljeFeltNavne();
    for (const [felt, etiket] of Object.entries(detaljeFelter)){
      kraev(`detalje.felter.${felt}`, kendte.includes(felt),
        `ukendt felt — kendte felter: ${kendte.join(', ')}`);
      kraev(`detalje.felter.${felt}`, typeof etiket === 'string' && etiket.trim(),
        'etiketten på kildens side mangler');
    }
  }

  // Årgang og km: fra kortet ELLER fra detaljesiden, men de skal komme et sted fra.
  // "Fra kortet" tæller også et sammensat udtræk ({ css, udtraek }) — se
  // valideringen ovenfor, som allerede har afvist en ugyldig form.
  for (const felt of PAAKRAEVEDE_FELTER){
    const sv = k.selectors?.[felt];
    const fraKort = (typeof sv === 'string' && sv.trim())
      || (sv && typeof sv === 'object' && typeof sv.css === 'string' && sv.css.trim());
    const fraDetalje = k.detalje?.hent && typeof detaljeFelter[felt] === 'string' && detaljeFelter[felt].trim();
    kraev(felt, fraKort || fraDetalje,
      `mangler — sæt selectors.${felt} (kortet) eller detalje.felter.${felt} (annoncens egen side)`);
  }

  /* Tilladelse er ikke et teknisk felt, men det er det vigtigste felt i filen.
     robots.txt er en teknisk regel; et skriftligt ja er en aftale. Vi kræver
     begge, og pipelinen nægter at køre uden.

     KRAVET ER SKÆRPET (C-013). Før gatede begge felter på `Boolean()`, og en
     bar `true` var nok. `true` nedskriver hverken hvornår, med hvem eller
     under hvilke vilkår — og feltet er ifølge DECISIONS.md netop "en
     nedskrivning af, at en aftale findes". En nedskrivning uden dato er
     ingen nedskrivning.

     Datoen må stå i `tilladelse_modtaget` selv (sådan gør mcsyd.yaml) eller
     i `tilladelse_dato` ved siden af (sådan gør guloggratis.yaml, hvor
     `tilladelse_modtaget: true` er skrevet som et ja/nej). Begge former
     nedskriver DATOEN, og det er den, kravet handler om. Ingen af de to
     eksisterende filer skal derfor rettes — men en tredje kilde kan ikke
     længere slippe forbi med et blot `true`.

     Kontrollen af, at robots.txt STADIG tillader os, ligger i
     crawler/robots.js og køres ved hver kørsel. Datoen her siger, hvornår et
     menneske læste filen; den kan ikke sige, hvad der står i den i dag. De
     to erstatter ikke hinanden. */
  const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;
  const somDato = v => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ''));
  const tilladelsesDato = [k.tilladelse_modtaget, k.tilladelse_dato].map(somDato).find(v => ISO_DATO.test(v));

  kraev('tilladelse_modtaget', Boolean(k.tilladelse_modtaget), 'skriftlig tilladelse mangler — kilden må ikke crawles');
  kraev('tilladelse_modtaget', Boolean(tilladelsesDato),
    'mangler en DATO for, hvornår det skriftlige ja blev modtaget. Skriv den som '
    + 'tilladelse_modtaget: ÅÅÅÅ-MM-DD, eller sæt tilladelse_dato ved siden af. '
    + 'Et bart "true" nedskriver hverken hvornår, med hvem eller under hvilke vilkår');
  kraev('robots_tjekket', Boolean(k.robots_tjekket), 'robots.txt er ikke tjekket');
  kraev('robots_tjekket', ISO_DATO.test(somDato(k.robots_tjekket)),
    'skal være en dato (ÅÅÅÅ-MM-DD) for, hvornår et menneske læste filen');

  const delay = Number(k.crawl_delay_ms);
  kraev('crawl_delay_ms', Number.isFinite(delay) && delay >= MINIMUM_DELAY_MS,
    `skal være mindst ${MINIMUM_DELAY_MS} (databasen afviser mindre)`);

  /* Valgfrie felter. De må mangle — men er de der, skal de være brugbare.
     Et ugyldigt regex ville først kaste midt i en kørsel, på det 200. kort,
     og et tomt type_vokabular ville stille og roligt give 343 annoncer uden
     type, som om kilden ikke havde nogen. */
  if (k.stand_url_moenster != null){
    try { byggeRegex(k.stand_url_moenster); }
    catch (e){ fejl.push(`stand_url_moenster: ugyldigt regex — ${e.message}`); }
  }
  if (k.type_vokabular != null){
    kraev('type_vokabular', Array.isArray(k.type_vokabular) && k.type_vokabular.length > 0
      && k.type_vokabular.every(t => typeof t === 'string' && t.trim()),
      'skal være en liste af ikke-tomme ord, eller udelades helt');
  }

  if (k.faste_felter?.saelgertype != null){
    kraev('faste_felter.saelgertype', ['privat', 'forhandler'].includes(k.faste_felter.saelgertype),
      "skal være 'privat' eller 'forhandler'");
  }

  if (fejl.length){
    throw new Error(`Konfigurationen ${k.konfig_fil} er ugyldig:\n  - ${fejl.join('\n  - ')}`);
  }
  return k;
}

/* YAML'en skriver mønsteret med inline-flag: '(?i)/produkter/...'. JavaScript
   forstår ikke (?i) inde i et mønster — kun som flag på RegExp'en. Uden den
   her oversættelse ville mønsteret kaste, og det er præcis det tilfælde
   YAML-kommentaren advarer om: stien har store begyndelsesbogstaver, så uden
   ignorecase finder vi nul annoncer. */
function byggeRegex(moenster){
  const m = String(moenster).match(/^\(\?([a-z]+)\)(.*)$/s);
  return m ? new RegExp(m[2], m[1]) : new RegExp(moenster);
}

module.exports = { laesKilde, alleKilder, validerKilde, byggeRegex, KILDE_MAPPE, MINIMUM_DELAY_MS };
