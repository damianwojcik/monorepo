Execute the steps from the `.spec.md` file using Playwright MCP tools and use DOM inspection to locate elements and run each step in order.

For every `/specs/<name>.e2e.md`, generate or update the corresponding Playwright test at `/tests/<name>.e2e.spec.ts`.

All Playwright imports must come from `@ubs.hive.toolchain/playwright`.

After generating the test, close the MCP Playwright browser and end the test session.