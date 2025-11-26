import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: 'index.html'
    }
  },
  server: {
    port: 3000,
    open: true,
    host: true, // Allow external access
    https: true // Enable HTTPS with self-signed certificate
  }
});
