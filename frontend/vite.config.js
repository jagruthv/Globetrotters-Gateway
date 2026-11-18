import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Target modern browsers — smaller, faster output (no legacy polyfills)
    target: 'es2022',

    // Only generate sourcemaps in dev (don't expose source to prod users)
    sourcemap: false,

    // Chunk splitting — tourists never download admin/staff JS bundles
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('masterAtlasData')) {
            return 'chunk-atlas-data';
          }
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('html5-qrcode')) {
              return 'chunk-scanner';
            }
            if (id.includes('canvas-confetti')) {
              return 'chunk-confetti';
            }
          }
        },

        // Organized output directories
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Warn if any single chunk exceeds 500KB (helps catch bundle bloat)
    chunkSizeWarningLimit: 500,
  },
})

