const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const fs = require("fs");
const path = require("path");

// Override config for testing
process.env.MCP_WORKSPACE = "/tmp/mcp-admin-test/workspace";
process.env.MCP_LOG_DIR = "/tmp/mcp-admin-test/logs";
process.env.MCP_ADMIN_TOKEN = "test-admin-secret-token";

const WORKSPACE = process.env.MCP_WORKSPACE;
const LOG_DIR = process.env.MCP_LOG_DIR;
const ADMIN_PORT = 8799;

function setupTestEnv() {
  fs.mkdirSync(WORKSPACE, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function post(urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: ADMIN_PORT,
        path: urlPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          ...headers,
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: JSON.parse(chunks) })
        );
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function get(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: ADMIN_PORT,
        path: urlPath,
        method: "GET",
        headers,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: JSON.parse(chunks) })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

let server;

describe("Admin MCP Server", () => {
  before(async () => {
    setupTestEnv();
    const { startAdmin } = require("../src/admin/server");
    server = await startAdmin(ADMIN_PORT, "127.0.0.1");
  });

  after(() => {
    if (server) server.close();
  });

  // ========================
  // Health
  // ========================

  describe("Health", () => {
    it("GET /health returns ok without token", async () => {
      const res = await get("/health");
      assert.strictEqual(res.body.status, "ok");
      assert.strictEqual(res.body.server, "admin-mcp");
    });
  });

  // ========================
  // Authentication
  // ========================

  describe("Authentication", () => {
    it("rejects requests without admin token", async () => {
      const res = await post("/mcp", {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      });
      assert.strictEqual(res.status, 401);
      assert.ok(res.body.error);
    });

    it("accepts requests with valid admin token", async () => {
      const res = await post(
        "/mcp",
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { "x-admin-token": "test-admin-secret-token" }
      );
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.result);
    });
  });

  // ========================
  // Admin Tools
  // ========================

  describe("Admin Tools", () => {
    const authHeader = { "x-admin-token": "test-admin-secret-token" };

    it("tools/list returns admin tools", async () => {
      const res = await post(
        "/mcp",
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        authHeader
      );
      const tools = res.body.result.tools;
      assert.ok(Array.isArray(tools));
      const names = tools.map((t) => t.name);
      assert.ok(names.includes("request_deploy"));
      assert.ok(names.includes("confirm_deploy"));
      assert.ok(names.includes("restart_service"));
      assert.ok(names.includes("rollback_last_deploy"));
      assert.ok(names.includes("list_pending_actions"));
    });

    it("request_deploy returns pending action requiring confirmation", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "request_deploy",
            arguments: { reason: "Test deploy" },
          },
        },
        authHeader
      );
      assert.ok(res.body.result);
      const data = JSON.parse(res.body.result.content[0].text);
      assert.ok(data.action_id);
      assert.ok(data.expires_at);
      assert.ok(data.message.includes("confirm"));
    });

    it("confirm_deploy confirms a pending action", async () => {
      // First request deploy
      const reqRes = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "request_deploy",
            arguments: { reason: "Confirm test" },
          },
        },
        authHeader
      );
      const reqData = JSON.parse(reqRes.body.result.content[0].text);

      // Then confirm it
      const confirmRes = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "confirm_deploy",
            arguments: { action_id: reqData.action_id },
          },
        },
        authHeader
      );
      assert.ok(confirmRes.body.result);
      const confirmData = JSON.parse(confirmRes.body.result.content[0].text);
      assert.strictEqual(confirmData.status, "confirmed");
    });

    it("confirm_deploy rejects invalid action_id", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: {
            name: "confirm_deploy",
            arguments: { action_id: "nonexistent_123" },
          },
        },
        authHeader
      );
      assert.ok(res.body.error);
    });

    it("confirm_deploy requires action_id argument", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 6,
          method: "tools/call",
          params: { name: "confirm_deploy", arguments: {} },
        },
        authHeader
      );
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, -32602);
    });

    it("restart_service returns pending action", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: {
            name: "restart_service",
            arguments: { service: "mcp" },
          },
        },
        authHeader
      );
      const data = JSON.parse(res.body.result.content[0].text);
      assert.ok(data.action_id);
      assert.ok(data.message.includes("confirm"));
    });

    it("rollback_last_deploy returns pending action", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 8,
          method: "tools/call",
          params: {
            name: "rollback_last_deploy",
            arguments: { reason: "Test rollback" },
          },
        },
        authHeader
      );
      const data = JSON.parse(res.body.result.content[0].text);
      assert.ok(data.action_id);
      assert.ok(data.message.includes("confirm"));
    });

    it("list_pending_actions shows pending items", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: "list_pending_actions", arguments: {} },
        },
        authHeader
      );
      const data = JSON.parse(res.body.result.content[0].text);
      assert.ok(Array.isArray(data.pending_actions));
      assert.ok(data.count >= 0);
    });

    it("rejects unknown admin tool", async () => {
      const res = await post(
        "/mcp",
        {
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: { name: "nonexistent_tool", arguments: {} },
        },
        authHeader
      );
      assert.ok(res.body.error);
      assert.strictEqual(res.body.error.code, -32601);
    });
  });
});
