import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    environmentMatchGlobs: [
      ['src/__tests__/components/**', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**',
        'src/app/api/**',
        'src/components/ui/**',
      ],
      exclude: [
        'src/__tests__/**',
        'src/app/api/auth/[...nextauth]/**',
        'src/app/api/notifications/stream/**',
        'src/app/api/tickets/[id]/pdf/**',
        '**/*.d.ts',
      ],
      thresholds: {
        lines:     70,
        functions: 70,
        branches:  60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
