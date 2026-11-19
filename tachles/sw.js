// Tachles service worker: app shell offline, API always from the network.
var V = "tachles-v3";
var SHELL = ["./", "index.html", "styles.css", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png",
  "js/content.js", "js/engine.js", "js/prompts.js", "js/store.js", "js/io.js", "js/ui.js", "js/tools.js", "js/talk.js", "js/sync.js", "js/main.js"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.indexOf("/api/") >= 0 || u.origin !== location.origin) return;
  // network first, so updates arrive; cache as fallback
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var c = r.clone(); caches.open(V).then(function (ca) { ca.put(e.request, c); }); }
    return r;
  }).catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match("index.html"); }); }));
});
