import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Precache only our static application, never user data or third-party requests.
export function offlinePlugin(): Plugin {
  return {
    name: 'delivr-offline',
    apply: 'build',
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle);
      const collect = (dir: string, prefix = ''): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? collect(join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]);
      const publicAssets = collect('public');
      const urls = ['index.html', ...assets.filter(a => a !== 'index.html'), ...publicAssets].map(a => `./${a}`);
      const hash = createHash('sha256').update(JSON.stringify(urls));
      publicAssets.forEach(asset => hash.update(readFileSync(join('public', asset))));
      const version = hash.digest('hex').slice(0, 12);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'delivr-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('delivr-') && k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL('./index.html', self.registration.scope))));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
` });
    },
  };
}
