// Service worker do app Buntech: deixa o app abrir sem sinal.
// - arquivos estáticos (_next/static, mapa, marca, dados): cache primeiro
// - páginas: rede primeiro; sem sinal usa a última versão vista ou a tela /offline
// Dados do Supabase NUNCA passam por aqui (ficam no IndexedDB, ver src/lib/offline).
const VERSAO = "v1";
const ESTATICO = `estatico-${VERSAO}`;
const PAGINAS = `paginas-${VERSAO}`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGINAS).then((c) => c.add("/offline")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => ![ESTATICO, PAGINAS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (/^\/(_next\/static|maplibre|brand|data)\//.test(url.pathname) || /\.(png|ico|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(ESTATICO).then((c) => c.put(req, copia)); }
        return r;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && !r.redirected) { const copia = r.clone(); caches.open(PAGINAS).then((c) => c.put(req, copia)); }
          return r;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline")) || Response.error()),
    );
  }
});
