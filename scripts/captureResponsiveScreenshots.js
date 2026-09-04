import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { VERSION, projectIdentity } from "../src/gameData.js";

const port = Number(process.env.RESPONSIVE_CAPTURE_PORT || 5194);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = "docs/acceptance/tests/ui/responsive-screenshots";
const manifestPath = "docs/acceptance/tests/ui/RESPONSIVE_SCREENSHOT_MANIFEST.json";
const cases = [
  {
    id: "ux03-1280x720-hud-combat",
    label: "1280x720 HUD 与战斗",
    viewport: { width: 1280, height: 720 },
    scale: 1,
    path: "/?scene=forest-combat",
    surfaces: ["hud", "combat"],
  },
  {
    id: "ux03-1920x1080-quest",
    label: "1920x1080 任务日志",
    viewport: { width: 1920, height: 1080 },
    scale: 1,
    path: "/?scene=river-weather&panel=quest",
    surfaces: ["hud", "quest"],
  },
  {
    id: "ux03-1280x720-scale125-inventory",
    label: "1280x720 125% 缩放背包",
    viewport: { width: 1280, height: 720 },
    scale: 1.25,
    path: "/?scene=moonspire-boss&panel=inventory",
    surfaces: ["hud", "inventory", "combat"],
  },
];

const edgePath = findEdgePath();
mkdirSync(outDir, { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    BUILD_DATE: "responsive-capture",
    BUILD_COMMIT: "local-evidence",
    DEEPSEEK_API_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer();
  const results = cases.map((entry) => captureCase(entry));
  const requirements = summarizeRequirements(results);
  const manifest = {
    schemaVersion: 1,
    title: projectIdentity.title,
    gameVersion: VERSION,
    generatedAt: new Date().toISOString(),
    command: "npm run capture:responsive",
    browser: {
      executable: edgePath,
      mode: "Microsoft Edge headless",
    },
    baseUrl,
    outputDir: outDir,
    requirements,
    files: results,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`响应式截图完成：${results.length} 张，UX-03 ${requirements.complete ? "通过" : "需复核"}。`);
  if (!requirements.complete) process.exitCode = 1;
} finally {
  server.kill();
}

function captureCase(entry) {
  const outPath = join(outDir, `${entry.id}.png`);
  const profileDir = mkdtempSync(join(tmpdir(), "moonbell-edge-"));
  try {
    const url = `${baseUrl}${entry.path}`;
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--hide-scrollbars",
      "--no-first-run",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=4500",
      `--user-data-dir=${profileDir}`,
      `--window-size=${entry.viewport.width},${entry.viewport.height}`,
      `--force-device-scale-factor=${entry.scale}`,
      `--screenshot=${resolve(outPath)}`,
      url,
    ];
    const result = spawnSync(edgePath, args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 * 4 });
    if (result.status !== 0 || !existsSync(outPath)) {
      throw new Error(`Edge 截图失败：${result.stderr || result.stdout || `exit ${result.status}`}`);
    }
    const buffer = readFileSync(outPath);
    const png = readPngInfo(buffer);
    return {
      id: entry.id,
      label: entry.label,
      file: outPath.replaceAll("\\", "/"),
      urlPath: entry.path,
      viewport: entry.viewport,
      deviceScaleFactor: entry.scale,
      expectedDeviceSize: {
        width: Math.round(entry.viewport.width * entry.scale),
        height: Math.round(entry.viewport.height * entry.scale),
      },
      imageSize: {
        width: png.width,
        height: png.height,
      },
      bytes: statSync(outPath).size,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      surfaces: entry.surfaces,
      valid: true,
    };
  } finally {
    const resolvedProfile = resolve(profileDir);
    const resolvedTemp = resolve(tmpdir());
    if (resolvedProfile.startsWith(resolvedTemp)) rmSync(resolvedProfile, { recursive: true, force: true });
  }
}

async function waitForServer() {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/api/status`);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error("本地截图服务器未能启动。");
}

function summarizeRequirements(results) {
  const surfaces = new Set(results.flatMap((entry) => entry.surfaces));
  const has1280 = results.some((entry) => entry.viewport.width === 1280 && entry.viewport.height === 720 && entry.deviceScaleFactor === 1);
  const has1920 = results.some((entry) => entry.viewport.width === 1920 && entry.viewport.height === 1080 && entry.deviceScaleFactor === 1);
  const hasScale125 = results.some((entry) => entry.deviceScaleFactor === 1.25);
  const hasExpectedSurfaces = ["hud", "quest", "inventory", "combat"].every((surface) => surfaces.has(surface));
  const validFiles = results.every(
    (entry) =>
      entry.valid &&
      entry.imageSize.width === entry.expectedDeviceSize.width &&
      entry.imageSize.height === entry.expectedDeviceSize.height &&
      entry.bytes > 0 &&
      entry.sha256,
  );
  return {
    has1280,
    has1920,
    hasScale125,
    hasExpectedSurfaces,
    validFiles,
    complete: has1280 && has1920 && hasScale125 && hasExpectedSurfaces && validFiles,
  };
}

function readPngInfo(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 29 || buffer.subarray(0, 8).toString("hex") !== pngSignature || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("不是有效 PNG 文件");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function findEdgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "msedge",
  ].filter(Boolean);
  const found = candidates.find((candidate) => candidate === "msedge" || existsSync(candidate));
  if (!found) throw new Error("未找到 Microsoft Edge，可设置 EDGE_PATH 后重试。");
  return found;
}
