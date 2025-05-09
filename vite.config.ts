import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
  },
  assetsInclude: ['**/*.ttf'],
  build: {
    assetsInlineLimit: 0,
  },
}); 