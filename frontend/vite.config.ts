/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api is proxied to Django so the browser sees one origin (no CORS needed).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true },
})
