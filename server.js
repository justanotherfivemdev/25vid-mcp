const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(express.json());

// 🔒 CONFIG
const WORKSPACE = "/workspace";
const LOG_DIR = "/opt/mcp/logs";
const DEPLOY_LOG = path.join(LOG_DIR, "deploy.log");
const MCP_LOG = path.join(LOG_DIR, "mcp.log");

// 📁 Ensure log dir exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 🧠 TOOL DEFINITIONS
const tools = [
  { name: "list_files", description: "List files in workspace directory" },
  { name: "read_file", description: "Read a file from workspace" },
  { name: "git_status", description: "Get git status of repo" },
  { name: "list_deploy_logs", description: "Get full deploy logs" },
  { name: "get_last_deploy", description: "Get recent deploy entries" }
];

// 🔒 SAFE PATH
function safePath(base, target) {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(base)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

// 🧾 LOGGING
function log(entry) {
  const line = `[${new Date().toISOString()}] ${JSON.stringify(entry)}\n`;
  fs.appendFileSync(MCP_LOG, line);
}

// 🔍 REQUEST LOGGER
app.use((req, res, next) => {
  log({ type: "http", method: req.method, path: req.url });
  next();
});


// =========================
// 🚀 MCP ENDPOINT
// =========================
app.post("/mcp", async (req, res) => {
  const { id, method, params } = req.body;

  log({ type: "mcp_request", method, params });

  try {
    // TOOL LIST
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        id,
        result: { tools }
      });
    }

    // TOOL CALL
    if (method === "tools/call") {
      const { name, arguments: args = {} } = params || {};

      // 📁 LIST FILES
      if (name === "list_files") {
        const dir = safePath(WORKSPACE, args.path || ".");
        const files = fs.readdirSync(dir);

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
          }
        });
      }

      // 📄 READ FILE
      if (name === "read_file") {
        if (!args.path) throw new Error("Missing path");

        const file = safePath(WORKSPACE, args.path);
        const content = fs.readFileSync(file, "utf-8");

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: content }]
          }
        });
      }

      // 🧠 GIT STATUS
      if (name === "git_status") {
        exec("git status", { cwd: WORKSPACE }, (err, stdout, stderr) => {
          if (err) {
            return res.json({
              jsonrpc: "2.0",
              id,
              error: { message: stderr || err.toString() }
            });
          }

          res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: stdout }]
            }
          });
        });
        return;
      }

      // 📊 DEPLOY LOGS
      if (name === "list_deploy_logs") {
        const logData = fs.existsSync(DEPLOY_LOG)
          ? fs.readFileSync(DEPLOY_LOG, "utf-8")
          : "No deploy logs";

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: logData }]
          }
        });
      }

      // 📌 LAST DEPLOY
      if (name === "get_last_deploy") {
        if (!fs.existsSync(DEPLOY_LOG)) {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: "No deploy logs" }]
            }
          });
        }

        const lines = fs.readFileSync(DEPLOY_LOG, "utf-8").split("\n");
        const last = lines.slice(-10).join("\n");

        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: last }]
          }
        });
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        error: { message: `Unknown tool: ${name}` }
      });
    }

    return res.json({
      jsonrpc: "2.0",
      id,
      error: { message: "Unknown method" }
    });

  } catch (e) {
    log({ type: "error", error: e.toString() });

    return res.json({
      jsonrpc: "2.0",
      id,
      error: { message: e.toString() }
    });
  }
});


// =========================
// 📊 DASHBOARD API
// =========================

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// MCP logs
app.get("/api/mcp/logs", (req, res) => {
  if (!fs.existsSync(MCP_LOG)) {
    return res.json({ logs: [] });
  }

  const logs = fs.readFileSync(MCP_LOG, "utf-8")
    .split("\n")
    .slice(-100);

  res.json({ logs });
});

// Deploy logs
app.get("/api/deploy/logs", (req, res) => {
  if (!fs.existsSync(DEPLOY_LOG)) {
    return res.json({ logs: [] });
  }

  const logs = fs.readFileSync(DEPLOY_LOG, "utf-8")
    .split("\n")
    .slice(-100);

  res.json({ logs });
});

// System info
app.get("/api/system", (req, res) => {
  res.json({
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});


// =========================
// 🚀 START SERVER
// =========================
app.listen(8787, "0.0.0.0", () => {
  console.log("MCP + Dashboard server running on 0.0.0.0:8787");
});
