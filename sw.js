// Service worker: เก็บไฟล์แอปไว้ในเครื่องเพื่อเปิดใช้ได้ขณะออฟไลน์
// ไฟล์ของแอป: เครือข่ายก่อน (ได้เวอร์ชันใหม่เสมอเมื่อออนไลน์)  · gstatic/ฟอนต์: ใช้ของในเครื่องแล้วอัปเดตเบื้องหลัง
const VERSION = '2026.10.28-0731';
const SHELL = ['./', 'index.html', 'app.js', 'styles.css', 'firebase-config.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo-96.png', 'icons/logo-256.png', 'icons/favicon-64.png', 'icons/apple-touch-icon-180.png', 'icons/maskable-512.png',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css',
  'vendor/leaflet/images/marker-icon.png', 'vendor/leaflet/images/marker-icon-2x.png', 'vendor/leaflet/images/marker-shadow.png'];
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const FB_FILES = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => FB + f);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(async c => {
    await c.addAll(SHELL);
    await Promise.all(FB_FILES.map(u => c.add(u).catch(() => null)));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
    return;
  }
  const swr = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')
    || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!swr) return; // ฐานข้อมูล/ล็อกอิน/แผนที่ ไม่ผ่าน service worker
  e.respondWith(caches.open(VERSION).then(async c => {
    const cached = await c.match(req);
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
    return cached || (await net) || Response.error();
  }));
});
