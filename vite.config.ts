/// <reference types="vitest/config" />
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Serve /fares/*.json in dev and copy fares/ into dist/fares on build, so
 *  the app can check fares/manifest.json for newer data (FR-16). */
function faresDir(): Plugin {
  const dir = join(__dirname, 'fares')
  return {
    name: 'pamasahe-fares-dir',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith('/fares/') || extname(url) !== '.json') return next()
        const file = join(dir, url.slice('/fares/'.length))
        if (!existsSync(file)) return next()
        res.setHeader('Content-Type', 'application/json')
        res.end(readFileSync(file))
      })
    },
    closeBundle() {
      const out = join(__dirname, 'dist', 'fares')
      mkdirSync(out, { recursive: true })
      cpSync(dir, out, { recursive: true })
    },
  }
}

export default defineConfig({
  // Set BASE_PATH=/repo-name/ when deploying to a GitHub Pages project site.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    faresDir(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'logo-mark.svg', 'busway-mark.svg', 'train-mark.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Magkano Pamasahe — LTFRB Fare Checker',
        short_name: 'Magkano Pamasahe',
        description: 'Check the official LTFRB fare for jeepney, UV Express, bus, EDSA Busway, taxi and TNVS.',
        theme_color: '#0b3d91',
        background_color: '#f8fafc',
        display: 'standalone',
        lang: 'en',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/fares/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fares' },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'tile.openstreetmap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: {
    // Vercel sets VERCEL=1 in its build environment; the GitHub Pages build
    // and local dev do not. Gates the Web Analytics script (src/main.tsx).
    __VERCEL__: JSON.stringify(process.env.VERCEL === '1'),
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
