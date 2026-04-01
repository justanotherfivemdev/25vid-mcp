const { describe, it, before } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

// Override config for testing
process.env.MCP_WORKSPACE = "/tmp/mcp-debug-test/workspace";
process.env.MCP_LOG_DIR = "/tmp/mcp-debug-test/logs";

const LOG_DIR = process.env.MCP_LOG_DIR;

describe("Debug Analyzer", () => {
  before(() => {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  });

  it("detects errors in log lines", () => {
    const { analyzeLine } = require("../src/debug/analyzer");

    const result = analyzeLine("Error: Something went wrong", 1);
    assert.ok(result);
    assert.strictEqual(result.category, "runtime_error");
    assert.strictEqual(result.severity, "high");
  });

  it("detects deploy failures", () => {
    const { analyzeLine } = require("../src/debug/analyzer");

    const result = analyzeLine("[2024-01-01] Deploy FAIL — build error", 5);
    assert.ok(result);
    assert.strictEqual(result.category, "deploy_failure");
    assert.strictEqual(result.severity, "critical");
  });

  it("returns null for normal log lines", () => {
    const { analyzeLine } = require("../src/debug/analyzer");

    const result = analyzeLine("INFO: Server started on port 8787", 1);
    assert.strictEqual(result, null);
  });

  it("analyzeErrors returns structured report", () => {
    // Write test log with errors
    const mcpLogPath = path.join(LOG_DIR, "mcp.log");
    const deployLogPath = path.join(LOG_DIR, "deploy.log");

    fs.writeFileSync(
      mcpLogPath,
      '{"type":"tool_call","success":false,"error":"ENOENT: no such file"}\n' +
        '{"type":"tool_call","success":true}\n' +
        "Error: TypeError: Cannot read properties of undefined\n"
    );

    fs.writeFileSync(
      deployLogPath,
      "[2024-01-01] Deploy started\n" +
        "[2024-01-01] Deploy SUCCESS\n" +
        "[2024-01-02] Deploy WARNING — health check failed\n"
    );

    const { analyzeErrors } = require("../src/debug/analyzer");
    const report = analyzeErrors();

    assert.ok(report.timestamp);
    assert.ok(report.summary);
    assert.ok(report.summary.totalErrors > 0);
    assert.ok(Array.isArray(report.errors));
    assert.ok(Array.isArray(report.suggestions));
    assert.ok(report.summary.bySeverity);
  });

  it("handles missing log files gracefully", () => {
    // Point to non-existent log dir
    const origLogDir = process.env.MCP_LOG_DIR;
    process.env.MCP_LOG_DIR = "/tmp/mcp-debug-test/nonexistent";

    // Re-require to get fresh config
    delete require.cache[require.resolve("../src/debug/analyzer")];
    delete require.cache[require.resolve("../src/config")];
    const { analyzeErrors } = require("../src/debug/analyzer");

    const report = analyzeErrors();
    assert.ok(report);
    assert.strictEqual(report.summary.totalErrors, 0);

    // Restore
    process.env.MCP_LOG_DIR = origLogDir;
    delete require.cache[require.resolve("../src/debug/analyzer")];
    delete require.cache[require.resolve("../src/config")];
  });
});
