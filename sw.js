/* ============================================================
   SheetFin — Service Worker
   - Navegação: rede primeiro (3,5 s) com fallback para o cache
   - Arquivos do app: cache + atualização em segundo plano
   - NUNCA intercepta chamadas ao Apps Script (outra origem): dados sempre vão à rede
   Ao publicar uma nova versão: altere VERSAO aqui e o ?v= no index.html.
   ============================================================ */
const VERSAO = '2026.11.18.2';
const CACHE = 'sheetfin-' + VERSAO;
const ESCOPO = self.registration.scope;
const SHELL = [
  'index.html',
  'sheetfin.css?v=' + VERSAO,
  'config.js?v=' + VERSAO,
  'api.js?v=' + VERSAO,
  'apoie.js?v=' + VERSAO,
  'app.js?v=' + VERSAO,
  'login.js?v=' + VERSAO,
  'pwa.js?v=' + VERSAO,
  'logo-login.webp',
  'logo-menu.jpg',
  'icon-192.png',
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
