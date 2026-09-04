import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { VERSION, projectIdentity } from "../src/gameData.js";

const port = Number(process.env.MEMORY_CAPTURE_PORT || 5198);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = "docs/acceptance/tests/performance/memory-curve";
const manifestPath = "docs/acceptance/tests/performance/MEMORY_CURVE_MANIFEST.json";
const chartPath = join(outDir, "perf03-memory-curve.png");
const chartHtmlPath = join(outDir, "perf03-memory-curve.html");
const edgePath = findEdgePath();
const viewport = { width: 1366, height: 768 };
const cases = [
  { id: "title", label: "标题页", path: "/" },
  { id: "village", label: "聚落 HUD", path: "/?scene=bellvale" },
  { id: "rain", label: "雨天河岸", path: "/?scene=river-weather&weather=细雨&segment=2" },
  { id: "boss", label: "首领战", path: "/?scene=moonspire-boss&weather=雾风&segment=3" },
];

mkdirSync(outDir, { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    BUILD_DATE: "memory-capture",
    BUILD_COMMIT: "local-evidence",
    DEEPSEEK_API_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer();
  const samples = [];
  for (const entry of cases) {
    samples.push(...(await captureCase(entry)));
  }
  const requirements = summarizeRequirements(samples);
  writeChart(samples, requirements);
  const chart = renderChart();
  const manifest = {
    schemaVersion: 1,
    title: projectIdentity.title,
    gameVersion: VERSION,
    generatedAt: new Date().toISOString(),
    command: "npm run capture:memory",
    browser: {
      executable: edgePath,
      mode: "Microsoft Edge headless",
    },
    baseUrl,
    viewport,
    cases,
    requirements,
    samples,
    chart,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`浏览器内存曲线取证完成：${samples.length} 个采样点，PERF-03 ${requirements.complete ? "通过" : "需复核"}。`);
  if (!requirements.complete) process.exitCode = 1;
} finally {
  server.kill();
}

async function captureCase(entry) {
  const token = `moonbell-memory-${entry.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const profileDir = mkdtempSync(join(tmpdir(), `moonbell-memory-edge-${entry.id}-`));
  const url = `${baseUrl}${entry.path}`;
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--run-all-compositor-stages-before-draw",
    `--user-data-dir=${profileDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
    `--moonbell-memory-token=${token}`,
    url,
  ];
  const browser = spawn(edgePath, args, { stdio: ["ignore", "ignore", "ignore"] });
  const startedAt = Date.now();
  const results = [];
  try {
    await delay(900);
    for (let index = 0; index < 8; index += 1) {
      if (browser.exitCode !== null) throw new Error(`Edge 提前退出：${entry.label}`);
      const memory = sampleBrowserMemory(token, basename(profileDir));
      results.push({
        caseId: entry.id,
        label: entry.label,
        elapsedMs: Date.now() - startedAt,
        processCount: memory.processCount,
        workingSetMiB: memory.workingSetMiB,
        ok: memory.processCount > 0 && memory.workingSetMiB > 0,
      });
      await delay(650);
    }
  } finally {
    browser.kill();
    await delay(600);
    const resolvedProfile = resolve(profileDir);
    const resolvedTemp = resolve(tmpdir());
    if (resolvedProfile.startsWith(resolvedTemp)) rmSync(resolvedProfile, { recursive: true, force: true });
  }
  return results;
}

function sampleBrowserMemory(token, profileLeaf) {
  if (process.platform !== "win32") {
    return sampleBrowserMemoryUnix(token, profileLeaf);
  }
  const safeToken = escapePowerShellLike(token);
  const safeProfile = escapePowerShellLike(profileLeaf);
  const command = [
    "$items = Get-CimInstance Win32_Process | Where-Object {",
    `($_.CommandLine -like '*${safeToken}*') -or ($_.CommandLine -like '*${safeProfile}*')`,
    "};",
    "$items | Select-Object ProcessId,WorkingSetSize | ConvertTo-Json -Compress",
  ].join(" ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", timeout: 10_000 });
  if (result.status !== 0 || !result.stdout.trim()) return { processCount: 0, workingSetMiB: 0 };
  const parsed = JSON.parse(result.stdout.trim());
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const bytes = rows.reduce((sum, row) => sum + Number(row.WorkingSetSize || 0), 0);
  return {
    processCount: rows.length,
    workingSetMiB: Number((bytes / 1024 / 1024).toFixed(2)),
  };
}

function sampleBrowserMemoryUnix(token, profileLeaf) {
  const result = spawnSync("ps", ["-axo", "pid=,rss=,command="], { encoding: "utf8", timeout: 10_000 });
  if (result.status !== 0) return { processCount: 0, workingSetMiB: 0 };
  const rows = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(token) || line.includes(profileLeaf));
  const kib = rows.reduce((sum, line) => {
    const parts = line.split(/\s+/);
    return sum + Number(parts[1] || 0);
  }, 0);
  return { processCount: rows.length, workingSetMiB: Number((kib / 1024).toFixed(2)) };
}

function escapePowerShellLike(value) {
  return String(value).replace(/'/g, "''").replace(/[\[\]]/g, "?");
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
  throw new Error("本地内存曲线取证服务器未能启动。");
}

function summarizeRequirements(samples) {
  const byCase = new Map();
  for (const sample of samples) {
    const group = byCase.get(sample.caseId) || [];
    group.push(sample);
    byCase.set(sample.caseId, group);
  }
  const maxWorkingSetMiB = Math.max(...samples.map((sample) => sample.workingSetMiB));
  const minWorkingSetMiB = Math.min(...samples.map((sample) => sample.workingSetMiB));
  const completeCases = cases.every((entry) => (byCase.get(entry.id) || []).filter((sample) => sample.ok).length >= 6);
  const memoryWithinBudget = maxWorkingSetMiB <= 1200;
  const curveHasVariation = maxWorkingSetMiB - minWorkingSetMiB >= 1;
  return {
    completeCases,
    memoryWithinBudget,
    curveHasVariation,
    sampleCount: samples.length,
    maxWorkingSetMiB,
    minWorkingSetMiB,
    complete: completeCases && memoryWithinBudget && curveHasVariation,
  };
}

function writeChart(samples, requirements) {
  const width = 1280;
  const height = 720;
  const margin = { left: 88, right: 42, top: 78, bottom: 96 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxY = Math.max(64, Math.ceil((requirements.maxWorkingSetMiB + 40) / 50) * 50);
  const minY = Math.max(0, Math.floor(Math.max(0, requirements.minWorkingSetMiB - 40) / 50) * 50);
  const points = samples.map((sample, index) => {
    const x = margin.left + (index / Math.max(1, samples.length - 1)) * plotWidth;
    const y = margin.top + ((maxY - sample.workingSetMiB) / Math.max(1, maxY - minY)) * plotHeight;
    return { ...sample, x, y };
  });
  const caseBands = cases
    .map((entry) => {
      const group = points.filter((point) => point.caseId === entry.id);
      const first = group[0];
      const last = group[group.length - 1];
      if (!first || !last) return "";
      return `<rect x="${first.x - 8}" y="${margin.top}" width="${last.x - first.x + 16}" height="${plotHeight}" fill="#ffffff" opacity="0.055" />
      <text x="${(first.x + last.x) / 2}" y="${height - 44}" text-anchor="middle" class="case-label">${entry.label}</text>`;
    })
    .join("\n");
  const grid = Array.from({ length: 6 }, (_, index) => {
    const value = minY + ((maxY - minY) / 5) * index;
    const y = margin.top + ((maxY - value) / Math.max(1, maxY - minY)) * plotHeight;
    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="grid" />
      <text x="${margin.left - 14}" y="${y + 5}" text-anchor="end" class="axis">${Math.round(value)} MiB</text>`;
  }).join("\n");
  const polyline = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const dots = points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5" class="dot" />`).join("\n");
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #17202a; font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; color: #f5edd7; }
      svg { display: block; width: ${width}px; height: ${height}px; background: linear-gradient(135deg, #17202a, #243b45 54%, #4d5138); }
      .title { font-size: 34px; font-weight: 800; fill: #fff6d5; }
      .subtitle, .axis, .case-label, .note { fill: #e6d7b4; }
      .subtitle { font-size: 16px; }
      .axis { font-size: 14px; }
      .case-label { font-size: 15px; font-weight: 700; }
      .grid { stroke: #ffffff; stroke-opacity: 0.14; stroke-width: 1; }
      .line { fill: none; stroke: #f0c66e; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; }
      .dot { fill: #f6e2a0; stroke: #5b3c2e; stroke-width: 2; }
      .note { font-size: 15px; }
      .badge { fill: #203039; stroke: #d6b16b; stroke-opacity: 0.55; rx: 10; }
    </style>
  </head>
  <body>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="浏览器内存曲线">
      <text x="${margin.left}" y="42" class="title">PERF-03 浏览器内存曲线</text>
      <text x="${margin.left}" y="68" class="subtitle">Microsoft Edge headless，按标题、聚落、雨天河岸、首领战连续采样工作集内存</text>
      ${caseBands}
      ${grid}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="grid" />
      <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}" class="grid" />
      <polyline points="${polyline}" class="line" />
      ${dots}
      <rect x="${width - 390}" y="30" width="332" height="92" class="badge" />
      <text x="${width - 368}" y="60" class="note">采样点：${samples.length}</text>
      <text x="${width - 368}" y="84" class="note">峰值：${requirements.maxWorkingSetMiB.toFixed(2)} MiB</text>
      <text x="${width - 368}" y="108" class="note">状态：${requirements.complete ? "通过" : "需复核"}</text>
    </svg>
  </body>
</html>
`;
  writeFileSync(chartHtmlPath, html, "utf8");
}

function renderChart() {
  const profileDir = mkdtempSync(join(tmpdir(), "moonbell-memory-chart-edge-"));
  try {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--hide-scrollbars",
      "--no-first-run",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=1500",
      `--user-data-dir=${profileDir}`,
      "--window-size=1280,720",
      `--screenshot=${resolve(chartPath)}`,
      pathToFileURL(resolve(chartHtmlPath)).href,
    ];
    const result = spawnSync(edgePath, args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 * 4 });
    if (result.status !== 0 || !existsSync(chartPath)) throw new Error(`内存曲线图渲染失败：${result.stderr || result.stdout || result.status}`);
    const buffer = readFileSync(chartPath);
    return {
      file: chartPath.replaceAll("\\", "/"),
      html: chartHtmlPath.replaceAll("\\", "/"),
      bytes: statSync(chartPath).size,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    };
  } finally {
    const resolvedProfile = resolve(profileDir);
    const resolvedTemp = resolve(tmpdir());
    if (resolvedProfile.startsWith(resolvedTemp)) rmSync(resolvedProfile, { recursive: true, force: true });
  }
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
