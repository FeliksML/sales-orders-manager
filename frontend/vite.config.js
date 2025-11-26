import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VitePWA TEMPORARILY DISABLED - Service Worker was causing Mixed Content errors
// by caching HTTP URLs. Will re-enable once the issue is resolved.
// The full PWA config is saved in vite.config.pwa-backup.js

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
