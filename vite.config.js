import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue2'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.mjs', '.js', '.json', '.vue']
  },
  css: {
    preprocessorOptions: {
      scss: { silenceDeprecations: ['import', 'slash-div', 'global-builtin'] },
      sass: { silenceDeprecations: ['import', 'slash-div', 'global-builtin'] }
    }
  },
  server: {
    port: 8080
  },
  build: {
    target: 'es2020'
  }
})
