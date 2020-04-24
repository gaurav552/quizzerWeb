const PRE_CACHE = "precache-1.1"
const RUNTIME = 'runtime-1';

const CACHE_URL = [
    '/index.html',
    '/assets/bg1.png',
    '/script/script2.js',
    '/style/additional.css',
    '/style/style.css'
]

addEventListener('install', e => {
    e.waitUntil(
        caches.open(PRE_CACHE)
        .then(cache => cache.addAll(CACHE_URL))
        .then(skipWaiting()) //to be commented
    )
})

addEventListener("activate", e => {
    const curcache = [PRE_CACHE, RUNTIME]
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return cacheNames.filter(cacheName => !curcache.includes(cacheName))
        }).then(cacheToDelete => {
            return Promise.all(cacheToDelete.map(cacheToDelete => {
                return caches.delete(cacheToDelete)
            }))
        }).then(self.clients.claim()) //to be commented
    )
})

addEventListener("fetch", e => {
    if (e.request.url.startsWith(self.location.origin) || e.request.url.startsWith("https://opentdb.com/")) {
        e.respondWith(
            caches.match(e.request).then(cacheResponse => {
                if (cacheResponse) {
                    return cacheResponse
                }
                return caches.open(RUNTIME).then(cache => {
                    return fetch(e.request).then(response => {
                        return cache.put(e.request, response.clone()).then(() => {
                            return response;
                        })
                    })
                })
            })
        )
    }
})