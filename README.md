# 25th Infantry Division — MCP Server

Production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for AI-assisted development, built for GitHub Copilot integration via the **Streamable HTTP** transport.

## Quick Start

```bash
npm install
npm start          # Starts on 0.0.0.0:8787
```

Or with Docker:

```bash
docker compose up -d
```

The server exposes:

| Endpoint | Purpose |
|---|---|
| `POST /mcp` | MCP JSON-RPC (Streamable HTTP) |
| `GET /mcp` | SSE stream (server-initiated messages) |
| `DELETE /mcp` | Session termination |
| `GET /dashboard/` | Operations Center UI |
| `GET /health` | Health check |

## Connecting GitHub Copilot

### GitHub Copilot (VS Code)

Add to your **VS Code `settings.json`**:

```jsonc
{
  "github.copilot.chat.mcpServers": {
    "25vid-mcp": {
      "type": "http",
      "url": "https://mcp.25thvid.com/mcp"
    }
  }
}
```

Or add to your repo's **`.vscode/mcp.json`**:

```json
{
  "servers": {
    "25vid-mcp": {
      "type": "http",
      "url": "https://mcp.25thvid.com/mcp"
    }
  }
}
```

### GitHub Copilot (github.com)

Configure the MCP server in your repository or organization settings:

1. Go to **Repository Settings → Copilot → MCP Servers** (or Organization Settings)
2. Add a new server with the URL: `https://mcp.25thvid.com/mcp`
3. Set transport to **Streamable HTTP**

## Cloudflare Configuration

If the MCP server is behind Cloudflare (e.g., `mcp.25thvid.com`), specific settings are required for GitHub Copilot to connect successfully.

### Required DNS Settings

| Setting | Value | Notes |
|---|---|---|
| **DNS Record** | `A` or `CNAME` pointing to your origin | Standard |
| **Proxy Status** | **Proxied** (orange cloud) is fine, but see rules below | If issues persist, try **DNS only** (gray cloud) to bypass Cloudflare entirely |

### Required Cloudflare Settings

#### 1. SSL/TLS

- **Encryption mode**: Set to **Full (strict)** if you have an origin certificate, or **Full** otherwise
- **Always Use HTTPS**: Enabled
- **Minimum TLS Version**: 1.2

#### 2. Firewall / WAF — Allow GitHub Traffic

GitHub Copilot connects from GitHub's server infrastructure. You **must** allow these requests through Cloudflare's firewall.

**Create a WAF Custom Rule** (Security → WAF → Custom rules):

- **Rule name**: `Allow GitHub MCP`
- **Expression**:
  ```
  (http.request.uri.path eq "/mcp" and ip.src in {
    140.82.112.0/20
    143.55.64.0/20
    185.199.108.0/22
    192.30.252.0/22
    20.201.28.151/32
    20.205.243.166/32
    20.26.156.210/32
    20.27.177.113/32
    20.29.134.17/32
    20.87.245.0/32
    4.208.26.197/32
    20.233.83.145/32
    20.248.137.48/32
    20.207.73.82/32
    20.175.192.146/32
    20.233.54.53/32
    20.201.28.152/32
    20.26.156.215/32
    4.208.26.200/32
  })
  ```
- **Action**: **Skip** (skip all remaining custom rules, or at minimum skip rate limiting, bot protection, and managed rules)

> **Tip**: GitHub's IP ranges change periodically. Fetch the latest from:
> ```bash
> curl -s https://api.github.com/meta | jq '.hooks, .api, .actions'
> ```

#### 3. Bot Protection

If you have **Bot Fight Mode** or **Super Bot Fight Mode** enabled:

- Either **disable** it globally, or
- Add an exception for the `/mcp` path in the bot management rules
- Bot fight mode can block GitHub's automated POST requests, causing "Error POSTing to endpoint"

#### 4. Rate Limiting

If you have Cloudflare rate limiting rules:

- Ensure the `/mcp` path is excluded or has a high enough threshold
- GitHub Copilot may make multiple rapid requests during initialization and tool discovery

#### 5. Under Attack Mode

- **Must be OFF** — "Under Attack" mode shows a JavaScript challenge page that completely blocks API/MCP traffic

#### 6. Page Rules / Configuration Rules (Optional Optimization)

Create a **Configuration Rule** for `mcp.25thvid.com/mcp*`:

- **Cache Level**: Bypass
- **Disable Performance** (optional — prevents Cloudflare from modifying responses)
- **SSL**: Full (Strict)

### Verifying Connectivity

Test from the command line that the MCP endpoint is reachable:

```bash
# Basic connectivity test
curl -s https://mcp.25thvid.com/health

# MCP initialize handshake
curl -s -X POST https://mcp.25thvid.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "capabilities": {},
      "clientInfo": { "name": "curl-test", "version": "1.0" }
    }
  }'
```

A successful response looks like:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "25vid-mcp", "version": "2.0.0" }
  }
}
```

If you see a Cloudflare challenge page, HTML, or a 403/1020 error instead, review the firewall and bot protection settings above.

## Troubleshooting

### "MCP server failed to start: Streamable HTTP error: Error POSTing to endpoint"

This means GitHub Copilot could not reach the `/mcp` endpoint. Check:

1. **Server is running**: `curl https://mcp.25thvid.com/health` should return `{"status":"ok"}`
2. **CORS headers present**: `curl -v -X OPTIONS https://mcp.25thvid.com/mcp` should return `204` with `Access-Control-Allow-*` headers
3. **Cloudflare not blocking**: Check Cloudflare's **Security → Events** log for blocked requests from GitHub IPs
4. **Bot protection off**: Cloudflare Bot Fight Mode blocks automated POST requests
5. **SSL is correct**: Ensure `Full (Strict)` SSL mode and valid origin certificate

### "0 tool calls / no activity"

If the MCP initializes but no tools are called:

1. Verify `tools/list` works: POST to `/mcp` with `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
2. Check that the MCP server is registered correctly in VS Code or GitHub settings
3. Review the server logs for any errors during tool execution

### Cloudflare Error 1020 (Access Denied)

A WAF or firewall rule is blocking the request. Go to **Security → Events** in the Cloudflare dashboard to find which rule triggered, then add an exception.

### Cloudflare Error 524 (Timeout)

The SSE connection exceeded Cloudflare's proxy timeout (100 seconds on free plans). Options:

- Upgrade to a Cloudflare plan with longer timeouts
- Use **DNS Only** (gray cloud) mode to bypass the proxy for this subdomain
- The POST-based MCP interactions are not affected — only long-lived SSE streams

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MCP_PORT` | `8787` | Server port |
| `MCP_HOST` | `0.0.0.0` | Bind address |
| `MCP_WORKSPACE` | `/workspace` | Root directory for file tools |
| `MCP_LOG_DIR` | `/opt/mcp/logs` | Log file directory |
| `MCP_MAX_FILE_SIZE` | `5242880` | Max file size for read operations (bytes) |
| `MCP_ALLOWED_IPS` | *(none)* | Comma-separated list of allowed IPs (optional) |
| `MCP_ADMIN_TOKEN` | *(none)* | Admin MCP auth token (for admin server) |

## Architecture

```
server.js                 → Express entry point, CORS, middleware, routes
src/
  config.js               → Configuration constants
  logger.js               → Structured logging
  security.js             → Path validation, IP checking
  middleware.js            → Rate limiting, timeouts, request ID
  mcp/
    handler.js            → MCP JSON-RPC request handler
    registry.js           → Tool registration and discovery
    validator.js          → JSON-RPC 2.0 validation
  tools/                  → Individual MCP tool implementations
  routes/
    dashboard.js          → Dashboard UI and API routes
  admin/
    server.js             → Admin MCP server (separate port)
  debug/
    analyzer.js           → Error log analysis
public/
  index.html              → Operations Center dashboard UI
```

## Testing

```bash
npm install
npm test
```

## License

ISC
