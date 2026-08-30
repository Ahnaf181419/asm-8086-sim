import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// PAGES_BASE is set by the build:pages / preview:pages scripts so the GitHub
// Pages build (served under /asm-lab-prep/) and the matching local preview
// agree; unset (Vercel, dev, vitest) keeps the root base.
const base = process.env.PAGES_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
})
