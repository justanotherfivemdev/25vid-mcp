// Tool: git_status — Get git status of the workspace repo

const { execFile } = require("child_process");
const config = require("../config");

module.exports = {
  name: "git_status",
  description: "Get git status of repo",
  inputSchema: {
    type: "object",
    properties: {},
  },
  handler() {
    return new Promise((resolve, reject) => {
      execFile("git", ["status"], { cwd: config.workspace, timeout: 10000 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      });
    });
  },
};
