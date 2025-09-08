import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'localhost+2-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost+2.pem'))
    },
    host: true,
    port: 5173,
    proxy: {
  '/api': {
    target: 'https://localhost:3001',  // ← Cambiar a puerto 3000
    changeOrigin: true,
    secure: false,  // ← Permitir certificados auto-firmados
    configure: (proxy, options) => {
      proxy.on('error', (err, req, res) => {
        console.log('proxy error', err);
      });
      proxy.on('proxyReq', (proxyReq, req, res) => {
        console.log('Sending Request to the Target:', req.method, req.url);
      });
      proxy.on('proxyRes', (proxyRes, req, res) => {
        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
      });
    }
  }
}
  }
})