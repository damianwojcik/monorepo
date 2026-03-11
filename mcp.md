playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /playwright\.auth\.setup\.ts/,
  fullyParallel: false,
  retries: 0
});


playwright.auth.setup.ts


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

scripts/start-mcp.js

import fs from "fs";
import { execSync } from "child_process";
import path from "path";

const authFile = path.resolve(".auth/user.json");
const MAX_AUTH_AGE_HOURS = 8;

function authExpired() {
  if (!fs.existsSync(authFile)) return true;

  const stat = fs.statSync(authFile);
  const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

  return ageHours > MAX_AUTH_AGE_HOURS;
}

if (authExpired()) {
  console.log("Auth missing or expired → generating new session...");

  execSync(
    "npx playwright test playwright.auth.setup.ts",
    { stdio: "inherit" }
  );
}

console.log("Starting Playwright MCP...");

execSync(
  "node node_modules/@playwright/mcp/cli.js --browser chrome --isolated --storage-state .auth/user.json",
  { stdio: "inherit" }
);

mcp.json

{
  "servers": {
    "playwright-automation": {
      "type": "stdio",
      "command": "node",
      "args": [
        "node_modules/@playwright/mcp/cli.js",
        "--browser",
        "chrome",
        "--isolated",
        "--storage-state",
        ".auth/user.json"
      ]
    }
  }
}

Root package.json


{
  "scripts": {
    "auth": "playwright test playwright.auth.setup.ts",
    "mcp": "node scripts/start-mcp.js",
    "test:abc": "playwright test -c apps/abc/playwright.config.ts",
    "test:def": "playwright test -c apps/def/playwright.config.ts"
  }
}