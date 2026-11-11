/**
 * Service Worker para PWA - COTEL DECTlink
 * 
 * Este service worker proporciona:
 * - Caching de recursos estáticos para carga offline
 * - Cache de datos de la API para trabajo en campo sin conexión
 * - Sincronización automática al recuperar conexión
 */

// @ts-nocheck - Desactivar type checking para Service Worker

// Nombre del cache para recursos estáticos
const CACHE_NAME_STATIC = 'cotel-static-v1';
const CACHE_NAME_API = 'cotel-api-v1';

// Recursos estáticos a cachear
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  // Assets de Vite (se añadirán dinámicamente)
];

// Patrones de rutas de la API que se cachearán
const API_PATTERNS = [
  /^\/api\/subscribers/,
  /^\/api\/cells/,
  /^\/api\/work-orders/,
  /^\/api\/database\/status/,
];

// Tamaño máximo del cache de API (en número de requests)
const MAX_API_CACHE_SIZE = 50;

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC)
      .then((cache) => {
        console.log('[SW] Cache de estáticos abierto, cacheando recursos...');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Recursos estáticos cacheados');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error al cachear recursos estáticos:', error);
      })
  );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('cotel-') && name !== CACHE_NAME_STATIC && name !== CACHE_NAME_API)
            .map((name) => caches.delete(name))
        );
      }),
      self.clients.claim(),
    ])
      .then(() => {
        console.log('[SW] Service Worker activado y caches antiguos limpiados');
      })
  );
});

// Interceptar requests: estrategia de cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo manejar requests GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Requests de API: cache con estrategia Network-First
  if (API_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Recursos estáticos: cache con estrategia Cache-First
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            console.log(`[SW] Sirviendo desde cache: ${url.pathname}`);
            return response;
          }
          
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME_STATIC)
                  .then((cache) => cache.put(event.request, responseClone));
              }
              return response;
            })
            .catch(() => {
              return new Response(
                JSON.stringify({ error: 'Offline - Los datos no están disponibles', offline: true }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }
});

/**
 * Manejar requests de API con estrategia Network-First + Cache
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Primero intentar la red
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await caches.open(CACHE_NAME_API)
        .then((cache) => cache.put(request, responseClone));
      return networkResponse;
    }
    
    // Si falla la red, intentar el cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`[SW] Sirviendo desde cache API: ${url.pathname}`);
      return cachedResponse;
    }
    
    // No hay cache
    return new Response(
      JSON.stringify({ 
        error: 'Offline - No hay datos cacheados disponibles', 
        offline: true,
        url: url.pathname
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[SW] Error en request API: ${url.pathname}`, error);
    
    // Intentar el cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`[SW] Sirviendo desde cache API (fallback): ${url.pathname}`);
      return cachedResponse;
    }
    
    // No hay cache
    return new Response(
      JSON.stringify({ 
        error: 'Offline - No se pudo conectar al servidor', 
        offline: true,
        url: url.pathname
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_API_CACHE') {
    caches.delete(CACHE_NAME_API)
      .then(() => console.log('[SW] Cache de API limpiado'))
      .catch((error) => console.error('[SW] Error al limpiar cache API:', error));
  }
  
  if (event.data?.type === 'SYNC_DATA') {
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_REQUESTED' });
      });
    });
  }
});

// Escuchar cambios de conexión
self.addEventListener('online', () => {
  console.log('[SW] Conexión recuperada');
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
