// =========================
// MCP Tool: fivem_resource_scaffold
// =========================
// Generates FiveM resource scaffolds and templates
// for the game modding community.

module.exports = {
  name: "fivem_resource_scaffold",
  description:
    "Generate a FiveM resource scaffold with fxmanifest.lua and starter scripts. Supports client, server, and shared script templates for game modding.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Resource name (e.g., 'my-resource')",
      },
      type: {
        type: "string",
        description: "Resource type: 'client', 'server', 'shared', 'full' (default: full)",
      },
      framework: {
        type: "string",
        description: "Framework: 'standalone', 'esx', 'qb' (default: standalone)",
      },
    },
    required: ["name"],
  },
  scope: "public",
  handler: async (args) => {
    const name = args.name;
    const type = (args.type || "full").toLowerCase();
    const framework = (args.framework || "standalone").toLowerCase();

    const files = {};

    // fxmanifest.lua
    const scripts = [];
    if (type === "full" || type === "shared") scripts.push(`shared_script 'shared.lua'`);
    if (type === "full" || type === "client") scripts.push(`client_script 'client.lua'`);
    if (type === "full" || type === "server") scripts.push(`server_script 'server.lua'`);

    files["fxmanifest.lua"] = [
      "fx_version 'cerulean'",
      "game 'gta5'",
      "",
      `description '${name}'`,
      "version '1.0.0'",
      `author '25th Infantry Division'`,
      "",
      ...scripts,
    ].join("\n");

    // Client script
    if (type === "full" || type === "client") {
      const clientLines = ["-- Client-side script for " + name, ""];
      if (framework === "esx") {
        clientLines.push("ESX = exports['es_extended']:getSharedObject()");
        clientLines.push("");
      } else if (framework === "qb") {
        clientLines.push("QBCore = exports['qb-core']:GetCoreObject()");
        clientLines.push("");
      }
      clientLines.push(
        "RegisterCommand('" + name + "', function(source, args, rawCommand)",
        "    print('" + name + " client command executed')",
        "    -- Add your client logic here",
        "end, false)",
        "",
        "-- Example thread",
        "CreateThread(function()",
        "    while true do",
        "        Wait(1000)",
        "        -- Tick logic here",
        "    end",
        "end)"
      );
      files["client.lua"] = clientLines.join("\n");
    }

    // Server script
    if (type === "full" || type === "server") {
      const serverLines = ["-- Server-side script for " + name, ""];
      if (framework === "esx") {
        serverLines.push("ESX = exports['es_extended']:getSharedObject()");
        serverLines.push("");
      } else if (framework === "qb") {
        serverLines.push("QBCore = exports['qb-core']:GetCoreObject()");
        serverLines.push("");
      }
      serverLines.push(
        "RegisterNetEvent('" + name + ":server:init')",
        "AddEventHandler('" + name + ":server:init', function()",
        "    local src = source",
        "    print('" + name + " initialized for player ' .. src)",
        "end)",
        "",
        "-- Player connecting handler",
        "AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)",
        "    local src = source",
        "    print(name .. ' is connecting to the server')",
        "end)"
      );
      files["server.lua"] = serverLines.join("\n");
    }

    // Shared script
    if (type === "full" || type === "shared") {
      files["shared.lua"] = [
        "-- Shared configuration for " + name,
        "",
        "Config = {}",
        "Config.Debug = false",
        "Config.ResourceName = '" + name + "'",
      ].join("\n");
    }

    return JSON.stringify({
      resource: name,
      framework,
      type,
      files,
    }, null, 2);
  },
};
