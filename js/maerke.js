/* Hydrates a brand landing page: renders the listing grid for the brand named
   in [data-brand], sorted newest first. */
document.addEventListener('DOMContentLoaded', async () => {
  await backendReady();
  const mount = document.getElementById('brand-listings');
  const brand = mount && mount.dataset.brand;

  renderHeader(null);
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  if (!brand) return;

  const items = Store.getAllListings()
    .filter(l => l.brand === brand)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  mount.innerHTML = items.length
    ? items.map(listingCardHTML).join('')
    : `<div class="empty-state">${Icon.search}<h3>Ingen ${escapeHTML(brand)} til salg lige nu</h3>
       <p>Opret en søgeagent, så giver vi besked når der kommer en.</p>
       <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a></div>`;
  wireFavoriteButtons(mount);
});
