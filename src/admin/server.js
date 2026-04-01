// =========================
// Admin MCP Server
// =========================
// Separate MCP server for admin-only operations.
// Protected by token authentication. Additional IP restrictions may be enforced at the network layer.
// All destructive actions require a confirmation step.

const express = require("express");
const config = require("../config");
const { validateJsonRpc, jsonRpcSuccess, jsonRpcError } = require("../mcp/validator");
const { log, logError } = require("../logger");

const app = express();
app.use(express.json());

// Constants
const ACTION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ========================
// Admin Authentication
// ========================

function adminAuthMiddleware(req, res, next) {
  // Skip auth for health check
  if (req.path === "/health") return next();

  const token = req.headers["x-admin-token"];
  const adminToken = process.env.MCP_ADMIN_TOKEN;

  if (!adminToken) {
    return res.status(503).json({ error: "Admin server not configured — MCP_ADMIN_TOKEN not set" });
  }

  if (!token || token !== adminToken) {
    log({ type: "admin_auth_failure", ip: req.ip, path: req.path, timestamp: new Date().toISOString() });
    return res.status(401).json({ error: "Unauthorized — invalid or missing admin token" });
  }

  next();
}

app.use(adminAuthMiddleware);

// ========================
// Pending Actions Store
// ========================

const pendingActions = new Map();
let actionCounter = 0;

function createPendingAction(action, params) {
  const id = `action_${++actionCounter}_${Date.now()}`;
  const entry = {
    id,
    action,
    params,
    status: "pending_confirmation",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ACTION_EXPIRY_MS).toISOString(),
  };
  pendingActions.set(id, entry);

  log({
    type: "admin_action_requested",
    actionId: id,
    action,
    params,
    timestamp: entry.createdAt,
  });

  return entry;
}

// Cleanup expired actions periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of pendingActions) {
    if (new Date(entry.expiresAt).getTime() < now) {
      pendingActions.delete(id);
    }
  }
}, 60 * 1000);
cleanupInterval.unref();

// ========================
// Admin Tool Definitions
// ========================

const adminTools = [
  {
    name: "request_deploy",
    description: "Request a deployment. Returns a confirmation ID that must be confirmed with confirm_deploy before execution.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Reason for deployment" },
      },
    },
  },
  {
    name: "confirm_deploy",
    description: "Confirm and execute a previously requested deployment by its action ID.",
    inputSchema: {
      type: "object",
      properties: {
        action_id: { type: "string", description: "The action ID returned by request_deploy" },
      },
      required: ["action_id"],
    },
  },
  {
    name: "restart_service",
    description: "Request a service restart. Returns a confirmation ID that must be confirmed with confirm_deploy before execution.",
    inputSchema: {
      type: "object",
      properties: {
        service: { type: "string", description: "Service to restart (default: mcp)" },
      },
    },
  },
  {
    name: "rollback_last_deploy",
    description: "Request a rollback to the previous deployment. Returns a confirmation ID that must be confirmed with confirm_deploy before execution.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Reason for rollback" },
      },
    },
  },
  {
    name: "list_pending_actions",
    description: "List all pending actions awaiting confirmation.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ========================
// Admin Tool Handlers
// ========================

const fs = require("fs");

function appendDeployLog(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(config.deployLog, line);
  } catch {
    // Log directory may not exist in test environments
  }
}

const toolHandlers = {
  request_deploy(args) {
    const entry = createPendingAction("deploy", { reason: args.reason || "Manual deploy request" });
    return {
      message: "Deploy requested. You MUST confirm this action before it executes.",
      action_id: entry.id,
      expires_at: entry.expiresAt,
      confirm_with: "Call confirm_deploy with action_id: " + entry.id,
    };
  },

  confirm_deploy(args) {
    const { action_id } = args;
    const entry = pendingActions.get(action_id);

    if (!entry) {
      throw new Error("Action not found or expired: " + action_id);
    }

    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      pendingActions.delete(action_id);
      throw new Error("Action expired: " + action_id);
    }

    // Mark as confirmed
    entry.status = "confirmed";
    entry.confirmedAt = new Date().toISOString();
    pendingActions.delete(action_id);

    log({
      type: "admin_action_confirmed",
      actionId: action_id,
      action: entry.action,
      timestamp: entry.confirmedAt,
    });

    // Execute the action
    let resultMessage;
    switch (entry.action) {
      case "deploy":
        appendDeployLog("ADMIN: Deploy confirmed — " + (entry.params.reason || "no reason"));
        resultMessage = "Deploy confirmed and logged. Use CI/CD pipeline to execute actual deployment.";
        break;
      case "restart":
        appendDeployLog("ADMIN: Service restart confirmed — " + (entry.params.service || "mcp"));
        resultMessage = "Service restart confirmed and logged. Service: " + (entry.params.service || "mcp");
        break;
      case "rollback":
        appendDeployLog("ADMIN: Rollback confirmed — " + (entry.params.reason || "no reason"));
        resultMessage = "Rollback confirmed and logged. Use CI/CD pipeline to execute rollback.";
        break;
      default:
        resultMessage = "Action confirmed: " + entry.action;
    }

    return { message: resultMessage, action_id, action: entry.action, status: "confirmed" };
  },

  restart_service(args) {
    const entry = createPendingAction("restart", { service: args.service || "mcp" });
    return {
      message: "Service restart requested. You MUST confirm this action before it executes.",
      action_id: entry.id,
      expires_at: entry.expiresAt,
      confirm_with: "Call confirm_deploy with action_id: " + entry.id,
    };
  },

  rollback_last_deploy(args) {
    const entry = createPendingAction("rollback", { reason: args.reason || "Manual rollback" });
    return {
      message: "Rollback requested. You MUST confirm this action before it executes.",
      action_id: entry.id,
      expires_at: entry.expiresAt,
      confirm_with: "Call confirm_deploy with action_id: " + entry.id,
    };
  },

  list_pending_actions() {
    const actions = [];
    for (const entry of pendingActions.values()) {
      actions.push({
        id: entry.id,
        action: entry.action,
        status: entry.status,
        created_at: entry.createdAt,
        expires_at: entry.expiresAt,
      });
    }
    return { pending_actions: actions, count: actions.length };
  },
};

// ========================
// Admin MCP Handler
// ========================

async function adminMcpHandler(req, res) {
  const body = req.body || {};
  const { id, method, params } = body;

  const validationError = validateJsonRpc(body);
  if (validationError) {
    return res.json(jsonRpcError(id, validationError.code, validationError.message));
  }

  try {
    if (method === "tools/list") {
      return res.json(jsonRpcSuccess(id, { tools: adminTools }));
    }

    if (method === "tools/call") {
      const { name, arguments: args = {} } = params || {};

      if (!name || typeof name !== "string") {
        return res.json(jsonRpcError(id, -32602, "Invalid params: missing tool 'name'"));
      }

      const handler = toolHandlers[name];
      if (!handler) {
        return res.json(jsonRpcError(id, -32601, `Unknown admin tool: ${name}`));
      }

      // Validate required args
      const toolDef = adminTools.find((t) => t.name === name);
      if (toolDef && toolDef.inputSchema && toolDef.inputSchema.required) {
        for (const field of toolDef.inputSchema.required) {
          if (args[field] === undefined || args[field] === null) {
            return res.json(jsonRpcError(id, -32602, `Missing required argument: ${field}`));
          }
        }
      }

      const result = await handler(args);
      return res.json(
        jsonRpcSuccess(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        })
      );
    }

    return res.json(jsonRpcError(id, -32601, `Unknown method: ${method}`));
  } catch (err) {
    logError({ message: err.message, stack: err.stack, context: "adminMcpHandler" });
    return res.json(jsonRpcError(id, -32000, err.message));
  }
}

// ========================
// Routes
// ========================

// Health check — used by Docker healthcheck and deploy scripts
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "mcp-admin", timestamp: new Date().toISOString() });
});

// Readiness check — for future liveness vs readiness separation
app.get("/ready", (req, res) => {
  res.json({ status: "ok", service: "mcp-admin", timestamp: new Date().toISOString() });
});

app.post("/mcp", adminMcpHandler);

// ========================
// Export
// ========================

module.exports = {
  adminApp: app,
  startAdmin(port, host) {
    port = port || parseInt(process.env.MCP_ADMIN_PORT || "8788", 10);
    host = host || process.env.MCP_ADMIN_HOST || "127.0.0.1";
    return new Promise((resolve) => {
      const server = app.listen(port, host, () => {
        console.log(`Admin MCP server running on ${host}:${port}`);
        resolve(server);
      });
    });
  },
};
