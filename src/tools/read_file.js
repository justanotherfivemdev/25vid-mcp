// Tool: read_file — Read a file from workspace (with size limit)

const fs = require("fs");
const { safePath, checkFileSize } = require("../security");

module.exports = {
  name: "read_file",
  description: "Read a file from workspace",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative path to file within workspace" },
    },
    required: ["path"],
  },
  async handler(args) {
    const file = safePath(args.path);
    await checkFileSize(file);
    const content = await fs.promises.readFile(file, "utf-8");
    return content;
  },
};
