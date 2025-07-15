import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            store: ['zustand']
          }
        }
      },
      target: 'es2015',
      chunkSizeWarningLimit: 1000
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8000'),
      'process.env.VITE_APP_TITLE': JSON.stringify(env.VITE_APP_TITLE || 'Reddit Forum'),
      'process.env.VITE_ENVIRONMENT': JSON.stringify(mode)
    },
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  }
})