import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sent as appVersion in every secure-gateway request header (src/api/gateway.js).
  define: { __APP_VERSION__: JSON.stringify(version) },
})
