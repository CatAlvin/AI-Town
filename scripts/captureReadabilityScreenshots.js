import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { setTimeout as delay } from "node:timers/promises";
import { VERSION, projectIdentity } from "../src/gameData.js";

const port = Number(process.env.READABILITY_CAPTURE_PORT || 5196);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = "docs/acceptance/tests/visual/readability-screenshots";
const manifestPath = "docs/acceptance/tests/visual/READABILITY_SCREENSHOT_MANIFEST.json";
const cases = [
  {
    id: "art06-daylight-hud",
    label: "白天 HUD 与交互提示",
    path: "/?scene=forest-combat&weather=晴朗&segment=0&brightness=1",
    surfaces: ["daylight", "hud", "interaction", "combat"],
  },
  {
    id: "art06-night-fog-boss",
    label: "深夜雾风首领场景",
    path: "/?scene=moonspire-boss&weather=雾风&segment=3&brightness=0.78",
    surfaces: ["night", "fog", "boss", "hud"],
  },
  {
    id: "art06-rain-quest-text",
    label: "雨天任务文字",
    path: "/?scene=river-weather&weather=细雨&segment=2&brightness=0.95&panel=quest",
    surfaces: ["rain", "quest", "text", "hud"],
  },
  {
    id: "art06-dense-combat-warning",
    label: "战斗特效密集可读性",
    path: "/?scene=ruins-boss&weather=雾风&segment=3&brightness=0.82",
    surfaces: ["combat", "warning", "enemy", "hud"],
  },
];
const viewport = { width: 1366, height: 768 };
const edgePath = findEdgePath();

mkdirSync(outDir, { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    BUILD_DATE: "readability-capture",
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
    command: "npm run capture:readability",
    browser: {
      executable: edgePath,
      mode: "Microsoft Edge headless",
    },
    baseUrl,
    outputDir: outDir,
    viewport,
    requirements,
    files: results,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`极端可读性截图完成：${results.length} 张，ART-06 ${requirements.complete ? "通过" : "需复核"}。`);
  if (!requirements.complete) process.exitCode = 1;
} finally {
  server.kill();
}

function captureCase(entry) {
  const outPath = join(outDir, `${entry.id}.png`);
  const profileDir = mkdtempSync(join(tmpdir(), "moonbell-readability-edge-"));
  try {
    const url = `${baseUrl}${entry.path}`;
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--hide-scrollbars",
      "--no-first-run",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=5000",
      `--user-data-dir=${profileDir}`,
      `--window-size=${viewport.width},${viewport.height}`,
      `--screenshot=${resolve(outPath)}`,
      url,
    ];
    const result = spawnSync(edgePath, args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 * 4 });
    if (result.status !== 0 || !existsSync(outPath)) {
      throw new Error(`Edge 截图失败：${result.stderr || result.stdout || `exit ${result.status}`}`);
    }
    const buffer = readFileSync(outPath);
    const png = decodePng(buffer);
    const metrics = measureReadability(png);
    return {
      id: entry.id,
      label: entry.label,
      file: outPath.replaceAll("\\", "/"),
      urlPath: entry.path,
      viewport,
      imageSize: {
        width: png.width,
        height: png.height,
      },
      bytes: statSync(outPath).size,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      surfaces: entry.surfaces,
      metrics,
      valid: png.width === viewport.width && png.height === viewport.height && metrics.ok,
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
  throw new Error("本地可读性截图服务器未能启动。");
}

function summarizeRequirements(results) {
  const surfaces = new Set(results.flatMap((entry) => entry.surfaces));
  const requiredSurfaces = ["daylight", "night", "rain", "combat", "boss", "quest", "hud"];
  const hasAllSurfaces = requiredSurfaces.every((surface) => surfaces.has(surface));
  const validFiles = results.every((entry) => entry.valid && existsSync(entry.file) && entry.bytes > 0 && entry.sha256);
  const uniqueHashes = new Set(results.map((entry) => entry.sha256)).size === results.length;
  return {
    hasAllSurfaces,
    validFiles,
    uniqueHashes,
    complete: results.length >= 4 && hasAllSurfaces && validFiles && uniqueHashes,
  };
}

function measureReadability(png) {
  const luminance = [];
  const pixels = png.data.length / 4;
  for (let i = 0; i < png.data.length; i += 4) {
    luminance.push(0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]);
  }
  luminance.sort((a, b) => a - b);
  const p10 = luminance[Math.floor(pixels * 0.1)];
  const p90 = luminance[Math.floor(pixels * 0.9)];
  const avg = luminance.reduce((total, value) => total + value, 0) / pixels;
  const darkRatio = luminance.filter((value) => value < 32).length / pixels;
  const brightRatio = luminance.filter((value) => value > 196).length / pixels;
  const contrastSpread = p90 - p10;
  return {
    averageLuminance: Number(avg.toFixed(2)),
    p10: Number(p10.toFixed(2)),
    p90: Number(p90.toFixed(2)),
    contrastSpread: Number(contrastSpread.toFixed(2)),
    darkRatio: Number(darkRatio.toFixed(4)),
    brightRatio: Number(brightRatio.toFixed(4)),
    ok: contrastSpread >= 42 && darkRatio <= 0.82 && brightRatio >= 0.006,
  };
}

function decodePng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("不是有效 PNG 文件");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error("不支持隔行 PNG");
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    offset += 12 + length;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`不支持的 PNG 格式：bitDepth=${bitDepth}, colorType=${colorType}`);
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  let rawOffset = 0;
  let pixelOffset = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const scanline = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    unfilter(scanline, prev, channels, filter);
    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      pixels[pixelOffset] = scanline[source];
      pixels[pixelOffset + 1] = scanline[source + 1];
      pixels[pixelOffset + 2] = scanline[source + 2];
      pixels[pixelOffset + 3] = channels === 4 ? scanline[source + 3] : 255;
      pixelOffset += 4;
    }
    prev = scanline;
  }
  return { width, height, data: pixels };
}

function unfilter(line, prev, channels, filter) {
  for (let i = 0; i < line.length; i += 1) {
    const left = i >= channels ? line[i - channels] : 0;
    const up = prev[i] || 0;
    const upLeft = i >= channels ? prev[i - channels] || 0 : 0;
    if (filter === 1) line[i] = (line[i] + left) & 255;
    else if (filter === 2) line[i] = (line[i] + up) & 255;
    else if (filter === 3) line[i] = (line[i] + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) line[i] = (line[i] + paeth(left, up, upLeft)) & 255;
    else if (filter !== 0) throw new Error(`未知 PNG filter：${filter}`);
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
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
