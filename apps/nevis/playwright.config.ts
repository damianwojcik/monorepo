import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the nevis app.
 * Inherits from root config but can override app-specific settings.
 */
export default defineConfig({
  testDir: './tests',
  specPattern: '**/*.e2e.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: undefined,
});
