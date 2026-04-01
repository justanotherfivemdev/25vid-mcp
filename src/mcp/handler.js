// =========================
// MCP Request Handler
// =========================
// Handles JSON-RPC MCP protocol requests (tools/list, tools/call).

const registry = require("./registry");
const { validateJsonRpc, jsonRpcSuccess, jsonRpcError } = require("./validator");
const { logToolCall, logError } = require("../logger");
const config = require("../config");

/**
 * Express route handler for POST /mcp.
 * Processes MCP JSON-RPC requests for tool listing and tool execution.
 */
async function mcpHandler(req, res) {
  const { id, method, params } = req.body;
  const requestId = req.requestId;

  // Validate JSON-RPC structure
  const validationError = validateJsonRpc(req.body);
  if (validationError) {
    return res.json(jsonRpcError(id, validationError.code, validationError.message));
  }

  try {
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
    return res.json(jsonRpcError(id, -32601, `Unknown method: ${method}`));
  } catch (err) {
    logError({
      requestId,
      message: err.message,
      stack: err.stack,
      context: "mcpHandler",
    });

    return res.json(jsonRpcError(id, -32603, "Internal error"));
  }
}

module.exports = { mcpHandler };
