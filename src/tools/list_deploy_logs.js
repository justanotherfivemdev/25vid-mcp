// Tool: list_deploy_logs — Get full deploy log contents

const fs = require("fs");
const config = require("../config");

module.exports = {
  name: "list_deploy_logs",
  description: "Get full deploy logs",
  inputSchema: {
    type: "object",
    properties: {},
  },
  async handler() {
    try {
      const data = await fs.promises.readFile(config.deployLog, "utf-8");
      return data;
    } catch {
      return "No deploy logs";
    }
  },
};
