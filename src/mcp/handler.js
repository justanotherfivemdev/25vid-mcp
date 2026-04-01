// =========================
// MCP Request Handler
// =========================
// Handles JSON-RPC MCP protocol requests including the full MCP lifecycle:
// initialize, notifications/initialized, ping, tools/list, tools/call.
// Supports the Streamable HTTP transport (POST, GET SSE, DELETE session).

const crypto = require("crypto");
const registry = require("./registry");
const { validateJsonRpc, jsonRpcSuccess, jsonRpcError } = require("./validator");
const { logToolCall, logError } = require("../logger");
const config = require("../config");

const PROTOCOL_VERSION = "2025-03-26";

// Active sessions: sessionId -> { initialized: boolean, createdAt: number }
const sessions = new Map();

// SSE clients: sessionId -> Set of response objects
const sseClients = new Map();

/**
 * Clean up expired sessions (older than 30 minutes).
 */
setInterval(() => {
  const maxAge = 30 * 60 * 1000;
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > maxAge) {
      sessions.delete(id);
      sseClients.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Express route handler for POST /mcp.
 * Processes MCP JSON-RPC requests for the full protocol lifecycle.
 */
async function mcpHandler(req, res) {
  const { id, method, params } = req.body;
  const requestId = req.requestId;
  const isNotification = id === undefined;

  // Validate JSON-RPC structure (always return errors for malformed requests)
  const validationError = validateJsonRpc(req.body);
  if (validationError) {
    return res.json(jsonRpcError(id, validationError.code, validationError.message));
  }

  try {
    // ---- MCP Lifecycle: initialize ----
    if (method === "initialize") {
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { initialized: false, createdAt: Date.now() });

      res.setHeader("Mcp-Session-Id", sessionId);
      return res.json(
        jsonRpcSuccess(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "25vid-mcp",
            version: "2.0.0",
          },
        })
      );
    }

    // ---- MCP Lifecycle: notifications/initialized ----
    if (method === "notifications/initialized") {
      const sessionId = req.headers["mcp-session-id"];
      if (sessionId && sessions.has(sessionId)) {
        sessions.get(sessionId).initialized = true;
      }
      // Notifications get no JSON-RPC response body
      return res.status(204).end();
    }

    // ---- MCP Lifecycle: ping ----
    if (method === "ping") {
      return res.json(jsonRpcSuccess(id, {}));
    }

    // ---- MCP Lifecycle: notifications/cancelled ----
    if (method === "notifications/cancelled") {
      return res.status(204).end();
    }

    // Handle tools/list
    if (method === "tools/list") {
      const tools = registry.listTools(config.toolScopes.public);
      return res.json(jsonRpcSuccess(id, { tools }));
    }

    // Handle tools/call
    if (method === "tools/call") {
      const { name, arguments: args = {} } = params || {};

      if (!name || typeof name !== "string") {
        return res.json(jsonRpcError(id, -32602, "Invalid params: missing tool 'name'"));
      }

      const tool = registry.getTool(name, config.toolScopes.public);
      if (!tool) {
        return res.json(jsonRpcError(id, -32601, `Unknown tool: ${name}`));
      }

      // Validate arguments against tool schema
      const argError = registry.validateArgs(tool, args);
      if (argError) {
        return res.json(jsonRpcError(id, -32602, argError));
      }

      // Execute tool with timing
      const start = Date.now();
      try {
        const result = await tool.handler(args, { requestId });
        const durationMs = Date.now() - start;

        logToolCall({
          requestId,
          tool: name,
          args,
          success: true,
          durationMs,
        });

        return res.json(
          jsonRpcSuccess(id, {
            content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }],
          })
        );
      } catch (toolErr) {
        const durationMs = Date.now() - start;

        logToolCall({
          requestId,
          tool: name,
          args,
          success: false,
          error: toolErr.message,
          durationMs,
        });

        return res.json(jsonRpcError(id, -32000, toolErr.message));
      }
    }

    // Unknown method
    if (isNotification) return res.status(204).end();
    return res.json(jsonRpcError(id, -32601, `Unknown method: ${method}`));
  } catch (err) {
    logError({
      requestId,
      message: err.message,
      stack: err.stack,
      context: "mcpHandler",
    });

    if (isNotification) return res.status(204).end();
    return res.json(jsonRpcError(id, -32603, "Internal error"));
  }
}

/**
 * Express route handler for GET /mcp (SSE stream).
 * Opens a Server-Sent Events stream for server-initiated messages.
 */
function mcpSseHandler(req, res) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).json({ error: "Missing or invalid Mcp-Session-Id header" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // Register this SSE client
  if (!sseClients.has(sessionId)) {
    sseClients.set(sessionId, new Set());
  }
  sseClients.get(sessionId).add(res);

  // Clean up when client disconnects
  req.on("close", () => {
    const clients = sseClients.get(sessionId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(sessionId);
    }
  });
}

/**
 * Express route handler for DELETE /mcp (session termination).
 * Terminates an active MCP session.
 */
function mcpDeleteHandler(req, res) {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).json({ error: "Missing or invalid Mcp-Session-Id header" });
  }

  // Close any open SSE connections for this session
  const clients = sseClients.get(sessionId);
  if (clients) {
    for (const client of clients) {
      client.end();
    }
    sseClients.delete(sessionId);
  }

  sessions.delete(sessionId);
  return res.status(204).end();
}

module.exports = { mcpHandler, mcpSseHandler, mcpDeleteHandler, sessions, sseClients };
