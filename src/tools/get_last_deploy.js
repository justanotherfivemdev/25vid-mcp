// Tool: get_last_deploy — Get last 10 lines of deploy log

const fs = require("fs");
const config = require("../config");

module.exports = {
  name: "get_last_deploy",
  description: "Get recent deploy entries",
  inputSchema: {
    type: "object",
    properties: {},
  },
  async handler() {
    try {
      const data = await fs.promises.readFile(config.deployLog, "utf-8");
      const lines = data.split("\n");
      return lines.slice(-10).join("\n");
    } catch {
      return "No deploy logs";
    }
  },
};
