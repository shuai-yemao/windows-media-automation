import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

export const PLUGIN_VERSION = "0.1.0";
export const STATE_DIR = ".media-automation";
export const MEDIA_EXTENSIONS = new Set([
  ".mp4", ".mov", ".m4v", ".mkv", ".avi", ".webm", ".mts", ".m2ts",
  ".mp3", ".wav", ".m4a", ".aac", ".flac", ".png", ".jpg", ".jpeg", ".webp"
]);

const sourceDefaults = [
  {
    sourceId: "remotion-core",
    repositoryUrl: "https://github.com/remotion-dev/remotion",
    skillPath: "README.md",
    commitOrTag: "unlocked-reference",
    license: "Review required",
    starSnapshot: 60000,
    sourceType: "official-runtime",
    supportedFeatures: ["motion-design", "layout", "typography", "rendering"],
    windowsStatus: "UNVERIFIED",
    regressionStatus: "UNVERIFIED",
    status: "HARVESTED",
    notes: "Official Remotion runtime candidate; not required by the base plugin."
  },
  {
    sourceId: "remotion-agent-skills",
    repositoryUrl: "https://github.com/remotion-dev/skills",
    skillPath: ".agents/skills",
    commitOrTag: "unlocked-reference",
    license: "Review required",
    starSnapshot: 4700,
    sourceType: "official-style-skill",
    supportedFeatures: ["animation-timing", "captions", "safe-area", "typography"],
    windowsStatus: "UNVERIFIED",
    regressionStatus: "UNVERIFIED",
    status: "HARVESTED",
    notes: "Accepted as an official-organization exception to the general Star gate."
  },
  {
    sourceId: "heygen-skills",
    repositoryUrl: "https://github.com/heygen-com/skills",
    skillPath: "skills",
    commitOrTag: "unlocked-reference",
    license: "Review required",
    starSnapshot: null,
    sourceType: "creative-reference",
    supportedFeatures: ["creative-direction", "product-launch", "visual-style"],
    windowsStatus: "UNVERIFIED",
    regressionStatus: "UNVERIFIED",
    status: "HARVESTED",
    notes: "Creative-direction reference only until Star and local smoke tests are recorded."
  },
  {
    sourceId: "hyperframes",
    repositoryUrl: "https://github.com/heygen-com/hyperframes",
    skillPath: "skills/hyperframes-creative",
    commitOrTag: "unlocked-reference",
    license: "Review required",
    starSnapshot: null,
    sourceType: "creative-reference",
    supportedFeatures: ["palette", "typography", "beat-planning", "composition"],
    windowsStatus: "UNVERIFIED",
    regressionStatus: "UNVERIFIED",
    status: "HARVESTED",
    notes: "Creative grammar reference; not a required execution dependency."
  }
];

const profileDefaults = {
  global: {
    status: "active",
    version: 1,
    title: "Creator baseline",
    dimensions: {
      pacing: { averageShotSeconds: 4.5, hookSeconds: 6, pauseTolerance: "natural" },
      shotLanguage: { wide: 0.2, medium: 0.45, close: 0.25, detail: 0.1 },
      composition: { subjectPriority: "clear", safeArea: true, whitespace: "intentional" },
      color: { brightness: "natural", saturation: "moderate", skinToneProtection: true },
      typography: { maxLines: 2, hierarchy: "clear", decoration: "minimal" },
      transitions: { primary: ["hard-cut", "action-cut"], maximumDecorativePerMinute: 2 },
      motion: { zoom: "subtle", shake: "off", motionBlur: "limited" },
      audio: { voicePriority: "high", music: "supporting", soundEffectDensity: "low" },
      narrative: { hook: true, proof: false, cta: false },
      prohibitions: ["over-saturated", "transition-fatigue", "obscured-subject"]
    },
    references: [],
    provenance: []
  },
  overrides: {
    vlog: { status: "active", version: 1, title: "Natural Vlog", dimensions: { pacing: { averageShotSeconds: 4.5, hookSeconds: 6 }, color: { brightness: "natural", saturation: "moderate", skinToneProtection: true }, audio: { voicePriority: "high", music: "supporting" }, transitions: { primary: ["hard-cut", "action-cut", "crossfade"] } } },
    product_promo: { status: "active", version: 1, title: "Product Promo", dimensions: { pacing: { averageShotSeconds: 2.5, hookSeconds: 3 }, composition: { subjectPriority: "product-first", safeArea: true }, color: { brightness: "controlled", saturation: "brand-led", productColorProtection: true }, narrative: { hook: true, proof: true, cta: true }, transitions: { primary: ["hard-cut", "match-cut"] } } },
    course: { status: "active", version: 1, title: "Clear Course", dimensions: { pacing: { averageShotSeconds: 7, hookSeconds: 8 }, typography: { maxLines: 2, hierarchy: "strong", decoration: "minimal" }, audio: { voicePriority: "very-high", music: "optional" }, narrative: { hook: true, proof: true, cta: false }, transitions: { primary: ["hard-cut", "crossfade"] } } }
  }
};

const now = () => new Date().toISOString();

export function stableJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort(), 2);
}

export function hashObject(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

async function readJson(filePath, fallback) {
  if (!(await exists(filePath))) return fallback;
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, filePath);
}

function projectPath(projectDirectory) {
  if (!projectDirectory || typeof projectDirectory !== "string") throw new Error("projectDirectory is required");
  return path.resolve(projectDirectory);
}

export async function ensureProject(projectDirectory) {
  const root = projectPath(projectDirectory);
  const state = path.join(root, STATE_DIR);
  await fs.mkdir(path.join(state, "runs"), { recursive: true });
  const projectFile = path.join(state, "project.json");
  const sourceFile = path.join(state, "style-source-ledger.json");
  const profileFile = path.join(state, "taste-profiles.json");
  const project = await readJson(projectFile, {
    schemaVersion: 1,
    pluginVersion: PLUGIN_VERSION,
    projectId: hashObject({ root }).slice(0, 16),
    projectDirectory: root,
    output: { width: 1920, height: 1080, aspectRatio: "16:9", reviewRequired: true },
    createdAt: now(),
    updatedAt: now()
  });
  project.updatedAt = now();
  await writeJson(projectFile, project);
  const ledger = await readJson(sourceFile, { schemaVersion: 1, updatedAt: now(), sources: sourceDefaults });
  const profiles = await readJson(profileFile, { schemaVersion: 1, updatedAt: now(), global: profileDefaults.global, overrides: profileDefaults.overrides, candidates: [] });
  await writeJson(sourceFile, ledger);
  await writeJson(profileFile, profiles);
  return { root, state, projectFile, sourceFile, profileFile, project, ledger, profiles };
}

export async function initProject(args) {
  const ctx = await ensureProject(args.projectDirectory);
  return { ok: true, project: ctx.project, stateDirectory: ctx.state, seededSources: ctx.ledger.sources.length, profileTypes: Object.keys(ctx.profiles.overrides) };
}

async function walk(directory, result = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.name === STATE_DIR || entry.name === "node_modules") continue;
    if (entry.isDirectory()) await walk(full, result);
    else result.push(full);
  }
  return result;
}

function findExecutable(name) {
  const candidates = [
    name,
    process.env[`${name.toUpperCase()}_PATH`],
    "C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe",
    "C:\\Users\\zhang\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffprobe.exe"
  ].filter(Boolean);
  return candidates[0];
}

function runProcess(command, args, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill(); resolve({ ok: false, timedOut: true, stdout, stderr }); }, timeoutMs);
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", (error) => { clearTimeout(timer); resolve({ ok: false, error: error.message, stdout, stderr }); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ ok: code === 0, code, stdout, stderr }); });
  });
}

async function probeMedia(filePath) {
  const ffprobe = findExecutable("ffprobe");
  const result = await runProcess(ffprobe, ["-v", "error", "-show_format", "-show_streams", "-of", "json", filePath]);
  if (!result.ok) return { available: false, error: result.error || result.stderr.trim() || `ffprobe exited ${result.code}` };
  try { return { available: true, ...JSON.parse(result.stdout) }; } catch (error) { return { available: false, error: `invalid ffprobe JSON: ${error.message}` }; }
}

export async function scanProject(args) {
  const ctx = await ensureProject(args.projectDirectory);
  const input = path.resolve(args.inputDirectory || args.projectDirectory);
  const files = (await walk(input)).filter((file) => MEDIA_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const items = [];
  for (const file of files) {
    const stat = await fs.stat(file);
    const item = { path: file, relativePath: path.relative(ctx.root, file), extension: path.extname(file).toLowerCase(), bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    if ([".mp4", ".mov", ".m4v", ".mkv", ".avi", ".webm", ".mts", ".m2ts"].includes(item.extension)) item.probe = await probeMedia(file);
    items.push(item);
  }
  items.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const manifest = { schemaVersion: 1, scannedAt: now(), inputDirectory: input, itemCount: items.length, items, inputHash: hashObject(items) };
  await writeJson(path.join(ctx.state, "media-manifest.json"), manifest);
  return { ok: true, manifestPath: path.join(ctx.state, "media-manifest.json"), itemCount: items.length, inputHash: manifest.inputHash, ffprobe: items.some((item) => item.probe?.available) ? "available" : "unavailable-or-no-video" };
}

export async function listProfiles(args) {
  const ctx = await ensureProject(args.projectDirectory);
  return ctx.profiles;
}

export async function createProfile(args) {
  const ctx = await ensureProject(args.projectDirectory);
  const profileId = String(args.profileId || "vlog-candidate");
  const videoType = String(args.videoType || "vlog");
  const candidate = {
    profileId,
    videoType,
    title: args.title || profileId,
    status: "candidate",
    version: 1,
    createdAt: now(),
    dimensions: args.preferences || {},
    references: Array.isArray(args.references) ? args.references : [],
    provenance: [{ kind: "user-input", createdAt: now() }]
  };
  const profiles = ctx.profiles;
  profiles.candidates = (profiles.candidates || []).filter((item) => item.profileId !== profileId);
  profiles.candidates.push(candidate);
  profiles.updatedAt = now();
  await writeJson(ctx.profileFile, profiles);
  return { ok: true, profile: candidate, status: "candidate", message: "Profile 未自动激活，需要用户确认后再提升为 active。" };
}

export async function registerSource(args) {
  const ctx = await ensureProject(args.projectDirectory);
  if (!args.repositoryUrl) throw new Error("repositoryUrl is required");
  const source = {
    sourceId: String(args.sourceId || hashObject({ url: args.repositoryUrl, path: args.skillPath }).slice(0, 12)),
    repositoryUrl: args.repositoryUrl,
    skillPath: args.skillPath || "",
    commitOrTag: args.commitOrTag || "unlocked-reference",
    license: args.license || "Review required",
    starSnapshot: Number.isFinite(args.starSnapshot) ? args.starSnapshot : null,
    sourceType: args.sourceType || "creative-reference",
    supportedFeatures: Array.isArray(args.supportedFeatures) ? args.supportedFeatures : [],
    windowsStatus: args.windowsStatus || "UNVERIFIED",
    regressionStatus: args.regressionStatus || "UNVERIFIED",
    status: "DISCOVERED",
    registeredAt: now(),
    notes: args.notes || ""
  };
  ctx.ledger.sources = (ctx.ledger.sources || []).filter((item) => item.sourceId !== source.sourceId);
  ctx.ledger.sources.push(source);
  ctx.ledger.updatedAt = now();
  await writeJson(ctx.sourceFile, ctx.ledger);
  return { ok: true, source, ledgerPath: ctx.sourceFile };
}

export async function validateSource(args) {
  const ctx = await ensureProject(args.projectDirectory);
  const source = (ctx.ledger.sources || []).find((item) => item.sourceId === args.sourceId);
  if (!source) throw new Error(`source not found: ${args.sourceId}`);
  const officialException = ["remotion-dev", "heygen-com"].some((org) => source.repositoryUrl.includes(`github.com/${org}/`));
  const starGate = officialException || (Number.isFinite(source.starSnapshot) && source.starSnapshot >= 10000);
  const licenseGate = source.license && source.license !== "Review required";
  const windowsGate = source.windowsStatus === "PASS";
  const regressionGate = source.regressionStatus === "PASS";
  const passed = starGate && licenseGate && windowsGate && regressionGate;
  source.status = passed ? "VALIDATED" : "HARVESTED";
  source.validation = { checkedAt: now(), officialException, starGate, licenseGate, windowsGate, regressionGate, result: passed ? "PASS" : "WARN" };
  ctx.ledger.updatedAt = now();
  await writeJson(ctx.sourceFile, ctx.ledger);
  return { ok: true, source, canActivate: passed, message: passed ? "来源已通过机器门禁，但仍需用户确认后才可 ACTIVE。" : "来源保留为 HARVESTED；请补齐许可证、Windows smoke test 和固定样片回归。" };
}

export async function harvestSource(args) {
  const ctx = await ensureProject(args.projectDirectory);
  const source = (ctx.ledger.sources || []).find((item) => item.sourceId === args.sourceId);
  if (!source) throw new Error(`source not found: ${args.sourceId}`);
  if (!source.repositoryUrl.startsWith("https://github.com/")) throw new Error("harvest only permits https://github.com sources");
  const rawUrl = args.rawUrl || source.rawUrl;
  if (!rawUrl || !rawUrl.startsWith("https://raw.githubusercontent.com/")) throw new Error("rawUrl must be an https://raw.githubusercontent.com URL");
  const response = await fetch(rawUrl, { redirect: "follow" });
  if (!response.ok) throw new Error(`GitHub fetch failed: HTTP ${response.status}`);
  const content = await response.text();
  const destination = path.join(ctx.state, "style-sources", source.sourceId, path.basename(new URL(rawUrl).pathname) || "SKILL.md");
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content, "utf8");
  source.rawUrl = rawUrl;
  source.harvestedPath = destination;
  source.harvestedSha256 = crypto.createHash("sha256").update(content).digest("hex");
  source.harvestedAt = now();
  source.status = "HARVESTED";
  ctx.ledger.updatedAt = now();
  await writeJson(ctx.sourceFile, ctx.ledger);
  return { ok: true, source, bytes: Buffer.byteLength(content), message: "Skill 文本已采集为本地参考；许可证和运行时状态仍需单独验证。" };
}

export async function activateSource(args) {
  const ctx = await ensureProject(args.projectDirectory);
  if (args.confirm !== true) throw new Error("confirm=true is required to activate a style source");
  const source = (ctx.ledger.sources || []).find((item) => item.sourceId === args.sourceId);
  if (!source) throw new Error(`source not found: ${args.sourceId}`);
  if (source.status !== "VALIDATED") throw new Error("only VALIDATED sources can become ACTIVE");
  source.status = "ACTIVE";
  source.activatedAt = now();
  ctx.ledger.updatedAt = now();
  await writeJson(ctx.sourceFile, ctx.ledger);
  return { ok: true, source, message: "来源已 ACTIVE；后续剪辑计划会记录其版本快照。" };
}

export async function activateProfile(args) {
  const ctx = await ensureProject(args.projectDirectory);
  if (args.confirm !== true) throw new Error("confirm=true is required to activate a Taste Profile");
  const candidate = (ctx.profiles.candidates || []).find((item) => item.profileId === args.profileId);
  if (!candidate) throw new Error(`profile not found: ${args.profileId}`);
  candidate.status = "active";
  candidate.version = Number(candidate.version || 0) + 1;
  candidate.activatedAt = now();
  ctx.profiles.updatedAt = now();
  await writeJson(ctx.profileFile, ctx.profiles);
  return { ok: true, profile: candidate, message: "Taste Profile 已 ACTIVE；旧版本仍保留在项目状态中。" };
}

function merge(base, override) {
  if (!override || typeof override !== "object") return base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) result[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(base[key] || {}, value) : value;
  return result;
}

async function latestManifest(ctx) {
  return readJson(path.join(ctx.state, "media-manifest.json"), { itemCount: 0, items: [], inputHash: "none" });
}

export async function generateEditPlan(args) {
  const ctx = await ensureProject(args.projectDirectory);
  const profiles = ctx.profiles;
  const videoType = args.videoType || "vlog";
  const base = videoType === "product_promo" ? profiles.overrides.product_promo : videoType === "course" ? profiles.overrides.course : profiles.overrides.vlog;
  const active = profiles.candidates?.find((item) => item.profileId === args.profileId && item.status === "active");
  const profileSnapshot = merge(merge(profiles.global, base), active || {});
  const manifest = await latestManifest(ctx);
  const plan = {
    schemaVersion: 1,
    planId: `edp-${Date.now().toString(36)}`,
    projectId: ctx.project.projectId,
    title: args.title || "Untitled media project",
    videoType,
    editor: "jianying-pro",
    output: ctx.project.output,
    reviewRequired: true,
    status: "DRAFT_REQUIRES_APPROVAL",
    sourceSnapshot: { mediaManifestHash: manifest.inputHash, profileId: args.profileId || `${videoType}-default`, profileHash: hashObject(profileSnapshot), styleSources: ctx.ledger.sources.filter((item) => item.status === "ACTIVE").map((item) => ({ sourceId: item.sourceId, commitOrTag: item.commitOrTag })) },
    style: profileSnapshot,
    decisions: [
      { id: "hook", action: "select-opening", rule: `${profileSnapshot.dimensions?.pacing?.hookSeconds || 6}s 内建立主题`, approval: "required" },
      { id: "dead-air", action: "mark-silence-candidates", rule: "只标记候选，不自动删除原始素材", approval: "required" },
      { id: "captions", action: "generate-caption-plan", rule: "最多两行，保持安全区", approval: "required" },
      { id: "b-roll", action: "suggest-b-roll", rule: "候选素材必须经过用户确认", approval: "required" }
    ],
    assets: manifest.items.map((item) => ({ path: item.path, role: item.extension.match(/\.png|\.jpe?g|\.webp/) ? "image-candidate" : "media-candidate", approval: "required" })),
    createdAt: now()
  };
  plan.planHash = hashObject(plan);
  const planPath = path.join(ctx.state, "runs", `${plan.planId}.json`);
  await writeJson(planPath, plan);
  return { ok: true, planPath, planHash: plan.planHash, status: plan.status, assetCount: plan.assets.length };
}

export async function validateOutput(args) {
  const ctx = await ensureProject(args.projectDirectory);
  const outputPath = path.resolve(args.outputPath || "");
  const report = { schemaVersion: 1, outputPath, checkedAt: now(), checks: [], result: "NOT_VERIFIED" };
  const stat = await fs.stat(outputPath).catch(() => null);
  report.checks.push({ id: "exists", pass: Boolean(stat), detail: stat ? `${stat.size} bytes` : "file not found" });
  if (stat) {
    const probe = await probeMedia(outputPath);
    report.probe = probe;
    const video = probe.streams?.find((stream) => stream.codec_type === "video");
    report.checks.push({ id: "ffprobe", pass: probe.available, detail: probe.available ? "metadata read" : probe.error });
    report.checks.push({ id: "resolution", pass: video?.width === 1920 && video?.height === 1080, detail: video ? `${video.width}x${video.height}` : "no video stream" });
    report.checks.push({ id: "aspect-ratio", pass: video ? Math.abs((video.width / video.height) - 16 / 9) < 0.01 : false, detail: video ? `${video.width}:${video.height}` : "unknown" });
  }
  report.result = report.checks.every((check) => check.pass) ? "PASS" : report.checks.some((check) => check.pass) ? "WARN" : "NOT_VERIFIED";
  const reportPath = path.join(ctx.state, "runs", `output-check-${Date.now().toString(36)}.json`);
  await writeJson(reportPath, report);
  return { ok: true, reportPath, result: report.result, checks: report.checks };
}

export const handlers = { initProject, scanProject, listProfiles, createProfile, registerSource, validateSource, harvestSource, activateSource, activateProfile, generateEditPlan, validateOutput };
