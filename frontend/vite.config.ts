import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all interfaces for Docker
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Enable code splitting and optimization
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for React ecosystem
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // Maps chunk for Google Maps related code
          if (id.includes('@googlemaps') || id.includes('google-maps')) {
            return 'maps';
          }
          
          // Query chunk for React Query and related
          if (id.includes('@tanstack/react-query') || id.includes('react-query')) {
            return 'query';
          }
          
          // State management chunk
          if (id.includes('zustand') || id.includes('state')) {
            return 'state';
          }
          
          // UI/Styling chunk
          if (id.includes('tailwind') || id.includes('css') || id.includes('style')) {
            return 'ui';
          }
          
          // Utilities chunk for smaller libraries
          if (id.includes('node_modules') && 
              (id.includes('lodash') || id.includes('date-fns') || id.includes('uuid'))) {
            return 'utils';
          }
          
          // Large vendor libraries get their own chunks
          if (id.includes('node_modules')) {
            const chunks = ['react-vendor', 'maps', 'query', 'state', 'ui', 'utils'];
            const packageName = id.split('node_modules/')[1]?.split('/')[0];
            
            // Group smaller packages together
            if (packageName && !chunks.some(chunk => id.includes(chunk))) {
              return 'vendor';
            }
          }
        },
        // Optimize chunk file names with better hashing
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || 'chunk';
          return `assets/${name}-[hash].js`;
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `assets/styles/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    // Optimize bundle size with advanced settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Fix Safari 10 issues
      },
      format: {
        comments: false, // Remove comments
      }
    },
    // Set chunk size warning limit (increased for better performance)
    chunkSizeWarningLimit: 800,
    // Enable source maps for debugging (only in development)
    sourcemap: process.env.NODE_ENV === 'development',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize CSS
    cssMinify: true,
    // Report compressed size
    reportCompressedSize: true,
    // Optimize for production
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'zustand'
    ],
    exclude: [
      '@googlemaps/react-wrapper' // Load Google Maps dynamically
    ]
  },
  // Define environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})