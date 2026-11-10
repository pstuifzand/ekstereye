import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue2'

// The reader has no test harness worth the name: these cover the modules that carry
// the most risk (feed HTML, entry classification, timestamps, the mark-read queue, the
// store mutations) rather than the components that the browser probe already exercises.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.mjs', '.js', '.json', '.vue']
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true
  }
})
