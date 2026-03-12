## E2E Test Generation

### Prerequisites

From the repo root, run:

```
pnpm mcp
```

This will create `.auth/user.json` (if missing or expired) and start the MCP server. Keep it running while you work.

### Writing a spec

Create a spec at `<app>/specs/<name>.e2e.md` describing the scenario in plain steps.

Example (`apps/rates/irs-stream/app/specs/ccy-filter.e2e.md`):

```markdown
# CCY Filter

URL: /axion?use-mocked=r2000

## Steps
1. Enter "EUR" in the search bar
2. Press Enter
3. Assert all displayed rows show "EUR" in the CCY column
```

### Generating a test

1. Open a **new** Copilot Chat session
2. Attach your `<app>/specs/<name>.e2e.md` file
3. Attach `root/prompt.md`
4. Send: `Follow the instructions in prompt.md to generate a test from the attached spec.`

Output: one file at `<app>/tests/<name>.e2e.spec.ts` and two run commands.

### Running the generated test

**Step through (visual, paused at each action):**

```
cd <app>
pnpm exec hive-playwright test tests/<name>.e2e.spec.ts --debug
```

**Normal run (headed):**

```
cd <app>
pnpm exec hive-playwright test tests/<name>.e2e.spec.ts --headed
```

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth errors | Re-run `pnpm mcp` from repo root |
| Wrong selectors | Fix in `.spec.ts`, rerun, or update the `.e2e.md` spec and regenerate |
| Chat launches a browser or creates extra files | Start a fresh chat session — never continue a broken one |