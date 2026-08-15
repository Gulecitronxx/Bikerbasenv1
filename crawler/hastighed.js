/* Hastighedsgrænse pr. domæne.

   Reglen er ikke "gennemsnitligt to sekunder mellem kald". Den er: der er
   aldrig to kald i luften mod det samme domæne på samme tid, og der går
   mindst crawl_delay_ms fra ét kald er FÆRDIGT til det næste starter.

   Forskellen betyder noget. Ti parallelle kald med 2 sekunders mellemrum er
   stadig ti samtidige forbindelser til en forhandlers server, og det er
   præcis den slags trafik, der får en aftale trukket tilbage.

   Nøglen er domænet, ikke kilden. To YAML-filer, der peger på samme vært,
   deler kø. */

const koeer = new Map();   // domæne -> Promise-kæde (serialisering)
const sidst = new Map();   // domæne -> tidsstempel for seneste afsluttede kald

function sov(ms){
  return ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve();
}

/* Kør fn() med domænet reserveret. Kaldet lægger sig bagerst i domænets kø,
   venter resten af forsinkelsen af, kører, og frigiver først derefter. */
function medHastighedsgraense(domaene, delayMs, fn){
  const forrige = koeer.get(domaene) || Promise.resolve();

  const tur = forrige.then(async () => {
    const sidste = sidst.get(domaene);
    if (sidste != null){
      await sov(delayMs - (Date.now() - sidste));
    }
    try {
      return await fn();
    } finally {
      // Også ved fejl: et mislykket kald har ramt serveren lige så hårdt som
      // et vellykket, og et retry må ikke springe forsinkelsen over.
      sidst.set(domaene, Date.now());
    }
  });

  // Køen må ikke knække, når et kald fejler — næste i køen skal stadig køre.
  koeer.set(domaene, tur.then(() => {}, () => {}));
  return tur;
}

// Kun til test: nulstil tilstanden mellem kørsler.
function nulstil(){
  koeer.clear();
  sidst.clear();
}

module.exports = { medHastighedsgraense, nulstil, sov };
