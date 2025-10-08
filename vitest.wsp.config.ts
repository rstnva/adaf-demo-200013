import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Focused Vitest config for WallStreet Pulse (WSP) only
// - Runs only tests matching tests/wsp.*.test.ts
// - Uses Node environment (MSW server intercepts fetch reliably)
// - Keeps coverage scoped to WSP code paths
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['tests/wsp.*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/wsp',
      reporter: ['text', 'lcov'],
      all: true,
      include: [
        'src/lib/wsp/**',
        'src/app/api/wsp/**',
        'src/metrics/wsp.metrics.ts',
        'src/types/wsp.d.ts',
      ],
      exclude: [
        'src/app/api/wsp/calendar/route.ts',
        'src/app/api/wsp/ratesfx/route.ts',
        'src/app/api/wsp/indices/route.ts',
        'src/app/api/wsp/events/route.ts',
        'src/app/api/wsp/events/cooldown/route.ts',
        'src/app/api/wsp/wsps/route.ts',
      ],
      thresholds: { lines: 75, functions: 75, branches: 60, statements: 75 },
    },
  },
})
