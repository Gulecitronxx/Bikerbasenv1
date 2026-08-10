/* Læser sidens adresse ud af js/seo.js, så byggescripterne og browserkoden
   ikke kan komme til at pege på hver sit domæne.

   Før lå adressen hårdkodet tre steder. Ved et domæneskift ville man
   uundgåeligt glemme det ene, og så ville canonical og sitemap pege på det
   gamle domæne — præcis den slags fejl Google straffer. */

const fs = require('fs');
const path = require('path');

module.exports = function siteUrl(root){
  const src = fs.readFileSync(path.join(root, 'js/seo.js'), 'utf8');
  const m = src.match(/^const SITE_URL = '([^']+)';/m);
  if (!m) throw new Error('Kunne ikke finde SITE_URL i js/seo.js — build afbrudt.');
  return m[1].replace(/\/+$/, '');
};
