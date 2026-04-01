// =========================
// MCP Tool: project_knowledge
// =========================
// Persistent knowledge base stored as a JSON file.
// Allows the AI to store and retrieve context, notes,
// conventions, and project knowledge across sessions.

const fs = require("fs");
const path = require("path");
const config = require("../config");

const KNOWLEDGE_FILE = path.join(config.logDir, "knowledge.json");

function loadKnowledge() {
  try {
    const data = fs.readFileSync(KNOWLEDGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { entries: [], updatedAt: null };
  }
}

function saveKnowledge(kb) {
  kb.updatedAt = new Date().toISOString();
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(kb, null, 2));
}

module.exports = {
  name: "project_knowledge",
  description:
    "Persistent knowledge base for the 25th community. Store and retrieve project conventions, coding patterns, notes, and context across sessions. Actions: 'list', 'search', 'add', 'remove'.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Action to perform: 'list', 'search', 'add', 'remove' (default: list)",
      },
      key: {
        type: "string",
        description: "Knowledge entry key/topic (required for add/remove)",
      },
      value: {
        type: "string",
        description: "Knowledge content (required for add)",
      },
      category: {
        type: "string",
        description: "Category: 'convention', 'pattern', 'note', 'config', 'reference' (default: note)",
      },
      query: {
        type: "string",
        description: "Search query (for search action)",
      },
    },
  },
  scope: "public",
  handler: async (args) => {
    const action = (args.action || "list").toLowerCase();
    const kb = loadKnowledge();

    switch (action) {
      case "list": {
        return JSON.stringify({
          total: kb.entries.length,
          updatedAt: kb.updatedAt,
          entries: kb.entries.map((e) => ({
            key: e.key,
            category: e.category,
            preview: e.value.substring(0, 100),
            addedAt: e.addedAt,
          })),
        }, null, 2);
      }

      case "search": {
        const query = (args.query || "").toLowerCase();
        if (!query) {
          throw new Error("Missing 'query' parameter for search action");
        }
        const results = kb.entries.filter(
          (e) =>
            e.key.toLowerCase().includes(query) ||
            e.value.toLowerCase().includes(query) ||
            e.category.toLowerCase().includes(query)
        );
        return JSON.stringify({
          query,
          results: results.length,
          entries: results,
        }, null, 2);
      }

      case "add": {
        if (!args.key) throw new Error("Missing 'key' parameter for add action");
        if (!args.value) throw new Error("Missing 'value' parameter for add action");

        // Update existing or add new
        const existing = kb.entries.findIndex((e) => e.key === args.key);
        const entry = {
          key: args.key,
          value: args.value,
          category: args.category || "note",
          addedAt: new Date().toISOString(),
        };

        if (existing >= 0) {
          entry.addedAt = kb.entries[existing].addedAt;
          entry.updatedAt = new Date().toISOString();
          kb.entries[existing] = entry;
        } else {
          kb.entries.push(entry);
        }

        saveKnowledge(kb);
        return JSON.stringify({
          status: existing >= 0 ? "updated" : "added",
          entry,
          total: kb.entries.length,
        }, null, 2);
      }

      case "remove": {
        if (!args.key) throw new Error("Missing 'key' parameter for remove action");
        const idx = kb.entries.findIndex((e) => e.key === args.key);
        if (idx < 0) {
          throw new Error("Knowledge entry not found: " + args.key);
        }
        const removed = kb.entries.splice(idx, 1)[0];
        saveKnowledge(kb);
        return JSON.stringify({ status: "removed", entry: removed, total: kb.entries.length }, null, 2);
      }

      default:
        throw new Error("Unknown action: " + action + ". Use 'list', 'search', 'add', or 'remove'.");
    }
  },
};
