import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

// https://vite.dev/config/
// PAGES_BASE is set by the build:pages / preview:pages scripts so the GitHub
// Pages build (served under /asm-8086-sim/) and the matching local preview
// agree; unset (Vercel, dev, vitest) keeps the root base.
const base = process.env.PAGES_BASE ?? '/'

// Second XSS layer behind the lesson-HTML sanitizer: a CSP meta tag on the
// BUILT page only. Dev stays unrestricted so Vite HMR websockets keep working.
// 'unsafe-inline' in style-src covers CodeMirror's injected <style> elements
// and React's inline style attributes; the two Google Fonts origins are the
// only external resources the page loads.
function cspMeta(): Plugin {
  // base-uri and form-action do NOT fall back to default-src, so they have to
  // be stated. frame-ancestors cannot be set from a meta tag at all — that one
  // is carried by vercel.json, which is the only target here that can send
  // real headers. 'self' in font-src so a future self-hosted face is not
  // silently blocked.
  const policy =
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "object-src 'none'"
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`)
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), cspMeta()],
  test: {
    coverage: {
      include: ['src'],
      exclude: ['src/data/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})
