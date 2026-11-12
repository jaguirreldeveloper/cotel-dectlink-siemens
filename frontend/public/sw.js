/**
 * Service Worker - COTEL DECTlink Siemens
 * Versión: 2.0 (Offline-First)
 * 
 * Estrategias implementadas:
 * - Cache-First para assets estáticos
 * - Network-First con fallback a cache para API
 * - Stale-While-Revalidate para datos críticos
 * - Sincronización en segundo plano al recuperar conexión
 */

// Nombres de cache
const CACHE_STATIC = 'cotel-static-v2';
const CACHE_API = 'cotel-api-v2';
const CACHE_RUNTIME = 'cotel-runtime-v1';

// Recursos estáticos para cachear (Cache-First)
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/manifest.json',
    '/assets/main-B0xhgRcy.css',
    '/assets/main-DFpjqz3l.js',
    '/assets/vendor-B3IQnQ6K.js',
    '/assets/leaflet-DV1VrHZB.js',
    '/assets/leaflet-vh-t_kPv.css',
];

// Patrones de API para cachear (Network-First con fallback)
const API_PATTERNS = [
    /^\/api\/subscribers/,
    /^\/api\/cells/,
    /^\/api\/zonas/,
    /^\/api\/clientes/,
    /^\/api\/centrales/,
    /^\/api\/subcentrales/,
    /^\/api\/shelters/,
    /^\/api\/armarios/,
    /^\/api\/work-orders/,
    /^\/api\/database\/status/,
    /^\/api\/database\/schema/,
    /^\/api\/infraestructura/,
];

// Datos críticos para Stale-While-Revalidate
const CRITICAL_API_PATTERNS = [
    /^\/api\/subscribers$/,  // Padrón completo
    /^\/api\/cells$/,         // Todas las celdas
];

// ============================================================================
// INSTALACIÓN
// ============================================================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installando Service Worker v2...');
    
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => {
                console.log('[SW] Cache de estáticos abierto, cacheando recursos...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Recursos estáticos cacheados');
                return self.skipWaiting(); // Forzar activación inmediata
            })
            .catch((error) => {
                console.error('[SW] Error al cachear recursos estáticos:', error);
            })
    );
});

// ============================================================================
// ACTIVACIÓN
// ============================================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activándose...');
    
    event.waitUntil(
        Promise.all([
            // Limpiar caches antiguos
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('cotel-') && name !== CACHE_STATIC && name !== CACHE_API)
                        .map((name) => caches.delete(name))
                );
            }),
            self.clients.claim() // Tomar control de todas las pestañas
        ])
        .then(() => {
            console.log('[SW] Service Worker activado y caches antiguos limpiados');
        })
    );
});

// ============================================================================
// FETCH
// ============================================================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Solo manejar GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // 1. Assets estáticos - Cache-First
    if (url.origin === self.location.origin && STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        console.log(`[SW] Sirviendo desde cache estático: ${url.pathname}`);
                        return response;
                    }
                    return fetchAndCache(event.request, CACHE_STATIC);
                })
        );
        return;
    }
    
    // 2. API requests - Network-First con fallback a cache
    if (API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
        event.respondWith(
            networkFirstWithCacheFallback(event.request, url.pathname)
        );
        return;
    }
    
    // 3. Datos críticos - Stale-While-Revalidate
    if (CRITICAL_API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
        event.respondWith(
            staleWhileRevalidate(event.request, url.pathname)
        );
        return;
    }
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Fetch y cachear en el cache especificado
 */
async function fetchAndCache(request, cacheName) {
    const response = await fetch(request);
    
    if (response.ok) {
        const responseClone = response.clone();
        caches.open(cacheName)
            .then((cache) => cache.put(request, responseClone))
            .catch((error) => {
                console.error(`[SW] Error al cachear ${request.url}:`, error);
            });
    }
    
    return response;
}

/**
 * Network-First con fallback a cache
 */
async function networkFirstWithCacheFallback(request, path) {
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            // Cachear respuesta exitosa
            const responseClone = response.clone();
            caches.open(CACHE_API)
                .then((cache) => cache.put(request, responseClone))
                .catch((error) => {
                    console.error(`[SW] Error al cachear API ${path}:`, error);
                });
            return response;
        }
        
        // Fallback a cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log(`[SW] Sirviendo desde cache API (fallback): ${path}`);
            return cachedResponse;
        }
        
        // Sin cache, devolver error
        return new Response(JSON.stringify({
            error: 'Offline - No hay datos cacheados disponibles',
            offline: true,
            url: path
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error(`[SW] Error en request API: ${path}`, error);
        
        // Fallback a cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log(`[SW] Sirviendo desde cache API (fallback offline): ${path}`);
            return cachedResponse;
        }
        
        return new Response(JSON.stringify({
            error: 'Offline - No se pudo conectar al servidor',
            offline: true,
            url: path
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale-While-Revalidate: devolver cache mientras se actualiza en segundo plano
 */
async function staleWhileRevalidate(request, path) {
    const cachedResponse = await caches.match(request);
    
    // Devolver cache inmediatamente si existe
    if (cachedResponse) {
        console.log(`[SW] Sirviendo desde cache (stale-while-revalidate): ${path}`);
        
        // Actualizar en segundo plano
        event.waitUntil(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_API)
                            .then((cache) => cache.put(request, response.clone()))
                            .then(() => {
                                console.log(`[SW] Cache actualizado en segundo plano: ${path}`);
                                // Notificar a las pestañas que hay datos nuevos
                                self.clients.matchAll({ type: 'window' }).then((clients) => {
                                    clients.forEach((client) => {
                                        client.postMessage({ type: 'DATA_REFRESHED', path });
                                    });
                                });
                            });
                    }
                    return response;
                })
                .catch((error) => {
                    console.error(`[SW] Error al actualizar cache en segundo plano: ${path}`, error);
                })
        );
        
        return cachedResponse;
    }
    
    // Si no hay cache, intentar fetch
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_API)
                .then((cache) => cache.put(request, responseClone));
        }
        
        return response;
    } catch (error) {
        console.error(`[SW] Error en stale-while-revalidate: ${path}`, error);
        
        return new Response(JSON.stringify({
            error: 'Offline - No hay datos disponibles',
            offline: true,
            url: path
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ============================================================================
// SINCRONIZACIÓN
// ============================================================================

/**
 * Sincronizar datos cacheados con el servidor cuando se recupera la conexión
 */
async function syncCachedData() {
    console.log('[SW] Sincronizando datos cacheados...');
    
    const apiCache = await caches.open(CACHE_API);
    const keys = await apiCache.keys();
    
    for (const request of keys) {
        const url = new URL(request.url);
        
        // Solo sincronizar endpoints POST/PUT/PATCH/DELETE no se cachean, así que no es necesario
        // Para datos que podrían haber cambiado, notificar al cliente
        if (API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    // Actualizar cache
                    await apiCache.put(request, response.clone());
                    console.log(`[SW] Datos sincronizados: ${url.pathname}`);
                }
            } catch (error) {
                console.error(`[SW] Error al sincronizar ${url.pathname}:`, error);
            }
        }
    }
    
    console.log('[SW] Sincronización completada');
}

// ============================================================================
// MENSAJES
// ============================================================================
self.addEventListener('message', (event) => {
    if (!event.data) return;
    
    switch (event.data.type) {
        case 'CLEAR_API_CACHE':
            caches.delete(CACHE_API)
                .then(() => console.log('[SW] Cache de API limpiado'))
                .catch((error) => console.error('[SW] Error al limpiar cache API:', error));
            break;
            
        case 'CLEAR_ALL_CACHE':
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('cotel-'))
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => console.log('[SW] Todos los caches limpiados'))
            .catch((error) => console.error('[SW] Error al limpiar caches:', error));
            break;
            
        case 'SYNC_DATA':
            self.clients.matchAll({ type: 'window' }).then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'SYNC_REQUESTED' });
                });
            });
            break;
    }
});

// ============================================================================
// EVENTOS ONLINE/OFFLINE
// ============================================================================
self.addEventListener('online', () => {
    console.log('[SW] Conexión recuperada');
    
    // Sincronizar datos en segundo plano
    event.waitUntil(syncCachedData());
    
    self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
            client.postMessage({ type: 'ONLINE' });
        });
    });
});

self.addEventListener('offline', () => {
    console.log('[SW] Conexión perdida');
    
    self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
            client.postMessage({ type: 'OFFLINE' });
        });
    });
});

// ============================================================================
// PUSH NOTIFICATIONS (Reservado para futuro)
// ============================================================================
// self.addEventListener('push', (event) => {
//     console.log('[SW] Push recibido:', event);
// });

console.log('[SW] Service Worker v2 cargado y listo');
