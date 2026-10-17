/* Guide-siderne (guides.html, guide-*.html) er statiske. Det eneste scriptet
   skal gøre, er at give siden den fælles header med login-, tema- og
   favoritknapper. Selve artiklen kræver ingen JavaScript, så den virker også,
   hvis scriptet ikke når frem. */
/* Indholdsfortegnelsen (.gd-toc): sammenklappelig <details> på mobil, altid åben på desktop. Moderne browsere
   viser indholdet af CSS alene (::details-content); her åbnes den i de øvrige, og et klik på overskriften
   lukker den ikke på desktop. Dertil markeres det afsnit, der er i syne (aria-current), uden at flytte noget. */
document.addEventListener('DOMContentLoaded', () => {
  const det = document.querySelector('.gd-toc-det');
  if (!det) return;
  const bred = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;
  const synk = () => { if (bred && bred.matches) det.open = true; };
  synk();
  if (bred && bred.addEventListener) bred.addEventListener('change', synk);
  const sum = det.querySelector('summary');
  if (sum) sum.addEventListener('click', e => { if (bred && bred.matches) e.preventDefault(); });
  const links = [...det.querySelectorAll('a[href^="#"]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const afsnit = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  const io = new IntersectionObserver(poster => {
    poster.forEach(p => {
      if (!p.isIntersecting) return;
      links.forEach(a => { if (a.getAttribute('href') === '#' + p.target.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    });
  }, { rootMargin: '-15% 0px -70% 0px' });
  afsnit.forEach(s => io.observe(s));
});
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof backendReady === 'function') await backendReady();
  if (typeof renderHeader === 'function') renderHeader(null);
});
