#!/usr/bin/env node
import readline from "node:readline";
import { handlers } from "./lib/core.mjs";

const tools = [
  { name: "media_init_project", description: "Create or update the local .media-automation state directory.", inputSchema: { type: "object", required: ["projectDirectory"], properties: { projectDirectory: { type: "string" } } } },
  { name: "media_scan_project", description: "Scan media assets and collect FFprobe metadata when available.", inputSchema: { type: "object", required: ["projectDirectory"], properties: { projectDirectory: { type: "string" }, inputDirectory: { type: "string" } } } },
  { name: "taste_list_profiles", description: "Read active, override, and candidate Taste Profiles.", inputSchema: { type: "object", required: ["projectDirectory"], properties: { projectDirectory: { type: "string" } } } },
  { name: "taste_create_profile", description: "Create a candidate Taste Profile without activating it.", inputSchema: { type: "object", required: ["projectDirectory", "profileId"], properties: { projectDirectory: { type: "string" }, profileId: { type: "string" }, videoType: { type: "string", enum: ["vlog", "product_promo", "course"] }, title: { type: "string" }, preferences: { type: "object" }, references: { type: "array" } } } },
  { name: "taste_register_source", description: "Register a GitHub style source in DISCOVERED state.", inputSchema: { type: "object", required: ["projectDirectory", "repositoryUrl"], properties: { projectDirectory: { type: "string" }, sourceId: { type: "string" }, repositoryUrl: { type: "string" }, skillPath: { type: "string" }, commitOrTag: { type: "string" }, license: { type: "string" }, starSnapshot: { type: "number" }, sourceType: { type: "string" }, supportedFeatures: { type: "array" }, windowsStatus: { type: "string" }, regressionStatus: { type: "string" }, notes: { type: "string" } } } },
  { name: "taste_validate_source", description: "Evaluate the source gate; never activates a source automatically.", inputSchema: { type: "object", required: ["projectDirectory", "sourceId"], properties: { projectDirectory: { type: "string" }, sourceId: { type: "string" } } } },
  { name: "taste_harvest_source", description: "Fetch a GitHub Skill text file into the local reference library without activating it.", inputSchema: { type: "object", required: ["projectDirectory", "sourceId", "rawUrl"], properties: { projectDirectory: { type: "string" }, sourceId: { type: "string" }, rawUrl: { type: "string" } } } },
  { name: "taste_activate_source", description: "Activate a source only after validation and explicit confirmation.", inputSchema: { type: "object", required: ["projectDirectory", "sourceId", "confirm"], properties: { projectDirectory: { type: "string" }, sourceId: { type: "string" }, confirm: { type: "boolean" } } } },
  { name: "taste_activate_profile", description: "Activate a candidate Taste Profile only after explicit confirmation.", inputSchema: { type: "object", required: ["projectDirectory", "profileId", "confirm"], properties: { projectDirectory: { type: "string" }, profileId: { type: "string" }, confirm: { type: "boolean" } } } },
  { name: "media_generate_edit_plan", description: "Generate a deterministic draft edit decision plan requiring approval.", inputSchema: { type: "object", required: ["projectDirectory"], properties: { projectDirectory: { type: "string" }, profileId: { type: "string" }, videoType: { type: "string", enum: ["vlog", "product_promo", "course"] }, title: { type: "string" } } } },
  { name: "media_validate_output", description: "Validate output existence, FFprobe metadata, 1920x1080, and 16:9 rules.", inputSchema: { type: "object", required: ["projectDirectory", "outputPath"], properties: { projectDirectory: { type: "string" }, outputPath: { type: "string" } } } }
];

const mapping = {
  media_init_project: "initProject",
  media_scan_project: "scanProject",
  taste_list_profiles: "listProfiles",
  taste_create_profile: "createProfile",
  taste_register_source: "registerSource",
  taste_validate_source: "validateSource",
  taste_harvest_source: "harvestSource",
  taste_activate_source: "activateSource",
  taste_activate_profile: "activateProfile",
  media_generate_edit_plan: "generateEditPlan",
  media_validate_output: "validateOutput"
};

function send(id, result, error = null) {
  process.stdout.write(`${JSON.stringify(error ? { jsonrpc: "2.0", id, error } : { jsonrpc: "2.0", id, result })}\n`);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let request;
  try { request = JSON.parse(line); } catch (error) { send(null, null, { code: -32700, message: error.message }); return; }
  if (request.method === "notifications/initialized") return;
  if (request.method === "initialize") {
    send(request.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "windows-media", version: "0.1.0" } });
    return;
  }
  if (request.method === "tools/list") { send(request.id, { tools }); return; }
  if (request.method === "tools/call") {
    const name = request.params?.name;
    const fn = mapping[name] && handlers[mapping[name]];
    if (!fn) { send(request.id, null, { code: -32601, message: `Unknown tool: ${name}` }); return; }
    try {
      const value = await fn(request.params?.arguments || {});
      send(request.id, { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value });
    } catch (error) {
      send(request.id, null, { code: -32000, message: error.message });
    }
    return;
  }
  send(request.id, null, { code: -32601, message: `Unsupported method: ${request.method}` });
});
