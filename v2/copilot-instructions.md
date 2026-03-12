root/.github/copilot-instructions.md

When working with `.e2e.md` spec files:
- Never create .md files in the root directory or any other directory.
- Never launch browsers or use MCP tools unless explicitly asked for selector discovery.
- Only output one `.e2e.spec.ts` test file per spec, at the path specified in the prompt.
- Do not read repository files, snapshots, or anything beyond the spec provided in context.