Execute the steps from the .spec.md file using Playwright MCP tools.
Use DOM inspection to locate elements and run each step in order.

# run scenario

- goto https://neo-qa2.ubstest.net/axion?use-mocked=r2000
- click "Export"
- expect a file download

{
  "playwright.experimental.autoAllow": true,

  "chat.tools.urls.autoApprove": {
    "https://*": true
  },

  "chat.tools.edits.autoApprove": {
    "**/tests/**": true
  },

  "chat.tools.terminal.autoApprove": {
    "npx playwright *": true,
    "pnpm playwright *": true,
    "npm run test*": true
  }
}