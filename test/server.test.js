const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

// Override config for testing
process.env.MCP_WORKSPACE = "/tmp/mcp-test-suite/workspace";
process.env.MCP_LOG_DIR = "/tmp/mcp-test-suite/logs";

const fs = require("fs");
const path = require("path");

// Setup test workspace
const WORKSPACE = process.env.MCP_WORKSPACE;
const LOG_DIR = process.env.MCP_LOG_DIR;

function setupTestWorkspace() {
  fs.mkdirSync(path.join(WORKSPACE, "subdir"), { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(path.join(WORKSPACE, "test.txt"), "Hello World\n");
  fs.writeFileSync(path.join(WORKSPACE, "subdir", "app.js"), "console.log('hi');\n");
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { hostname: "127.0.0.1", port: 8787, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(chunks), headers: res.headers }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:8787${path}`, (res) => {
      let chunks = "";
      res.on("data", (c) => (chunks += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(chunks), headers: res.headers }));
    }).on("error", reject);
  });
}

let server;

describe("MCP Server", () => {
  before(async () => {
    setupTestWorkspace();
    // Start server
    const app = require("../server");
  });

  // ========================
  // Health & Dashboard
  // ========================

  describe("Health & Dashboard", () => {
    it("GET /health returns ok", async () => {
      const res = await get("/health");
      assert.strictEqual(res.body.status, "ok");
    });

    it("GET /api/system returns uptime", async () => {
      const res = await get("/api/system");
      assert.ok(typeof res.body.uptime === "number");
      assert.ok(res.body.timestamp);
    });

    it("GET /api/system/health returns extended metrics", async () => {
      const res = await get("/api/system/health");
      assert.strictEqual(res.body.status, "ok");
      assert.ok(res.body.memory);
      assert.ok(res.body.os);
      assert.ok(res.body.nodeVersion);
    });

    it("GET /api/deploy/status returns structured response", async () => {
      const res = await get("/api/deploy/status");
      assert.ok("hasLogs" in res.body);
      assert.ok("totalEntries" in res.body);
      assert.ok(Array.isArray(res.body.recentEntries));
    });

    it("GET /api/mcp/logs returns array", async () => {
      const res = await get("/api/mcp/logs");
      assert.ok(Array.isArray(res.body.logs));
    });

    it("GET /api/deploy/logs returns array", async () => {
      const res = await get("/api/deploy/logs");
      assert.ok(Array.isArray(res.body.logs));
    });
  });

  // ========================
  // MCP Protocol
  // ========================

  describe("MCP Protocol", () => {
    it("tools/list returns all tools with schemas", async () => {
      const res = await post("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" });
      assert.strictEqual(res.body.jsonrpc, "2.0");
      assert.strictEqual(res.body.id, 1);
      assert.ok(Array.isArray(res.body.result.tools));
      assert.ok(res.body.result.tools.length >= 10);

      // All tools have inputSchema
      for (const tool of res.body.result.tools) {
        assert.ok(tool.name);
        assert.ok(tool.description);
        assert.ok(tool.inputSchema);
      }
    });

    it("rejects invalid method type", async () => {
      const res = await post("/mcp", { method: 123 });
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, -32600);
    });

    it("returns error for unknown method", async () => {
      const res = await post("/mcp", { jsonrpc: "2.0", id: 1, method: "fake/method" });
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, -32601);
    });

    it("returns error for unknown tool", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "nonexistent", arguments: {} },
      });
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, -32601);
    });

    it("validates required arguments", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "read_file", arguments: {} },
      });
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, -32602);
      assert.ok(res.body.error.message.includes("path"));
    });

    it("includes request ID header", async () => {
      const res = await post("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" });
      assert.ok(res.headers["x-request-id"]);
    });
  });

  // ========================
  // Tool Execution
  // ========================

  describe("Tools", () => {
    it("list_files returns workspace contents", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "list_files", arguments: {} },
      });
      assert.ok(res.body.result);
      const files = JSON.parse(res.body.result.content[0].text);
      assert.ok(files.includes("test.txt"));
    });

    it("read_file returns file content", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "read_file", arguments: { path: "test.txt" } },
      });
      assert.ok(res.body.result);
      assert.ok(res.body.result.content[0].text.includes("Hello World"));
    });

    it("get_file_tree returns directory structure", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "get_file_tree", arguments: {} },
      });
      assert.ok(res.body.result);
      const tree = JSON.parse(res.body.result.content[0].text);
      assert.ok(Array.isArray(tree));
      const dir = tree.find((e) => e.name === "subdir");
      assert.ok(dir);
      assert.strictEqual(dir.type, "directory");
    });

    it("get_file_metadata returns file info", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "get_file_metadata", arguments: { path: "test.txt" } },
      });
      assert.ok(res.body.result);
      const meta = JSON.parse(res.body.result.content[0].text);
      assert.strictEqual(meta.isFile, true);
      assert.ok(meta.size > 0);
      assert.ok(meta.modified);
    });

    it("search_files finds matching files", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "search_files", arguments: { pattern: "Hello" } },
      });
      assert.ok(res.body.result);
      assert.ok(res.body.result.content[0].text.includes("test.txt"));
    });

    it("list_deploy_logs handles missing log gracefully", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "list_deploy_logs", arguments: {} },
      });
      assert.ok(res.body.result);
      assert.strictEqual(res.body.result.content[0].text, "No deploy logs");
    });

    it("get_last_deploy handles missing log gracefully", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "get_last_deploy", arguments: {} },
      });
      assert.ok(res.body.result);
      assert.strictEqual(res.body.result.content[0].text, "No deploy logs");
    });
  });

  // ========================
  // Security
  // ========================

  describe("Security", () => {
    it("blocks directory traversal via ../", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "read_file", arguments: { path: "../../etc/passwd" } },
      });
      assert.ok(res.body.error);
      assert.ok(res.body.error.message.includes("traversal"));
    });

    it("blocks absolute path escape", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: { name: "read_file", arguments: { path: "/etc/passwd" } },
      });
      assert.ok(res.body.error);
    });
  });

  // ========================
  // Activity Tracking
  // ========================

  describe("Activity Tracking", () => {
    it("GET /api/mcp/activity returns recent tool calls", async () => {
      // Make a tool call first
      await post("/mcp", {
        jsonrpc: "2.0", id: 99, method: "tools/call",
        params: { name: "list_files", arguments: {} },
      });

      // Wait briefly for async log write
      await new Promise((r) => setTimeout(r, 100));

      const res = await get("/api/mcp/activity");
      assert.ok(Array.isArray(res.body.activity));
      assert.ok(res.body.activity.length > 0);

      const entry = res.body.activity[res.body.activity.length - 1];
      assert.ok(entry.timestamp);
      assert.ok(entry.tool);
      assert.ok(entry.requestId);
      assert.strictEqual(entry.type, "tool_call");
    });
  });
});
