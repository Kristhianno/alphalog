import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

/**
 * Landing do Repdrive (public/lp): troca /styles.css e /main.js por /styles.css?v=<hash> nas
 * páginas geradas, para o navegador nunca misturar HTML novo com CSS/JS antigos em cache.
 */
function versionLandingAssets(): Plugin {
  return {
    name: 'version-landing-assets',
    apply: 'build',
    closeBundle() {
      const dir = path.resolve(import.meta.dirname, 'dist/lp')
      const version = (file: string) => createHash('md5').update(readFileSync(path.join(dir, file))).digest('hex').slice(0, 10)
      const v = { css: version('styles.css'), js: version('main.js') }
      for (const page of ['index.html', 'privacidade.html']) {
        const file = path.join(dir, page)
        const html = readFileSync(file, 'utf8')
          .replaceAll('href="/styles.css"', `href="/styles.css?v=${v.css}"`)
          .replaceAll('src="/main.js"', `src="/main.js?v=${v.js}"`)
        writeFileSync(file, html)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    versionLandingAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'AlphaLog | Gestão Logística',
        short_name: 'AlphaLog',
        description: 'Gestão de solicitações, motoristas, veículos e frota da AlphaLog.',
        theme_color: '#2691d7',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // landing do Repdrive (servida só em www.repdrive.com.br) fica fora do cache do app
        globIgnores: ['lp/**'],
        navigateFallbackDenylist: [/^\/lp\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})