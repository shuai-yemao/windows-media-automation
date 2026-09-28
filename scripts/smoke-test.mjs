#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { handlers } from "./lib/core.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "windows-media-automation-"));
try {
  const init = await handlers.initProject({ projectDirectory: root });
  if (!init.ok || init.seededSources < 4) throw new Error("project initialization failed");
  const scan = await handlers.scanProject({ projectDirectory: root, inputDirectory: root });
  if (!scan.ok || scan.itemCount !== 0) throw new Error("empty project scan failed");
  const profile = await handlers.createProfile({ projectDirectory: root, profileId: "smoke-vlog", videoType: "vlog", title: "Smoke Vlog" });
  if (profile.status !== "candidate") throw new Error("profile was activated too early");
  const source = await handlers.registerSource({ projectDirectory: root, sourceId: "smoke-source", repositoryUrl: "https://github.com/example/smoke-style", license: "MIT", starSnapshot: 12000, windowsStatus: "PASS", regressionStatus: "PASS" });
  if (source.source.status !== "DISCOVERED") throw new Error("source did not start as DISCOVERED");
  const validated = await handlers.validateSource({ projectDirectory: root, sourceId: "smoke-source" });
  if (!validated.canActivate || validated.source.status !== "VALIDATED") throw new Error("source gate failed");
  await handlers.activateSource({ projectDirectory: root, sourceId: "smoke-source", confirm: true });
  await handlers.activateProfile({ projectDirectory: root, profileId: "smoke-vlog", confirm: true });
  const plan = await handlers.generateEditPlan({ projectDirectory: root, profileId: "smoke-vlog", videoType: "vlog", title: "Smoke Vlog" });
  if (plan.status !== "DRAFT_REQUIRES_APPROVAL" || !plan.planHash) throw new Error("edit plan failed");
  console.log(JSON.stringify({ ok: true, checks: ["init", "scan", "candidate-lifecycle", "source-gate", "activation", "edit-plan"] }, null, 2));
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
