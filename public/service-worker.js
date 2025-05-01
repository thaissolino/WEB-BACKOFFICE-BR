// Nome do cache
const CACHE_NAME = 'black-rabbit-cache';

// Evento de instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalado');
  
  // Não precisamos fazer nada de específico durante a instalação
  // Apenas aguardamos a ativação
  self.skipWaiting(); // Força a ativação imediata do Service Worker
});

// Evento de ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado');
  
  // Ao ativar, limpar todos os caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Exclui todos os caches, independentemente do nome
          console.log(`Service Worker: Limpando cache ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Evento de interceptação de requisições (fetch)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request) // Faz uma nova requisição de rede sempre
  );
});
