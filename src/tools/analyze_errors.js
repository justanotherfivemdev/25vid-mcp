// =========================
// MCP Tool: analyze_errors
// =========================
// Analyzes MCP and deploy logs for errors, producing
// structured output suitable for AI-assisted debugging.

const { analyzeErrors } = require("../debug/analyzer");

module.exports = {
  name: "analyze_errors",
  description:
    "Analyze MCP and deploy logs for errors. Returns structured error report with categories, severity levels, and fix suggestions for AI-assisted debugging.",
  inputSchema: {
    type: "object",
    properties: {
      max_lines: {
        type: "integer",
        description: "Maximum number of log lines to analyze (default: 500)",
      },
    },
  },
  scope: "public",
  handler: async (args) => {
    const report = analyzeErrors({ maxLines: args.max_lines || 500 });
    return JSON.stringify(report, null, 2);
  },
};
