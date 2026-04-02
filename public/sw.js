// public/sw.js
const CACHE_NAME = 'modaltech-pwa-v1'

// páginas básicas para cachear na instalação (ajuste se quiser)
const URLS_TO_CACHE = ['/', '/login']

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE)
        }),
    )
})

// limpa caches antigos quando você mudar o CACHE_NAME
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            ),
        ),
    )
})

// network-first para GET do mesmo domínio, com fallback para cache
self.addEventListener('fetch', (event) => {
    const { request } = event

    // só GET e só requisições do mesmo origin (não mexe em Supabase, etc)
    if (
        request.method !== 'GET' ||
        !request.url.startsWith(self.location.origin)
    ) {
        return
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                const copy = response.clone()
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, copy)
                })
                return response
            })
            .catch(() => caches.match(request)),
    )
})
