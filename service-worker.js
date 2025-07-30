// service-worker.js
const CACHE_NAME = 'renalcare-pwa-cache-v4'; // Mantener la versión para no invalidar el caché si no es necesario
const urlsToCache = [
    '/',
    'https://johnbeta1977.github.io/renal001/index.html',
    'https://johnbeta1977.github.io/renal001/app.js',
    'https://johnbeta1977.github.io/renal001/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    // Rutas de imágenes ahora directamente en /image/
    'https://johnbeta1977.github.io/renal001/image/bg.jpg',
    'https://johnbeta1977.github.io/renal001/image/logo.png',
    'https://johnbeta1977.github.io/renal001/image/icon-72x72.png',
    'https://johnbeta1977.github.io/renal001/image/icon-96x96.png',
    'https://johnbeta1977.github.io/renal001/image/icon-128x128.png',
    'https://johnbeta1977.github.io/renal001/image/icon-144x144.png',
    'https://johnbeta1977.github.io/renal001/image/icon-152x152.png',
    'https://johnbeta1977.github.io/renal001/image/icon-192x192.png',
    'https://johnbeta1977.github.io/renal001/image/icon-384x384.png',
    'https://johnbeta1977.github.io/renal001/image/icon-512x512.png'
];

// Evento de instalación: Cacha los recursos estáticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cacheando archivos estáticos');
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento de activación: Limpia cachés antiguos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando caché antiguo', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Evento de fetch: Sirve recursos desde la caché o la red
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si el recurso está en caché, lo devuelve
                if (response) {
                    return response;
                }
                // Si no, intenta obtenerlo de la red
                return fetch(event.request).then(
                    response => {
                        // Si la respuesta de la red es válida, la clona y la guarda en caché
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});
