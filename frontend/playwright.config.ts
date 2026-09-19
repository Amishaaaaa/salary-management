import { defineConfig } from '@playwright/test'

// Runs against a live stack: Django on :8000 (seeded) and the Vite dev server on :5173.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173' },
  reporter: 'list',
})
