/* =====================================================================
   Service worker — só a "casca" do app (html, css, js, fontes, logo).
   Estratégia: REDE PRIMEIRO, cache como reserva.
   Por quê: com cache primeiro, uma correção publicada no GitHub Pages
   demoraria a aparecer — e pior, um config.js antigo continuaria valendo.
   Dados de roteiro nunca passam por aqui: vêm sempre do Supabase.
   ===================================================================== */

const CACHE = 'roteiros-b7-v3';
const CASCA = [
  './', './index.html',
  './styles/global.css', './styles/dashboard.css', './styles/editor.css', './styles/print.css',
  './js/vendor-supabase.js', './js/supabase.js', './js/database.js', './js/ui.js',
  './js/autosave.js', './js/print.js', './js/dashboard.js', './js/editor.js',
  './js/backup.js', './js/app.js',
  './assets/brand/logo-color.png', './assets/brand/logo-white.png',
  './assets/brand/symbol-color.png', './assets/brand/symbol-white.png',
  './assets/fonts/inter-400.woff2', './assets/fonts/inter-500.woff2',
  './assets/fonts/inter-600.woff2', './assets/fonts/inter-700.woff2',
  './assets/fonts/archivo-700.woff2', './assets/fonts/archivo-800.woff2', './assets/fonts/archivo-900.woff2',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/favicon.png',
  './manifest.json'
];
/* config.js fica de fora de propósito: é o arquivo que você edita e não
   pode, em hipótese alguma, ficar preso numa versão antiga. */

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(CASCA.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(ns => Promise.all(ns.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;  // Supabase vai direto à rede
  if (url.pathname.endsWith('/js/config.js')) return;                              // sempre fresco

  ev.respondWith(
    fetch(ev.request).then(resp => {
      const copia = resp.clone();
      caches.open(CACHE).then(c => c.put(ev.request, copia)).catch(() => {});
      return resp;
    }).catch(() =>
      caches.match(ev.request).then(c => c || caches.match('./index.html'))
    )
  );
});
