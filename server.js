// =========================
// MCP Server — Entry Point
// =========================
// Production-grade MCP server with modular architecture.
// Supports JSON-RPC 2.0 over HTTP for GitHub Copilot integration.

const express = require("express");
const config = require("./src/config");
const { loadTools } = require("./src/tools/index");
const { mcpHandler, mcpSseHandler, mcpDeleteHandler } = require("./src/mcp/handler");
const dashboardRoutes = require("./src/routes/dashboard");
const {
  requestIdMiddleware,
  httpLoggerMiddleware,
  createRateLimiter,
  timeoutMiddleware,
  ipRestrictionMiddleware,
} = require("./src/middleware");

// Initialize Express
const app = express();
app.use(express.json());

// CORS middleware — required for GitHub Copilot and browser-based MCP clients
// Restricts Access-Control-Allow-Origin to localhost and MCP_ALLOWED_ORIGINS
const allowedOriginsEnv = process.env.MCP_ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  const isLocalhostOrigin =
    typeof origin === "string" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  const isAllowedEnvOrigin =
    typeof origin === "string" && allowedOrigins.includes(origin);

  if (origin && (isLocalhostOrigin || isAllowedEnvOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    // Vary on Origin to prevent cache mix-ups when echoing a specific origin
    const existingVary = res.getHeader("Vary");
    if (!existingVary) {
      res.setHeader("Vary", "Origin");
    } else {
      const varyValues = Array.isArray(existingVary)
        ? existingVary.flatMap((v) => String(v).split(",").map((s) => s.trim()))
        : String(existingVary).split(",").map((s) => s.trim());
      if (!varyValues.includes("Origin")) {
        res.setHeader("Vary", varyValues.concat("Origin").join(", "));
      }
    }
  } else if (!origin) {
    // Non-browser clients (no Origin header): allow for server-to-server MCP
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  // If origin is present but not allowed, no Access-Control-Allow-Origin is set (browser blocks it)

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Mcp-Session-Id, X-Request-ID"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, X-Request-ID"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  next();
});

// Handle CORS preflight requests for the MCP endpoint
app.options("/mcp", (req, res) => {
  res.status(204).end();
});

// Apply middleware stack
app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);
app.use(timeoutMiddleware);
app.use(createRateLimiter());
app.use(ipRestrictionMiddleware);

// Register all MCP tools
loadTools();

// MCP JSON-RPC endpoint (Streamable HTTP transport)
app.post("/mcp", mcpHandler);
app.get("/mcp", (req, res, next) => {
  // Disable socket timeouts for SSE to allow long-lived connections
  if (typeof req.setTimeout === "function") req.setTimeout(0);
  if (typeof res.setTimeout === "function") res.setTimeout(0);
  return mcpSseHandler(req, res, next);
});
app.delete("/mcp", mcpDeleteHandler);

// Dashboard and API routes
app.use(dashboardRoutes);

// Start server when run directly
if (require.main === module) {
  app.listen(config.port, config.host, () => {
    console.log(`MCP server running on ${config.host}:${config.port}`);
  });
}

// Export a function to start the server for testing
module.exports = {
  app,
  start(port, host) {
    return new Promise((resolve) => {
      const server = app.listen(port || config.port, host || config.host, () => resolve(server));
    });
  },
};
