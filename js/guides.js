/* Guide-siderne (guides.html, guide-*.html) er statiske. Det eneste scriptet
   skal gøre, er at give siden den fælles header med login-, tema- og
   favoritknapper. Selve artiklen kræver ingen JavaScript, så den virker også,
   hvis scriptet ikke når frem. */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof backendReady === 'function') await backendReady();
  if (typeof renderHeader === 'function') renderHeader(null);
});
