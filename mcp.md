import { test as setup } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {

  await page.goto('/axion');

  // login flow
  await page.fill('#user', process.env.USER!);
  await page.fill('#password', process.env.PASSWORD!);
  await page.click('button[type=submit]');

  await page.waitForURL('**/axion**');

  await page.context().storageState({ path: authFile });
});



import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({

  testDir: './tests',

  use: {
    storageState: path.resolve(__dirname, '../../.auth/user.json')
  }

});





import fs from "fs";
import { execSync } from "child_process";

const authFile = ".auth/user.json";

if (!fs.existsSync(authFile)) {
  console.log("Auth file missing → running Playwright auth setup...");
  execSync("npx playwright test playwright.auth.setup.ts", {
    stdio: "inherit",
  });
}

console.log("Starting MCP...");
execSync(
  "node node_modules/@playwright/mcp/cli.js --browser chrome --isolated --storage-state .auth/user.json",
  { stdio: "inherit" }
);

{
  "scripts": {
    "mcp": "node scripts/start-mcp.js"
  }
}