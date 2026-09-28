#!/usr/bin/env node
import { handlers } from "./lib/core.mjs";

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) { result._.push(token); continue; }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) result[key] = true;
    else { result[key] = next; i += 1; }
  }
  return result;
}

function required(args, key) {
  if (!args[key]) throw new Error(`--${key} is required`);
  return args[key];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const projectDirectory = args.project || args.projectDirectory;
  let result;
  if (command === "init") result = await handlers.initProject({ projectDirectory: required(args, "project") });
  else if (command === "scan") result = await handlers.scanProject({ projectDirectory: required(args, "project"), inputDirectory: args.input });
  else if (command === "profile-create") result = await handlers.createProfile({ projectDirectory: required(args, "project"), profileId: required(args, "id"), videoType: args.type || "vlog", title: args.title });
  else if (command === "profiles") result = await handlers.listProfiles({ projectDirectory: required(args, "project") });
  else if (command === "source-add") result = await handlers.registerSource({ projectDirectory: required(args, "project"), sourceId: args.id, repositoryUrl: required(args, "url"), skillPath: args.skill, commitOrTag: args.commit, license: args.license, starSnapshot: args.stars ? Number(args.stars) : null, sourceType: args.sourceType, windowsStatus: args.windows || "UNVERIFIED", regressionStatus: args.regression || "UNVERIFIED" });
  else if (command === "source-validate") result = await handlers.validateSource({ projectDirectory: required(args, "project"), sourceId: required(args, "id") });
  else if (command === "source-harvest") result = await handlers.harvestSource({ projectDirectory: required(args, "project"), sourceId: required(args, "id"), rawUrl: required(args, "raw") });
  else if (command === "source-activate") result = await handlers.activateSource({ projectDirectory: required(args, "project"), sourceId: required(args, "id"), confirm: args.confirm === "true" });
  else if (command === "profile-activate") result = await handlers.activateProfile({ projectDirectory: required(args, "project"), profileId: required(args, "id"), confirm: args.confirm === "true" });
  else if (command === "plan") result = await handlers.generateEditPlan({ projectDirectory: required(args, "project"), profileId: args.profile, videoType: args.type || "vlog", title: args.title });
  else if (command === "validate-output") result = await handlers.validateOutput({ projectDirectory: required(args, "project"), outputPath: required(args, "output") });
  else throw new Error("Usage: init | scan | profiles | profile-create | profile-activate | source-add | source-harvest | source-validate | source-activate | plan | validate-output");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`ERROR: ${error.message}\n`); process.exitCode = 1; });
