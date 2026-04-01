// =========================
// Security Utilities
// =========================

const path = require("path");
const fs = require("fs");
const config = require("./config");

/**
 * Resolve and validate a path within the workspace.
 * Prevents directory traversal attacks.
 * @param {string} target - Relative path within workspace
 * @returns {string} Resolved absolute path
 * @throws {Error} If path escapes workspace
 */
function safePath(target) {
  const base = path.resolve(config.workspace);
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error("Path traversal denied: path escapes workspace");
  }
  return resolved;
}

/**
 * Check if a file exceeds the configured max file size.
 * @param {string} filePath - Absolute path to file
 * @throws {Error} If file exceeds max size
 */
async function checkFileSize(filePath) {
  const stat = await fs.promises.stat(filePath);
  if (stat.size > config.maxFileSize) {
    throw new Error(
      `File too large: ${stat.size} bytes (max ${config.maxFileSize} bytes)`
    );
  }
}

/**
 * Optional IP restriction check.
 * Returns true if the request IP is allowed, or if no restrictions are configured.
 */
function isIPAllowed(ip) {
  if (!config.allowedIPs) return true;
  return config.allowedIPs.includes(ip);
}

module.exports = { safePath, checkFileSize, isIPAllowed };
