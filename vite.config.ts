import { defineConfig } from 'vite';

const buildVersion = Date.now().toString();
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy libs to improve initial load
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          react: ['react', 'react-dom']
        }
      }
    }
  }
});
