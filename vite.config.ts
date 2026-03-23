import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    allowedHosts: true,  // allows ngrok and any other tunnel
    proxy: {
      '/api': {
        target: 'http://192.168.18.10:8080',
        changeOrigin: true,
      },
    },
  },
})