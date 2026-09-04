import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { VERSION, projectIdentity } from "../src/gameData.js";

if (typeof WebSocket !== "function") {
  throw new Error("帧率取证需要 Node 内置 WebSocket；请使用 Node 22+ 或 Codex 捆绑 Node 运行。");
}

const port = Number(process.env.FPS_CAPTURE_PORT || 5200);
const debugPortBase = Number(process.env.FPS_CAPTURE_DEBUG_PORT || 9400);
const durationMs = Number(process.env.FPS_CAPTURE_DURATION_MS || 120_000);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = "docs/acceptance/tests/performance/frame-rate";
const manifestPath = "docs/acceptance/tests/performance/FRAME_RATE_MANIFEST.json";
const chartPath = join(outDir, "perf01-frame-rate.png");
const chartHtmlPath = join(outDir, "perf01-frame-rate.html");
const edgePath = findEdgePath();
const viewport = { width: 1280, height: 720 };
const cases = [
  { id: "village", label: "聚落", path: "/?scene=bellvale" },
  { id: "rain", label: "雨天河岸", path: "/?scene=river-weather&weather=细雨&segment=2" },
  { id: "combat", label: "森林战斗", path: "/?scene=forest-combat" },
  { id: "boss", label: "首领战", path: "/?scene=moonspire-boss&weather=雾风&segment=3" },
];

async function main() {
  mkdirSync(outDir, { recursive: true });
  const server = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      BUILD_DATE: "fps-capture",
      BUILD_COMMIT: "local-evidence",
      DEEPSEEK_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForServer(server);
    const results = [];
    for (const [index, entry] of cases.entries()) {
      results.push(await captureCase(entry, debugPortBase + index));
    }
    const requirements = summarizeRequirements(results);
    writeChart(results, requirements);
    const chart = renderChart();
    const manifest = {
      schemaVersion: 1,
      title: projectIdentity.title,
      gameVersion: VERSION,
      generatedAt: new Date().toISOString(),
      command: "npm run capture:fps",
      browser: {
        executable: edgePath,
        mode: "Microsoft Edge headless + DevTools Protocol",
      },
      baseUrl,
      viewport,
      durationTargetMs: durationMs,
      cases,
      requirements,
      results,
      chart,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`帧率取证完成：${results.length} 个场景，每场 ${Math.round(durationMs / 1000)} 秒，PERF-01 ${requirements.complete ? "通过" : "需复核"}。`);
    if (!requirements.complete) process.exitCode = 1;
  } finally {
    server.kill();
  }
}

async function captureCase(entry, debugPort) {
  const profileDir = mkdtempSync(join(tmpdir(), `moonbell-fps-${entry.id}-`));
  const browser = spawn(
    edgePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--no-first-run",
      "--hide-scrollbars",
      "--run-all-compositor-stages-before-draw",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      `--window-size=${viewport.width},${viewport.height}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
  let client;
  try {
    const wsUrl = await createTarget(debugPort);
    client = await CdpClient.connect(wsUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate(client, `${baseUrl}${entry.path}`);
    const raw = await evaluate(client, `(${measureFrameRate.toString()})(${Math.round(durationMs)})`);
    const stats = summarizeFrameTimes(raw.frameTimes, raw.elapsedMs);
    return {
      id: entry.id,
      label: entry.label,
      path: entry.path,
      elapsedMs: raw.elapsedMs,
      frameCount: raw.frameTimes.length,
      avgFps: stats.avgFps,
      minFps1s: stats.minFps1s,
      p95FrameMs: stats.p95FrameMs,
      maxFrameMs: stats.maxFrameMs,
      droppedFrameRatio: stats.droppedFrameRatio,
      perSecondFps: stats.perSecondFps,
      ok: raw.elapsedMs >= 118_000 && stats.avgFps >= 50 && stats.p95FrameMs <= 24 && stats.droppedFrameRatio <= 0.02,
    };
  } finally {
    await client?.close();
    browser.kill();
    await delay(300);
    const resolvedProfile = resolve(profileDir);
    const resolvedTemp = resolve(tmpdir());
    if (resolvedProfile.startsWith(resolvedTemp)) rmSync(resolvedProfile, { recursive: true, force: true });
  }
}

async function measureFrameRate(targetMs) {
  const frameTimes = [];
  const startedAt = performance.now();
  let last = 0;
  await new Promise((resolve) => {
    const tick = (now) => {
      if (last) frameTimes.push(Number((now - last).toFixed(3)));
      last = now;
      if (now - startedAt >= targetMs) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return {
    elapsedMs: performance.now() - startedAt,
    frameTimes,
  };
}

function summarizeFrameTimes(frameTimes, elapsedMs) {
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const avgFps = Number(((frameTimes.length / elapsedMs) * 1000).toFixed(2));
  const p95FrameMs = Number(percentile(sorted, 0.95).toFixed(2));
  const maxFrameMs = Number(Math.max(...frameTimes).toFixed(2));
  const droppedFrameRatio = Number((frameTimes.filter((ms) => ms > 34).length / Math.max(1, frameTimes.length)).toFixed(4));
  const buckets = [];
  let elapsed = 0;
  for (const frame of frameTimes) {
    elapsed += frame;
    const index = Math.max(0, Math.floor(elapsed / 1000));
    buckets[index] = (buckets[index] || 0) + 1;
  }
  const completeBuckets = buckets.filter((value) => Number.isFinite(value));
  const stableBuckets = completeBuckets.length > 2 ? completeBuckets.slice(1, -1) : completeBuckets;
  const perSecondFps = stableBuckets.map((value) => Number(value.toFixed(2)));
  const minFps1s = Number(Math.min(...perSecondFps).toFixed(2));
  return { avgFps, minFps1s, p95FrameMs, maxFrameMs, droppedFrameRatio, perSecondFps };
}

function percentile(sorted, ratio) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)));
  return sorted[index];
}

function summarizeRequirements(results) {
  const completeCases = cases.every((entry) => results.some((result) => result.id === entry.id && result.ok));
  const durationComplete = results.every((result) => result.elapsedMs >= 118_000);
  const fpsStable = results.every((result) => result.avgFps >= 50 && result.p95FrameMs <= 24 && result.droppedFrameRatio <= 0.02);
  return {
    completeCases,
    durationComplete,
    fpsStable,
    minAvgFps: Math.min(...results.map((result) => result.avgFps)),
    maxP95FrameMs: Math.max(...results.map((result) => result.p95FrameMs)),
    maxDroppedFrameRatio: Math.max(...results.map((result) => result.droppedFrameRatio)),
    complete: completeCases && durationComplete && fpsStable,
  };
}

function writeChart(results, requirements) {
  const width = 1280;
  const height = 720;
  const margin = { left: 84, right: 42, top: 88, bottom: 92 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const seconds = Math.max(...results.map((result) => result.perSecondFps.length));
  const maxY = Math.max(70, Math.ceil(Math.max(...results.flatMap((result) => result.perSecondFps)) / 10) * 10);
  const minY = 0;
  const palette = ["#f0c66e", "#7bd7c4", "#ff9d66", "#c2d6ff"];
  const grid = Array.from({ length: 6 }, (_, index) => {
    const value = minY + ((maxY - minY) / 5) * index;
    const y = margin.top + ((maxY - value) / (maxY - minY)) * plotHeight;
    return `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="grid" />
      <text x="${margin.left - 14}" y="${y + 5}" text-anchor="end" class="axis">${Math.round(value)} FPS</text>`;
  }).join("\n");
  const lines = results
    .map((result, resultIndex) => {
      const points = result.perSecondFps
        .map((fps, index) => {
          const x = margin.left + (index / Math.max(1, seconds - 1)) * plotWidth;
          const y = margin.top + ((maxY - fps) / (maxY - minY)) * plotHeight;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      const color = palette[resultIndex % palette.length];
      return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" />
        <circle cx="${width - 350}" cy="${150 + resultIndex * 30}" r="6" fill="${color}" />
        <text x="${width - 332}" y="${155 + resultIndex * 30}" class="legend">${result.label} · 均值 ${result.avgFps} FPS</text>`;
    })
    .join("\n");
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #17202a; font-family: "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; color: #f5edd7; }
      svg { display: block; width: ${width}px; height: ${height}px; background: linear-gradient(135deg, #17202a, #263b37 56%, #514b35); }
      .title { font-size: 34px; font-weight: 800; fill: #fff6d5; }
      .subtitle, .axis, .legend, .note { fill: #e6d7b4; }
      .subtitle { font-size: 16px; }
      .axis { font-size: 14px; }
      .legend, .note { font-size: 15px; }
      .grid { stroke: #ffffff; stroke-opacity: 0.14; stroke-width: 1; }
      .badge { fill: #203039; stroke: #d6b16b; stroke-opacity: 0.55; rx: 10; }
    </style>
  </head>
  <body>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="浏览器帧率曲线">
      <text x="${margin.left}" y="44" class="title">PERF-01 浏览器帧率曲线</text>
      <text x="${margin.left}" y="70" class="subtitle">Microsoft Edge headless，聚落、雨天河岸、森林战斗、首领战各连续 ${Math.round(durationMs / 1000)} 秒 rAF 采样</text>
      ${grid}
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="grid" />
      <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}" class="grid" />
      ${lines}
      <rect x="${width - 382}" y="28" width="332" height="90" class="badge" />
      <text x="${width - 360}" y="58" class="note">状态：${requirements.complete ? "通过" : "需复核"}</text>
      <text x="${width - 360}" y="82" class="note">最低均值：${requirements.minAvgFps.toFixed(2)} FPS</text>
      <text x="${width - 360}" y="106" class="note">最高 P95：${requirements.maxP95FrameMs.toFixed(2)} ms</text>
      <text x="${margin.left}" y="${height - 36}" class="axis">横轴：采样秒数；纵轴：每秒 requestAnimationFrame 帧数</text>
    </svg>
  </body>
</html>
`;
  writeFileSync(chartHtmlPath, html, "utf8");
}

function renderChart() {
  const profileDir = mkdtempSync(join(tmpdir(), "moonbell-fps-chart-edge-"));
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
    if (result.status !== 0 || !existsSync(chartPath)) throw new Error(`帧率曲线图渲染失败：${result.stderr || result.stdout || result.status}`);
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

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  await waitForExpression(client, "document.readyState === 'complete'");
  await waitForExpression(client, "(() => { const app = document.querySelector('#app'); return app && !app.hidden; })()", 18_000);
  await delay(600);
}

async function waitForExpression(client, expression, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await evaluate(client, `Boolean(${expression})`).catch(() => false);
    if (ok) return;
    await delay(150);
  }
  throw new Error(`等待浏览器状态超时：${expression}`);
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) {
    const text = response.exceptionDetails.text || response.exceptionDetails.exception?.description || "Runtime.evaluate failed";
    throw new Error(text);
  }
  return response.result?.value;
}

async function waitForServer(server) {
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
  throw new Error("本地帧率取证服务器未能启动。");
}

async function createTarget(debugPort) {
  const base = `http://127.0.0.1:${debugPort}`;
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/json/version`);
      if (response.ok) break;
    } catch {
      await delay(150);
    }
  }
  const response = await fetch(`${base}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  if (!response.ok) throw new Error(`创建 DevTools target 失败：HTTP ${response.status}`);
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error("DevTools target 缺少 webSocketDebuggerUrl");
  return target.webSocketDebuggerUrl;
}

class CdpClient {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(wsUrl);
    this.opened = new Promise((resolvePromise, reject) => {
      this.socket.addEventListener("open", resolvePromise, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
    this.socket.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("DevTools WebSocket 已关闭"));
      this.pending.clear();
    });
  }

  static async connect(wsUrl) {
    const client = new CdpClient(wsUrl);
    await client.opened;
    return client;
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const message = JSON.stringify({ id, method, params });
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject });
      this.socket.send(message);
    });
  }

  handleMessage(event) {
    const data = JSON.parse(event.data);
    if (!data.id || !this.pending.has(data.id)) return;
    const pending = this.pending.get(data.id);
    this.pending.delete(data.id);
    if (data.error) pending.reject(new Error(data.error.message || JSON.stringify(data.error)));
    else pending.resolve(data.result || {});
  }

  async close() {
    this.socket.close();
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

await main();
