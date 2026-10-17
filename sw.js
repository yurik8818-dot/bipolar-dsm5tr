// Офлайн-режим: приложение и иконки кешируются при установке, шрифты кешируются при первом открытии с интернетом.
const VERSION = 'v1';
const APP_CACHE = 'bipolar-app-' + VERSION;
const FONT_CACHE = 'bipolar-fonts-' + VERSION;
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== APP_CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Шрифты Google: из кеша, в фоне обновляем
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Своё приложение: сначала сеть (чтобы получать обновления), без сети из кеша
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(r => { if (r.ok) { const copy = r.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); } return r; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  }
});
