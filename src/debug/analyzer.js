// =========================
// AI Debug Loop — Log Analyzer
// =========================
// Parses MCP and deploy logs to detect errors,
// produces structured output for AI consumption.

const fs = require("fs");
const config = require("../config");

// Error patterns to detect in logs
const ERROR_PATTERNS = [
  { pattern: /Error:/i, category: "runtime_error", severity: "high" },
  { pattern: /ENOENT/i, category: "file_not_found", severity: "medium" },
  { pattern: /EACCES/i, category: "permission_denied", severity: "high" },
  { pattern: /ECONNREFUSED/i, category: "connection_refused", severity: "high" },
  { pattern: /ETIMEDOUT/i, category: "timeout", severity: "medium" },
  { pattern: /SyntaxError/i, category: "syntax_error", severity: "high" },
  { pattern: /TypeError/i, category: "type_error", severity: "high" },
  { pattern: /ReferenceError/i, category: "reference_error", severity: "high" },
  { pattern: /ENOMEM/i, category: "out_of_memory", severity: "critical" },
  { pattern: /Deploy WARNING/i, category: "deploy_warning", severity: "medium" },
  { pattern: /Deploy FAIL/i, category: "deploy_failure", severity: "critical" },
  { pattern: /health check failed/i, category: "health_check_failure", severity: "high" },
  { pattern: /Container .* exited/i, category: "container_crash", severity: "critical" },
  { pattern: /rate limit/i, category: "rate_limit", severity: "low" },
  { pattern: /"success"\s*:\s*false/i, category: "tool_failure", severity: "medium" },
];

/**
 * Parse a log file and extract structured entries.
 * @param {string} filePath - Path to the log file
 * @param {number} maxLines - Maximum number of lines to read from the end
 * @returns {string[]} Array of log lines
 */
function readLogLines(filePath, maxLines = 500) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return data.split("\n").filter(Boolean).slice(-maxLines);
  } catch {
    return [];
  }
}

/**
 * Analyze a single log line for error patterns.
 * @param {string} line - Log line to analyze
 * @param {number} lineNumber - Line number for context
 * @returns {object|null} Detected error or null
 */
function analyzeLine(line, lineNumber) {
  for (const { pattern, category, severity } of ERROR_PATTERNS) {
    if (pattern.test(line)) {
      return {
        line: lineNumber,
        category,
        severity,
        message: line.trim().substring(0, 500),
        matchedPattern: pattern.source,
      };
    }
  }
  return null;
}

/**
 * Analyze logs and return structured error report.
 * @param {object} options
 * @param {number} options.maxLines - Max lines to analyze
 * @returns {object} Structured analysis report
 */
function analyzeErrors(options = {}) {
  const maxLines = options.maxLines || 500;

  // Read both log files
  const mcpLines = readLogLines(config.mcpLog, maxLines);
  const deployLines = readLogLines(config.deployLog, maxLines);

  const errors = [];

  // Analyze MCP logs
  mcpLines.forEach((line, i) => {
    const error = analyzeLine(line, i + 1);
    if (error) {
      error.source = "mcp.log";
      errors.push(error);
    }
  });

  // Analyze deploy logs
  deployLines.forEach((line, i) => {
    const error = analyzeLine(line, i + 1);
    if (error) {
      error.source = "deploy.log";
      errors.push(error);
    }
  });

  // Group by category
  const byCategory = {};
  for (const err of errors) {
    if (!byCategory[err.category]) {
      byCategory[err.category] = [];
    }
    byCategory[err.category].push(err);
  }

  // Count by severity
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const err of errors) {
    bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalErrors: errors.length,
      bySeverity,
      categories: Object.keys(byCategory),
    },
    errors: errors.slice(-100), // Limit output size
    suggestions: generateSuggestions(byCategory),
  };
}

/**
 * Generate fix suggestions based on detected error patterns.
 * @param {object} byCategory - Errors grouped by category
 * @returns {object[]} Array of suggestions
 */
function generateSuggestions(byCategory) {
  const suggestions = [];

  if (byCategory.file_not_found) {
    suggestions.push({
      category: "file_not_found",
      suggestion: "Check file paths and ensure required files exist. Verify volume mounts in docker-compose.yml.",
      priority: "medium",
    });
  }

  if (byCategory.permission_denied) {
    suggestions.push({
      category: "permission_denied",
      suggestion: "Check file ownership and permissions. Ensure Docker user has access to mounted volumes.",
      priority: "high",
    });
  }

  if (byCategory.connection_refused) {
    suggestions.push({
      category: "connection_refused",
      suggestion: "Service may be down or port misconfigured. Check Docker container status and network settings.",
      priority: "high",
    });
  }

  if (byCategory.out_of_memory) {
    suggestions.push({
      category: "out_of_memory",
      suggestion: "Server is running out of memory. Consider increasing container memory limits or optimizing code.",
      priority: "critical",
    });
  }

  if (byCategory.deploy_failure || byCategory.health_check_failure) {
    suggestions.push({
      category: "deploy_failure",
      suggestion: "Recent deployment failed. Check deploy logs for details. Consider rolling back to last known good state.",
      priority: "critical",
    });
  }

  if (byCategory.container_crash) {
    suggestions.push({
      category: "container_crash",
      suggestion: "Docker container crashed. Check container logs with 'docker logs mcp-server' for root cause.",
      priority: "critical",
    });
  }

  if (byCategory.syntax_error || byCategory.type_error || byCategory.reference_error) {
    suggestions.push({
      category: "code_error",
      suggestion: "Code errors detected. Review recent commits for bugs. Run linter and test suite before deploying.",
      priority: "high",
    });
  }

  if (byCategory.tool_failure) {
    suggestions.push({
      category: "tool_failure",
      suggestion: "MCP tool execution failures detected. Check tool implementations and input validation.",
      priority: "medium",
    });
  }

  return suggestions;
}

module.exports = { analyzeErrors, readLogLines, analyzeLine, ERROR_PATTERNS };
