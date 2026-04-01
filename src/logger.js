// =========================
// Structured JSON Logger
// =========================

const fs = require("fs");
const path = require("path");
const config = require("./config");

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

/**
 * Write a structured JSON log entry to the MCP log file.
 * Each entry includes a timestamp and is written as a single JSON line.
 */
function log(entry) {
  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  const line = JSON.stringify(record) + "\n";
  fs.promises.appendFile(config.mcpLog, line).catch((err) => {
    console.error("Failed to write log:", err.message);
  });
}

/**
 * Log an MCP tool call with full context.
 */
function logToolCall({ requestId, tool, args, success, result, error, durationMs }) {
  log({
    type: "tool_call",
    requestId,
    tool,
    arguments: args,
    success,
    durationMs,
    ...(error ? { error: String(error) } : {}),
  });
}

/**
 * Log an error with optional stack trace.
 */
function logError({ requestId, message, stack, context }) {
  log({
    type: "error",
    requestId,
    message: String(message),
    ...(stack ? { stack } : {}),
    ...(context ? { context } : {}),
  });
}

/**
 * Log an HTTP request.
 */
function logHttp({ requestId, method, path, statusCode, durationMs }) {
  log({
    type: "http",
    requestId,
    method,
    path,
    statusCode,
    durationMs,
  });
}

/**
 * Parse recent structured log entries from the MCP log file.
 * Returns the last N entries as parsed JSON objects.
 */
async function getRecentLogs(count = 100) {
  try {
    const data = await fs.promises.readFile(config.mcpLog, "utf-8");
    const lines = data.split("\n").filter(Boolean);
    return lines.slice(-count).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
  } catch {
    return [];
  }
}

/**
 * Get recent tool call activity from logs.
 */
async function getRecentActivity(count = 50) {
  const logs = await getRecentLogs(500);
  return logs.filter((l) => l.type === "tool_call").slice(-count);
}

module.exports = { log, logToolCall, logError, logHttp, getRecentLogs, getRecentActivity };
