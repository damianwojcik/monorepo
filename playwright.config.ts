import { defineConfig, devices } from '@playwright/test';

/**
 * Root Playwright configuration for the monorepo.
 * Individual apps have their own configs for app-specific settings.
 */
export default defineConfig({
  testDir: './apps',
  specPattern: '**/tests/**/*.e2e.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: 'html',
  
  use: {
    baseURL: 'https://neo-qa2.ubstest.net',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: undefined,
});
