import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Source maps stay off so implementation details are not published.
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) expects a function here, not an object.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('react-router') || id.includes('react-dom')) return 'react';
          if (/node_modules[\\/]react[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
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
