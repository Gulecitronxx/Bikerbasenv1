/* Info-/tekstsiderne (om-bikerbasen, vilkaar, privatlivspolitik, sikkerhed, om-indeksering, 404).
   Siderne er statisk HTML og kræver ingen JavaScript for at kunne læses. Scriptet giver kun
   headeren dens aktive menu, login-/favoritstatus og tema, og udfylder de ikoner, som
   teksten selv peger på med data-icon. Erstatter de tidligere inline-scripts pr. side (CSP). */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderHeader === 'function') {
    /* data-aktiv er filnavnet. På GitHub Pages er stien ofte uden .html, så den kan ikke aflæses sikkert. */
    renderHeader(document.body.getAttribute('data-aktiv') || null);
  }
  if (typeof Icon !== 'undefined') {
    document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = Icon[el.dataset.icon] || ''; });
  }
});
