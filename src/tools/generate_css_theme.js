// =========================
// MCP Tool: generate_css_theme
// =========================
// Generates CSS custom property themes for web projects.

module.exports = {
  name: "generate_css_theme",
  description:
    "Generate a CSS custom properties theme (variables) for web projects. Supports dark, light, military, neon, and minimal styles.",
  inputSchema: {
    type: "object",
    properties: {
      style: {
        type: "string",
        description: "Theme style: 'dark', 'light', 'military', 'neon', 'minimal' (default: dark)",
      },
      prefix: {
        type: "string",
        description: "CSS variable prefix (default: none)",
      },
    },
  },
  scope: "public",
  handler: async (args) => {
    const style = (args.style || "dark").toLowerCase();
    const prefix = args.prefix ? args.prefix + "-" : "";

    const themes = {
      dark: {
        bg: "#0f172a", surface: "#1e293b", text: "#e2e8f0", "text-dim": "#94a3b8",
        accent: "#38bdf8", success: "#4ade80", warning: "#fbbf24", error: "#f87171", border: "#334155",
      },
      light: {
        bg: "#ffffff", surface: "#f8fafc", text: "#1e293b", "text-dim": "#64748b",
        accent: "#0ea5e9", success: "#22c55e", warning: "#f59e0b", error: "#ef4444", border: "#e2e8f0",
      },
      military: {
        bg: "#0a0e13", surface: "#111820", text: "#d4dce8", "text-dim": "#6e7f94",
        accent: "#4ade80", success: "#4ade80", warning: "#d4a843", error: "#ef4444", border: "#1e2a3a",
      },
      neon: {
        bg: "#0a0a0a", surface: "#141414", text: "#f0f0f0", "text-dim": "#888888",
        accent: "#00ff88", success: "#00ff88", warning: "#ffaa00", error: "#ff3366", border: "#222222",
      },
      minimal: {
        bg: "#fafafa", surface: "#ffffff", text: "#333333", "text-dim": "#999999",
        accent: "#111111", success: "#059669", warning: "#d97706", error: "#dc2626", border: "#eeeeee",
      },
    };

    const theme = themes[style];
    if (!theme) {
      return JSON.stringify({ error: "Unknown style: " + style, available: Object.keys(themes) });
    }

    const lines = [":root {"];
    for (const [key, value] of Object.entries(theme)) {
      lines.push(`  --${prefix}${key}: ${value};`);
    }
    lines.push("}");

    return lines.join("\n");
  },
};
