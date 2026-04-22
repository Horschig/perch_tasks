import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:1420',
    browserName: 'chromium',
    headless: true,
    viewport: { width: 900, height: 640 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    port: 1420,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});