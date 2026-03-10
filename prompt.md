Start a Playwright MCP test session in headed mode.
Always call the Playwright MCP setup tool before interacting with the page.

Open the scenario URL from the `.e2e.md` specification using the MCP Playwright browser.

If authentication is required, use the project's login helper (for example `hive.uiLogin`) to sign in.

Use DOM inspection to execute the scenario steps described in the spec exactly as written.

Do not generate the test until the scenario has been executed in the MCP browser.

For every `/specs/<name>.e2e.md`, generate or update the Playwright test file at `/tests/<name>.e2e.spec.ts`.

All Playwright imports must come from `@ubs.hive.toolchain/playwright`.

Only generate or update the test file in `/tests`. Never run Playwright tests, shell commands, or create any other files.

After generating the test, close the MCP Playwright browser and end the session.