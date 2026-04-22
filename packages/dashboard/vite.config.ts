import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
      components: resolve(__dirname, 'src/components'),
      layouts: resolve(__dirname, 'src/layouts'),
      pages: resolve(__dirname, 'src/pages'),
      stores: resolve(__dirname, 'src/stores'),
      assets: resolve(__dirname, 'src/assets'),
    },
  },
  build: {
    outDir: 'dist/spa',
    target: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
  },
  server: {
    open: true,
  },
})
