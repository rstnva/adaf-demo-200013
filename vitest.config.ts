import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/wsp',
      reporter: ['text','lcov'],
      all: true,
      include: [
        'src/lib/wsp/adapters/**',
        'src/lib/wsp/cache/**',
        'src/lib/wsp/norm/**',
        'src/lib/wsp/schemas/**',
        'src/components/dashboard/wsp/utils/**',
        'src/metrics/wsp.metrics.ts'
      ],
      thresholds: { lines: 75, functions: 75, branches: 70, statements: 75 },
    },
  },
})
