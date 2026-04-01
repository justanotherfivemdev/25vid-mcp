// Tool: get_git_diff — Show uncommitted changes in workspace

const { execFile } = require("child_process");
const config = require("../config");

module.exports = {
  name: "get_git_diff",
  description: "Get uncommitted git diff of workspace",
  inputSchema: {
    type: "object",
    properties: {
      staged: { type: "boolean", description: "Show only staged changes (default: false)" },
    },
  },
  handler(args) {
    return new Promise((resolve, reject) => {
      const gitArgs = ["diff"];
      if (args.staged) gitArgs.push("--cached");

      execFile("git", gitArgs, { cwd: config.workspace, timeout: 10000, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout || "No changes");
      });
    });
  },
};
