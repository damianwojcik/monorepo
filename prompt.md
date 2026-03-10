Execute the steps from the `.spec.md` file using Playwright MCP tools in headed mode with an isolated clean browser session and use DOM inspection to locate elements and run each step in order.

Always authenticate first using `hive.uiLogin(page, 'fi:rates-sales', { url: page.url() })`.

For every `/specs/<name>.e2e.md`, generate or update `/tests/<name>.e2e.spec.ts`.

All Playwright imports must come from `@ubs.hive.toolchain/playwright`.

Only generate or update the test file in `/tests` and never run Playwright tests, shell commands, or create any other files.

After generating the test, close the MCP Playwright browser and end the session.