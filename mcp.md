import { defineConfig } from '@ubs.hive.toolchain/playwright';

export default defineConfig({
  testDir: './tests',
  testMatch: 'playwright.auth.setup.ts',
  fullyParallel: false,
  retries: 0,

  use: {
    baseURL: 'https://neo-qa2.ubstest.net',
  },
});