// Tool: get_file_tree — Recursive directory view of workspace

const fs = require("fs");
const path = require("path");
const { safePath } = require("../security");
const config = require("../config");

/**
 * Recursively build a file tree up to a max depth.
 */
async function buildTree(dir, depth, maxDepth) {
  if (depth > maxDepth) return [];

  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    // Skip hidden files/dirs and node_modules
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(config.workspace, fullPath);

    if (entry.isDirectory()) {
      const children = await buildTree(fullPath, depth + 1, maxDepth);
      result.push({ name: entry.name, path: relativePath, type: "directory", children });
    } else {
      result.push({ name: entry.name, path: relativePath, type: "file" });
    }
  }
  return result;
}

module.exports = {
  name: "get_file_tree",
  description: "Get recursive directory tree of workspace",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path within workspace (default: root)" },
      depth: { type: "integer", description: "Max recursion depth (default: 3)" },
    },
  },
  async handler(args) {
    const dir = safePath(args.path || ".");
    const maxDepth = Math.min(args.depth || 3, config.maxTreeDepth);
    const tree = await buildTree(dir, 0, maxDepth);
    return JSON.stringify(tree, null, 2);
  },
};
