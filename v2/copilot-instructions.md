When working with `.e2e.md` spec files:
- Never create files other than the single `.e2e.spec.ts` test file.
- Never launch browsers or use MCP tools.
- Do not read files beyond the spec provided in context.

Before outputting any test file:
- Remove unused imports, variables, and empty blocks.
- Inline locators that are only used once.