import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        // Suppress the deprecated esbuild/jsx warning from plugin-react
        babelrc: false,
        configFile: false,
      },
    }),
  ],
  // Suppress optimizeDeps.rollupOptions deprecation warning
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
