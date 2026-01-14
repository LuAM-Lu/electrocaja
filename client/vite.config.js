import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// En producción no importamos 'fs' porque no leeremos certificados .pem
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Configuraciones de desarrollo (opcionales durante el build)
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000', // El puerto que configuramos en el backend
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist', // Carpeta donde se generará el build
    emptyOutDir: true,
  }
})