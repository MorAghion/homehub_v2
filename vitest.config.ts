import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // Exclude Playwright E2E specs — run via `playwright test`, not Vitest
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/hubs/tasks/**/*.tsx'],
      exclude: ['src/lib/**/*.test.ts', 'src/components/hubs/tasks/**/*.test.tsx'],
    },
  },
})
