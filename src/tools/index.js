// =========================
// Tool Loader
// =========================
// Registers all tools from the tools/ directory into the registry.

const registry = require("../mcp/registry");

// Import all tool definitions
const tools = [
  require("./list_files"),
  require("./read_file"),
  require("./git_status"),
  require("./list_deploy_logs"),
  require("./get_last_deploy"),
  require("./get_file_tree"),
  require("./search_files"),
  require("./get_git_diff"),
  require("./get_recent_commits"),
  require("./get_file_metadata"),
];

/**
 * Register all tools with the registry.
 */
function loadTools() {
  for (const tool of tools) {
    registry.register(tool);
  }
}

module.exports = { loadTools };
