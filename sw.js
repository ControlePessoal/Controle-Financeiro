/* ============================================================
   SheetFin — Service Worker
   - Navegação: rede primeiro (3,5 s) com fallback para o cache
   - Arquivos do app: cache + atualização em segundo plano
   - NUNCA intercepta chamadas ao Apps Script (outra origem): dados sempre vão à rede
   Ao publicar uma nova versão: altere VERSAO aqui e o ?v= no index.html.
   ============================================================ */
const VERSAO = '2026.11.18.1';
const CACHE = 'sheetfin-' + VERSAO;
const ESCOPO = self.registration.scope;
const SHELL = [
  'index.html',
  'css/sheetfin.css?v=' + VERSAO,
  'js/config.js?v=' + VERSAO,
  'js/api.js?v=' + VERSAO,
  'js/apoie.js?v=' + VERSAO,
  'js/app.js?v=' + VERSAO,
  'js/login.js?v=' + VERSAO,
  'js/pwa.js?v=' + VERSAO,
  'assets/logo-login.webp',
  'assets/logo-menu.jpg',
  'assets/icon-192.png',
  'manifest.json'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // best-effort: um arquivo ausente não pode impedir a instalação
      Promise.allSettled(SHELL.map((u) => cache.add(new Request(new URL(u, ESCOPO).href, { cache: 'reload' }))))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function comTimeout(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promessa.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Apps Script, Google Fonts: direto na rede

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const resp = await comTimeout(fetch(req), 3500);
        if (resp && resp.ok) cache.put(req, resp.clone());
        return resp;
      } catch (e) {
        return (await cache.match(req, { ignoreSearch: true })) ||
               (await cache.match(new URL('index.html', ESCOPO).href)) ||
               Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const emCache = await cache.match(req);
    const rede = fetch(req).then((resp) => {
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    }).catch(() => null);
    return emCache || (await rede) || Response.error();
  })());
});
