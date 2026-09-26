import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Unique per build; the running app compares it with `version.json` to detect a new deploy. */
const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Emits `version.json` next to `index.html` so open tabs can notice a newer build. */
function buildVersionPlugin(): Plugin {
  return {
    name: 'ag-go-build-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId, builtAt: new Date().toISOString() }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildVersionPlugin()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/pro-components'],
          'query-vendor': ['@tanstack/react-query'],
          'auth-vendor': ['@auth0/auth0-react'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
