/*
 * Service worker for the admin panel.
 *
 * Deliberately conservative about caching. This is an operations tool where a
 * stale booking list or a stale payment queue is worse than a slow one, so
 * every API request goes to the network and is never cached. Only the static
 * shell is cached, and even that is revalidated in the background.
 */

/*
 * OneSignal's worker is a single importScripts line, so it is merged in here
 * rather than registered separately. A scope can hold only one service worker
 * registration: registering theirs at "/" would silently replace this one and
 * take the offline banner, the install prompt and the shell cache with it.
 */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")

const VERSION = "v3"
const SHELL = `shell-${VERSION}`
const SHELL_ASSETS = ["/icon-192.png", "/icon-512.png", "/manifest.webmanifest"]

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", event => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never serve business data from a cache, and never cache the event stream.
  if (url.pathname.startsWith("/api/")) return

  const cacheFirst = response => {
    if (response.ok && response.type === "basic") {
      const copy = response.clone()
      caches.open(SHELL).then(cache => cache.put(request, copy))
    }
    return response
  }

  /*
   * The page itself always comes from the network.
   *
   * It was cached first and refreshed underneath, which meant a deploy stayed
   * invisible until a second reload — and worse, a cached page names build
   * assets by hash, so an old page could ask for chunks the new release no
   * longer has and fail to start at all. The cache is kept only as the offline
   * fallback, which is what it is for.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(cacheFirst).catch(() => caches.match(request).then(cached => cached || caches.match("/"))),
    )
    return
  }

  /*
   * Build assets are safe to serve from the cache without checking, because
   * their filenames contain a hash of their contents: a changed file is a
   * different URL, so a cached one can never be out of date.
   */
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(cacheFirst)))
    return
  }

  // Everything else — icons, the manifest — cached for speed, refreshed after.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(cacheFirst).catch(() => cached)
      return cached || network
    }),
  )
})

/* Web Push. Nothing is sent yet; the handler is here so a subscription works
   the moment a push key is configured. */
self.addEventListener("push", event => {
  let payload = { title: "Oman Adventures", body: "You have a new notification" }
  let raw = null
  try {
    if (event.data) raw = event.data.json()
  } catch {
    if (event.data) payload.body = event.data.text()
  }

  // OneSignal's own handler already shows its notifications. Without this the
  // agent would get two of everything — theirs and ours.
  if (raw && (raw.custom || raw.o || raw.alert !== undefined)) return

  if (raw) payload = { ...payload, ...raw }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || "wptour-push",
      renotify: true,
      data: { url: payload.url || "/whatsapp" },
    }),
  )
})

self.addEventListener("notificationclick", event => {
  event.notification.close()
  const target = event.notification.data?.url || "/whatsapp"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      // Focus an existing tab rather than opening a second copy of the panel.
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
