/* ÉN slugify til alle sideadresser (maerke-*, model-*, by-*, mc-*, region-*, annonce-*).

   Før stod der fire kopier (shared.js, build-brand-pages.js, build-facet-pages.js, seo-sider.js), og ingen af dem
   kendte andre accenttegn end æ/ø/å: "Zündapp KS 50" blev til model-z-ndapp-ks-50, fordi ü faldt ind under "alt andet
   bliver en bindestreg". Nu foldes accenter til grundbogstavet FØR bindestregsreglen.

   Dansk praksis bevares uændret: ø -> oe, æ -> ae, å -> aa (de tre står først, ellers ville Unicode-foldningen
   nå at tage "å" til "a"). Derefter: ü -> u, ä -> a, ö -> o, é -> e osv., og ß -> ss.

   Eksisterende adresser må ikke flytte sig: kun tegn, der før blev til en bindestreg, får et andet svar. Det
   er låst i scripts/slug.test.js mod alle committede model-/maerke-/by-/mc-/budget-/region-filnavne. */
function slugify(name){
  return String(name).normalize('NFC').toLowerCase()
    .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
    .replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
module.exports = { slugify };
