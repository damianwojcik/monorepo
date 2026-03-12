When working with `.e2e.md` spec files:
- Never create files other than the single `.e2e.spec.ts` test file.
- Never launch browsers or use MCP tools.
- Do not read files beyond the spec provided in context.
- Never infer, modify, or construct URLs. Use only URLs found verbatim in the spec.
- If a spec URL is relative, prepend `https://neo-qa2.ubstest.net`.

Before outputting any test file:
- Remove unused imports, variables, and empty blocks.
- Inline locators that are only used once.


## Rules
1. Do NOT launch a browser, use MCP tools, run CLI commands, or execute anything.
2. Do NOT read any files beyond the spec provided in context.
3. Do NOT create, modify, or touch any file other than the single test output.
4. All imports must come from `@ubs.hive.toolchain/playwright`.
5. Translate each spec step into the corresponding Playwright API call.


import { test, expect } from '@ubs.hive.toolchain/playwright';

test('<scenario name from spec>', async ({ page }) => {
  // steps derived from spec
});