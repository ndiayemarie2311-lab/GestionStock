const CACHE_NAME    = 'stockpro-v1';
const CACHE_STATIC  = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/responsive.css',
  '/js/config.js',
  '/js/state.js',
  '/js/auth.js',
  '/js/utils.js',
  '/js/render.js',
  '/js/app.js'
];

// Installation — mise en cache des fichiers statiques
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('StockPro SW: Cache installé');
      return cache.addAll(CACHE_STATIC);
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stratégie Network First
self.addEventListener('fetch', e => {
  // Ignorer les requêtes Supabase et externes
  if (
    e.request.url.includes('supabase.co') ||
    e.request.url.includes('googleapis') ||
    e.request.url.includes('jsdelivr') ||
    e.request.url.includes('emailjs')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Mettre en cache la réponse
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, clone);
        });
        return response;
      })
      .catch(() => {
        // En cas d'erreur réseau, utiliser le cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Page offline par défaut
          return caches.match('/index.html');
        });
      })
  );
});

// Message pour mettre à jour le cache
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});