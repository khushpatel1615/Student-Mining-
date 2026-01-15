const CACHE_NAME = 'sdm-cache-v1';
const STATIC_CACHE = 'sdm-static-v1';
const DYNAMIC_CACHE = 'sdm-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls - always network
    if (url.pathname.includes('/api/')) {
        return;
    }

    // For navigation requests, use network-first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache the response
                    const clone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    // Fallback to cache or offline page
                    return caches.match(request)
                        .then(cached => cached || caches.match('/offline.html'));
                })
        );
        return;
    }

    // For static assets, use cache-first
    if (request.destination === 'image' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font') {
        event.respondWith(
            caches.match(request)
                .then(cached => {
                    if (cached) return cached;

                    return fetch(request)
                        .then(response => {
                            const clone = response.clone();
                            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
                            return response;
                        });
                })
        );
        return;
    }

    // Default: network first
    event.respondWith(
        fetch(request)
            .then(response => {
                const clone = response.clone();
                caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
                return response;
            })
            .catch(() => caches.match(request))
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-attendance') {
        event.waitUntil(syncAttendance());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');
    const data = event.data?.json() || {
        title: 'Student Portal',
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: data.url || '/',
            actions: [
                { action: 'open', title: 'View' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        })
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(clientList => {
                // If a window is already open, focus it
                for (const client of clientList) {
                    if (client.url === event.notification.data && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data);
                }
            })
    );
});

// Helper function for syncing attendance
async function syncAttendance() {
    try {
        const db = await openDB();
        const pendingAttendance = await db.getAll('pending-attendance');

        for (const record of pendingAttendance) {
            try {
                await fetch('/api/attendance.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
                await db.delete('pending-attendance', record.id);
            } catch (err) {
                console.log('[SW] Sync failed for record:', record.id);
            }
        }
    } catch (err) {
        console.log('[SW] Sync error:', err);
    }
}
