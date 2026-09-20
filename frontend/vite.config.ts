/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api is proxied to Django so the browser sees one origin (no CORS needed).
// 127.0.0.1, not "localhost": Node can resolve localhost to IPv6 (::1) while Django's dev server listens on IPv4 only,
// which makes every proxied request fail with ECONNREFUSED.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true, exclude: ['e2e/**', 'node_modules/**'] },
})
