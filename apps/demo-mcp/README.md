# Demo MCP App

POC for Reddit Adapter. It imports Reddit data into a libSQL file.

## Usage

```bash
bun run apps/demo-mcp/src/cli.ts import --file ./export_username_date.zip
```

Exports to `.data/reddit.db`.
