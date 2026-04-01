// =========================
// Tool Registry
// =========================
// Centralized registry for all MCP tools.
// Tools are registered with metadata, input schema, scope, and handler.
// This enables clean extensibility and future admin MCP separation.

const config = require("../config");

class ToolRegistry {
  constructor() {
    this._tools = new Map();
  }

  /**
   * Register a tool.
   * @param {object} tool
   * @param {string} tool.name - Unique tool name
   * @param {string} tool.description - Human-readable description
   * @param {object} tool.inputSchema - JSON Schema for input validation
   * @param {string} tool.scope - Tool scope (public or admin)
   * @param {function} tool.handler - Async function(args, context) => result
   */
  register({ name, description, inputSchema, scope, handler }) {
    if (this._tools.has(name)) {
      throw new Error(`Tool already registered: ${name}`);
    }
    this._tools.set(name, {
      name,
      description,
      inputSchema: inputSchema || { type: "object", properties: {} },
      scope: scope || config.toolScopes.public,
      handler,
    });
  }

  /**
   * Get the tool list for a given scope (for tools/list response).
   * Returns tool definitions without handlers.
   */
  listTools(scope = config.toolScopes.public) {
    const result = [];
    for (const tool of this._tools.values()) {
      if (tool.scope === scope) {
        result.push({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        });
      }
    }
    return result;
  }

  /**
   * Get a tool by name, optionally filtered by scope.
   */
  getTool(name, scope = config.toolScopes.public) {
    const tool = this._tools.get(name);
    if (!tool || tool.scope !== scope) return null;
    return tool;
  }

  /**
   * Validate tool arguments against the input schema.
   * Basic JSON Schema validation for required fields and types.
   */
  validateArgs(tool, args) {
    const schema = tool.inputSchema;
    if (!schema || !schema.properties) return null;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (args[field] === undefined || args[field] === null) {
          return `Missing required argument: ${field}`;
        }
      }
    }

    // Check types of provided fields
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (args[key] !== undefined && prop.type) {
        const actual = typeof args[key];
        if (prop.type === "integer" && (actual !== "number" || !Number.isInteger(args[key]))) {
          return `Argument '${key}' must be an integer`;
        } else if (prop.type !== "integer" && actual !== prop.type) {
          return `Argument '${key}' must be of type ${prop.type}, got ${actual}`;
        }
      }
    }

    return null; // Valid
  }
}

// Singleton registry
const registry = new ToolRegistry();

module.exports = registry;
