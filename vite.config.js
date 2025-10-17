import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Use 'esbuild' for minification to avoid an additional dependency ('terser') and achieve faster build times.
    // Use 'esbuild' for minification to avoid an additional dependency ('terser') and achieve faster build times.
    minify: 'esbuild'
  }
})
