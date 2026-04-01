// =========================
// Configuration Constants
// =========================

const path = require("path");

const config = {
  // Server
  port: parseInt(process.env.MCP_PORT || "8787", 10),
  host: process.env.MCP_HOST || "0.0.0.0",

  // Workspace
  workspace: process.env.MCP_WORKSPACE || "/workspace",

  // Logging
  logDir: process.env.MCP_LOG_DIR || "/opt/mcp/logs",
  get mcpLog() {
    return path.join(this.logDir, "mcp.log");
  },
  get deployLog() {
    return path.join(this.logDir, "deploy.log");
  },

  // Security
  maxFileSize: parseInt(process.env.MCP_MAX_FILE_SIZE || String(5 * 1024 * 1024), 10), // 5MB default
  maxSearchResults: 100,
  maxTreeDepth: 10,

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
  },

  // Request timeout (ms)
  requestTimeout: 30000,

  // IP restriction (future Cloudflare integration)
  allowedIPs: process.env.MCP_ALLOWED_IPS
    ? process.env.MCP_ALLOWED_IPS.split(",").map((ip) => ip.trim())
    : null,

  // Tool scopes for future admin MCP separation
  toolScopes: {
    public: "public",   // Exposed to GitHub Copilot
    admin: "admin",     // Future: admin-only tools
  },
};

module.exports = config;
