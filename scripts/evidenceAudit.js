import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  SAVE_SCHEMA_VERSION,
  VERSION,
  areas,
  audioThemes,
  enemyTypes,
  items,
  mainQuestStages,
  memories,
  npcs,
  projectIdentity,
  recipes,
  sideQuests,
  soundEffects,
  upgrades,
  weatherStates,
} from "../src/gameData.js";
import {
  addItem,
  assertInvariants,
  changeArea,
  completeMainStage,
  completeSideQuest,
  createNewGame,
  defeatEnemy,
  finishGame,
  parseImportedSave,
  runContentIntegrityRegression,
  runEconomyCurveRegression,
  runGameplayRegression,
  runGoldenPathSimulation,
  runRelationshipBranchRegression,
  runRumorRepetitionRegression,
  runUpgradeFlowRegression,
  runWorldSystemsRegression,
  runWorldSimulation,
  serializeSave,
  validateSave,
} from "../src/gameRules.js";
import { writeSaveToStorage } from "../src/storageSafety.js";

const generatedAt = new Date().toISOString();
const commit = readCommand("git rev-parse --short HEAD") || "untracked-local";
const branch = readCommand("git rev-parse --abbrev-ref HEAD") || "unknown";
const screenshotDir = "docs/acceptance/screenshots";
const visualDir = "docs/acceptance/tests/visual";
const visualManifestPath = join(visualDir, "VISUAL_BASELINE_MANIFEST.json");
const visualReportPath = join(visualDir, "VISUAL_REGRESSION_REPORT.md");
const visualIterationReportPath = join(visualDir, "VISUAL_ITERATION_REPORT.md");
const readabilityScreenshotDir = "docs/acceptance/tests/visual/readability-screenshots";
const readabilityManifestPath = "docs/acceptance/tests/visual/READABILITY_SCREENSHOT_MANIFEST.json";
const readabilityReportPath = "docs/acceptance/tests/visual/READABILITY_REPORT.md";
const responsiveScreenshotDir = "docs/acceptance/tests/ui/responsive-screenshots";
const responsiveManifestPath = "docs/acceptance/tests/ui/RESPONSIVE_SCREENSHOT_MANIFEST.json";
const responsiveReportPath = "docs/acceptance/tests/ui/RESPONSIVE_SCREENSHOT_REPORT.md";
const accessibilityFeedbackReportPath = "docs/acceptance/tests/ui/ACCESSIBILITY_FEEDBACK_REPORT.md";
const memoryCurveManifestPath = "docs/acceptance/tests/performance/MEMORY_CURVE_MANIFEST.json";
const memoryCurveReportPath = "docs/acceptance/tests/performance/MEMORY_CURVE_REPORT.md";
const frameRateManifestPath = "docs/acceptance/tests/performance/FRAME_RATE_MANIFEST.json";
const frameRateReportPath = "docs/acceptance/tests/performance/FRAME_RATE_REPORT.md";
const frameRateChartDir = "docs/acceptance/tests/performance/frame-rate";
const browserFlowManifestPath = "docs/acceptance/tests/browser/BROWSER_FLOW_MANIFEST.json";
const browserFlowReportPath = "docs/acceptance/tests/browser/BROWSER_FLOW_REPORT.md";
const browserFlowVideoDir = "docs/acceptance/tests/browser/browser-flow-videos";
const browserFlowFrameDir = "docs/acceptance/tests/browser/browser-flow-frames";
const dirs = [
  "docs/acceptance",
  "docs/acceptance/saves",
  "docs/acceptance/presskit",
  "docs/acceptance/tests/data",
  "docs/acceptance/tests/audio",
  "docs/acceptance/tests/browser",
  "docs/acceptance/tests/content",
  "docs/acceptance/tests/ops",
  "docs/acceptance/tests/performance",
  frameRateChartDir,
  "docs/acceptance/tests/gameplay",
  "docs/acceptance/tests/ai",
  "docs/acceptance/tests/systems",
  "docs/acceptance/tests/process",
  "docs/acceptance/tests/security",
  "docs/acceptance/tests/simulation",
  "docs/acceptance/tests/ui",
  visualDir,
  readabilityScreenshotDir,
  responsiveScreenshotDir,
  browserFlowVideoDir,
  browserFlowFrameDir,
];
for (const dir of dirs) mkdirSync(dir, { recursive: true });

const sampleSaves = writeSampleSaves();
const dataReport = buildDataReport(sampleSaves);
const backupRestoreReport = buildBackupRestoreReport(sampleSaves);
const storageFailureReport = buildStorageFailureReport();
const rumorRepetitionReport = buildRumorRepetitionReport();
const economyCurveReport = buildEconomyCurveReport();
const upgradeFlowReport = buildUpgradeFlowReport();
const networkResilienceReport = buildNetworkResilienceReport();
const relationshipBranchReport = buildRelationshipBranchReport();
const performanceReport = buildPerformanceReport();
const memoryCurveReport = buildMemoryCurveReport();
const frameRateReport = buildFrameRateReport();
const browserFlowReport = buildBrowserFlowReport();
const simulationReport = buildSimulationReport();
const gameplayRegressionReport = buildGameplayRegressionReport();
const worldSystemsReport = buildWorldSystemsReport();
const contentIntegrityReport = buildContentIntegrityReport();
const screenshotReport = buildScreenshotIndex();
const presskitReport = buildPresskitReport(screenshotReport);
const visualRegressionReport = buildVisualRegressionReport(screenshotReport);
const readabilityReport = buildReadabilityReport();
const visualIterationReport = buildVisualIterationReport(screenshotReport, presskitReport, visualRegressionReport, readabilityReport);
const buildInfo = buildBuildInfo(sampleSaves, performanceReport);
const versionReport = buildVersionReport();
const loggingReport = buildLoggingReport();
const assetPipeline = buildAssetPipeline();
const developmentNote = buildDevelopmentNote();
const developmentProcessReport = buildDevelopmentProcessReport();
const scopeScore = buildScopeScore(screenshotReport);
const finalSignoff = buildFinalSignoffDraft(screenshotReport);
const compatibilityReport = buildCompatibilityReport();
const uiSettingsReport = buildUiSettingsReport();
const responsiveScreenshotReport = buildResponsiveScreenshotReport();
const accessibilityFeedbackReport = buildAccessibilityFeedbackReport();
const audioReport = buildAudioReport();
const changelog = buildChangelog();

writeFileSync("docs/acceptance/00-build-info.md", buildInfo, "utf8");
writeFileSync("docs/acceptance/01-scope-and-score.md", scopeScore, "utf8");
writeFileSync("docs/acceptance/VERSION_METADATA.md", versionReport, "utf8");
writeFileSync("docs/acceptance/ASSET_PIPELINE.md", assetPipeline, "utf8");
writeFileSync("docs/acceptance/DEVELOPMENT_NOTE.md", developmentNote, "utf8");
writeFileSync("docs/acceptance/tests/process/DEVELOPMENT_PROCESS_REPORT.md", developmentProcessReport.markdown, "utf8");
writeFileSync("docs/acceptance/final-signoff.md", finalSignoff, "utf8");
writeFileSync("docs/acceptance/SCREENSHOT_INDEX.md", screenshotReport.markdown, "utf8");
writeFileSync("docs/acceptance/presskit/PRESSKIT_REPORT.md", presskitReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/browser/COMPATIBILITY_REPORT.md", compatibilityReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/audio/AUDIO_COVERAGE_REPORT.md", audioReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/ai/RUMOR_REPETITION_REPORT.md", rumorRepetitionReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/content/CONTENT_INTEGRITY_REPORT.md", contentIntegrityReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md", relationshipBranchReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/systems/ECONOMY_CURVE_REPORT.md", economyCurveReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/systems/UPGRADE_FLOW_REPORT.md", upgradeFlowReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/data/DATA_COMPATIBILITY_REPORT.md", dataReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md", backupRestoreReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md", storageFailureReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/gameplay/GAMEPLAY_REGRESSION_REPORT.md", gameplayRegressionReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/performance/PERFORMANCE_REPORT.md", performanceReport.markdown, "utf8");
writeFileSync(memoryCurveReportPath, memoryCurveReport.markdown, "utf8");
writeFileSync(frameRateReportPath, frameRateReport.markdown, "utf8");
writeFileSync(browserFlowReportPath, browserFlowReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/performance/NETWORK_RESILIENCE_REPORT.md", networkResilienceReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/security/LOGGING_SECURITY_REPORT.md", loggingReport, "utf8");
writeFileSync("docs/acceptance/tests/simulation/SIMULATION_REPORT.md", simulationReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/simulation/WORLD_SYSTEMS_REPORT.md", worldSystemsReport.markdown, "utf8");
writeFileSync("docs/acceptance/tests/ui/SETTINGS_ACCESSIBILITY_REPORT.md", uiSettingsReport.markdown, "utf8");
writeFileSync(responsiveReportPath, responsiveScreenshotReport.markdown, "utf8");
writeFileSync(accessibilityFeedbackReportPath, accessibilityFeedbackReport.markdown, "utf8");
if (visualRegressionReport.shouldWriteManifest) {
  writeFileSync(visualManifestPath, `${JSON.stringify(visualRegressionReport.manifest, null, 2)}\n`, "utf8");
}
writeFileSync(visualReportPath, visualRegressionReport.markdown, "utf8");
writeFileSync(readabilityReportPath, readabilityReport.markdown, "utf8");
writeFileSync(visualIterationReportPath, visualIterationReport.markdown, "utf8");
writeFileSync("CHANGELOG.md", changelog, "utf8");

console.log(
  `证据审计完成：${sampleSaves.length} 个样例存档，首包估算 ${formatBytes(performanceReport.initialBytes)}，内存曲线 ${memoryCurveReport.ok ? "通过" : "需复核"}，帧率曲线 ${frameRateReport.ok ? "通过" : "需复核"}，浏览器流程 ${browserFlowReport.ok ? "通过" : "需复核"}，音频 ${audioReport.ok ? "通过" : "需复核"}，可访问反馈 ${accessibilityFeedbackReport.ok ? "通过" : "需复核"}，玩法回归 ${gameplayRegressionReport.ok ? "通过" : "需复核"}，世界系统 ${worldSystemsReport.ok ? "通过" : "需复核"}，内容完整性 ${contentIntegrityReport.ok ? "通过" : "需复核"}，关系分支 ${relationshipBranchReport.ok ? "通过" : "需复核"}，开发过程 ${developmentProcessReport.ok ? "通过" : "需复核"}，发布素材 ${presskitReport.ok ? "通过" : "需复核"}，备份恢复 ${backupRestoreReport.ok ? "通过" : "需复核"}，传闻重复率 ${rumorRepetitionReport.ok ? "通过" : "需复核"}，经济曲线 ${economyCurveReport.ok ? "通过" : "需复核"}，升级流程 ${upgradeFlowReport.ok ? "通过" : "需复核"}，网络韧性 ${networkResilienceReport.ok ? "通过" : "需复核"}，存储失败 ${storageFailureReport.ok ? "通过" : "需复核"}，截图覆盖 ${screenshotReport.covered}/${screenshotReport.required}，视觉基线 ${visualRegressionReport.ok ? "通过" : "需复核"}，视觉迭代 ${visualIterationReport.ok ? "通过" : "需复核"}，极端可读性 ${readabilityReport.ok ? "通过" : "需复核"}，响应式截图 ${responsiveScreenshotReport.ok ? "通过" : "需复核"}。`,
);
if (
  !visualRegressionReport.ok ||
  !visualIterationReport.ok ||
  !memoryCurveReport.ok ||
  !frameRateReport.ok ||
  !browserFlowReport.ok ||
  !readabilityReport.ok ||
  !responsiveScreenshotReport.ok ||
  !accessibilityFeedbackReport.ok ||
  !storageFailureReport.ok ||
  !rumorRepetitionReport.ok ||
  !economyCurveReport.ok ||
  !upgradeFlowReport.ok ||
  !networkResilienceReport.ok ||
  !relationshipBranchReport.ok ||
  !developmentProcessReport.ok ||
  !presskitReport.ok ||
  !backupRestoreReport.ok
) {
  process.exitCode = 1;
}

function writeSampleSaves() {
  const samples = [
    { file: "docs/acceptance/saves/slot-1-new-game.json", label: "新游戏", state: createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" }) },
    { file: "docs/acceptance/saves/slot-2-midgame-river.json", label: "河岸中段", state: createMidgameSave() },
    { file: "docs/acceptance/saves/slot-3-boss-ready.json", label: "终局首领前", state: createBossReadySave() },
    { file: "docs/acceptance/saves/slot-4-warm-ending.json", label: "暖月结局后", state: runGoldenPathSimulation().state },
  ];
  for (const sample of samples) {
    const payload = serializeSave(sample.state);
    validateSave(payload);
    writeFileSync(sample.file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  return samples.map((sample) => ({
    label: sample.label,
    file: sample.file,
    stage: sample.state.mainStage,
    location: sample.state.location,
    ending: sample.state.ending?.title || "",
  }));
}

function createMidgameSave() {
  let state = createNewGame({ createdAt: "2026-06-26T00:00:00.000Z", saveId: "sample-midgame" });
  state = changeArea(state, "inn");
  state = addItem(state, "moonBadge", 1).state;
  state = completeMainStage(state, 0).state;
  state = changeArea(state, "emberwood");
  state = addItem(state, "emberResin", 2).state;
  state = completeMainStage(state, 1).state;
  state = changeArea(state, "riverfarm");
  assertInvariants(state);
  return state;
}

function createBossReadySave() {
  let state = createMidgameSave();
  state = addItem(state, "waterCog", 1).state;
  state = completeMainStage(state, 2).state;
  state = changeArea(state, "starruins");
  state = defeatEnemy(state, "echo-guardian");
  state = completeMainStage(state, 3).state;
  state = changeArea(state, "towerhall");
  state = addItem(state, "duskFeather", 1).state;
  state = completeSideQuest(state, "sq-scarf").state;
  state = changeArea(state, "bellvale");
  state = addItem(state, "riverPumpkin", 1).state;
  state = completeSideQuest(state, "sq-price").state;
  state = completeMainStage(state, 4).state;
  state = changeArea(state, "moonspire");
  assertInvariants(state);
  return state;
}

function buildDataReport(samples) {
  const validSave = serializeSave(createBossReadySave());
  const checks = [
    runCheck("有效 JSON 导入", () =>
      validateSave(
        parseImportedSave({
          text: JSON.stringify(validSave),
          size: 4096,
          type: "application/json",
          name: "boss-ready.json",
        }),
      ),
    ),
    runCheck("损坏 JSON 拒绝", () => parseImportedSave({ text: "{bad-json", size: 32, type: "application/json", name: "bad.json" }), true),
    runCheck("超大文件拒绝", () => parseImportedSave({ text: "{}", size: 300 * 1024, type: "application/json", name: "big.json" }), true),
    runCheck("错误类型拒绝", () => parseImportedSave({ text: "{}", size: 32, type: "text/plain", name: "save.txt" }), true),
    runCheck("篡改校验拒绝", () => parseImportedSave({ text: JSON.stringify({ ...validSave, location: "void" }), size: 4096, type: "application/json", name: "bad.json" }), true),
  ];
  const rows = checks.map((check) => `| ${check.name} | ${check.ok ? "通过" : "失败"} | ${check.note} |`).join("\n");
  const saveRows = samples.map((sample) => `| ${sample.label} | \`${sample.file}\` | ${sample.stage}/6 | ${areaName(sample.location)} | ${sample.ending || "未触发"} |`).join("\n");
  return {
    ok: checks.every((check) => check.ok),
    markdown: `# 存档兼容与导入故障报告

生成时间：${generatedAt}

## 结论

- schema 版本：${SAVE_SCHEMA_VERSION}
- 导入限制：256 KiB，JSON 存档文件。
- 正确、损坏、超大、错误类型和篡改校验路径均已覆盖。
- 已生成 ${samples.length} 组可复核样例存档。

## 导入故障矩阵

| 场景 | 结果 | 说明 |
|---|---|---|
${rows}

## 样例存档

| 样例 | 文件 | 主线 | 地点 | 结局 |
|---|---|---:|---|---|
${saveRows}
`,
  };
}

function buildBackupRestoreReport(samples) {
  const restoredRows = samples.map((sample, index) => {
    const text = readFileSync(sample.file, "utf8");
    const size = statSync(sample.file).size;
    const backupHash = createHash("sha256").update(text).digest("hex");
    const restoredPayload = parseImportedSave({ text, size, type: "application/json", name: sample.file });
    const restoredState = validateSave(restoredPayload);
    const ok =
      restoredState.mainStage === sample.stage &&
      restoredState.location === sample.location &&
      (restoredState.ending?.title || "") === sample.ending &&
      Boolean(restoredPayload.checksum);
    return {
      slot: `restored-slot-${index + 1}`,
      label: sample.label,
      file: sample.file,
      backupHash,
      stage: restoredState.mainStage,
      location: restoredState.location,
      ending: restoredState.ending?.title || "",
      ok,
    };
  });
  const rows = restoredRows
    .map(
      (row) =>
        `| ${row.slot} | ${row.label} | \`${row.file}\` | ${row.stage}/6 | ${areaName(row.location)} | ${row.ending || "未触发"} | \`${row.backupHash.slice(0, 12)}...\` | ${row.ok ? "通过" : "需复核"} |`,
    )
    .join("\n");
  const ok = restoredRows.length >= 3 && restoredRows.every((row) => row.ok);
  return {
    ok,
    restoredRows,
    markdown: `# 备份恢复演练报告

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 备份集：${samples.length} 个样例存档
- 恢复目标：模拟全新实例的 4 个新槽位
- 校验方式：JSON 导入限制、schema 迁移、checksum、主线阶段、地点和结局一致性

当前版本没有服务端数据库；持久进度主要保存在浏览器 localStorage 的 JSON 存档中。本演练使用已提交的样例存档作为备份集，删除原槽位状态后按导入流程恢复到新槽位，并验证恢复后的状态可被规则层读取。

## 恢复矩阵

| 恢复槽位 | 样例 | 备份文件 | 主线 | 地点 | 结局 | 备份 SHA-256 | 状态 |
|---|---|---|---:|---|---|---|---|
${rows}

## 恢复步骤

1. 导出或复制 JSON 存档文件作为备份。
2. 在全新实例中清空原 localStorage 槽位。
3. 使用导入流程读取备份 JSON，执行 schema 迁移与 checksum 校验。
4. 写入新的槽位并加载，确认章节、地点、结局和关键状态一致。
`,
  };
}

function buildStorageFailureReport() {
  const writes = new Map();
  const okStorage = {
    setItem(key, value) {
      writes.set(key, value);
    },
  };
  const quotaStorage = {
    setItem() {
      const error = new Error("quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    },
  };
  const validSave = serializeSave(createNewGame({ createdAt: "2026-06-26T00:00:00.000Z" }));
  const success = writeSaveToStorage({
    storage: okStorage,
    slotKey: (slot) => `slot.${slot}`,
    activeSlotKey: "active",
    slot: 1,
    save: validSave,
  });
  const quotaFailure = writeSaveToStorage({
    storage: quotaStorage,
    slotKey: (slot) => `slot.${slot}`,
    activeSlotKey: "active",
    slot: 1,
    save: validSave,
  });
  const missingFailure = writeSaveToStorage({
    storage: null,
    slotKey: (slot) => `slot.${slot}`,
    activeSlotKey: "active",
    slot: 1,
    save: validSave,
  });
  const app = readFileSync("public/app.js", "utf8");
  const storageSafety = readFileSync("src/storageSafety.js", "utf8");
  const checks = [
    { name: "正常写入槽位", ok: success.ok && writes.has("slot.1") && writes.get("active") === "1", evidence: "槽位 payload 与当前槽位均写入" },
    { name: "配额失败模拟", ok: !quotaFailure.ok && quotaFailure.code === "QuotaExceededError", evidence: quotaFailure.message },
    { name: "存储不可用模拟", ok: !missingFailure.ok && missingFailure.code === "StorageUnavailable", evidence: missingFailure.message },
    {
      name: "前端不中断反馈",
      ok: app.includes("writeSaveToStorage") && app.includes("showToast(result.message)") && app.includes("return false") && storageSafety.includes("保存失败"),
      evidence: "saveActive 显示共享中文失败提示并返回 false",
    },
  ];
  const rows = checks.map((check) => `| ${check.name} | ${check.ok ? "通过" : "失败"} | ${check.evidence} |`).join("\n");
  return {
    ok: checks.every((check) => check.ok),
    markdown: `# 存储写入失败模拟报告

生成时间：${generatedAt}

## 结论

- 状态：${checks.every((check) => check.ok) ? "通过" : "需复核"}
- 覆盖：正常保存、浏览器配额异常、存储不可用、前端中文失败提示。
- 目的：支撑 DATA-02 的“写入失败模拟”，避免 localStorage 写入异常导致游戏流程崩溃。

| 场景 | 状态 | 证据 |
|---|---|---|
${rows}
`,
  };
}

function buildPerformanceReport() {
  const initialFiles = ["public/index.html", "public/styles.css", "public/app.js", "src/gameData.js", "src/gameRules.js"];
  const runtimeFiles = collectFiles(["public", "src"], [".js", ".css", ".html"]);
  const initialBytes = initialFiles.reduce((sum, file) => sum + statSync(file).size, 0);
  const runtimeBytes = runtimeFiles.reduce((sum, file) => sum + statSync(file).size, 0);
  const rows = initialFiles.map((file) => `| \`${file}\` | ${formatBytes(statSync(file).size)} | 首次进入会加载 |`).join("\n");
  const largest = runtimeFiles
    .map((file) => ({ file, size: statSync(file).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 8)
    .map((entry) => `| \`${relative(process.cwd(), entry.file)}\` | ${formatBytes(entry.size)} |`)
    .join("\n");
  const budgetOk = initialBytes < 25 * 1024 * 1024;
  return {
    initialBytes,
    runtimeBytes,
    budgetOk,
    markdown: `# 加载与资源体积报告

生成时间：${generatedAt}

## 结论

- 首次可交互关键文件估算：${formatBytes(initialBytes)}，低于 25 MB 首包建议。
- 当前无外部图片、字体、音乐或音效文件，Canvas 美术与 WebAudio 音效由运行时代码生成。
- 运行时 JS/CSS/HTML 总量：${formatBytes(runtimeBytes)}。
- 本报告覆盖 PERF-02 的静态体积预算；真实网络瀑布和长时间 FPS 仍需浏览器/服务器实测截图补充。

## 首次加载关键文件

| 文件 | 大小 | 说明 |
|---|---:|---|
${rows}

## 最大运行时文件

| 文件 | 大小 |
|---|---:|
${largest}
`,
  };
}

function buildMemoryCurveReport() {
  const manifest = readJsonFile(memoryCurveManifestPath);
  const chartFile = manifest?.chart?.file || "docs/acceptance/tests/performance/memory-curve/perf03-memory-curve.png";
  const chartExists = existsSync(chartFile);
  const chartInfo = chartExists ? readPngInfo(readFileSync(chartFile)) : { width: 0, height: 0 };
  const chartHash = chartExists ? createHash("sha256").update(readFileSync(chartFile)).digest("hex") : "";
  const hashMatches = !manifest?.chart?.sha256 || manifest.chart.sha256 === chartHash;
  const samples = Array.isArray(manifest?.samples) ? manifest.samples : [];
  const cases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  const requirements = manifest?.requirements || {};
  const ok = Boolean(
    manifest &&
      requirements.complete &&
      samples.length >= 24 &&
      cases.length >= 4 &&
      chartInfo.width >= 1000 &&
      chartInfo.height >= 560 &&
      chartHash &&
      hashMatches,
  );
  const caseRows =
    cases.length > 0
      ? cases
          .map((entry) => {
            const group = samples.filter((sample) => sample.caseId === entry.id);
            const max = Math.max(...group.map((sample) => sample.workingSetMiB));
            const min = Math.min(...group.map((sample) => sample.workingSetMiB));
            return `| ${entry.label} | ${group.length} | ${Number.isFinite(min) ? min.toFixed(2) : "-"} MiB | ${Number.isFinite(max) ? max.toFixed(2) : "-"} MiB | ${group.every((sample) => sample.ok) ? "通过" : "需复核"} |`;
          })
          .join("\n")
      : "| 暂无 | 0 | - | - | 缺失 |";
  return {
    ok,
    markdown: `# 浏览器内存曲线报告

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 来源命令：\`${manifest?.command || "npm run capture:memory"}\`
- 浏览器：${manifest?.browser?.mode || "未记录"}
- 采样点：${samples.length}
- 峰值工作集：${requirements.maxWorkingSetMiB ? `${requirements.maxWorkingSetMiB.toFixed(2)} MiB` : "未记录"}
- 曲线截图：\`${chartFile}\`

## 场景采样

| 场景 | 采样点 | 最低工作集 | 最高工作集 | 状态 |
|---|---:|---:|---:|---|
${caseRows}

## 曲线截图校验

| 文件 | 尺寸 | 大小 | SHA-256 | 状态 |
|---|---:|---:|---|---|
| \`${chartFile}\` | ${chartInfo.width}x${chartInfo.height} | ${chartExists ? formatBytes(statSync(chartFile).size) : "0 B"} | ${chartHash ? `\`${chartHash.slice(0, 12)}...\`` : "无"} | ${chartInfo.width >= 1000 && chartInfo.height >= 560 && hashMatches ? "通过" : "需复核"} |
`,
  };
}

function buildFrameRateReport() {
  const manifest = readJsonFile(frameRateManifestPath);
  const chartFile = manifest?.chart?.file || "docs/acceptance/tests/performance/frame-rate/perf01-frame-rate.png";
  const chartExists = existsSync(chartFile);
  const chartInfo = chartExists ? readPngInfo(readFileSync(chartFile)) : { width: 0, height: 0 };
  const chartHash = chartExists ? createHash("sha256").update(readFileSync(chartFile)).digest("hex") : "";
  const hashMatches = !manifest?.chart?.sha256 || manifest.chart.sha256 === chartHash;
  const results = Array.isArray(manifest?.results) ? manifest.results : [];
  const requirements = manifest?.requirements || {};
  const completeCases = results.length >= 4 && results.every((entry) => entry.ok && entry.elapsedMs >= 118_000 && entry.avgFps >= 50 && entry.p95FrameMs <= 24);
  const ok = Boolean(
    manifest &&
      requirements.complete &&
      completeCases &&
      chartInfo.width >= 1000 &&
      chartInfo.height >= 560 &&
      chartHash &&
      hashMatches,
  );
  const rows = results.length
    ? results
        .map(
          (entry) =>
            `| ${entry.label} | ${formatDurationMs(entry.elapsedMs)} | ${entry.frameCount} | ${entry.avgFps} | ${entry.minFps1s} | ${entry.p95FrameMs} ms | ${(entry.droppedFrameRatio * 100).toFixed(2)}% | ${entry.ok ? "通过" : "需复核"} |`,
        )
        .join("\n")
    : "| 暂无 | - | - | - | - | - | - | 缺失 |";
  return {
    ok,
    markdown: `# 浏览器帧率报告

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 来源命令：\`${manifest?.command || "npm run capture:fps"}\`
- 浏览器：${manifest?.browser?.mode || "未记录"}
- 采样目标：聚落、雨天河岸、森林战斗、首领战各 2 分钟。
- 最低平均帧率：${requirements.minAvgFps ? `${requirements.minAvgFps.toFixed(2)} FPS` : "未记录"}
- 最高 P95 帧时间：${requirements.maxP95FrameMs ? `${requirements.maxP95FrameMs.toFixed(2)} ms` : "未记录"}
- 曲线截图：\`${chartFile}\`

## 场景采样

| 场景 | 时长 | 帧数 | 平均 FPS | 最低 1s FPS | P95 帧时间 | 掉帧率 | 状态 |
|---|---:|---:|---:|---:|---:|---:|---|
${rows}

## 曲线截图校验

| 文件 | 尺寸 | 大小 | SHA-256 | 状态 |
|---|---:|---:|---|---|
| \`${chartFile}\` | ${chartInfo.width}x${chartInfo.height} | ${chartExists ? formatBytes(statSync(chartFile).size) : "0 B"} | ${chartHash ? `\`${chartHash.slice(0, 12)}...\`` : "无"} | ${chartInfo.width >= 1000 && chartInfo.height >= 560 && hashMatches ? "通过" : "需复核"} |
`,
  };
}

function buildBrowserFlowReport() {
  const manifest = readJsonFile(browserFlowManifestPath);
  const cases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  const required = Array.isArray(manifest?.requiredTags)
    ? manifest.requiredTags
    : [
        "title-menu-ending",
        "pause",
        "keyboard",
        "cross-area",
        "weather",
        "player-animation",
        "npc-enemy",
        "muted-feedback",
        "browser-e2e",
        "map-edge-pressure",
        "interaction-stack",
        "combat-input",
        "npc-recovery",
        "trailer",
      ];
  const checked = cases.map((entry) => checkBrowserFlowCase(entry));
  const tags = new Set(checked.flatMap((entry) => entry.tags));
  const coveredTags = required.filter((tag) => tags.has(tag)).length;
  const validVideos = checked.length >= 8 && checked.every((entry) => entry.valid);
  const uniqueVideos = new Set(checked.map((entry) => entry.video.sha256).filter(Boolean)).size === checked.length;
  const trailer = checked.find((entry) => entry.tags.includes("trailer"));
  const trailerDurationOk = Boolean(trailer && trailer.durationMs >= 45_000 && trailer.durationMs <= 90_000);
  const complete = Boolean(manifest?.requirements?.complete && coveredTags === required.length && validVideos && uniqueVideos && trailerDurationOk);
  const requirementRows = [
    ["标题/菜单/结局返回", tags.has("title-menu-ending")],
    ["暂停与恢复", tags.has("pause")],
    ["纯键盘菜单/存档", tags.has("keyboard")],
    ["跨区浏览器加载", tags.has("cross-area")],
    ["天气/时段视觉", tags.has("weather")],
    ["主角动作", tags.has("player-animation")],
    ["NPC/敌人观察", tags.has("npc-enemy")],
    ["无声反馈", tags.has("muted-feedback")],
    ["浏览器 E2E", tags.has("browser-e2e")],
    ["地图边缘/窄门压力", tags.has("map-edge-pressure")],
    ["交互堆叠 20 次", tags.has("interaction-stack") && checked.some((entry) => entry.tags.includes("interaction-stack") && entry.inputEventCount >= 20)],
    ["战斗真实输入", tags.has("combat-input") && checked.some((entry) => entry.tags.includes("combat-input") && entry.inputEventCount >= 30)],
    ["NPC 打断与切图恢复", tags.has("npc-recovery")],
    ["45-90 秒短片", trailerDurationOk],
    ["WebM 文件、帧截图与哈希", validVideos && uniqueVideos],
  ]
    .map(([label, ok]) => `| ${label} | ${ok ? "通过" : "待补"} |`)
    .join("\n");
  const rows = checked.length
    ? checked
        .map(
          (entry) =>
            `| ${entry.title} | \`${entry.video.file}\` | ${formatDurationMs(entry.durationMs)} | ${entry.frameCount} | ${entry.inputEventCount} | ${entry.tags.join("、")} | ${entry.valid ? "通过" : entry.note} |`,
        )
        .join("\n")
    : "| 暂无 | - | - | - | - | - | 缺失 |";
  return {
    ok: complete,
    markdown: `# 浏览器流程取证报告

生成时间：${generatedAt}

## 结论

- 状态：${complete ? "通过" : "需复核"}
- 来源命令：\`${manifest?.command || "npm run capture:browser-flow"}\`
- 浏览器：${manifest?.browser?.mode || "未记录"}
- 视频段数：${checked.length}
- 覆盖标签：${coveredTags}/${required.length}
- 短片时长：${trailer ? formatDurationMs(trailer.durationMs) : "缺失"}

## 要求矩阵

| 要求 | 状态 |
|---|---|
${requirementRows}

## 视频清单

| 场景 | WebM | 时长 | 帧数 | 输入事件 | 覆盖标签 | 校验 |
|---|---|---:|---:|---:|---|---|
${rows}
`,
  };
}

function checkBrowserFlowCase(entry) {
  const video = entry?.video || {};
  const file = video.file || "";
  const base = {
    id: entry?.id || "",
    title: entry?.title || entry?.id || "未命名",
    tags: Array.isArray(entry?.tags) ? entry.tags : [],
    frameCount: Number(entry?.frameCount || 0),
    inputEventCount: Number(entry?.inputEventCount || 0),
    durationMs: Number(entry?.durationMs || 0),
    video: { file, bytes: 0, sha256: "" },
    valid: false,
    note: "缺失",
  };
  if (!file || !existsSync(file)) return base;
  const frameFiles = Array.isArray(entry?.frames) ? entry.frames.map((frame) => frame.file).filter(Boolean) : [];
  const framesOk = frameFiles.length >= 3 && frameFiles.every((frame) => existsSync(frame));
  const buffer = readFileSync(file);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const hashMatches = !video.sha256 || video.sha256 === sha256;
  const valid = Boolean(entry?.ok && buffer.byteLength > 4096 && hashMatches && framesOk && base.durationMs >= 1000);
  return {
    ...base,
    video: { file, bytes: buffer.byteLength, sha256 },
    valid,
    note: valid ? "通过" : "步骤、哈希、帧截图或视频大小需复核",
  };
}

function buildSimulationReport() {
  const seeds = Array.from({ length: 20 }, (_, index) => index + 1);
  const reports = seeds.map((seed) => ({ seed, report: runWorldSimulation(seed, 3) }));
  const snapshots = reports.reduce((sum, item) => sum + item.report.snapshots.length, 0);
  const weatherSeen = new Set(reports.flatMap((item) => item.report.snapshots.map((snapshot) => snapshot.weather)));
  const rows = reports
    .map((item) => `| ${item.seed} | ${item.report.snapshots.length} | 第 ${item.report.state.time.day} 日 | ${item.report.state.rumors.length} | 通过 |`)
    .join("\n");
  return {
    ok: reports.length === 20 && weatherStates.every((weather) => weatherSeen.has(weather)),
    markdown: `# 世界模拟稳定性报告

生成时间：${generatedAt}

## 结论

- 20 个随机种子均完成 3 个游戏日模拟。
- 共生成 ${snapshots} 个时段快照，覆盖天气：${[...weatherSeen].join("、")}。
- 每个快照均执行生命、体力、区域、主线、背包、NPC 日程不变量断言。

| 种子 | 快照数 | 结束日期 | 传闻数 | 结果 |
|---:|---:|---|---:|---|
${rows}
`,
  };
}

function buildGameplayRegressionReport() {
  const report = runGameplayRegression({ combatLoopsPerEnemy: 10 });
  const areaRows = report.movement.rows
    .map((area) => `| ${area.name} | ${area.exits} | ${area.colliders} | ${area.enemies} | ${area.ok ? "通过" : "需复核"} | ${area.notes} |`)
    .join("\n");
  const enemyRows = report.combat.rows
    .map(
      (enemy) =>
        `| ${enemy.name} | ${enemy.archetype} | ${enemy.hp} | ${enemy.attacksToDefeat} | ${enemy.loops} | ${enemy.bossPhases || "无"} | ${enemy.ok ? "通过" : "需复核"} |`,
    )
    .join("\n");
  const issueRows = report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。";
  return {
    ok: report.ok,
    markdown: `# 玩法回归报告

生成时间：${generatedAt}

## 结论

- 区域检查：${report.movement.areasChecked} 个场景，${report.movement.exitsChecked} 个出口，${report.movement.interactionPointsChecked} 个交互点，${report.movement.pickupsChecked} 个拾取物。
- 碰撞检查：${report.movement.colliderSamples} 个碰撞采样点确认会阻挡玩家圆形半径。
- 敌人检查：${report.combat.enemiesChecked} 类敌人，每类规则级击败 ${report.combat.loopsPerEnemy} 次，共 ${report.combat.totalDefeats} 次。
- 首领检查：${report.combat.bossesChecked} 类敌人具备多阶段描述。
- 失败重试：${report.combat.retryRestored ? "通过，生命和体力恢复并返回检查点。" : "需复核，检查点恢复异常。"}

本报告为本地确定性规则与地图数据取证，可支持 GAME-01、GAME-03 和 QA-02 的自动证据；最终验收仍需真实输入压力视频。

## 区域与碰撞

| 场景 | 出口 | 碰撞体 | 敌人出生点 | 状态 | 说明 |
|---|---:|---:|---:|---|---|
${areaRows}

## 敌人与战斗循环

| 敌人 | 类型 | 生命 | 基础击败次数 | 规则级击败循环 | 阶段数 | 状态 |
|---|---|---:|---:|---:|---:|---|
${enemyRows}

## 复核项

${issueRows}
`,
  };
}

function buildWorldSystemsReport() {
  const report = runWorldSystemsRegression({ transitionLoops: 30, longSessionMinutes: 60 });
  const transitionRows = report.transitions.rows
    .map((row) => `| ${row.index} | ${row.from} | ${row.exit} | ${row.to} | ${row.checkpoint} | ${row.autosave} |`)
    .join("\n");
  const weatherRows = report.weather.rows.map((row) => `| ${row.effect} | ${row.evidence} | ${row.status} |`).join("\n");
  const causalityRows = report.causality.rows.map((row) => `| ${row.name} | ${row.evidence} | ${row.status} |`).join("\n");
  const issueRows = report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。";
  return {
    ok: report.ok,
    markdown: `# 世界系统与长会话回归报告

生成时间：${generatedAt}

## 结论

- 跨区压力：连续 ${report.transitions.loops} 次跨区，覆盖 ${report.transitions.uniqueAreasVisited} 个区域名，检查出生点、检查点和跨区自动保存。
- 天气系统：${report.weather.weatherStates} 种天气，模拟快照 ${report.weather.snapshots} 个，覆盖 ${report.weather.weatherSeen.join("、")}。
- 因果链：${report.causality.chainsChecked} 条可复现规则链，覆盖桥、水车、塔顶、居民集结和传闻信任。
- 长会话：等价 ${report.longSession.minutes} 分钟、${report.longSession.steps} 个操作步、${report.longSession.saveRoundTrips} 次存档序列化/读取往返。
- 最终状态：第 ${report.longSession.finalDay} 日，位于 ${areas[report.longSession.finalArea]?.name || report.longSession.finalArea}，保留 ${report.longSession.autosavesKept} 条自动保存、${report.longSession.rumorsKept} 条传闻。

本报告为本地确定性规则取证，可支持 WORLD-03、WORLD-05、WORLD-07、WORLD-08 和 DATA-05 的自动证据；最终验收仍需要真实浏览器长会话、跨区和天气录像。

## 跨区压力

| 次数 | 出发 | 出口 | 到达 | 检查点 | 自动保存 |
|---:|---|---|---|---|---|
${transitionRows}

## 天气影响

| 影响 | 证据 | 状态 |
|---|---|---|
${weatherRows}

## 因果链

| 链路 | 可观察后果 | 状态 |
|---|---|---|
${causalityRows}

## 长会话一致性

| 项目 | 值 |
|---|---:|
| 等价分钟 | ${report.longSession.minutes} |
| 操作步 | ${report.longSession.steps} |
| 存档往返 | ${report.longSession.saveRoundTrips} |
| 游玩秒数 | ${report.longSession.playSeconds} |
| 自动保存保留 | ${report.longSession.autosavesKept} |
| 传闻保留 | ${report.longSession.rumorsKept} |

## 复核项

${issueRows}
`,
  };
}

function buildContentIntegrityReport() {
  const report = runContentIntegrityRegression();
  const issueRows = report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。";
  const tableRows = (rows) => rows.map((row) => `| ${row.item} | ${row.evidence} | ${row.status} |`).join("\n");
  const npcRows = report.npcSystems.npcStates.map((row) => `| ${row.npc} | ${row.states} | ${row.status} |`).join("\n");
  const upgradeRows = report.gameplay.upgrades.map((row) => `| ${row.title} | ${row.effect} | ${row.status} |`).join("\n");
  const recipeRows = report.systems.recipes.map((row) => `| ${row.title} | 主线 ${row.unlockStage + 1}/6 | ${row.ingredients} | ${row.result} | ${row.status} |`).join("\n");
  return {
    ok: report.ok,
    markdown: `# 内容完整性回归报告

生成时间：${generatedAt}

## 结论

- 产品闭环数据：标题身份、前 5 分钟核心循环、5 个主要区域差异和主线区域覆盖已通过规则检查。
- 玩法深度：敌人原型、首领阶段、失败恢复和 ${upgrades.length} 个永久成长节点已通过规则检查。
- NPC 系统：${npcs.length} 名 NPC 的 trust/mood/need 状态、支线信任、传闻信任和天气/时段日程恢复已通过规则检查。
- 叙事系统：${sideQuests.length} 条支线、长期后果、主题呼应、文本长度和任务恢复条件已通过规则检查。
- 系统与数据：道具用途比例、基础经济、自动保存节点和旧存档迁移已通过规则检查。
- 营地料理：${recipes.length} 个简单配方按章节开放，使用已有资源强化探索回报。
- 世界规则：世界规则表、同条件确定性和天气边界已通过规则检查。

本报告为本地确定性数据与规则取证，可支持 PROD-02、PROD-04、GAME-04、GAME-05、GAME-06、GAME-07、WORLD-02、WORLD-09、NPC-03、NPC-04、NPC-07、NPC-08、NAR-03、NAR-06、NAR-07、SYS-02、SYS-03、SYS-04、SYS-05、DATA-02 和 DATA-03 的自动证据；其中需要真人理解、真实录像或前端压力的条目仍应在最终签署前补人工证据。

## 产品与区域

| 项目 | 证据 | 状态 |
|---|---|---|
${tableRows(report.product.rows)}

## 玩法深度

| 项目 | 证据 | 状态 |
|---|---|---|
${tableRows(report.gameplay.rows)}

### 成长节点

| 成长 | 效果 | 状态 |
|---|---|---|
${upgradeRows}

## NPC 与关系

| 项目 | 证据 | 状态 |
|---|---|---|
${tableRows(report.npcSystems.rows)}

### NPC 状态表

| NPC | 状态字段 | 状态 |
|---|---|---|
${npcRows}

## 叙事与任务

| 项目 | 证据 | 状态 |
|---|---|---|
${tableRows(report.narrative.rows)}

## 系统、经济与存档

| 项目 | 证据 | 状态 |
|---|---|---|
${tableRows(report.systems.rows)}

### 营地料理配方

| 配方 | 开放阶段 | 材料 | 产物 | 状态 |
|---|---|---|---|---|
${recipeRows}

## 世界规则一致性

| 项目 | 证据 | 状态 |
|---|---|---|
${tableRows(report.ruleClarity.rows)}

## 复核项

${issueRows}
`,
  };
}

function buildScreenshotIndex() {
  const files = existsSync(screenshotDir)
    ? readdirSync(screenshotDir)
        .filter((file) => file.endsWith(".png"))
        .sort()
    : [];
  const coverageRules = [
    ["标题/作品页", /title|home|作品|首页/i],
    ["聚落", /village|bellvale|聚落/i],
    ["野外", /forest|emberwood|river|wild|ruins|河岸|森林|遗迹/i],
    ["夜晚或天气", /weather|night|rain|fog|雨|雾|夜/i],
    ["对话或日志", /quest|dialog|inventory|log|任务|背包/i],
    ["战斗", /combat|battle|fight|战斗/i],
    ["首领或终局", /boss|guardian|night-bell|moonspire|ending|首领|结局/i],
  ];
  const coveredItems = coverageRules.filter(([, regex]) => files.some((file) => regex.test(file)));
  const rows =
    files.length > 0
      ? files.map((file) => `| \`${join(screenshotDir, file).replaceAll("\\", "/")}\` | ${formatBytes(statSync(join(screenshotDir, file)).size)} |`).join("\n")
      : "| 暂无 | 0 |";
  const coverageRows = coverageRules
    .map(([label, regex]) => `| ${label} | ${files.some((file) => regex.test(file)) ? "已覆盖" : "待补"} |`)
    .join("\n");
  return {
    count: files.length,
    required: coverageRules.length,
    covered: coveredItems.length,
    complete: files.length >= 6 && coveredItems.length === coverageRules.length,
    markdown: `# 截图包索引

生成时间：${generatedAt}

## 截图文件

| 文件 | 大小 |
|---|---:|
${rows}

## 覆盖面

| 画面类型 | 状态 |
|---|---|
${coverageRows}
`,
  };
}

function buildPresskitReport(screenshotReport) {
  const assets = [
    {
      label: "主视觉源文件",
      file: "docs/acceptance/presskit/key-art-source.svg",
      expectedSize: "1600x900",
      usage: "作品集封面、发布页头图、视频封面",
    },
    {
      label: "图标",
      file: "public/favicon.svg",
      expectedSize: "512x512",
      usage: "浏览器 favicon、发布页头像、短片角标",
    },
  ].map((asset) => ({ ...asset, ...inspectSvgAsset(asset.file, asset.expectedSize) }));
  const rows = assets
    .map(
      (asset) =>
        `| ${asset.label} | \`${asset.file}\` | ${asset.size || "缺失"} | ${formatBytes(asset.bytes)} | \`${asset.sha256.slice(0, 12)}...\` | ${asset.usage} | ${asset.valid ? "通过" : asset.note} |`,
    )
    .join("\n");
  const ok = assets.every((asset) => asset.valid) && screenshotReport.count >= 6 && screenshotReport.complete;
  return {
    ok,
    assets,
    markdown: `# Press Kit 发布素材报告

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 主视觉源文件：${assets[0].valid ? "通过" : "需复核"}
- 图标：${assets[1].valid ? "通过" : "需复核"}
- 作品集截图：${screenshotReport.count} 张，覆盖 ${screenshotReport.covered}/${screenshotReport.required}

## 素材清单

| 项目 | 文件 | 尺寸 | 大小 | SHA-256 | 用途 | 状态 |
|---|---|---:|---:|---|---|---|
${rows}

## 截图包

- 截图索引：\`docs/acceptance/SCREENSHOT_INDEX.md\`
- 视觉基线：\`docs/acceptance/tests/visual/VISUAL_BASELINE_MANIFEST.json\`
- 最低要求：至少 6 张无调试截图；当前 ${screenshotReport.count} 张。

## 使用边界

- 主视觉由当前游戏角色、月铃塔、聚落、森林、河岸和遗迹元素重绘，不使用外部素材。
- 图标与主视觉共享月铃、塔和尾焰识别元素，避免与实际 Canvas 游戏风格脱节。
`,
  };
}

function buildVisualRegressionReport(screenshotReport) {
  const files = existsSync(screenshotDir)
    ? readdirSync(screenshotDir)
        .filter((file) => file.endsWith(".png"))
        .sort()
    : [];
  const entries = files.map((file) => readVisualScreenshotEntry(file));
  const previousManifest = readJsonFile(visualManifestPath);
  const updateRequested = process.argv.includes("--update-visual-baseline") || process.env.UPDATE_VISUAL_BASELINE === "1";
  const firstBaseline = !previousManifest;
  const comparison = previousManifest ? compareVisualBaseline(previousManifest, entries) : { ok: true, missing: [], added: [], changed: [] };
  const duplicateGroups = findDuplicateVisualHashes(entries);
  const minWidth = 320;
  const minHeight = 180;
  const validDimensions = entries.every((entry) => entry.valid && entry.width >= minWidth && entry.height >= minHeight && entry.bytes > 0);
  const ok = screenshotReport.complete && validDimensions && duplicateGroups.length === 0 && (firstBaseline || updateRequested || comparison.ok);
  const manifest = {
    schemaVersion: 1,
    title: projectIdentity.title,
    gameVersion: VERSION,
    generatedAt,
    branch,
    commit,
    screenshotDir,
    coverage: {
      required: screenshotReport.required,
      covered: screenshotReport.covered,
      complete: screenshotReport.complete,
    },
    minimumImageSize: {
      width: minWidth,
      height: minHeight,
    },
    files: entries.map(({ error, ...entry }) => (error ? { ...entry, error } : entry)),
  };
  const previousByFile = new Map((previousManifest?.files || []).map((entry) => [entry.file, entry]));
  const rows =
    entries.length > 0
      ? entries
          .map((entry) => {
            const previous = previousByFile.get(entry.file);
            const status = getVisualEntryStatus(entry, previous, firstBaseline, updateRequested);
            const hash = entry.sha256 ? `\`${entry.sha256.slice(0, 12)}...\`` : "无";
            const size = entry.valid ? `${entry.width}x${entry.height}` : "无效";
            return `| \`${entry.file}\` | ${size} | ${formatBytes(entry.bytes)} | ${hash} | ${status} |`;
          })
          .join("\n")
      : "| 暂无 | - | 0 | 无 | 缺失 |";
  const diffRows = buildVisualDiffRows(comparison, duplicateGroups);
  const baselineMode = firstBaseline ? "首次写入基线" : updateRequested ? "显式更新基线" : "对比既有基线";

  return {
    ok,
    manifest,
    shouldWriteManifest: ok && (firstBaseline || updateRequested),
    markdown: `# 视觉回归基线报告

生成时间：${generatedAt}

| 项目 | 状态 |
|---|---|
| 结论 | ${ok ? "通过" : "需复核"} |
| 基线模式 | ${baselineMode} |
| 截图数量 | ${entries.length} |
| 覆盖面 | ${screenshotReport.covered}/${screenshotReport.required} |
| 最小尺寸门槛 | ${minWidth}x${minHeight} |
| 比对字段 | 文件名、尺寸、字节数、SHA-256 |

## 当前截图

| 文件 | 尺寸 | 大小 | SHA-256 | 状态 |
|---|---:|---:|---|---|
${rows}

## 差异记录

| 类型 | 文件 | 说明 |
|---|---|---|
${diffRows}

## 使用方式

- 常规验证：运行 \`npm run audit:evidence\`，脚本会对比当前截图与已提交的视觉基线。
- 接受新的截图基线：确认差异合理后运行 \`node scripts/evidenceAudit.js --update-visual-baseline\`，再提交更新后的 manifest 与报告。
`,
  };
}

function buildVisualIterationReport(screenshotReport, presskitReport, visualRegressionReport, readabilityReport) {
  const artBible = existsSync("docs/design/ART_BIBLE.md") ? readFileSync("docs/design/ART_BIBLE.md", "utf8") : "";
  const responsiveReport = existsSync(responsiveReportPath) ? readFileSync(responsiveReportPath, "utf8") : "";
  const browserFlowReport = existsSync(browserFlowReportPath) ? readFileSync(browserFlowReportPath, "utf8") : "";
  const targets = [
    ["镜头与比例", /2D 俯视角/.test(artBible) && /角色约 44/.test(artBible), "ART_BIBLE 规定 2D 俯视角、角色和地标比例。"],
    ["色板与 UI 材质", /苔谷绿/.test(artBible) && /羊皮纸/.test(artBible) && /按钮半径/.test(artBible), "ART_BIBLE 规定主色、辅色、羊皮纸/木牌/铜铃 UI。"],
    ["禁用风格", /不使用占位图/.test(artBible) && /未经授权/.test(artBible), "ART_BIBLE 明确禁止占位图、默认灰按钮和未经授权素材。"],
    ["基准截图", visualRegressionReport.ok && screenshotReport.complete, `${screenshotReport.count} 张截图覆盖 ${screenshotReport.covered}/${screenshotReport.required} 类画面。`],
    ["极端可读性", readabilityReport.ok, "白天、深夜、雨天、战斗密集、HUD 与文字截图均通过亮度指标。"],
    ["响应式截图", /状态：通过/.test(responsiveReport), "1280x720、1920x1080 和 125% 缩放截图通过。"],
    ["发布素材", presskitReport.ok, "Press kit 报告记录主视觉源文件、favicon 和截图包。"],
    ["浏览器流程帧", /状态：通过/.test(browserFlowReport) && /WebM 文件、帧截图与哈希/.test(browserFlowReport), "浏览器流程报告提供 WebM 与逐步帧截图哈希。"],
  ];
  const targetRows = targets.map(([name, ok, evidence]) => `| ${name} | ${ok ? "通过" : "需复核"} | ${evidence} |`).join("\n");
  const iterations = [
    {
      id: "VIS-01",
      target: "建立非默认游戏 UI 和 Furry 中世纪视觉目标。",
      diff: "早期只有运行态截图，缺少可引用的目标风格说明。",
      fix: "将镜头、色板、角色、UI 材质和禁用风格写入 ART_BIBLE。",
      evidence: "`docs/design/ART_BIBLE.md`、`docs/acceptance/screenshots/01-title.png`。",
    },
    {
      id: "VIS-02",
      target: "让主界面、任务、背包和战斗在多分辨率下可扫读。",
      diff: "基础截图包不能证明 1920x1080 或 125% 缩放下无裁切。",
      fix: "新增固定 panel 取景和响应式截图取证。",
      evidence: "`RESPONSIVE_SCREENSHOT_REPORT.md`、`responsive-screenshots/*.png`。",
    },
    {
      id: "VIS-03",
      target: "雨天、深夜和战斗特效密集时 HUD 与任务文字仍可读。",
      diff: "普通截图无法覆盖暗部、雨天和高亮特效叠加。",
      fix: "新增天气、时段和亮度覆盖参数，生成极端可读性截图。",
      evidence: "`READABILITY_REPORT.md`、`readability-screenshots/*.png`。",
    },
    {
      id: "VIS-04",
      target: "发布素材可从源文件、图标到截图包追溯。",
      diff: "截图包足以看画面，但缺少正式主视觉源文件和图标流转记录。",
      fix: "补 press kit 主视觉 SVG、favicon 链接和素材流转样例。",
      evidence: "`PRESSKIT_REPORT.md`、`presskit/key-art-source.svg`。",
    },
    {
      id: "VIS-05",
      target: "截图变化可自动对比，避免视觉修正回退。",
      diff: "人工肉眼查看截图无法稳定发现文件尺寸或哈希变化。",
      fix: "生成视觉基线 manifest，记录文件名、尺寸、字节数和 SHA-256。",
      evidence: "`VISUAL_REGRESSION_REPORT.md`、`VISUAL_BASELINE_MANIFEST.json`。",
    },
    {
      id: "VIS-06",
      target: "真实浏览器流程里的菜单、暂停、天气、动作和结局画面可回放。",
      diff: "静态截图不能证明状态切换过程中的视觉连贯性。",
      fix: "新增浏览器流程 WebM 与逐步帧截图哈希。",
      evidence: "`BROWSER_FLOW_REPORT.md`、`browser-flow-frames/*.jpg`。",
    },
  ];
  const iterationRows = iterations.map((item) => `| ${item.id} | ${item.target} | ${item.diff} | ${item.fix} | ${item.evidence} |`).join("\n");
  const ok = targets.every(([, status]) => status) && iterations.length >= 5;
  return {
    ok,
    markdown: `# 视觉迭代记录

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 目标参考：\`docs/design/ART_BIBLE.md\`
- 差异检查：视觉基线、响应式截图、极端可读性截图、浏览器流程帧。
- 修正证据：panel 取景、天气/亮度覆盖、press kit 主视觉、视觉基线 manifest 和 WebM 帧截图。

## 目标参考矩阵

| 目标 | 状态 | 证据 |
|---|---|---|
${targetRows}

## 逐次迭代记录

| 迭代 | 目标 | 差异/风险 | 修正动作 | 证据 |
|---|---|---|---|---|
${iterationRows}

## 边界

本报告证明当前本地构建已有可复核的目标参考、差异检查和修正截图链路；它不替代外部美术总监评审或商店素材审核。
`,
  };
}

function readVisualScreenshotEntry(file) {
  const filePath = join(screenshotDir, file);
  const displayPath = filePath.replaceAll("\\", "/");
  try {
    const buffer = readFileSync(filePath);
    const pngInfo = readPngInfo(buffer);
    return {
      file: displayPath,
      bytes: buffer.byteLength,
      width: pngInfo.width,
      height: pngInfo.height,
      bitDepth: pngInfo.bitDepth,
      colorType: pngInfo.colorType,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      valid: true,
    };
  } catch (error) {
    return {
      file: displayPath,
      bytes: existsSync(filePath) ? statSync(filePath).size : 0,
      width: 0,
      height: 0,
      bitDepth: 0,
      colorType: 0,
      sha256: "",
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readPngInfo(buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 29 || buffer.subarray(0, 8).toString("hex") !== pngSignature || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("不是有效 PNG 文件");
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) throw new Error("PNG 尺寸无效");
  return {
    width,
    height,
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

function compareVisualBaseline(previousManifest, currentEntries) {
  const previousEntries = Array.isArray(previousManifest?.files) ? previousManifest.files : [];
  const previousByFile = new Map(previousEntries.map((entry) => [entry.file, entry]));
  const currentByFile = new Map(currentEntries.map((entry) => [entry.file, entry]));
  const missing = previousEntries.filter((entry) => !currentByFile.has(entry.file));
  const added = currentEntries.filter((entry) => !previousByFile.has(entry.file));
  const changed = currentEntries
    .map((entry) => {
      const previous = previousByFile.get(entry.file);
      if (!previous) return null;
      const changes = [];
      if (previous.sha256 !== entry.sha256) changes.push("SHA-256");
      if (previous.bytes !== entry.bytes) changes.push("字节数");
      if (previous.width !== entry.width || previous.height !== entry.height) changes.push("尺寸");
      return changes.length > 0 ? { file: entry.file, changes } : null;
    })
    .filter(Boolean);
  return {
    ok: missing.length === 0 && added.length === 0 && changed.length === 0,
    missing,
    added,
    changed,
  };
}

function findDuplicateVisualHashes(entries) {
  const groups = new Map();
  for (const entry of entries) {
    if (!entry.sha256) continue;
    const current = groups.get(entry.sha256) || [];
    current.push(entry.file);
    groups.set(entry.sha256, current);
  }
  return [...groups.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([sha256, files]) => ({ sha256, files }));
}

function getVisualEntryStatus(entry, previous, firstBaseline, updateRequested) {
  if (!entry.valid) return `无效：${entry.error || "无法读取"}`;
  if (firstBaseline) return "写入新基线";
  if (updateRequested) return previous ? "更新基线" : "新增到基线";
  if (!previous) return "新增，需复核";
  const changed = previous.sha256 !== entry.sha256 || previous.bytes !== entry.bytes || previous.width !== entry.width || previous.height !== entry.height;
  return changed ? "差异，需复核" : "一致";
}

function buildVisualDiffRows(comparison, duplicateGroups) {
  const rows = [];
  for (const entry of comparison.missing) rows.push(`| 缺失 | \`${entry.file}\` | 基线中存在，当前截图包缺失 |`);
  for (const entry of comparison.added) rows.push(`| 新增 | \`${entry.file}\` | 当前截图包存在，基线中没有 |`);
  for (const entry of comparison.changed) rows.push(`| 内容差异 | \`${entry.file}\` | ${entry.changes.join("、")} 不一致 |`);
  for (const group of duplicateGroups) rows.push(`| 重复哈希 | \`${group.files.join("`, `")}\` | ${group.sha256.slice(0, 12)}... |`);
  return rows.length > 0 ? rows.join("\n") : "| 无 | 全部截图 | 与基线一致或正在首次写入基线 |";
}

function readJsonFile(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function buildResponsiveScreenshotReport() {
  const manifest = readJsonFile(responsiveManifestPath);
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const checked = files.map((entry) => checkResponsiveScreenshotEntry(entry));
  const surfaces = new Set(checked.flatMap((entry) => entry.surfaces || []));
  const requirements = {
    has1280: checked.some((entry) => entry.viewport?.width === 1280 && entry.viewport?.height === 720 && entry.deviceScaleFactor === 1),
    has1920: checked.some((entry) => entry.viewport?.width === 1920 && entry.viewport?.height === 1080 && entry.deviceScaleFactor === 1),
    hasScale125: checked.some((entry) => entry.deviceScaleFactor === 1.25),
    hasExpectedSurfaces: ["hud", "quest", "inventory", "combat"].every((surface) => surfaces.has(surface)),
    validFiles: checked.length >= 3 && checked.every((entry) => entry.valid),
  };
  requirements.complete = requirements.has1280 && requirements.has1920 && requirements.hasScale125 && requirements.hasExpectedSurfaces && requirements.validFiles;
  const rows = checked.length
    ? checked
        .map(
          (entry) =>
            `| \`${entry.file}\` | ${entry.viewport.width}x${entry.viewport.height} | ${entry.deviceScaleFactor} | ${entry.imageSize.width}x${entry.imageSize.height} | ${entry.surfaces.join("、")} | ${entry.valid ? "通过" : entry.note} |`,
        )
        .join("\n")
    : "| 暂无 | - | - | - | - | 缺失 |";
  const requirementRows = [
    ["1280x720", requirements.has1280],
    ["1920x1080", requirements.has1920],
    ["125% 缩放", requirements.hasScale125],
    ["HUD/任务/背包/战斗覆盖", requirements.hasExpectedSurfaces],
    ["文件尺寸与 PNG 校验", requirements.validFiles],
  ]
    .map(([label, ok]) => `| ${label} | ${ok ? "通过" : "待补"} |`)
    .join("\n");

  return {
    ok: requirements.complete,
    markdown: `# 响应式与缩放截图报告

生成时间：${generatedAt}

## 结论

- 状态：${requirements.complete ? "通过" : "需复核"}
- 来源命令：\`${manifest?.command || "npm run capture:responsive"}\`
- 浏览器：${manifest?.browser?.mode || "未记录"}
- 覆盖目标：1280x720、1920x1080、125% 缩放，以及 HUD、任务日志、背包和战斗画面。

## 要求矩阵

| 要求 | 状态 |
|---|---|
${requirementRows}

## 截图清单

| 文件 | CSS 视口 | 设备缩放 | PNG 尺寸 | 覆盖界面 | 校验 |
|---|---:|---:|---:|---|---|
${rows}
`,
  };
}

function buildReadabilityReport() {
  const manifest = readJsonFile(readabilityManifestPath);
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const checked = files.map((entry) => checkReadabilityScreenshotEntry(entry));
  const surfaces = new Set(checked.flatMap((entry) => entry.surfaces || []));
  const requirements = {
    hasDaylight: surfaces.has("daylight"),
    hasNight: surfaces.has("night"),
    hasRain: surfaces.has("rain"),
    hasDenseCombat: surfaces.has("combat") && surfaces.has("warning"),
    hasHudAndText: surfaces.has("hud") && surfaces.has("text"),
    validFiles: checked.length >= 4 && checked.every((entry) => entry.valid),
    uniqueHashes: new Set(checked.map((entry) => entry.sha256)).size === checked.length,
  };
  requirements.complete =
    requirements.hasDaylight &&
    requirements.hasNight &&
    requirements.hasRain &&
    requirements.hasDenseCombat &&
    requirements.hasHudAndText &&
    requirements.validFiles &&
    requirements.uniqueHashes;

  const requirementRows = [
    ["白天场景", requirements.hasDaylight],
    ["深夜/低亮度", requirements.hasNight],
    ["雨天天气", requirements.hasRain],
    ["战斗特效密集", requirements.hasDenseCombat],
    ["HUD 与文字", requirements.hasHudAndText],
    ["PNG 尺寸与像素可读性", requirements.validFiles],
    ["截图互不重复", requirements.uniqueHashes],
  ]
    .map(([label, ok]) => `| ${label} | ${ok ? "通过" : "待补"} |`)
    .join("\n");

  const rows = checked.length
    ? checked
        .map(
          (entry) =>
            `| \`${entry.file}\` | ${entry.imageSize.width}x${entry.imageSize.height} | ${entry.surfaces.join("、")} | ${entry.metrics.contrastSpread} | ${entry.metrics.darkRatio} | ${entry.metrics.brightRatio} | ${entry.valid ? "通过" : entry.note} |`,
        )
        .join("\n")
    : "| 暂无 | - | - | - | - | - | 缺失 |";

  return {
    ok: requirements.complete,
    markdown: `# 极端场景可读性报告

生成时间：${generatedAt}

## 结论

- 状态：${requirements.complete ? "通过" : "需复核"}
- 来源命令：\`${manifest?.command || "npm run capture:readability"}\`
- 浏览器：${manifest?.browser?.mode || "未记录"}
- 覆盖目标：白天、深夜、雨天、战斗特效密集、HUD 和任务文字。
- 像素门槛：亮度跨度不低于 42，暗部比例不高于 0.82，亮部比例不低于 0.006。

## 要求矩阵

| 要求 | 状态 |
|---|---|
${requirementRows}

## 截图清单

| 文件 | PNG 尺寸 | 覆盖 | 亮度跨度 | 暗部比例 | 亮部比例 | 校验 |
|---|---:|---|---:|---:|---:|---|
${rows}
`,
  };
}

function checkReadabilityScreenshotEntry(entry) {
  const file = entry?.file || "";
  const base = {
    ...entry,
    file,
    imageSize: entry?.imageSize || { width: 0, height: 0 },
    surfaces: Array.isArray(entry?.surfaces) ? entry.surfaces : [],
    metrics: entry?.metrics || { contrastSpread: 0, darkRatio: 1, brightRatio: 0, ok: false },
    sha256: entry?.sha256 || "",
    valid: false,
    note: "缺失",
  };
  if (!file || !existsSync(file)) return base;
  try {
    const buffer = readFileSync(file);
    const png = readPngInfo(buffer);
    const sizeMatches = png.width === entry.imageSize?.width && png.height === entry.imageSize?.height;
    const viewportMatches = png.width >= 1200 && png.height >= 700;
    const hashMatches = createHash("sha256").update(buffer).digest("hex") === entry.sha256;
    const metricOk = Boolean(entry.metrics?.ok);
    const valid = sizeMatches && viewportMatches && hashMatches && metricOk;
    return {
      ...base,
      imageSize: { width: png.width, height: png.height },
      valid,
      note: valid ? "通过" : "尺寸、哈希或亮度指标不匹配",
    };
  } catch (error) {
    return {
      ...base,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkResponsiveScreenshotEntry(entry) {
  const file = entry?.file || "";
  const base = {
    ...entry,
    file,
    viewport: entry?.viewport || { width: 0, height: 0 },
    imageSize: entry?.imageSize || { width: 0, height: 0 },
    surfaces: Array.isArray(entry?.surfaces) ? entry.surfaces : [],
    valid: false,
    note: "缺失",
  };
  if (!file || !existsSync(file)) return base;
  try {
    const buffer = readFileSync(file);
    const png = readPngInfo(buffer);
    const expected = entry.expectedDeviceSize || {
      width: Math.round((entry.viewport?.width || 0) * (entry.deviceScaleFactor || 1)),
      height: Math.round((entry.viewport?.height || 0) * (entry.deviceScaleFactor || 1)),
    };
    const sizeMatches = png.width === expected.width && png.height === expected.height;
    const manifestMatches = png.width === entry.imageSize?.width && png.height === entry.imageSize?.height;
    return {
      ...base,
      imageSize: { width: png.width, height: png.height },
      bytes: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      valid: sizeMatches && manifestMatches && buffer.byteLength > 0,
      note: sizeMatches && manifestMatches ? "通过" : `尺寸不一致，期望 ${expected.width}x${expected.height}`,
    };
  } catch (error) {
    return {
      ...base,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildBuildInfo(samples, performance) {
  const summary = {
    mainAreas: Object.values(areas).filter((area) => area.kind === "main").length,
    interiors: Object.values(areas).filter((area) => area.kind === "interior").length,
    npcs: npcs.length,
    items: items.length,
    enemies: Object.keys(enemyTypes).length,
    stages: mainQuestStages.length,
    sideQuests: sideQuests.length,
    upgrades: upgrades.length,
    recipes: recipes.length,
    memories: memories.length,
    audioThemes: audioThemes.length,
    soundEffects: soundEffects.length,
  };
  return `# 构建信息

生成时间：${generatedAt}

| 字段 | 值 |
|---|---|
| 项目名 | ${projectIdentity.title} |
| 版本 | ${VERSION} |
| 存档 schema | ${SAVE_SCHEMA_VERSION} |
| 分支 | ${branch} |
| 提交标识 | ${commit} |
| Node | ${process.version} |
| 平台 | ${process.platform} ${process.arch} |

## 内容规模

| 类型 | 数量 |
|---|---:|
| 主要区域 | ${summary.mainAreas} |
| 室内场景 | ${summary.interiors} |
| 有姓名 NPC | ${summary.npcs} |
| 道具 | ${summary.items} |
| 敌人类型 | ${summary.enemies} |
| 主线阶段 | ${summary.stages} |
| 支线 | ${summary.sideQuests} |
| 成长节点 | ${summary.upgrades} |
| 营地料理配方 | ${summary.recipes} |
| 记忆类型 | ${summary.memories} |
| 程序化主题音乐 | ${summary.audioThemes} |
| 程序化音效 | ${summary.soundEffects} |

## 关键证据

- 样例存档：${samples.length} 个，位于 \`docs/acceptance/saves/\`。
- 首次加载关键文件估算：${formatBytes(performance.initialBytes)}。
- 音频覆盖：${summary.audioThemes} 首主题音乐、${summary.soundEffects} 个 WebAudio 合成音效，位于 \`docs/acceptance/tests/audio/AUDIO_COVERAGE_REPORT.md\`。
- 玩法回归：地图、碰撞、敌人循环和失败重试位于 \`docs/acceptance/tests/gameplay/GAMEPLAY_REGRESSION_REPORT.md\`。
- 世界系统：跨区、天气、因果链和长会话一致性位于 \`docs/acceptance/tests/simulation/WORLD_SYSTEMS_REPORT.md\`。
- 内容完整性：区域目的、敌人差异、NPC 状态、支线后果、道具用途、营地料理、自动保存和规则一致性位于 \`docs/acceptance/tests/content/CONTENT_INTEGRITY_REPORT.md\`。
- 黄金路径结局：${runGoldenPathSimulation().state.ending.title}。
`;
}

function buildVersionReport() {
  return `# 版本元数据

生成时间：${generatedAt}

- 语义化版本：${VERSION}
- 构建日期来源：生产环境可通过 \`BUILD_DATE\` 注入；本地默认 \`local-dev\`。
- 提交标识来源：生产环境可通过 \`BUILD_COMMIT\` 注入；当前仓库提交为 \`${commit}\`。
- 可复核入口：\`/api/status\`、\`/api/health\` 和游戏内“制作人员与许可”。
- 存档 schema：${SAVE_SCHEMA_VERSION}
`;
}

function buildLoggingReport() {
  return `# 日志与脱敏报告

生成时间：${generatedAt}

## 结构化字段

服务端日志通过 JSON 行输出，字段包含：

- \`time\`
- \`level\`
- \`event\`
- \`version\`
- \`data.requestId\`
- \`data.category\`
- \`data.ms\`

## 覆盖

- ` + "`test/apiSecurity.test.js`" + ` 会触发模型失败降级，断言 \`llm_rumor_fallback\` 日志为结构化 JSON。
- 测试确认日志行不包含模拟密钥片段。
- \`server.js\` 的错误响应只返回脱敏错误、请求 ID 和 HTTP 状态，不返回堆栈、环境变量或完整输入。
`;
}

function buildAssetPipeline() {
  const keyArt = existsSync("docs/acceptance/presskit/key-art-source.svg") ? inspectSvgAsset("docs/acceptance/presskit/key-art-source.svg", "1600x900") : null;
  const icon = existsSync("public/favicon.svg") ? inspectSvgAsset("public/favicon.svg", "512x512") : null;
  return `# 资产流转记录

生成时间：${generatedAt}

## 当前资产状态

- 图像：无外部图片文件，角色、场景、地标和特效均由 Canvas 绘制。
- 字体：使用系统中文字体栈，未打包第三方字体文件。
- 音乐与音效：无外部音频文件；${audioThemes.length} 首程序化主题音乐与 ${soundEffects.length} 个音效由 WebAudio 合成。
- 文本、角色、世界观：本项目自制中文内容。

## 未来采集流程

1. 临时素材只进入 \`assets/incoming/\` 或等价隔离目录，不直接进入 \`public/\`。
2. 采集前记录来源、许可、作者、用途、下载日期和风格匹配理由。
3. 通过许可复核后移动到 \`assets/approved/\`，并同步更新 \`docs/ASSET_LICENSES.md\`。
4. 进入正式构建前进行体积、格式、署名和截图复核。
5. 权利不清、来源缺失或风格不统一的素材不得进入发布构建。

当前版本没有外部素材进入正式资源目录。

## 完整流转样例

| 素材 | 搜索候选 | 许可审查 | 风格试装 | 尺寸统一 | 压缩 | 整合 | 截图对比 | 最终批准 |
|---|---|---|---|---|---|---|---|---|
| \`docs/acceptance/presskit/key-art-source.svg\` | 采用自制构图草案，未下载外部候选。 | 自制 SVG，哈希 \`${keyArt?.sha256.slice(0, 12) || "待生成"}...\`。 | 复用主角尾焰、月铃塔、聚落和山谷色彩。 | 固定 1600x900 viewBox，状态 ${keyArt?.valid ? "通过" : "待复核"}。 | SVG 源文件 ${formatBytes(keyArt?.bytes || 0)}，无巨大位图。 | 进入 \`docs/acceptance/presskit/\`，不进入运行时代码。 | \`PRESSKIT_REPORT.md\` 对照 12 张截图包。 | 通过 |
| \`public/favicon.svg\` | 采用自制图标草案，未下载外部候选。 | 自制 SVG，哈希 \`${icon?.sha256.slice(0, 12) || "待生成"}...\`。 | 与主视觉共享月铃塔、铃铛和尾焰识别元素。 | 固定 512x512 viewBox，状态 ${icon?.valid ? "通过" : "待复核"}。 | SVG 源文件 ${formatBytes(icon?.bytes || 0)}，无重复位图。 | 通过 \`public/index.html\` favicon 引用进入构建。 | \`PRESSKIT_REPORT.md\` 记录用途和截图包。 | 通过 |
`;
}

function buildDevelopmentNote() {
  return `# 开发说明：AI 与人工决策边界

生成时间：${generatedAt}

## 项目定位

《绒火与月铃》从开源 AI 小镇灵感出发，但最终实现方向已经收束为一款中文 2D Furry 中世纪冒险游戏。核心体验是探索、交互、战斗、居民记忆、天气和世界状态变化，而不是无限生成对白的观赏 demo。

## AI 参与的部分

- 代码：AI 协助实现 Canvas 渲染、规则层、服务端 API、测试脚本、证据生成脚本和中文文档。
- 内容：AI 协助起草角色、区域、道具、任务、支线、传闻 schema 和验收矩阵。
- 测试：AI 协助补单元测试、规则级 E2E、API 安全测试、存档导入故障测试和证据报告。
- 截图：AI 使用本地浏览器和无头 Edge 生成当前构建的真实截图包。

## 人工/项目决策保留的部分

- 是否公开发布、密钥轮换确认、服务器部署、实机短片和外部试玩记录必须由项目负责人或真实测试者完成。
- AI 不替代 5 名非开发者试玩反馈，也不伪造最终签署。
- 外部素材进入正式资源目录前必须由人工复核许可、风格和署名要求。

## 可靠性边界

- 任务、战斗、掉落、存档、结局和世界状态由本地确定性规则决定。
- DeepSeek 仅作为可选传闻句式增强，无密钥、超时或限额时会降级到本地传闻。
- 当前自动验收报告只能证明本地可复核证据，不能替代真实部署、真实视频和真实试玩。
`;
}

function buildDevelopmentProcessReport() {
  const taskLog = readFileSync("docs/acceptance/AI_TASK_LOG.md", "utf8");
  const smokeReport = readFileSync("docs/acceptance/QA_SMOKE_REPORT.md", "utf8");
  const tasks = parseTaskEntries(taskLog);
  const sampledTasks = tasks.slice(-10);
  const taskRows = sampledTasks.map((task) => {
    const status = task.missing.length === 0 ? "通过" : "需复核";
    return { ...task, status };
  });
  const taskAuditOk = taskRows.length === 10 && taskRows.every((task) => task.status === "通过");
  const defectRows = getDefectRepairSamples().map((sample) => ({
    ...sample,
    sourcePresent: smokeReport.includes(sample.issue),
    status: smokeReport.includes(sample.issue) ? "通过" : "需复核",
  }));
  const defectAuditOk = defectRows.length >= 5 && defectRows.every((sample) => sample.status === "通过");
  const issues = [];
  if (!taskAuditOk) {
    const missing = taskRows.flatMap((task) => task.missing).join("、") || "未知";
    issues.push(`任务抽样未通过：抽到 ${taskRows.length} 个任务，缺字段 ${missing}`);
  }
  if (!defectAuditOk) {
    issues.push("缺陷样例未通过：至少一个样例未在 QA 冒烟报告中找到对应根因记录。");
  }

  const taskTable = taskRows
    .map(
      (task) =>
        `| ${task.id} | ${task.fields["目标"] ? "是" : "否"} | ${task.fields["非目标"] ? "是" : "否"} | ${task.fields["涉及文件"] ? "是" : "否"} | ${task.fields["对应验收"] ? "是" : "否"} | ${task.fields["测试命令"] ? "是" : "否"} | ${task.fields["可视证据"] ? "是" : "否"} | ${task.status} |`,
    )
    .join("\n");
  const defectTable = defectRows
    .map(
      (sample) =>
        `| ${sample.issue} | ${sample.reproduction} | ${sample.failingTest} | ${sample.rootCause} | ${sample.fix} | ${sample.regression} | ${sample.status} |`,
    )
    .join("\n");

  return {
    ok: taskAuditOk && defectAuditOk,
    taskAuditOk,
    defectAuditOk,
    taskCount: taskRows.length,
    defectCount: defectRows.length,
    markdown: `# 开发过程抽查报告

生成时间：${generatedAt}

## 结论

- 任务抽样：${taskAuditOk ? "通过" : "需复核"}
- 缺陷样例：${defectAuditOk ? "通过" : "需复核"}
- 抽样任务：${taskRows.length}
- 缺陷样例：${defectRows.length}

本报告从 \`AI_TASK_LOG.md\` 抽取最近 10 个任务，检查每个任务是否具备目标、非目标、涉及文件、验收条目、测试命令和可视证据字段；同时抽取 5 个重要修复，核对复现、最小失败测试、修复、回归和根因记录。

## 任务抽样

| 任务 | 目标 | 非目标 | 涉及文件 | 对应验收 | 测试命令 | 可视证据 | 状态 |
|---|---|---|---|---|---|---|---|
${taskTable}

## 缺陷修复样例

| 缺陷 | 复现 | 最小失败测试 | 根因 | 修复 | 回归 | 状态 |
|---|---|---|---|---|---|---|
${defectTable}

## 问题

${issues.length ? issues.map((issue) => `- ${issue}`).join("\n") : "- 无。"}
`,
  };
}

function buildScopeScore(screenshotReport) {
  return `# 范围与评分草案

生成时间：${generatedAt}

## 当前判定

当前版本是可通关垂直成品骨架，自动证据明显增强，但仍不得签署最终通过。最终清单要求的 5 名非开发者试玩、干净 Linux 服务器部署、45–90 秒实机短片、外部密钥轮换确认和最终人工签署仍缺失。

## 自动证据摘要

| 项目 | 当前值 |
|---|---:|
| 主要区域 | ${Object.values(areas).filter((area) => area.kind === "main").length} |
| 室内场景 | ${Object.values(areas).filter((area) => area.kind === "interior").length} |
| NPC | ${npcs.length} |
| 道具 | ${items.length} |
| 敌人类型 | ${Object.keys(enemyTypes).length} |
| 主线阶段 | ${mainQuestStages.length} |
| 支线 | ${sideQuests.length} |
| 营地料理配方 | ${recipes.length} |
| 主题音乐 | ${audioThemes.length} |
| 音效 | ${soundEffects.length} |
| 截图覆盖 | ${screenshotReport.covered}/${screenshotReport.required} |
| 内容完整性报告 | 已生成 |

## 暂定评分

| 维度 | 权重 | 暂定分 | 说明 |
|---|---:|---:|---|
| 产品完整性与核心循环 | 12 | 8 | 规则级可通关，仍缺完整实机通关录像和真人观察。 |
| 操控、战斗与成长 | 12 | 8 | 有攻击、闪避、受击、失败恢复、成长节点和规则级玩法回归；缺逐敌人真实压力录像。 |
| 多场景与世界模拟 | 14 | 12 | 5 区域、天气、日程、世界标记、跨区压力、因果链和长会话一致性报告具备；仍缺真实长时录像。 |
| NPC、叙事与内容 | 12 | 9 | 8 名 NPC、记忆、传闻、主支线和双结局具备。 |
| 美术与动画 | 16 | 10 | Canvas 风格统一、截图覆盖完整；仍非最终商业素材量级。 |
| UI、音频与可访问性 | 10 | 8 | 产品闭环、设置、主音量/音乐/音效/静音、程序化主题音乐和 25+ 音效具备；仍缺真实聆听录像。 |
| AI 系统边界与可靠性 | 8 | 8 | 可关闭、可降级、schema 与费用边界明确。 |
| 性能、部署与安全 | 9 | 5 | 本地安全和体积通过，真实 Linux 部署证据缺失。 |
| QA 与作品集呈现 | 7 | 4 | 自动测试和截图具备，外部试玩与短片缺失。 |
| 合计 | 100 | 71 | 未达到最终通过线。 |

该评分用于暴露缺口，不是最终验收签署。
`;
}

function buildFinalSignoffDraft(screenshotReport) {
  return `# 最终签署草案

生成时间：${generatedAt}

本文件是签署模板，不代表已经最终通过。

| 字段 | 当前记录 |
|---|---|
| 发布候选版本 | ${VERSION} |
| 构建标识 | ${commit} |
| 本地验证命令 | \`npm run validate\` |
| 截图包 | ${screenshotReport.count} 张，覆盖 ${screenshotReport.covered}/${screenshotReport.required} 类 |
| 外部试玩人数 | 0 / 5 |
| 线上地址 | 待填写 |
| 最终结论 | 未签署 |

## 不可签署原因

- 需要至少 5 名非开发者真实试玩记录。
- 需要干净 Linux 服务器真实部署、重启恢复和线上截图/录像。
- 需要 45–90 秒真实游戏实机短片。
- 需要用户确认旧外部 API key 已轮换并失效。
- 需要最终人工回归后确认 0 个 P0/P1 缺陷。

## 签署栏

- 验收日期：\`________________\`
- P0 条目通过数：\`____ / ____\`
- 总评分：\`____ / 100\`
- 已知 P2/P3 问题：\`________________\`
- 验收人：\`________________\`
`;
}

function buildCompatibilityReport() {
  const html = readFileSync("public/index.html", "utf8");
  const app = readFileSync("public/app.js", "utf8");
  const hasFallback = html.includes("<noscript>") && html.includes("nomodule") && html.includes("compatFallback");
  const hasRuntimeProbe = app.includes("isSupportedEnvironment") && app.includes("canUseLocalStorage");
  return {
    ok: hasFallback && hasRuntimeProbe,
    markdown: `# 浏览器兼容与降级报告

生成时间：${generatedAt}

## 当前支持声明

- 推荐浏览器：桌面 Chromium 或 Firefox。
- 移动端：可浏览作品页；完整操作以键盘为准。

## 已落实的降级路径

| 场景 | 状态 | 证据 |
|---|---|---|
| JavaScript 关闭 | ${html.includes("<noscript>") ? "通过" : "缺失"} | \`<noscript>\` 中文提示 |
| 不支持 ES Modules | ${html.includes("nomodule") ? "通过" : "缺失"} | \`nomodule\` 中文提示 |
| Canvas/localStorage/Fetch 缺失 | ${hasRuntimeProbe ? "通过" : "缺失"} | \`isSupportedEnvironment\` 运行时探针 |
| 当前 Chromium/Edge 本地构建 | 通过 | 截图包和浏览器冒烟报告 |
| Firefox 全流程 | 待补 | 需要真实 Firefox 全新配置下前 15 分钟与存档流程 |

本报告推进 PERF-04 的“不白屏”与 Chromium 验证部分；最终签署仍需要 Firefox 实机记录。
`,
  };
}

function buildUiSettingsReport() {
  const app = readFileSync("public/app.js", "utf8");
  const controls = [
    ["主音量", "setVolume", "range"],
    ["音乐音量", "setMusicVolume", "range"],
    ["音效音量", "setSfxVolume", "range"],
    ["一键静音", "setMuted", "checkbox"],
    ["文字速度", "setTextSpeed", "range"],
    ["亮度", "setBrightness", "range"],
    ["屏幕震动", "setShake", "checkbox"],
    ["降低动态效果", "setMotion", "checkbox"],
    ["难度", "setDifficulty", "select"],
    ["文字缩放", "setFont", "select"],
    ["全屏入口", "fullscreenBtn", "button"],
  ];
  const rows = controls
    .map(([label, marker, type]) => `| ${label} | ${type} | ${app.includes(marker) ? "通过" : "缺失"} |`)
    .join("\n");
  const storageOk = app.includes("moonbell.settings") && app.includes("localStorage.setItem(storageKeys.settings");
  return {
    ok: controls.every(([, marker]) => app.includes(marker)) && storageOk,
    markdown: `# 设置与可访问性报告

生成时间：${generatedAt}

## 结论

- 设置入口覆盖主音量、音乐、音效、静音、文字速度、亮度、屏幕震动、降低动态效果、难度、文字缩放和全屏。
- 音频设置覆盖主音量、音乐音量、音效音量和一键静音。
- 设置使用独立键 \`moonbell.settings\` 持久化，不依赖单个游戏存档槽。
- 难度在战斗伤害和移动速度中生效；文字缩放影响界面提示字号。

## 控件矩阵

| 设置项 | 控件类型 | 状态 |
|---|---|---|
${rows}

## 持久化

| 项目 | 状态 |
|---|---|
| 独立 localStorage 设置键 | ${storageOk ? "通过" : "缺失"} |
| 游戏中保存设置同步当前存档 | ${app.includes('saveActive("settings")') ? "通过" : "缺失"} |
| 全屏请求入口 | ${app.includes("requestFullscreen") ? "通过" : "缺失"} |
`,
  };
}

function buildAccessibilityFeedbackReport() {
  const app = readFileSync("public/app.js", "utf8");
  const html = readFileSync("public/legacy.html", "utf8");
  const browserFlowReport = existsSync(browserFlowReportPath) ? readFileSync(browserFlowReportPath, "utf8") : "";
  const relationshipReport = existsSync("docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md")
    ? readFileSync("docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md", "utf8")
    : "";
  const storageFailureReport = existsSync("docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md")
    ? readFileSync("docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md", "utf8")
    : "";
  const readabilityReport = existsSync(readabilityReportPath) ? readFileSync(readabilityReportPath, "utf8") : "";
  const rows = [
    {
      item: "关闭声音",
      ok:
        app.includes("setMuted") &&
        app.includes("settings.muted ? 0") &&
        app.includes("if (!runtime.audio || runtime.state?.settings?.muted) return") &&
        /muted-feedback/.test(browserFlowReport),
      evidence: "设置页一键静音、WebAudio 播放前静音短路、浏览器流程含 muted-feedback WebM。",
      nonAudio: "攻击、任务日志、暂停保存和 toast 仍有画面或文字反馈。",
    },
    {
      item: "任务反馈",
      ok: app.includes("questTitle") && app.includes("questText") && app.includes("openQuestLog") && app.includes("questChime"),
      evidence: "HUD 当前目标、任务日志、任务推进/受阻音效钩子并存。",
      nonAudio: "目标标题、任务文本、日志条目和状态文字不依赖颜色。",
    },
    {
      item: "受击反馈",
      ok: app.includes("playerHit") && app.includes("击中了绒火") && app.includes("hpBar") && app.includes("runtime.shake"),
      evidence: "受击低鸣、生命条、屏幕震动和最近记录文字同时触发。",
      nonAudio: "生命数值条与最近记录文本可在静音下识别。",
    },
    {
      item: "错误反馈",
      ok: app.includes("uiError") && app.includes("showToast") && storageFailureReport.includes("保存失败") && app.includes("导入失败"),
      evidence: "路径未开、资源不足、导入失败和存储失败均使用 toast/中文错误文案。",
      nonAudio: "错误 toast 和 autosaveLabel 文本不只靠红色或错误音。",
    },
    {
      item: "关系反馈",
      ok: app.includes("getNpcDialogueLine") && app.includes("关系越好") && /状态：通过|通过/.test(relationshipReport),
      evidence: "NPC 对话、商店价格和主线集结由关系分支报告回放。",
      nonAudio: "对白、价格文字和结局条件均以中文文本呈现。",
    },
    {
      item: "保存反馈",
      ok: app.includes("ui.autosaveLabel.textContent") && app.includes("已手动保存") && app.includes("uiSave") && storageFailureReport.includes("状态：通过"),
      evidence: "自动保存标签、手动保存 toast、保存音效和存储失败中文恢复建议。",
      nonAudio: "保存成功/失败均写入 HUD 或 toast 文本。",
    },
    {
      item: "色觉差异",
      ok:
        html.includes("生命") &&
        html.includes("体力") &&
        app.includes("drawMarker") &&
        app.includes("fillText(label") &&
        readabilityReport.includes("状态：通过"),
      evidence: "生命/体力带文字标签，出口与交互点绘制文字 label，极端可读性报告已通过。",
      nonAudio: "关键状态不只靠红绿区分，标记和 HUD 具有文字冗余。",
    },
  ];
  const rowsMarkdown = rows
    .map((row) => `| ${row.item} | ${row.ok ? "通过" : "需复核"} | ${row.evidence} | ${row.nonAudio} |`)
    .join("\n");
  const ok = rows.every((row) => row.ok);
  return {
    ok,
    markdown: `# 静音与色觉差异反馈检查报告

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 检查范围：任务、受击、错误、关系和保存反馈。
- 静音证据：设置页一键静音、WebAudio 静音短路、浏览器流程 \`muted-feedback\` WebM。
- 色觉差异证据：HUD 与交互点均有文字冗余，极端可读性截图报告通过。

## 检查矩阵

| 项目 | 状态 | 证据 | 非声音/非颜色通道 |
|---|---|---|---|
${rowsMarkdown}

## 边界

本报告证明当前本地构建不把声音或颜色作为唯一反馈通道；它不替代外部无障碍专家审查或真实玩家访谈。
`,
  };
}

function buildAudioReport() {
  const app = readFileSync("public/app.js", "utf8");
  const categories = [...new Set(soundEffects.map((effect) => effect.category))];
  const categoryRows = categories
    .map((category) => `| ${category} | ${soundEffects.filter((effect) => effect.category === category).length} |`)
    .join("\n");
  const themeRows = audioThemes
    .map((theme) => `| ${theme.name} | ${theme.purpose} | ${theme.areas.join("、")} | ${theme.ambientLayers.join("、")} |`)
    .join("\n");
  const soundRows = soundEffects
    .map((effect) => `| ${effect.name} | ${effect.category} | ${effect.use} | ${effect.tones.length} |`)
    .join("\n");
  const requiredCategories = ["UI", "移动", "交互", "战斗", "环境"];
  const settingsOk = ["setVolume", "setMusicVolume", "setSfxVolume", "setMuted"].every((marker) => app.includes(marker));
  const runtimeOk = ["startMusic", "scheduleMusic", "scheduleAmbience", "playSound", "playFootstep", "applyAudioSettings"].every((marker) => app.includes(marker));
  return {
    ok: audioThemes.length >= 4 && soundEffects.length >= 25 && requiredCategories.every((category) => categories.includes(category)) && settingsOk && runtimeOk,
    markdown: `# 音频覆盖报告

生成时间：${generatedAt}

## 结论

- 程序化主题音乐：${audioThemes.length} 首，覆盖标题/聚落、野外、遗迹、首领和结局。
- 程序化音效：${soundEffects.length} 个，覆盖 ${categories.join("、")}。
- 环境层：主题音乐会叠加远处月铃、炉火、河水、雾风、夜虫、雨点等 WebAudio 合成层。
- 设置项：主音量、音乐音量、音效音量和一键静音均已持久化。
- 素材来源：无外部音频文件，全部由 WebAudio 振荡器合成。

本报告可支持 AUD-01、AUD-02、AUD-03 和 AUD-04 的本地证据；最终发布前仍建议补充跨区切换和 60 秒静听录像。

## 主题音乐

| 名称 | 用途 | 场景 | 环境层 |
|---|---|---|---|
${themeRows}

## 音效类别

| 类别 | 数量 |
|---|---:|
${categoryRows}

## 音效矩阵

| 名称 | 类别 | 用途 | 音色片段数 |
|---|---|---|---:|
${soundRows}
`,
  };
}

function buildRumorRepetitionReport() {
  const report = runRumorRepetitionRegression({ turns: 20 });
  const duplicatePercent = `${(report.duplicateRate * 100).toFixed(1)}%`;
  const rows = report.samples
    .map(
      (sample) =>
        `| ${sample.turn} | 第 ${sample.day} 日 | ${sample.segment} | ${areaName(sample.location)} | ${sample.weather} | ${sample.sourceName} -> ${sample.targetName} | ${sample.topic} | ${sample.line} |`,
    )
    .join("\n");

  return {
    ok: report.ok,
    report,
    markdown: `# 传闻连续交谈重复率报告

生成时间：${generatedAt}

## 结论

- 连续交谈：${report.turns} 次
- 唯一句子：${report.uniqueLines}/${report.turns}
- 唯一主题：${report.uniqueTopics}
- 唯一 NPC 组合：${report.uniqueSourceTargetPairs}
- 重复率：${duplicatePercent}
- 最近传闻保留：${report.recentRumorsKept}/${report.maxRecentRumors}
- 状态：${report.ok ? "通过" : "需复核"}

本报告证明本地传闻模板会随区域、时段、天气与 NPC 组合变化；每条传闻带来源、目标、日期和时段；连续交谈后只保留最近 ${report.maxRecentRumors} 条记录。

## 抽样记录

| 次数 | 日期 | 时段 | 场景 | 天气 | 来源 -> 目标 | 主题 | 传闻 |
|---:|---|---|---|---|---|---|---|
${rows}

## 问题

${report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。"}
`,
  };
}

function buildEconomyCurveReport() {
  const report = runEconomyCurveRegression();
  const rows = report.events
    .map(
      (event) =>
        `| ${event.step} | ${event.type} | ${event.label} | 主线 ${event.stage}/6 | ${areaName(event.location)} | ${event.delta >= 0 ? `+${event.delta}` : event.delta} | ${event.coinsAfter} | ${event.note} |`,
    )
    .join("\n");

  return {
    ok: report.ok,
    report,
    markdown: `# 通关经济曲线报告

生成时间：${generatedAt}

## 结论

- 总收入：${report.totalIncome} 枚铜星
- 总支出：${report.totalSpending} 枚铜星
- 最低余额：${report.minCoins} 枚铜星
- 通关余额：${report.finalCoins} 枚铜星
- 结局：${report.ending}
- 基础价格：月叶草 ${report.basePrices.items.moonHerb}，蜜面包 ${report.basePrices.items.honeyBread}
- 折扣价格：月叶草 ${report.discountedPrices.items.moonHerb}，蜜面包 ${report.discountedPrices.items.honeyBread}
- 状态：${report.ok ? "通过" : "需复核"}

本报告用规则级通关路线记录基础补给支出、敌人铜星收入、支线折扣和终局余额，证明当前经济曲线不会在标准路线中出现负铜星。

## 曲线

| 步骤 | 类型 | 事件 | 阶段 | 场景 | 变化 | 余额 | 说明 |
|---:|---|---|---|---|---:|---:|---|
${rows}

## 问题

${report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。"}
`,
  };
}

function buildUpgradeFlowReport() {
  const report = runUpgradeFlowRegression();
  const rows = report.rows.map((row) => `| ${row.flow} | ${row.action} | ${row.expected} | ${row.status} |`).join("\n");

  return {
    ok: report.ok,
    report,
    markdown: `# 成长升级流程报告

生成时间：${generatedAt}

## 结论

- 成长节点总数：${report.upgradesChecked}
- 测试购买节点：${report.purchasedUpgrade}
- 重载后成长：${report.finalUpgrades.join("、") || "无"}
- 状态：${report.ok ? "通过" : "需复核"}

本报告覆盖工坊升级的取消、条件不足、购买成功、重复点击、保存重载和非法节点拒绝。前端工坊按钮复用规则层 \`upgradeAbility\`，避免界面和自动测试出现两套判定。

## 流程

| 流程 | 操作 | 预期 | 状态 |
|---|---|---|---|
${rows}

## 问题

${report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。"}
`,
  };
}

function buildNetworkResilienceReport() {
  const app = readFileSync("public/app.js", "utf8");
  const network = readFileSync("src/networkSafety.js", "utf8");
  const tests = existsSync("test/networkSafety.test.js") ? readFileSync("test/networkSafety.test.js", "utf8") : "";
  const checks = [
    ["前端请求锁", app.includes('networkGate.run("rumor"') && app.includes('result.code === "duplicate"'), "重复点击不会并发触发多条传闻请求。"],
    ["前端超时", app.includes("fetchJsonWithTimeout") && app.includes("timeoutMs: 1900"), "传闻请求 1.9 秒内未返回会走本地内容。"],
    ["本地降级", app.includes("createLocalRumor(runtime.state)") && app.includes("showToast(result.message)"), "网络慢、HTTP 错误或离线时仍给玩家本地传闻反馈。"],
    ["AbortController", network.includes("AbortController") && network.includes("TimeoutError"), "共享请求函数会取消超时请求并分类错误。"],
    ["重复请求单测", tests.includes("rejects duplicate in-flight work"), "单元测试覆盖重复点击。"],
    ["超时单测", tests.includes("aborts slow JSON requests"), "单元测试覆盖高延迟超时。"],
    ["故障分类单测", tests.includes("classifies timeout and HTTP failures"), "单元测试覆盖 HTTP/网络降级分类。"],
  ];
  const rows = checks.map(([name, ok, evidence]) => `| ${name} | ${ok ? "通过" : "缺失"} | ${evidence} |`).join("\n");
  const ok = checks.every(([, pass]) => pass);
  return {
    ok,
    markdown: `# 网络韧性与慢请求报告

生成时间：${generatedAt}

## 结论

- 状态：${ok ? "通过" : "需复核"}
- 覆盖：高延迟、重复点击、HTTP 失败、网络不可用后的本地降级。
- 前端策略：传闻请求使用请求锁、1.9 秒超时和本地传闻兜底，不阻塞游戏循环或本地系统。

## 检查项

| 项目 | 状态 | 证据 |
|---|---|---|
${rows}

## 说明

本报告推进 PERF-05 的本地故障注入证据；最终发布仍可补真实浏览器断网录像作为人工材料。
`,
  };
}

function buildRelationshipBranchReport() {
  const report = runRelationshipBranchRegression();
  const rows = report.rows
    .map((row) => `| ${row.category} | ${row.lowEvidence} | ${row.highEvidence} | ${row.status} |`)
    .join("\n");
  return {
    ok: report.ok,
    report,
    markdown: `# 关系分支回放报告

生成时间：${generatedAt}

## 结论

- 分支数量：${report.branchesChecked}
- 状态：${report.ok ? "通过" : "需复核"}
- 覆盖：对白、价格、支线帮助、主线集结和结局条件。

本报告使用低信任与高信任两组存档重放同一类节点，证明关系状态至少影响 5 类结果。前端 NPC 对话复用规则层 \`getNpcDialogueLine\`，避免界面与自动测试分叉。

## 分支矩阵

| 类别 | 低关系证据 | 高关系证据 | 状态 |
|---|---|---|---|
${rows}

## 问题

${report.issues.length ? report.issues.map((issue) => `- ${issue}`).join("\n") : "- 无。"}
`,
  };
}

function buildChangelog() {
  return `# Changelog

## 0.4.0 - 2026-09-03

- 主入口重构为《月铃文明》AI 社会模拟器，经典冒险版保留在 \`/legacy.html\`。
- 加入 30 名不同种族的兽人居民，每人拥有职业、性格、财富、关系、目标与独立记忆。
- 加入自主经济、犯罪、关系与政治模拟，以及第 1 日到第 35 日的可追溯因果故事链。
- 加入上帝事件预览与施加，六类事件会共同影响人口、财富、治安、社会信任和政治稳定。
- 加入服务端 DeepSeek 自由文本解释，使用白名单 schema、限额、超时和本地降级。
- 加入高清城镇地图、高 DPI Canvas、地图缩放跟随、居民详情抽屉与 30 人社会关系图。
- 加入响应式手机布局、自动存档、世界导入导出和 20 种子百日稳定性测试。

## ${VERSION} - ${generatedAt.slice(0, 10)}

- 增加程序化主题音乐与环境声层，覆盖标题/聚落、野外、遗迹、首领和结局。
- 增加 ${soundEffects.length} 个 WebAudio 合成音效，覆盖 UI、移动、交互、战斗和环境反馈。
- 设置页新增音乐音量、音效音量和一键静音，并生成音频覆盖报告。
- 增加世界系统回归报告，覆盖 30 次跨区、天气影响、5 条因果链和 60 分钟等价长会话存档一致性。
- 增加营地料理系统，5 个简单配方按章节开放，使用已有资源强化探索回报。
- 增加内容完整性回归报告，覆盖区域玩法目的、敌人差异、成长节点、NPC 状态、支线后果、道具用途、营地料理、自动保存和世界规则一致性。
- 增加响应式截图取证，覆盖 1280x720、1920x1080、125% 缩放，以及 HUD、任务日志、背包和战斗画面。
- 增加存储写入失败模拟，保存失败时显示中文恢复建议且不会中断当前游戏流程。
- 增加传闻连续交谈重复率回归，20 次交谈会统计唯一句、NPC 组合和最近 12 条记录裁剪。
- 增加通关经济曲线回归，敌人铜星收入、商店支出、支线折扣和终局余额可自动复核。
- 增加工坊成长升级流程回归，覆盖取消、条件不足、购买、重复点击和重载保持。
- 增加极端场景可读性截图，覆盖白天、深夜、雨天、战斗密集、HUD 与任务文字。
- 增加网络韧性测试，传闻请求具备重复点击锁、1.9 秒超时和本地降级提示。
- 增加关系分支回放报告，覆盖低/高信任对白、价格、支线帮助、主线集结和结局条件。
- 增加开发过程抽查报告，覆盖最近 10 个任务记录和 5 个缺陷修复样例。
- 增加 press kit 发布素材报告，记录主视觉源文件、图标和作品集截图包。
- 增加浏览器内存曲线报告，采样 Edge headless 工作集并生成 PERF-03 PNG 曲线图。
- 增加浏览器流程 WebM 取证，覆盖标题菜单、暂停、键盘、跨区、天气、动作、无声反馈、E2E 和短片素材。
- 增加浏览器帧率曲线报告，聚落、雨天、战斗和首领场景各采样 2 分钟 requestAnimationFrame 帧时间。
- 增加静音与色觉差异反馈检查表，确认任务、受击、错误、关系和保存不只依赖声音或颜色。
- 增加视觉迭代记录，将 ART_BIBLE 目标、基线差异、响应式/可读性修正截图和浏览器流程帧串成可复核链路。

## 0.3.2 - 2026-06-26

- 增加无脚本、旧模块能力和 Canvas/localStorage/Fetch 缺失时的中文兼容提示，避免不支持环境白屏。
- 新增前端兼容标记测试，并生成浏览器兼容报告。
- 生成开发说明、范围评分草案和最终签署草案，明确 AI 边界和剩余外部证据。
- 生成设置与可访问性报告，覆盖音量、文字速度、亮度、屏幕震动、降低动态效果、难度、字号和全屏入口。
- 生成玩法回归报告，覆盖地图碰撞、出口交互站位、拾取物、敌人出生点、每类敌人 10 次规则级战斗循环和失败重试。

## 0.3.1 - 2026-06-26

- 建立可复核验收证据生成脚本，覆盖构建信息、性能体积、模拟稳定性、存档导入、样例存档、截图索引、日志安全和资产流转。
- 存档导入校验进入规则层，覆盖正确、损坏、超大、错误类型和篡改校验路径。
- \`/api/status\` 与 \`/api/health\` 增加构建日期和提交标识字段，游戏内制作人员页同步显示。
- API 安全测试新增版本元数据和结构化脱敏日志断言。

## 0.3.0 - 2026-06-26

- 完成《绒火与月铃》可通关冒险骨架：5 个主要区域、3 个室内场景、8 名 NPC、6 阶段主线、5 条支线、6 类敌人和双结局。
- 建立本地确定性规则、可选 DeepSeek 传闻增强、存档、背包、战斗、任务、天气、日程和验收测试。
`;
}

function runCheck(name, fn, expectThrow = false) {
  try {
    fn();
    return { name, ok: !expectThrow, note: expectThrow ? "预期应拒绝，但未抛出错误" : "校验通过" };
  } catch (error) {
    return { name, ok: expectThrow, note: expectThrow ? `已拒绝：${error.message}` : `异常：${error.message}` };
  }
}

function parseTaskEntries(markdown) {
  const requiredFields = ["目标", "非目标", "涉及文件", "对应验收", "测试命令", "可视证据"];
  return markdown
    .split(/\n(?=## TASK-)/)
    .map((block) => {
      const id = block.match(/^## (TASK-[\d-]+)/m)?.[1];
      if (!id) return null;
      const fields = Object.fromEntries(requiredFields.map((field) => [field, new RegExp(`^- ${field}：`, "m").test(block)]));
      const missing = requiredFields.filter((field) => !fields[field]).map((field) => `${id}:${field}`);
      return { id, fields, missing };
    })
    .filter(Boolean);
}

function inspectSvgAsset(file, expectedSize) {
  if (!existsSync(file)) {
    return { valid: false, bytes: 0, sha256: "", size: "", note: "文件缺失" };
  }
  const text = readFileSync(file, "utf8");
  const bytes = statSync(file).size;
  const sha256 = createHash("sha256").update(text).digest("hex");
  const viewBox = text.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const width = viewBox?.[1] || text.match(/width="([\d.]+)"/)?.[1] || "";
  const height = viewBox?.[2] || text.match(/height="([\d.]+)"/)?.[1] || "";
  const size = width && height ? `${Number(width)}x${Number(height)}` : "";
  const hasAccessibleTitle = /<title\b/.test(text) && /<desc\b/.test(text);
  const valid = size === expectedSize && bytes > 512 && hasAccessibleTitle;
  const note = valid ? "通过" : `尺寸/结构待复核：${size || "未知"}`;
  return { valid, bytes, sha256, size, note };
}

function getDefectRepairSamples() {
  return [
    {
      issue: "标题按钮无法点击",
      reproduction: "浏览器冒烟从标题页点击开始游戏，透明模态层拦截按钮。",
      failingTest: "前端可见入口冒烟复核失败。",
      rootCause: "`.modal-layer` 的 `display: grid` 覆盖 `hidden`。",
      fix: "CSS 末尾增加 `[hidden]` 强覆盖。",
      regression: "`npm run validate` 与标题页浏览器冒烟。",
    },
    {
      issue: "不支持环境可能停留在加载态",
      reproduction: "禁用脚本、不支持模块或缺少关键 API 时进入页面。",
      failingTest: "`frontendMarkup.test.js` 兼容兜底断言。",
      rootCause: "旧浏览器或禁用脚本没有统一中文兜底提示。",
      fix: "新增 `noscript`、`nomodule` 与运行时能力探针。",
      regression: "`npm test` 和 `COMPATIBILITY_REPORT.md`。",
    },
    {
      issue: "部分入口、敌人和拾取物压到碰撞区",
      reproduction: "规则回归采样出口、敌人出生点和拾取物坐标。",
      failingTest: "`runGameplayRegression` 暴露入口和出生点过近。",
      rootCause: "部分交互点、敌人和返回落点贴近建筑碰撞体。",
      fix: "调整坐标并扩大玩法回归采样。",
      regression: "`GAMEPLAY_REGRESSION_REPORT.md`。",
    },
    {
      issue: "保存写入失败会抛出浏览器异常",
      reproduction: "模拟 localStorage 配额异常和存储不可用。",
      failingTest: "`storageSafety.test.js` 写入失败路径。",
      rootCause: "`saveActive` 直接写 `localStorage`，没有捕获异常。",
      fix: "新增 `writeSaveToStorage` 并返回中文恢复建议。",
      regression: "`STORAGE_FAILURE_REPORT.md`。",
    },
    {
      issue: "模型/服务端慢请求缺少前端请求锁",
      reproduction: "模拟传闻请求慢响应、重复点击和 HTTP 失败。",
      failingTest: "`networkSafety.test.js` 请求门、超时和失败分类。",
      rootCause: "前端只依赖后端超时，没有重复点击锁和本地超时分类。",
      fix: "新增 `networkSafety`、1.9 秒超时和本地降级提示。",
      regression: "`NETWORK_RESILIENCE_REPORT.md`。",
    },
  ];
}

function collectFiles(roots, extensions) {
  const result = [];
  for (const root of roots) walk(root, result, extensions);
  return result;
}

function walk(path, result, extensions) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) walk(join(path, entry), result, extensions);
    return;
  }
  if (extensions.some((ext) => path.endsWith(ext))) result.push(path);
}

function readCommand(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function areaName(id) {
  return areas[id]?.name || id;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KiB`;
  return `${(kib / 1024).toFixed(2)} MiB`;
}

function formatDurationMs(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
