/* eslint-disable no-restricted-globals */

// Evento de instalación
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando Service Worker...');
    self.skipWaiting();
});

// Evento de activación
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Service Worker activado.');
});

// Manejar notificaciones push recibidas
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Notificación Push recibida.');

    let data = { title: 'Nuevo Recordatorio', body: 'Tienes un mensaje pendiente.' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: 'Nuevo Recordatorio', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: data.url || '/', // Guardamos la URL para el click
        vibrate: [100, 50, 100],
        actions: [
            { action: 'open', title: 'Ver Detalles' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Click en notificación detectado.');
    event.notification.close();

    const targetUrl = event.notification.data;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Si ya hay una ventana abierta, navegar en ella
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
