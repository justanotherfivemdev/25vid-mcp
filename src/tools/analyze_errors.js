// =========================
// MCP Tool: analyze_errors
// =========================
// Analyzes MCP and deploy logs for errors, producing
// structured output suitable for AI-assisted debugging.

const { analyzeErrors } = require("../debug/analyzer");

const MAX_ALLOWED_LINES = 5000;

module.exports = {
  name: "analyze_errors",
  description:
    "Analyze MCP and deploy logs for errors. Returns structured error report with categories, severity levels, and fix suggestions for AI-assisted debugging.",
  inputSchema: {
    type: "object",
    properties: {
      max_lines: {
        type: "integer",
        description: "Maximum number of log lines to analyze (default: 500, max: 5000)",
      },
    },
  },
  scope: "public",
  handler: async (args) => {
    const maxLines = Math.min(Math.max(1, args.max_lines || 500), MAX_ALLOWED_LINES);
    const report = analyzeErrors({ maxLines });
    return JSON.stringify(report, null, 2);
  },
};
