// Service Worker for Bruneau Devis PWA
const CACHE_NAME = 'bruneau-devis-v2';

// Installation immédiate
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    self.skipWaiting();
});

// Prise de contrôle immédiate
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API/Supabase requests
    const url = new URL(event.request.url);
    if (url.hostname.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.ok && url.origin === self.location.origin) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // For navigation requests, return index.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Réception des push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    let data = { title: 'Bruneau Devis', body: '', icon: '/devis-android-chrome-512x512.png', tag: 'devis-notification' };
    try {
        if (event.data) {
            const json = event.data.json();
            data = { ...data, ...json };
        }
    } catch (e) {
        console.error('[SW] Error parsing push data:', e);
        data.body = event.data?.text() || 'Nouvelle notification';
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body || 'Vous avez une nouvelle notification',
            icon: data.icon || '/devis-android-chrome-512x512.png',
            badge: '/devis-android-chrome-512x512.png',
            tag: data.tag || 'devis-notification',
            requireInteraction: true,  // IMPORTANT : reste affiché jusqu'au clic
            renotify: true,
            vibrate: [200, 100, 200],
            data: {
                url: data.url || '/',
                type: data.type || 'general'
            }
        })
    );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Try to focus an existing window
            for (const client of clients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Open a new window
            return self.clients.openWindow(url);
        })
    );
});
