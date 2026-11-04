import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'services/**/*.test.ts', 'apps/web/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': process.cwd() + '/apps/web' },
  },
})
