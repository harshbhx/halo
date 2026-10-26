// Reading settings before first paint, so the theme and text size never flash.
// A separate file (not inline) so the strict Content-Security-Policy allows it.
try {
  var s = JSON.parse(localStorage.getItem('fw.settings') || '{}');
  var r = document.documentElement;
  if (s.theme === 'light' || s.theme === 'dark') r.setAttribute('data-mode', s.theme);
  if (s.bigText) r.setAttribute('data-big-text', '');
  if (s.highContrast) r.setAttribute('data-high-contrast', '');
} catch (e) {}
