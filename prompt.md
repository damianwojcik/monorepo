Execute the steps from the `.spec.md` file using Playwright MCP tools in headed mode with an isolated clean browser session.

Always open the scenario URL from the spec using the MCP Playwright browser, authenticate using `hive.uiLogin(page, 'fi:rates-sales')`, and use DOM inspection to locate elements and execute the steps.

Do not generate the test until the scenario has been executed in the MCP browser.

For every `/specs/<name>.e2e.md`, generate or update `/tests/<name>.e2e.spec.ts`.

All Playwright imports must come from `@ubs.hive.toolchain/playwright`.

Only generate or update the test file in `/tests` and never run Playwright tests, shell commands, or create any other files.

After generating the test, close the MCP Playwright browser and end the session.