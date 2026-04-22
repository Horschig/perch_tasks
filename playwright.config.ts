import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/browser',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    url: 'http://127.0.0.1:4173/toolbar-harness.html',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});