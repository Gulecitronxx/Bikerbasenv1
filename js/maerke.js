/* Hydrates a brand landing page: renders the listing grid for the brand named
   in [data-brand].

   Runde 7 (D7-M2): SAMME raekkefoelge som byggetrinnet og soegesiden
   (Sortering 'blandet'), og samme antal kort (data-viste = 24). Foer sorterede
   den paa createdAt (null paa 548 af 548 — en no-op) og tegnede ALLE 262
   Honda igen oven i de 262, byggetrinnet allerede havde skrevet. Nu roeres
   DOM'en kun, hvis lageret har aendret sig siden bygget (andre id'er). */
document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  const mount = document.getElementById('brand-listings');
  const brand = mount && mount.dataset.brand;

  renderHeader(null);
  /* Facetfolden styres nu udelukkende af CSS (checkbox + label) — se
     scripts/build-brand-pages.js. Den JS, der stod her, flyttede foerste kort
     efter load og var selve CLS-problemet. */
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  if (!brand) return;

  const alle = Store.getAllListings().filter(l => l.brand === brand);
  const viste = Number(mount.dataset.viste) || 24;
  const items = (typeof Sortering !== 'undefined' ? Sortering.sorter(alle.slice(), 'blandet') : alle).slice(0, viste);

  const nuIds = [...mount.querySelectorAll('.card[data-listing-id]')].map(c => c.dataset.listingId).join('|');
  const nyeIds = items.map(l => String(l.id)).join('|');
  if (nuIds !== nyeIds){
    mount.innerHTML = items.length
      ? items.map((l, i) => listingCardHTML(l, i)).join('')
      : `<div class="empty-state">${Icon.search}<h3>Ingen ${escapeHTML(brand)} til salg lige nu</h3>
         <p>Gem en søgning på ${escapeHTML(brand)}, så tæller den nye annoncer, næste gang du kigger.</p>
         <a href="soegning.html?brands=${encodeURIComponent(brand)}" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a></div>`;
  }
  const antal = document.getElementById('brand-antal');
  if (antal && alle.length){
    antal.textContent = `${alle.length} ${alle.length === 1 ? 'annonce' : 'annoncer'}${alle.length > viste ? ` — de første ${viste} her` : ''}`;
  }
  wireFavoriteButtons(mount);
});
