Execute the steps from the `.spec.md` file using Playwright MCP tools in headed mode with an isolated clean browser session and use DOM inspection to locate elements and run each step in order.

Before executing the scenario, ensure `.auth/user.json` exists; if it is missing or invalid, run the Playwright setup test `playwright.auth.setup.ts` to generate it.

For every `/specs/<name>.e2e.md`, generate or update `/tests/<name>.e2e.spec.ts`.

All Playwright imports must come from `@ubs.hive.toolchain/playwright`.

Only generate or update the test file in `/tests` and do not run Playwright tests or create any other files.

After generating the test, close the MCP Playwright browser and end the session.