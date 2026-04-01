// =========================
// MCP Tool: enfusion_guide
// =========================
// Reference guide for Enfusion engine modding via the
// Enfusion MCP integration. Provides quick-access documentation,
// tool listings, setup instructions, and workflow patterns for
// Arma Reforger mod development.

module.exports = {
  name: "enfusion_guide",
  description:
    "Enfusion engine modding reference guide. Provides setup instructions, tool listings, workflow patterns, and quick-start templates for Arma Reforger mod development using the Enfusion MCP.",
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description:
          "Topic to look up: 'overview', 'setup', 'tools', 'workflows', 'templates', 'config' (default: overview)",
      },
      tool_name: {
        type: "string",
        description:
          "Specific Enfusion MCP tool name to get details on (e.g., 'api_search', 'script_create', 'wb_launch')",
      },
    },
  },
  scope: "public",
  handler: async (args) => {
    const topic = (args.topic || "overview").toLowerCase();

    if (args.tool_name) {
      return getToolDetail(args.tool_name.toLowerCase());
    }

    const topics = {
      overview: getOverview,
      setup: getSetup,
      tools: getToolListing,
      workflows: getWorkflows,
      templates: getTemplates,
      config: getConfig,
    };

    const fn = topics[topic];
    if (!fn) {
      return JSON.stringify(
        {
          error: "Unknown topic: " + topic,
          available: Object.keys(topics),
        },
        null,
        2
      );
    }

    return JSON.stringify(fn(), null, 2);
  },
};

function getOverview() {
  return {
    name: "Enfusion MCP",
    description:
      "Model Context Protocol server for Enfusion engine modding. Enables AI-assisted Arma Reforger mod development through natural language — API research, code generation, project scaffolding, and live Workbench control.",
    version: "0.10.0",
    repository: "https://github.com/steffenbk/enfusion-mcp-BK",
    engine: "Enfusion (Bohemia Interactive)",
    supported_games: ["Arma Reforger"],
    tool_count: 49,
    categories: [
      {
        name: "Research & Documentation",
        description:
          "Search 8,693+ Enfusion API classes, browse wiki guides, and access the modding knowledge base",
        tools: [
          "api_search",
          "component_search",
          "wiki_search",
          "wiki_read",
          "wb_knowledge",
          "asset_search",
        ],
      },
      {
        name: "Code Generation",
        description:
          "Generate Enforce Script files, prefabs, UI layouts, configs, and complete mod scaffolds",
        tools: [
          "mod",
          "script_create",
          "prefab",
          "layout_create",
          "config_create",
          "scenario_create",
        ],
      },
      {
        name: "Project Management",
        description:
          "Browse, read, write, validate, and build mod projects",
        tools: ["project", "mod", "server_config"],
      },
      {
        name: "Game Asset Access",
        description:
          "Browse and read base game files including .pak archives",
        tools: ["game_browse", "game_read", "game_duplicate", "asset_search"],
      },
      {
        name: "Live Workbench Control",
        description:
          "Control the Enfusion Workbench editor over TCP — create entities, manage scenes, test in-editor",
        tools: [
          "wb_launch",
          "wb_connect",
          "wb_state",
          "wb_play",
          "wb_stop",
          "wb_save",
          "wb_entity_create",
          "wb_entity_modify",
          "wb_entity_list",
          "wb_component",
          "wb_prefabs",
          "wb_animation_graph",
        ],
      },
    ],
    guided_workflows: ["/create-mod", "/modify-mod"],
  };
}

function getSetup() {
  return {
    title: "Enfusion MCP Setup Guide",
    installation: {
      claude_code: 'claude mcp add --scope user enfusion-mcp -- npx -y enfusion-mcp',
      claude_desktop: {
        description: "Add to claude_desktop_config.json:",
        config: {
          mcpServers: {
            "enfusion-mcp": {
              command: "npx",
              args: ["-y", "enfusion-mcp"],
            },
          },
        },
      },
    },
    requirements: [
      "Node.js 20+",
      "Arma Reforger Tools (Steam) — needed for building and Workbench control",
      "Arma Reforger (Steam) — for game asset access",
    ],
    environment_variables: {
      ENFUSION_PROJECT_PATH: "Default mod output directory",
      ENFUSION_WORKBENCH_PATH: "Path to Arma Reforger Tools",
      ENFUSION_GAME_PATH: "Arma Reforger game install path",
      ENFUSION_WORKBENCH_HOST: "NET API host (default: 127.0.0.1)",
      ENFUSION_WORKBENCH_PORT: "NET API port (default: 5775)",
    },
    config_file: "~/.enfusion-mcp/config.json",
  };
}

function getToolListing() {
  return {
    total_tools: 49,
    research: [
      { name: "api_search", description: "Search 8,693 Enfusion/Arma Reforger classes and methods with inheritance hierarchy" },
      { name: "component_search", description: "Filter ScriptComponent descendants by category (character, vehicle, weapon, AI, UI, etc.)" },
      { name: "wiki_search", description: "Search 250+ tutorials and guides from Enfusion engine docs" },
      { name: "wiki_read", description: "Read full wiki page content with code examples" },
      { name: "wb_knowledge", description: "Search bundled modding knowledge base with patterns" },
      { name: "asset_search", description: "Search game assets by name (loose files and .pak archives)" },
    ],
    generation: [
      { name: "mod", description: "Scaffold complete addon with directory structure and .gproj (actions: create/build/validate)" },
      { name: "script_create", description: "Generate Enforce Script (.c) files — component, gamemode, action, entity, manager, modded, basic" },
      { name: "prefab", description: "Generate/inspect Entity Template (.et) prefabs (actions: create/inspect)" },
      { name: "layout_create", description: "Generate UI layout (.layout) files — HUD, menu, dialog, list, custom" },
      { name: "config_create", description: "Generate config files for factions, missions, entity catalogs, editor placeables" },
      { name: "scenario_create", description: "Create scenario definitions (types: base/objective)" },
    ],
    project: [
      { name: "project", description: "Browse, read, and write project files (actions: browse/read/write)" },
      { name: "server_config", description: "Generate dedicated server config for local testing" },
    ],
    game_assets: [
      { name: "game_browse", description: "Browse base game files — loose files and .pak archives" },
      { name: "game_read", description: "Read base game files (scripts, prefabs, configs)" },
      { name: "game_duplicate", description: "Duplicate/copy base game assets for modding" },
    ],
    workbench: [
      { name: "wb_launch", description: "Start Workbench and wait for NET API" },
      { name: "wb_connect", description: "Test connection to Workbench" },
      { name: "wb_diagnose", description: "Run diagnostics on Workbench connection" },
      { name: "wb_state", description: "Get full state snapshot (mode, world, entities, selection)" },
      { name: "wb_play", description: "Switch to game mode (Play in Editor)" },
      { name: "wb_stop", description: "Return to edit mode" },
      { name: "wb_save", description: "Save current world" },
      { name: "wb_undo_redo", description: "Undo or redo last action" },
      { name: "wb_entity_create", description: "Create entity from prefab at position" },
      { name: "wb_entity_delete", description: "Delete entity by name" },
      { name: "wb_entity_list", description: "List and search entities in world" },
      { name: "wb_entity_inspect", description: "Get entity details (properties, components, children)" },
      { name: "wb_entity_modify", description: "Move, rotate, rename, reparent, set/get properties" },
      { name: "wb_entity_select", description: "Select, deselect, manage selection" },
      { name: "wb_entity_duplicate", description: "Duplicate entities" },
      { name: "wb_component", description: "Add/remove/list entity components" },
      { name: "wb_resources", description: "Register resources, rebuild database" },
      { name: "wb_prefabs", description: "Create templates, save, GUID lookup" },
      { name: "wb_animation_graph", description: "Manage animation graphs (actions: author/inspect/setup)" },
      { name: "wb_open_resource", description: "Open resource in its editor" },
      { name: "wb_reload", description: "Reload scripts or plugins without restarting" },
      { name: "wb_script_editor", description: "Read/write lines in open script file" },
      { name: "wb_clipboard", description: "Copy, cut, paste, duplicate entities" },
      { name: "wb_layers", description: "Create, delete, rename layers, set visibility" },
      { name: "wb_terrain", description: "Query terrain height and world bounds" },
      { name: "wb_localization", description: "String table CRUD for localization" },
    ],
  };
}

function getWorkflows() {
  return {
    title: "Common Enfusion Modding Workflows",
    workflows: [
      {
        name: "Create a New Mod",
        steps: [
          "Use 'mod' tool with action: 'create' to scaffold the mod structure",
          "Use 'script_create' to generate script files (.c) for game logic",
          "Use 'prefab' with action: 'create' to generate entity templates (.et)",
          "Use 'config_create' for faction, mission, or catalog configs",
          "Use 'mod' with action: 'validate' to check project structure",
          "Use 'mod' with action: 'build' to compile the addon",
        ],
      },
      {
        name: "Research an API",
        steps: [
          "Use 'api_search' to find classes and methods by name",
          "Use 'component_search' to browse components by category",
          "Use 'wiki_search' to find tutorials and guides",
          "Use 'wiki_read' to read full guide content with examples",
        ],
      },
      {
        name: "Live Editor Session",
        steps: [
          "Use 'wb_launch' to start Workbench",
          "Use 'wb_connect' to verify connection",
          "Use 'wb_entity_create' to place entities in the world",
          "Use 'wb_entity_modify' to adjust positions, rotations, properties",
          "Use 'wb_play' to test in-editor",
          "Use 'wb_stop' to return to edit mode",
          "Use 'wb_save' to save changes",
        ],
      },
      {
        name: "Modify Base Game Assets",
        steps: [
          "Use 'game_browse' to explore base game file structure",
          "Use 'asset_search' to find specific assets",
          "Use 'game_read' to inspect the original file",
          "Use 'game_duplicate' to copy the asset into your mod",
          "Use 'project' with action: 'write' to apply modifications",
        ],
      },
    ],
  };
}

function getTemplates() {
  return {
    title: "Quick-Start Template Examples",
    templates: [
      {
        name: "HUD Widget",
        description: "Create a HUD widget showing player health and stamina",
        prompt: "Create a HUD widget that shows player health and stamina",
        tools_used: ["script_create", "layout_create", "prefab"],
      },
      {
        name: "Custom Faction",
        description: "Create a new faction with custom soldiers and loadouts",
        prompt: "Create a custom faction called CSAT with desert camo soldiers",
        tools_used: ["config_create", "prefab", "script_create"],
      },
      {
        name: "Game Mode",
        description: "Create a wave-based survival game mode",
        prompt: "Make a zombie survival game mode with wave spawning",
        tools_used: ["script_create", "scenario_create", "config_create", "prefab"],
      },
      {
        name: "Vehicle Mod",
        description: "Add a custom vehicle to the game",
        prompt: "Create a custom helicopter with weapons",
        tools_used: ["prefab", "script_create", "config_create", "wb_animation_graph"],
      },
      {
        name: "Interactive Object",
        description: "Create an interactive object players can use",
        prompt: "Create an ammo crate that players can open and take items from",
        tools_used: ["prefab", "script_create", "layout_create"],
      },
    ],
    mod_templates: [
      "blank — Empty project scaffold",
      "weapon — Weapon mod with prefab and script",
      "vehicle — Vehicle mod setup",
      "gamemode — Game mode with scenario",
      "faction — Custom faction config",
      "ui — HUD/menu widget",
      "building — Placeable structure",
      "character — Custom character/soldier",
      "ai — AI behavior mod",
      "terrain — Terrain/world modification",
    ],
  };
}

function getConfig() {
  return {
    title: "Enfusion MCP Configuration",
    config_file_location: "~/.enfusion-mcp/config.json",
    example_config: {
      projectPath: "C:/Users/YourName/Documents/My Games/ArmaReforger/addons/MyMod",
      workbenchPath: "C:/Program Files (x86)/Steam/steamapps/common/Arma Reforger Tools",
      gamePath: "C:/Program Files (x86)/Steam/steamapps/common/Arma Reforger",
      workbenchHost: "127.0.0.1",
      workbenchPort: 5775,
    },
    environment_variables: [
      { name: "ENFUSION_PROJECT_PATH", description: "Default mod output directory" },
      { name: "ENFUSION_WORKBENCH_PATH", description: "Path to Arma Reforger Tools installation" },
      { name: "ENFUSION_GAME_PATH", description: "Path to Arma Reforger game installation" },
      { name: "ENFUSION_WORKBENCH_HOST", description: "Workbench NET API host (default: 127.0.0.1)" },
      { name: "ENFUSION_WORKBENCH_PORT", description: "Workbench NET API port (default: 5775)" },
    ],
    workbench_handler_setup: [
      "Install the handler scripts from enfusion-mcp mod/ directory into your Workbench plugins folder",
      "Start Workbench with the NET API enabled",
      "Use 'wb_diagnose' to verify the connection",
    ],
  };
}

function getToolDetail(name) {
  const tools = {
    api_search: {
      name: "api_search",
      description: "Search 8,693 indexed Enfusion/Arma Reforger classes and methods. Returns class definitions with inheritance hierarchy visualization.",
      category: "Research",
      parameters: { query: "Search term (class name, method name, or keyword)" },
      examples: ["api_search query:SCR_CharacterControllerComponent", "api_search query:GetHealth"],
    },
    script_create: {
      name: "script_create",
      description: "Generate Enforce Script (.c) files for Arma Reforger mods.",
      category: "Code Generation",
      parameters: {
        name: "Script class name",
        type: "Script type: component, gamemode, action, entity, manager, modded, basic",
        description: "Optional description",
      },
      examples: ["script_create name:MyHealthSystem type:component", "script_create name:SurvivalGameMode type:gamemode"],
    },
    wb_launch: {
      name: "wb_launch",
      description: "Start the Enfusion Workbench editor and wait for the NET API to become available.",
      category: "Workbench Control",
      parameters: {},
      examples: ["wb_launch"],
    },
    wb_entity_create: {
      name: "wb_entity_create",
      description: "Create an entity in the Workbench world from a prefab at a specified position.",
      category: "Workbench Control",
      parameters: {
        prefab: "Prefab resource path",
        position: "World position [x, y, z]",
        name: "Optional entity name",
      },
      examples: ["wb_entity_create prefab:{GUID} position:[0,10,0]"],
    },
    prefab: {
      name: "prefab",
      description: "Generate or inspect Entity Template (.et) prefabs.",
      category: "Code Generation",
      parameters: {
        action: "create or inspect",
        name: "Prefab name (for create)",
        type: "Prefab type: character, vehicle, weapon, spawnpoint, gamemode, interactive, generic",
      },
      examples: ["prefab action:create name:MyVehicle type:vehicle", "prefab action:inspect path:MyPrefab.et"],
    },
    mod: {
      name: "mod",
      description: "Mod project management — scaffold, build, or validate addon projects.",
      category: "Project Management",
      parameters: {
        action: "create, build, or validate",
        name: "Mod name (for create)",
        template: "Template type (for create)",
      },
      examples: ["mod action:create name:MyMod template:weapon", "mod action:validate", "mod action:build"],
    },
    wb_diagnose: {
      name: "wb_diagnose",
      description: "Run full diagnostic of the EnfusionMCP ↔ Workbench connection. Reports config paths, handler script locations, and NET API probe status.",
      category: "Workbench Control",
      parameters: {},
      examples: ["wb_diagnose"],
    },
  };

  const tool = tools[name];
  if (!tool) {
    return JSON.stringify(
      {
        error: "No detailed info for tool: " + name,
        hint: "Use topic: 'tools' to see the full tool listing",
        available_details: Object.keys(tools),
      },
      null,
      2
    );
  }

  return JSON.stringify(tool, null, 2);
}
