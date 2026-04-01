// Tool: get_file_metadata — Get file size, modified time, and permissions

const fs = require("fs");
const { safePath } = require("../security");

module.exports = {
  name: "get_file_metadata",
  description: "Get file metadata (size, modified time, permissions)",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path to file within workspace" },
    },
    required: ["path"],
  },
  async handler(args) {
    const file = safePath(args.path);
    const stat = await fs.promises.stat(file);
    return JSON.stringify(
      {
        path: args.path,
        size: stat.size,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
        permissions: "0" + (stat.mode & 0o777).toString(8),
      },
      null,
      2
    );
  },
};
