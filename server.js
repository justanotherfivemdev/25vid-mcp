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
