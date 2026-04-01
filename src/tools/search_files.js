// Tool: search_files — Grep-like search inside workspace files

const { execFile } = require("child_process");
const config = require("../config");

module.exports = {
  name: "search_files",
  description: "Search for text patterns in workspace files (grep-like)",
  inputSchema: {
    type: "object",
    properties: {
      pattern: { type: "string", description: "Search pattern (text or regex)" },
      path: { type: "string", description: "Relative subdirectory to search (default: entire workspace)" },
      include: { type: "string", description: "File glob filter, e.g. '*.js'" },
    },
    required: ["pattern"],
  },
  handler(args) {
    return new Promise((resolve, reject) => {
      const searchDir = args.path
        ? require("path").resolve(config.workspace, args.path)
        : config.workspace;

      // Verify search dir is within workspace
      if (!searchDir.startsWith(config.workspace)) {
        return reject(new Error("Search path escapes workspace"));
      }

      const grepArgs = ["-r", "-n", "-l", "--max-count=50"];
      if (args.include) {
        grepArgs.push(`--include=${args.include}`);
      }
      grepArgs.push("--", args.pattern, searchDir);

      execFile("grep", grepArgs, { timeout: 10000, maxBuffer: 1024 * 512 }, (err, stdout) => {
        if (err && !stdout) {
          // grep returns exit code 1 when no matches found
          if (err.code === 1) return resolve("No matches found");
          return reject(new Error(err.message));
        }

        // Convert absolute paths to relative
        const results = stdout
          .split("\n")
          .filter(Boolean)
          .map((line) => line.replace(config.workspace + "/", ""))
          .slice(0, config.maxSearchResults);

        resolve(results.join("\n") || "No matches found");
      });
    });
  },
};
