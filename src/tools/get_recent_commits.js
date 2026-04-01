// Tool: get_recent_commits — Show recent git commit history

const { execFile } = require("child_process");
const config = require("../config");

module.exports = {
  name: "get_recent_commits",
  description: "Get recent git commits from workspace",
  inputSchema: {
    type: "object",
    properties: {
      count: { type: "integer", description: "Number of commits to show (default: 10, max: 50)" },
    },
  },
  handler(args) {
    const count = Math.min(Math.max(args.count || 10, 1), 50);
    return new Promise((resolve, reject) => {
      execFile(
        "git",
        ["log", `--oneline`, `-n`, String(count), "--format=%h %ai %s"],
        { cwd: config.workspace, timeout: 10000 },
        (err, stdout, stderr) => {
          if (err) return reject(new Error(stderr || err.message));
          resolve(stdout || "No commits found");
        }
      );
    });
  },
};
