// =========================
// JSON-RPC Validator
// =========================
// Strict validation for MCP JSON-RPC 2.0 requests.

/**
 * Validate incoming JSON-RPC request structure.
 * Returns an error object if invalid, null if valid.
 */
function validateJsonRpc(body) {
  if (!body || typeof body !== "object") {
    return { code: -32700, message: "Parse error: invalid JSON" };
  }

  if (body.jsonrpc !== undefined && body.jsonrpc !== "2.0") {
    return { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" };
  }

  if (!body.method || typeof body.method !== "string") {
    return { code: -32600, message: "Invalid Request: missing or invalid 'method'" };
  }

  if (body.params !== undefined && typeof body.params !== "object") {
    return { code: -32600, message: "Invalid Request: 'params' must be an object" };
  }

  return null;
}

/**
 * Create a JSON-RPC 2.0 success response.
 */
function jsonRpcSuccess(id, result) {
  return {
    jsonrpc: "2.0",
    id: id !== undefined ? id : null,
    result,
  };
}

/**
 * Create a JSON-RPC 2.0 error response.
 */
function jsonRpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id !== undefined ? id : null,
    error: {
      code: code || -32000,
      message: message || "Server error",
      ...(data ? { data } : {}),
    },
  };
}

module.exports = { validateJsonRpc, jsonRpcSuccess, jsonRpcError };
