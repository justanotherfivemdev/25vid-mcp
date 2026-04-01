// =========================
// MCP Server — Entry Point
// =========================
// Production-grade MCP server with modular architecture.
// Supports JSON-RPC 2.0 over HTTP for GitHub Copilot integration.

const express = require("express");
const config = require("./src/config");
const { loadTools } = require("./src/tools/index");
const { mcpHandler } = require("./src/mcp/handler");
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

// MCP JSON-RPC endpoint
app.post("/mcp", mcpHandler);

// Dashboard and API routes
app.use(dashboardRoutes);

// Start server when run directly (not when required as module for testing)
if (require.main === module) {
  app.listen(config.port, config.host, () => {
    console.log(`MCP server running on ${config.host}:${config.port}`);
  });
} else {
  // When required for testing, start on the same port
  app.listen(config.port, config.host);
}

module.exports = app;
