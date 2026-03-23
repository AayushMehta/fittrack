import { defineConfig, devices } from '@playwright/test'

const testDbUrl = 'postgresql://user:password@localhost:5432/fittrack_test'
const E2E_PORT = 3001
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 4 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: 'html',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `DATABASE_URL="${testDbUrl}" AUTH_URL="${E2E_BASE_URL}" pnpm dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: !!process.env.REUSE_E2E_SERVER,
    timeout: 120000,
  },
})
