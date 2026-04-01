// Tool: list_files — List files in a workspace directory

const fs = require("fs");
const { safePath } = require("../security");

module.exports = {
  name: "list_files",
  description: "List files in workspace directory",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path within workspace" },
    },
  },
  async handler(args) {
    const dir = safePath(args.path || ".");
    const entries = await fs.promises.readdir(dir);
    return JSON.stringify(entries, null, 2);
  },
};
