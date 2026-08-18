import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron',
      rollupOptions: { input: 'src/main.ts' }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron',
      emptyOutDir: false,
      rollupOptions: { input: 'src/preload.ts' }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      outDir: 'dist-electron/renderer',
      emptyOutDir: false,
      rollupOptions: {
        input: 'src/renderer/index.html'
      }
    }
  }
});
