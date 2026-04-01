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

If the MCP server is behind Cloudflare (e.g., `mcp.25thvid.com`), specific settings are required for GitHub Copilot to connect successfully. The rules below are **path/hostname based**, not IP based — GitHub's Meta API IP list is not exhaustive and they do not recommend relying on allow-by-IP unless you monitor it continuously.

### 1. DNS

Create an `A` record:

| Setting | Value |
|---|---|
| **Name** | `mcp` |
| **Content** | Your origin server IP |
| **Proxy status** | Start with **DNS only** (gray cloud) for initial validation, then switch to **Proxied** (orange cloud) once the origin is confirmed working |

> **Tip**: Starting with DNS only is the fastest way to separate "origin/Nginx problem" from "Cloudflare problem." If DNS-only works and proxied fails, the problem is Cloudflare, not your app.

### 2. SSL/TLS

- **Encryption mode**: **Full (strict)** if your origin has a valid certificate (recommended), or **Full** otherwise
- **Always Use HTTPS**: Enabled
- **Minimum TLS Version**: 1.2

### 3. WAF Custom Rule — Skip for MCP Traffic

Create a **WAF Custom Rule** (Security → WAF → Custom rules) that matches the MCP endpoint by **hostname and path** — no IP allowlisting required:

- **Rule name**: `Allow MCP Traffic`
- **Expression**:
  ```
  (http.host eq "mcp.25thvid.com" and starts_with(http.request.uri.path, "/mcp"))
  ```
- **Action**: **Skip**
- **Skip**:
  - Remaining custom rules
  - Rate limiting rules
  - Managed rules
  - Super Bot Fight Mode (if you have that product)

> **Note on GitHub IPs**: You may optionally layer `ip.src in { ... }` on top of this rule for defense in depth, but do not rely on it as the sole filter. GitHub's IP ranges change and the Meta API list is not guaranteed to be complete.

### 4. Bot Protection

This is critical:

- **Plain Bot Fight Mode** (free tier) **cannot be bypassed by WAF Skip rules**. If it is enabled on the zone, it can still block API traffic like MCP. Either **disable it** for the zone or move the MCP service to a separate subdomain/zone where Bot Fight Mode is not active.
- **Super Bot Fight Mode** and **Enterprise bot controls** can be skipped by the WAF rule above.

### 5. Cache and Performance

For `mcp.25thvid.com` (or at least `/mcp*`), create a **Configuration Rule**:

- **Cache Level**: Bypass
- **Disable Performance** (optional — prevents Cloudflare from modifying API/SSE responses)
- **SSL**: Full (Strict)

This avoids Cloudflare caching or optimizing API/SSE traffic.

### 6. Rate Limiting

If you have Cloudflare rate limiting rules:

- The WAF Skip rule above should skip them for `/mcp`, but verify in Security → Events
- GitHub Copilot may make multiple rapid requests during initialization and tool discovery

### 7. Timeout Expectations

Cloudflare's default proxy read timeout is ~100–120 seconds. Long-lived SSE streams can hit a **524 timeout** if the origin does not respond in time.

- For initial Copilot validation, focus on the `POST /mcp` path first (short request/response cycles)
- If SSE becomes flaky through the proxy, switch to **DNS only** on the MCP subdomain as a fallback
- **Under Attack Mode** must be **OFF** — it shows a JavaScript challenge page that completely blocks API/MCP traffic

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

If you see a Cloudflare challenge page, HTML, or a 403/1020 error instead, review the WAF and bot protection settings above.

## Troubleshooting

### "MCP server failed to start: Streamable HTTP error: Error POSTing to endpoint"

This means GitHub Copilot could not reach the `/mcp` endpoint. Check:

1. **Server is running**: `curl https://mcp.25thvid.com/health` should return `{"status":"ok"}`
2. **CORS headers present**: `curl -v -X OPTIONS https://mcp.25thvid.com/mcp` should return `204` with `Access-Control-Allow-*` headers
3. **Cloudflare not blocking**: Check Cloudflare's **Security → Events** log for blocked requests
4. **Bot Fight Mode off**: Plain Bot Fight Mode blocks automated POST requests and cannot be skipped by WAF rules
5. **SSL is correct**: Ensure `Full (Strict)` SSL mode and valid origin certificate

### "0 tool calls / no activity"

If the MCP initializes but no tools are called:

1. Verify `tools/list` works: POST to `/mcp` with `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
2. Check that the MCP server is registered correctly in VS Code or GitHub settings
3. Review the server logs for any errors during tool execution

### Cloudflare Error 1020 (Access Denied)

A WAF or firewall rule is blocking the request. Go to **Security → Events** in the Cloudflare dashboard to find which rule triggered, then add an exception.

### Cloudflare Error 524 (Timeout)

The SSE connection exceeded Cloudflare's proxy read timeout (~100–120 seconds). Options:

- Switch to **DNS Only** (gray cloud) mode for the MCP subdomain to bypass the proxy entirely
- Focus on `POST /mcp` interactions — these are short-lived and not affected
- Upgrade to a Cloudflare plan with longer proxy read timeouts if long-lived SSE is needed

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MCP_PORT` | `8787` | Server port |
| `MCP_HOST` | `0.0.0.0` | Bind address |
| `MCP_WORKSPACE` | `/workspace` | Root directory for file tools |
| `MCP_LOG_DIR` | `/opt/mcp/logs` | Log file directory |
| `MCP_MAX_FILE_SIZE` | `5242880` | Max file size for read operations (bytes) |
| `MCP_ALLOWED_IPS` | *(none)* | Comma-separated list of allowed IPs (optional) |
| `MCP_ALLOWED_ORIGINS` | *(none)* | Comma-separated CORS origins to allow (e.g., `https://github.com,https://example.com`). Localhost is always permitted. Non-browser requests (no `Origin` header) are allowed by default. |
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
