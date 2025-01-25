import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { offlinePlugin } from './scripts/offline-plugin.ts';

// `base: './'` keeps asset URLs relative so the bundle loads from the
// Capacitor WebView (https://localhost/) as well as a static host.
export default defineConfig({
  base: './',
  plugins: [react(), offlinePlugin()],
  build: { outDir: 'web-dist', sourcemap: false, target: 'es2020' },
  server: { host: true, port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./scripts/vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
