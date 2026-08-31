import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config — proxies /api/* to the Express backend so the
// browser can call /api/chat without CORS hassle during dev.
export default defineConfig({
  plugins: [react()],
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
