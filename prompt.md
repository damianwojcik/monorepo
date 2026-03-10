Execute the steps from the `.spec.md` file using Playwright MCP tools. Use DOM inspection to locate elements and run each step in order.

Generate or update the corresponding Playwright test at `/tests/<name>.e2e.spec.ts` for every `/specs/<name>.e2e.md`.

All Playwright imports must come from `@ubs.hive.toolchain/playwright`.

After the test is generated, close the MCP Playwright browser.