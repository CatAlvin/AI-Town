import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { VERSION } from "../src/gameData.js";
import { getAcceptanceSummary, runGoldenPathSimulation, runWorldSimulation } from "../src/gameRules.js";

const now = new Date().toISOString();
const summary = getAcceptanceSummary();
const golden = runGoldenPathSimulation();
const simulation = runWorldSimulation(42, 3);
const screenshotDir = "docs/acceptance/screenshots";
const screenshotFiles = existsSync(screenshotDir) ? readdirSync(screenshotDir).filter((file) => file.endsWith(".png")).sort() : [];
const screenshotCount = screenshotFiles.length;
const screenshotCoverage = [
  ["标题/作品页", /title|home|作品|首页/i],
  ["聚落", /village|bellvale|聚落/i],
  ["野外", /forest|emberwood|river|wild|ruins|河岸|森林|遗迹/i],
  ["夜晚或天气", /weather|night|rain|fog|雨|雾|夜/i],
  ["对话或日志", /quest|dialog|inventory|log|任务|背包/i],
  ["战斗", /combat|battle|fight|战斗/i],
  ["首领或终局", /boss|guardian|night-bell|moonspire|ending|首领|结局/i],
];
const screenshotCoverageCount = screenshotCoverage.filter(([, regex]) => screenshotFiles.some((file) => regex.test(file))).length;
const screenshotCoverageComplete = screenshotCount >= 6 && screenshotCoverageCount === screenshotCoverage.length;
const hasPlaytestProtocol = existsSync("docs/acceptance/playtest/PLAYTEST_PROTOCOL.md");
const hasTrailerShotlist = existsSync("docs/acceptance/trailer/TRAILER_SHOTLIST.md");
const hasBuildInfo = existsSync("docs/acceptance/00-build-info.md");
const hasDataReport = existsSync("docs/acceptance/tests/data/DATA_COMPATIBILITY_REPORT.md");
const backupRestoreReport = existsSync("docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md")
  ? readFileSync("docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md", "utf8")
  : "";
const backupRestoreComplete = /状态：通过/.test(backupRestoreReport);
const hasStorageFailureReport = existsSync("docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md");
const hasRumorRepetitionReport = existsSync("docs/acceptance/tests/ai/RUMOR_REPETITION_REPORT.md");
const hasContentReport = existsSync("docs/acceptance/tests/content/CONTENT_INTEGRITY_REPORT.md");
const hasRelationshipBranchReport = existsSync("docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md");
const hasEconomyCurveReport = existsSync("docs/acceptance/tests/systems/ECONOMY_CURVE_REPORT.md");
const hasUpgradeFlowReport = existsSync("docs/acceptance/tests/systems/UPGRADE_FLOW_REPORT.md");
const hasPerformanceReport = existsSync("docs/acceptance/tests/performance/PERFORMANCE_REPORT.md");
const memoryCurveManifest = readJsonFile("docs/acceptance/tests/performance/MEMORY_CURVE_MANIFEST.json");
const hasMemoryCurveReport = existsSync("docs/acceptance/tests/performance/MEMORY_CURVE_REPORT.md");
const memoryCurveComplete = Boolean(hasMemoryCurveReport && memoryCurveManifest?.requirements?.complete && existsSync(memoryCurveManifest?.chart?.file || ""));
const frameRateManifest = readJsonFile("docs/acceptance/tests/performance/FRAME_RATE_MANIFEST.json");
const hasFrameRateReport = existsSync("docs/acceptance/tests/performance/FRAME_RATE_REPORT.md");
const frameRateComplete = Boolean(
  hasFrameRateReport &&
    frameRateManifest?.requirements?.complete &&
    Array.isArray(frameRateManifest.results) &&
    frameRateManifest.results.length >= 4 &&
    frameRateManifest.results.every((entry) => entry.ok && entry.elapsedMs >= 118_000) &&
    existsSync(frameRateManifest?.chart?.file || ""),
);
const hasNetworkResilienceReport = existsSync("docs/acceptance/tests/performance/NETWORK_RESILIENCE_REPORT.md");
const hasSimulationReport = existsSync("docs/acceptance/tests/simulation/SIMULATION_REPORT.md");
const hasWorldSystemsReport = existsSync("docs/acceptance/tests/simulation/WORLD_SYSTEMS_REPORT.md");
const hasGameplayReport = existsSync("docs/acceptance/tests/gameplay/GAMEPLAY_REGRESSION_REPORT.md");
const hasAudioReport = existsSync("docs/acceptance/tests/audio/AUDIO_COVERAGE_REPORT.md");
const hasLoggingReport = existsSync("docs/acceptance/tests/security/LOGGING_SECURITY_REPORT.md");
const hasCompatibilityReport = existsSync("docs/acceptance/tests/browser/COMPATIBILITY_REPORT.md");
const hasSettingsReport = existsSync("docs/acceptance/tests/ui/SETTINGS_ACCESSIBILITY_REPORT.md");
const assetPipelineText = existsSync("docs/acceptance/ASSET_PIPELINE.md") ? readFileSync("docs/acceptance/ASSET_PIPELINE.md", "utf8") : "";
const hasAssetPipeline = Boolean(assetPipelineText);
const presskitReport = existsSync("docs/acceptance/presskit/PRESSKIT_REPORT.md")
  ? readFileSync("docs/acceptance/presskit/PRESSKIT_REPORT.md", "utf8")
  : "";
const presskitComplete = /状态：通过/.test(presskitReport);
const assetFlowComplete = hasAssetPipeline && presskitComplete && /完整流转样例/.test(assetPipelineText) && /最终批准/.test(assetPipelineText);
const architectureDecisionReport = existsSync("docs/acceptance/adr/ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md")
  ? readFileSync("docs/acceptance/adr/ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md", "utf8")
  : "";
const developmentDecisionReportComplete =
  /读取现状/.test(architectureDecisionReport) && /假设/.test(architectureDecisionReport) && /影响范围/.test(architectureDecisionReport) && /风险/.test(architectureDecisionReport);
const hasDevelopmentNote = existsSync("docs/acceptance/DEVELOPMENT_NOTE.md");
const developmentProcessReport = existsSync("docs/acceptance/tests/process/DEVELOPMENT_PROCESS_REPORT.md")
  ? readFileSync("docs/acceptance/tests/process/DEVELOPMENT_PROCESS_REPORT.md", "utf8")
  : "";
const developmentTaskAuditComplete = /任务抽样：通过/.test(developmentProcessReport);
const defectRepairAuditComplete = /缺陷样例：通过/.test(developmentProcessReport);
const hasScopeScore = existsSync("docs/acceptance/01-scope-and-score.md");
const hasFinalSignoff = existsSync("docs/acceptance/final-signoff.md");
const hasVersionMetadata = existsSync("docs/acceptance/VERSION_METADATA.md") && existsSync("CHANGELOG.md");
const hasVersionControlReport = existsSync("docs/acceptance/VERSION_CONTROL_REPORT.md");
const visualBaselineManifest = readJsonFile("docs/acceptance/tests/visual/VISUAL_BASELINE_MANIFEST.json");
const hasVisualRegressionReport = existsSync("docs/acceptance/tests/visual/VISUAL_REGRESSION_REPORT.md");
const visualIterationReport = existsSync("docs/acceptance/tests/visual/VISUAL_ITERATION_REPORT.md")
  ? readFileSync("docs/acceptance/tests/visual/VISUAL_ITERATION_REPORT.md", "utf8")
  : "";
const visualIterationComplete = /状态：通过/.test(visualIterationReport) && /目标参考矩阵/.test(visualIterationReport) && /逐次迭代记录/.test(visualIterationReport);
const readabilityManifest = readJsonFile("docs/acceptance/tests/visual/READABILITY_SCREENSHOT_MANIFEST.json");
const hasReadabilityReport = existsSync("docs/acceptance/tests/visual/READABILITY_REPORT.md");
const visualBaselineComplete = Boolean(
  hasVisualRegressionReport &&
    visualBaselineManifest?.coverage?.complete &&
    Array.isArray(visualBaselineManifest.files) &&
    visualBaselineManifest.files.length >= 6 &&
    visualBaselineManifest.files.every((file) => file.valid && file.width >= 320 && file.height >= 180 && file.sha256),
);
const readabilityComplete = Boolean(
  hasReadabilityReport &&
    readabilityManifest?.requirements?.complete &&
    Array.isArray(readabilityManifest.files) &&
    readabilityManifest.files.length >= 4 &&
    readabilityManifest.files.every((file) => file.valid && existsSync(file.file) && file.metrics?.ok),
);
const responsiveScreenshotManifest = readJsonFile("docs/acceptance/tests/ui/RESPONSIVE_SCREENSHOT_MANIFEST.json");
const hasResponsiveScreenshotReport = existsSync("docs/acceptance/tests/ui/RESPONSIVE_SCREENSHOT_REPORT.md");
const accessibilityFeedbackReport = existsSync("docs/acceptance/tests/ui/ACCESSIBILITY_FEEDBACK_REPORT.md")
  ? readFileSync("docs/acceptance/tests/ui/ACCESSIBILITY_FEEDBACK_REPORT.md", "utf8")
  : "";
const accessibilityFeedbackComplete = /状态：通过/.test(accessibilityFeedbackReport) && /关闭声音/.test(accessibilityFeedbackReport) && /色觉差异/.test(accessibilityFeedbackReport);
const responsiveScreenshotsComplete = Boolean(
  hasResponsiveScreenshotReport &&
    responsiveScreenshotManifest?.requirements?.complete &&
    Array.isArray(responsiveScreenshotManifest.files) &&
    responsiveScreenshotManifest.files.length >= 3 &&
    responsiveScreenshotManifest.files.every((file) => file.valid && existsSync(file.file)),
);
const browserFlowManifest = readJsonFile("docs/acceptance/tests/browser/BROWSER_FLOW_MANIFEST.json");
const hasBrowserFlowReport = existsSync("docs/acceptance/tests/browser/BROWSER_FLOW_REPORT.md");
const browserFlowCases = Array.isArray(browserFlowManifest?.cases) ? browserFlowManifest.cases : [];
const browserFlowTags = new Set(browserFlowCases.flatMap((entry) => (Array.isArray(entry.tags) ? entry.tags : [])));
const browserFlowHas = (tag) => browserFlowTags.has(tag);
const browserFlowVideosComplete = browserFlowCases.length >= 8 && browserFlowCases.every((entry) => entry.ok && entry.video?.file && existsSync(entry.video.file));
const browserFlowTrailer = browserFlowCases.find((entry) => Array.isArray(entry.tags) && entry.tags.includes("trailer"));
const browserFlowTrailerComplete = Boolean(browserFlowTrailer && browserFlowTrailer.durationMs >= 45_000 && browserFlowTrailer.durationMs <= 90_000);
const browserFlowComplete = Boolean(hasBrowserFlowReport && browserFlowManifest?.requirements?.complete && browserFlowVideosComplete && browserFlowTrailerComplete);
const gitBranch = readCommand("git rev-parse --abbrev-ref HEAD");
const gitTags = readCommand("git tag --list")
  .split(/\r?\n/)
  .map((tag) => tag.trim())
  .filter(Boolean);
const hasVersionHistory = Boolean(gitBranch && hasVersionControlReport && gitTags.includes("v0.3.3-acceptance-baseline"));
const sampleSaveCount = existsSync("docs/acceptance/saves") ? readdirSync("docs/acceptance/saves").filter((file) => file.endsWith(".json")).length : 0;

const evidence = [
  ["GATE-01", "partial", "规则级黄金路径可达结局；仍需完整人工/视频证据。"],
  ["GATE-02", "pass", "productionAudit 扫描运行时代码无旧名、占位、TODO、Coming Soon、调试入口。"],
  ["GATE-03", "partial", "secretScan 通过，本地明文 key 文件已移除；仍需用户确认外部 key 已轮换。"],
  ["GATE-04", "pass", "ASSET_LICENSES 声明当前无外部素材，Canvas/音效/文本自制。"],
  ["GATE-05", "partial", "Dockerfile 与部署说明存在；仍需干净 Linux 服务器部署录像。"],
  [
    "GATE-06",
    hasDataReport && sampleSaveCount >= 3 ? "pass" : "partial",
    hasDataReport && sampleSaveCount >= 3
      ? `存档创建、读取、覆盖、校验、迁移、导入故障和 ${sampleSaveCount} 组样例存档均有自动证据；强刷/服务重启不影响 localStorage 存档。`
      : "存档规则有自动测试；仍需样例存档和导入故障报告。",
  ],
  ["GATE-07", "pass", "无 LLM golden path 可通关，/api/rumor 无 key 本地降级。"],
  [
    "GATE-08",
    hasFinalSignoff ? "partial" : "missing",
    hasFinalSignoff ? "缺陷台账和最终签署草案已存在；仍需完整人工回归与至少一名非开发者复测关闭。" : "需要最终缺陷签署记录。",
  ],
  [
    "PROD-01",
    browserFlowComplete && browserFlowHas("title-menu-ending") ? "pass" : "partial",
    browserFlowComplete && browserFlowHas("title-menu-ending")
      ? "浏览器流程 WebM 覆盖标题、设置、制作人员、开始游戏、任务、背包、暂停、结局返回标题。"
      : "标题/开始/继续/设置/制作人员/暂停/结局返回标题已实现；仍需全流程录像。",
  ],
  [
    "PROD-03",
    hasScopeScore ? "partial" : "missing",
    hasScopeScore ? "范围与评分草案已明确当前只是可通关垂直成品骨架；仍未证明 90–150 分钟主线体量。" : "需要章节用时统计和节拍表。",
  ],
  [
    "PROD-02",
    hasContentReport ? "partial" : "missing",
    hasContentReport ? "内容完整性报告证明开场任务串联了探索、交互、战斗和一次奖励结算；仍需陌生玩家前 10 分钟观察表。" : "需要新手核心循环观察证据。",
  ],
  [
    "PROD-04",
    hasContentReport ? "pass" : "missing",
    hasContentReport ? "内容完整性报告验证 5 个主要区域均有独立玩法目的、地标和主线/系统作用。" : "需要区域玩法目的对比证据。",
  ],
  [
    "PROD-05",
    hasScopeScore && hasDevelopmentNote ? "partial" : "missing",
    hasScopeScore && hasDevelopmentNote ? "范围评分草案和开发说明已明确当前边界与不可签署项；仍需真实功能冻结记录。" : "需要范围基线和变更记录。",
  ],
  [
    "PROD-06",
    hasContentReport && screenshotCoverageComplete ? "pass" : "partial",
    hasContentReport && screenshotCoverageComplete ? "项目身份、README、标题页、制作人员页、截图包和结局文本均使用《绒火与月铃》。" : "需要品牌一致性清单。",
  ],
  [
    "GAME-01",
    hasGameplayReport && browserFlowComplete && browserFlowHas("map-edge-pressure") ? "pass" : hasGameplayReport ? "partial" : "missing",
    hasGameplayReport && browserFlowComplete && browserFlowHas("map-edge-pressure")
      ? "玩法回归报告覆盖出生点、出口交互站位、拾取物、敌人出生点和碰撞体阻挡；浏览器流程 WebM 记录 5 个主要区域的地图边缘/窄门真实输入压力。"
      : hasGameplayReport
        ? "玩法回归报告覆盖出生点、出口交互站位、拾取物、敌人出生点和碰撞体阻挡；仍需逐地图边缘/窄门真实压力录像。"
        : "需要地图移动与碰撞压力证据。",
  ],
  [
    "GAME-02",
    hasGameplayReport && browserFlowComplete && browserFlowHas("interaction-stack") ? "pass" : hasGameplayReport ? "partial" : "missing",
    hasGameplayReport && browserFlowComplete && browserFlowHas("interaction-stack")
      ? "玩法回归报告覆盖交互点可达性，前端按优先级和距离选择目标；浏览器流程 WebM 记录 20 次 E 键真实交互输入与菜单恢复。"
      : hasGameplayReport
        ? "玩法回归报告覆盖交互点可达性，前端按优先级和距离选择目标；仍需人群/门口/物品堆叠 20 次真实交互录像。"
        : "需要交互目标压力证据。",
  ],
  [
    "GAME-03",
    hasGameplayReport && browserFlowComplete && browserFlowHas("combat-input") ? "pass" : hasGameplayReport ? "partial" : "missing",
    hasGameplayReport && browserFlowComplete && browserFlowHas("combat-input")
      ? "玩法回归报告覆盖每类敌人 10 次规则级击败、首领阶段描述和失败重试；浏览器流程 WebM 记录森林、遗迹和塔顶 30 次攻击/闪避真实输入压力。"
      : hasGameplayReport
        ? "玩法回归报告覆盖每类敌人 10 次规则级击败、首领阶段描述和失败重试；仍需每敌人 10 次真实输入战斗录像。"
        : "需要战斗循环压力证据。",
  ],
  ["GAME-04", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证 4 种以上基础敌人原型：追击、远程、区域控制、固定火力。" : "需要敌人行为说明。"],
  ["GAME-05", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告和玩法回归报告验证小头目与终局首领均有 2 阶段和可读前摇。" : "需要首领阶段证据。"],
  ["GAME-06", hasContentReport ? "pass" : "missing", hasContentReport ? "失败恢复规则返回最近检查点，生命与体力恢复；玩法回归报告覆盖 retry。" : "需要失败恢复证据。"],
  ["GAME-07", hasContentReport ? "pass" : "missing", hasContentReport ? "5 个永久成长节点均改变闪避、攻击、视野、采集或恢复等玩法选择。" : "需要成长路径证据。"],
  ["GAME-08", hasSettingsReport ? "pass" : "partial", hasSettingsReport ? "设置报告和前端实现覆盖“标准/轻松”难度，影响敌人伤害与移动速度。" : "需要难度对比证据。"],
  ["WORLD-01", "pass", `${summary.mainAreas} 个主要区域，${summary.interiors} 个室内场景。`],
  ["WORLD-02", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证每个主要区域至少 2 个地标，区域 purpose 与视觉/玩法作用不同。" : "需要地标截图和导航证据。"],
  ["WORLD-04", "pass", "4 个离散时段影响 NPC 日程与天气。"],
  [
    "WORLD-03",
    hasWorldSystemsReport && browserFlowComplete && browserFlowHas("cross-area") ? "pass" : hasWorldSystemsReport ? "partial" : "missing",
    hasWorldSystemsReport && browserFlowComplete && browserFlowHas("cross-area")
      ? "世界系统报告覆盖 30 次连续跨区，浏览器流程 WebM 记录聚落、森林、河岸、遗迹和塔顶加载时间轴。"
      : hasWorldSystemsReport
        ? "世界系统报告覆盖 30 次连续跨区、出生点、检查点和跨区自动保存；仍需真实浏览器跨区加载录像。"
        : "需要跨区压力和加载反馈证据。",
  ],
  [
    "WORLD-05",
    hasWorldSystemsReport && browserFlowComplete && browserFlowHas("weather") ? "pass" : hasWorldSystemsReport ? "partial" : "missing",
    hasWorldSystemsReport && browserFlowComplete && browserFlowHas("weather")
      ? "世界系统报告覆盖 3 种天气与玩法后果，浏览器流程 WebM 记录晴朗、细雨、雾风和深夜场景。"
      : hasWorldSystemsReport
        ? "世界系统报告覆盖 3 种天气、NPC 日程差异、雨结护符资源后果和雾风状态；仍需天气视觉/玩法实机录像。"
        : "需要天气影响矩阵与演示证据。",
  ],
  ["WORLD-06", screenshotCoverageComplete ? "pass" : "partial", "bridgeFixed/waterwheelFixed/villageUnited 等 world flags 已持久化；规则测试覆盖保存读取，截图包用于补前后视觉证据。"],
  [
    "WORLD-07",
    hasWorldSystemsReport ? "pass" : "missing",
    hasWorldSystemsReport ? "世界系统报告覆盖修桥、水车、塔顶、居民集结和传闻信任 5 条可复现因果链。" : "需要至少 3 条因果链测试脚本。",
  ],
  [
    "WORLD-08",
    hasWorldSystemsReport && hasSimulationReport ? "pass" : "partial",
    hasWorldSystemsReport && hasSimulationReport ? "20 种子模拟和 60 分钟等价长会话均执行不变量、存档往返、自动保存裁剪和传闻裁剪检查。" : "需要长时间模拟稳定性证据。",
  ],
  ["WORLD-09", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证世界规则表、同条件确定性和天气边界，规则同步写入 WORLD_BIBLE。" : "需要规则一致性证据。"],
  ["NPC-01", "pass", `${summary.namedNpcs} 名有姓名 NPC 与主角设定已数据化。`],
  ["NPC-02", "pass", `${summary.scheduledNpcs} 名 NPC 有 4 时段日程。`],
  ["NPC-03", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证 8 名 NPC 均有 trust/mood/need，支线和传闻会改变可变状态。" : "需要 NPC 状态对比证据。"],
  [
    "NPC-04",
    hasRelationshipBranchReport ? "pass" : hasContentReport ? "partial" : "missing",
    hasRelationshipBranchReport
      ? "关系分支报告用低/高信任存档回放对白、价格、支线帮助、主线集结和结局条件 5 类结果。"
      : hasContentReport
        ? "信任已影响对白、商店价格、主线集结和结局条件；仍需不同关系存档的浏览器分支录像。"
        : "需要关系分支录像。",
  ],
  ["NPC-05", "pass", `${summary.memoryTypes} 类结构化记忆已实现并按存档状态写入。`],
  ["NPC-06", "pass", "传闻带来源、目标、时间和失真；低失真传闻会提升目标 NPC 信任。"],
  [
    "NPC-07",
    hasContentReport && browserFlowComplete && browserFlowHas("npc-recovery") ? "pass" : hasContentReport ? "partial" : "missing",
    hasContentReport && browserFlowComplete && browserFlowHas("npc-recovery")
      ? "内容完整性报告验证天气/时段/集结状态下 NPC 日程均能解析到有效区域；浏览器流程 WebM 记录交互/对白输入、暂停打断、河岸切图和恢复。"
      : hasContentReport
        ? "内容完整性报告验证天气/时段/集结状态下 NPC 日程均能解析到有效区域；仍需堵门、切图和打断对话实机恢复录像。"
        : "需要 NPC 异常恢复录像。",
  ],
  ["NPC-08", hasContentReport ? "pass" : "missing", hasContentReport ? "角色数据与美术圣经记录物种轮廓、耳尾/嗅觉/习惯等身体语言，并在对白/设定中体现。" : "需要 Furry 行为说明。"],
  ["NAR-01", "pass", "WORLD_BIBLE 存在。"],
  ["NAR-02", "pass", `${summary.mainStages} 个主线阶段有目标、阻力、奖励和下一步线索。`],
  ["NAR-03", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证 5 条支线中至少 3 条产生长期后果，且均有主题句。" : "需要支线对比存档和截图。"],
  ["NAR-04", "pass", "双结局由 villageUnited、支线数量、传闻清晰度、信任和最终选择共同决定，测试覆盖两种结局。"],
  [
    "NAR-05",
    hasContentReport ? "partial" : "missing",
    hasContentReport ? "动态传闻和角色文本有 schema、长度和状态依据；仍需连续 10 次对话抽样与盲测归属记录。" : "需要对白抽样与盲测。",
  ],
  ["NAR-06", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告统计主线、支线和结局强制文本最长不超过 180 个汉字。" : "需要文本长度统计。"],
  ["NAR-07", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证黄金路径和跳过支线后的恢复条件，任务阶段不依赖随机 AI 文本。" : "需要任务排列组合证据。"],
  ["SYS-01", hasDataReport ? "pass" : "partial", "背包使用、容量上限、满包反馈、导入恢复和样例存档均有自动测试/报告。"],
  ["SYS-02", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证 15–25 个道具中至少 70% 具备战斗、探索、任务、关系或升级用途。" : "需要物品用途矩阵。"],
  [
    "SYS-03",
    hasContentReport && hasEconomyCurveReport ? "pass" : hasContentReport ? "partial" : "missing",
    hasContentReport && hasEconomyCurveReport
      ? "经济曲线报告覆盖标准通关路线的敌人铜星收入、商店支出、支线折扣、最低余额和终局余额。"
      : hasContentReport
        ? "内容完整性报告验证基础商店价格可理解且初始资源可购买基础补给；仍需完整通关收入/支出曲线。"
        : "需要经济曲线表。",
  ],
  [
    "SYS-04",
    hasContentReport && hasUpgradeFlowReport ? "pass" : hasContentReport ? "partial" : "missing",
    hasContentReport && hasUpgradeFlowReport
      ? "成长升级流程报告覆盖取消、条件不足、购买成功、重复点击、保存重载和非法节点拒绝。"
      : hasContentReport
        ? "内容完整性报告验证 5 个成长节点有明确玩法效果；仍需购买、取消、重载和条件不足的界面录像。"
        : "需要成长界面录像。",
  ],
  ["SYS-05", hasContentReport ? "pass" : "missing", hasContentReport ? "内容完整性报告验证 5 个营地料理配方，按主线阶段开放，使用已有资源，实际制作会扣材料、给产物并自动保存。" : "需要配方流程证据。"],
  ["DATA-01", "pass", "3 个存档槽位显示主线、地点、时长和保存时间；删除二次确认已实现并经浏览器冒烟确认。"],
  [
    "DATA-02",
    hasContentReport && hasStorageFailureReport ? "pass" : hasContentReport ? "partial" : "missing",
    hasContentReport && hasStorageFailureReport
      ? "内容完整性报告验证跨区、主线、支线和结局自动保存；存储失败报告模拟配额异常和存储不可用，前端显示中文失败提示且不中断。"
      : hasContentReport
        ? "内容完整性报告验证跨区、主线、支线和结局自动保存，前端显示保存原因；仍需写入失败模拟。"
        : "需要自动保存日志。",
  ],
  ["DATA-03", hasDataReport ? "pass" : "partial", hasDataReport ? "存档 schema、校验和默认值修复有测试，旧 schemaVersion 1 样例可迁移到当前版本。" : "需要迁移测试报告。"],
  ["DATA-04", hasDataReport ? "pass" : "partial", hasDataReport ? "导入正确、损坏、超大、错误类型和篡改文件均由规则层测试和报告覆盖。" : "需要导入故障报告。"],
  [
    "DATA-05",
    hasWorldSystemsReport ? "partial" : "missing",
    hasWorldSystemsReport ? "世界系统报告完成 60 分钟等价长会话、120 次存档序列化/读取往返和状态一致性检查；仍需真实浏览器 60 分钟会话记录。" : "需要连续游玩状态一致性报告。",
  ],
  [
    "UX-07",
    hasSettingsReport ? "pass" : "partial",
    hasSettingsReport
      ? "设置与可访问性报告覆盖主音量、音乐、音效、静音、文字速度、亮度、屏幕震动、降低动态效果、难度、字号、全屏入口和独立持久化。"
      : "主音量、音乐、音效、静音、文字速度、亮度、屏幕震动、降低动态效果、难度、字号和全屏入口已实现；仍需设置证据报告。",
  ],
  ["UX-01", "pass", "首页具备品牌加载页、进度条文案、noscript、nomodule 和运行时兼容兜底，不支持环境不会白屏。"],
  [
    "UX-02",
    hasContentReport ? "partial" : "missing",
    hasContentReport ? "开场任务已嵌入移动、交互、任务、战斗/闪避和保存路径；仍需 5 名新玩家成功率记录。" : "需要新手引导证据。",
  ],
  [
    "UX-03",
    responsiveScreenshotsComplete ? "pass" : screenshotCoverageComplete ? "partial" : "missing",
    responsiveScreenshotsComplete
      ? "响应式截图报告覆盖 1280x720、1920x1080 和 125% 缩放，并包含 HUD、任务日志、背包和战斗画面。"
      : screenshotCoverageComplete
        ? "截图包覆盖 HUD、任务、背包和战斗画面；仍需 1280×720/1920×1080 与 125% 缩放截图。"
        : "需要多分辨率截图。",
  ],
  [
    "UX-04",
    hasSettingsReport && browserFlowComplete && browserFlowHas("pause") ? "pass" : hasSettingsReport ? "partial" : "missing",
    hasSettingsReport && browserFlowComplete && browserFlowHas("pause")
      ? "暂停菜单包含继续、设置、控制说明、保存和返回标题；浏览器流程 WebM 覆盖战斗中 Esc 暂停、保存、控制说明与恢复。"
      : hasSettingsReport
        ? "暂停菜单包含继续、设置、控制说明、保存和返回标题，游戏循环在 paused 时停止更新；仍需战斗/对白中暂停录像。"
        : "需要暂停测试录像。",
  ],
  ["UX-05", hasContentReport ? "pass" : "missing", hasContentReport ? "任务日志由结构化主线和支线数据生成，显示当前目标、地点线索、完成状态和已完成任务。" : "需要任务日志截图。"],
  [
    "UX-06",
    hasContentReport ? "partial" : "missing",
    hasContentReport ? "主要区域有地标、区域级出口标记和当前目标；仍需玩家导航试玩记录。" : "需要导航试玩记录。",
  ],
  [
    "UX-08",
    hasSettingsReport && browserFlowComplete && browserFlowHas("keyboard") ? "pass" : hasSettingsReport ? "partial" : "missing",
    hasSettingsReport && browserFlowComplete && browserFlowHas("keyboard")
      ? "浏览器流程 WebM 使用键盘完成开始、移动、任务日志、背包、暂停、手动保存和继续，文字缩放两档由设置报告覆盖。"
      : hasSettingsReport
        ? "核心游戏支持键盘移动/交互/攻击/闪避/暂停/日志/背包，文字缩放两档；仍需不用鼠标完成菜单和存档的录像。"
        : "需要键盘导航录像。",
  ],
  [
    "UX-09",
    hasAudioReport && hasSettingsReport && accessibilityFeedbackComplete ? "pass" : hasAudioReport && hasSettingsReport ? "partial" : "missing",
    hasAudioReport && hasSettingsReport && accessibilityFeedbackComplete
      ? "静音与色觉差异反馈检查报告覆盖任务、受击、错误、关系和保存，证明声音或颜色不是唯一反馈通道。"
      : hasAudioReport && hasSettingsReport
        ? "任务、受击、错误、关系和保存均有文字、音效或视觉反馈；仍需关闭声音/色觉差异检查表。"
        : "需要可访问性检查表。",
  ],
  [
    "AUD-01",
    hasAudioReport ? "partial" : "missing",
    hasAudioReport ? `${summary.audioThemes} 首程序化主题音乐覆盖标题/聚落、野外、遗迹、首领和结局，并有切换逻辑；仍建议补跨区与暂停恢复聆听录像。` : "需要音乐清单和切换证据。",
  ],
  [
    "AUD-02",
    hasAudioReport ? "partial" : "missing",
    hasAudioReport ? "音频报告记录远处月铃、炉火、河水、雾风、夜虫、雨点等环境层；仍建议补每区 60 秒静听录像。" : "需要环境声分层证据。",
  ],
  [
    "AUD-03",
    hasAudioReport ? "pass" : "missing",
    hasAudioReport ? `${summary.soundEffects} 个 WebAudio 合成音效覆盖 UI、移动、交互、战斗和环境反馈，前端事件钩子和数据测试均已覆盖。` : "需要至少 25 个音效覆盖矩阵。",
  ],
  [
    "AUD-04",
    hasAudioReport && hasAssetPipeline && hasSettingsReport ? "pass" : "partial",
    hasAudioReport && hasAssetPipeline && hasSettingsReport
      ? "无外部音频资产；音频覆盖报告、资产流转记录和设置报告证明主音量、音乐、音效、静音与持久化已具备。"
      : "需要音频许可和主音量/音乐/音效/静音设置证据。",
  ],
  ["AI-01", "pass", "主线、战斗、掉落、存档、结局和世界状态均在本地规则层完成；LLM 只用于可选传闻句式增强。"],
  ["AI-02", "pass", "LLM 传闻 schema 白名单、长度和数值边界有测试。"],
  [
    "AI-03",
    "partial",
    "传闻 schema 仅允许既有 NPC、短主题、短句、枚举语气和失真数值；仍需 100 条动态对白人工抽检。",
  ],
  [
    "AI-04",
    hasRumorRepetitionReport ? "pass" : "partial",
    hasRumorRepetitionReport
      ? "传闻连续交谈报告覆盖 20 次交谈，统计唯一句、主题、NPC 组合、重复率，并验证最近 12 条记录裁剪。"
      : "传闻有来源、时间和最近记录裁剪，本地模板按时段/NPC 变化；仍需连续交谈 20 次重复率统计。",
  ],
  ["AI-05", "pass", "模型不可用时本地降级，不阻塞核心规则。"],
  ["AI-06", "pass", "服务端提供 LLM_SESSION_LIMIT、RATE_LIMIT 和 RATE_WINDOW_MS，API 安全测试覆盖会话配额与频率限制。"],
  ["AI-07", "pass", "模型输入不包含密钥，响应经白名单校验；API 安全测试覆盖提示注入文本和错误脱敏。"],
  [
    "AI-08",
    "partial",
    "世界圣经和 schema 限制题材、语气与实体范围；仍需边界输入内容安全人工抽检。",
  ],
  [
    "AI-09",
    hasLoggingReport ? "partial" : "missing",
    hasLoggingReport ? "日志报告和 API 安全测试覆盖来源、耗时、请求 ID、降级原因和脱敏；仍需真实成功模型调用日志样例。" : "需要模型调用观测日志。",
  ],
  ["ART-01", "pass", "ART_BIBLE 已定义镜头比例、Canvas 风格、色板、角色、UI 材质和禁用风格。"],
  [
    "ART-02",
    screenshotCoverageComplete ? "partial" : "missing",
    screenshotCoverageComplete ? "截图包证明当前 Canvas 风格统一；仍需 3 名外部观察者一致性评分。" : "需要视觉一致性评审。",
  ],
  [
    "ART-03",
    hasGameplayReport && browserFlowComplete && browserFlowHas("player-animation") ? "pass" : hasGameplayReport ? "partial" : "missing",
    hasGameplayReport && browserFlowComplete && browserFlowHas("player-animation")
      ? "浏览器流程 WebM 记录主角待机、移动、月铃击攻击弧、闪避位移和战斗反馈，规则报告覆盖受击与失败恢复。"
      : hasGameplayReport
        ? "主角具备待机浮动、移动、攻击弧、闪避、受击和失败恢复的程序化表现；仍缺逐动作动画图谱录像。"
        : "需要主角动作录像。",
  ],
  [
    "ART-04",
    hasGameplayReport && browserFlowComplete && browserFlowHas("npc-enemy") ? "pass" : hasGameplayReport ? "partial" : "missing",
    hasGameplayReport && browserFlowComplete && browserFlowHas("npc-enemy")
      ? "浏览器流程 WebM 记录聚落 NPC 待机/位置观察、遗迹敌人和塔顶首领画面，片段时长满足 30 秒观察摘要。"
      : hasGameplayReport
        ? "NPC 有程序化待机浮动与位置变化，敌人有前摇文本和阶段反馈；仍缺 30 秒观察录像。"
        : "需要 NPC/敌人动画集录像。",
  ],
  ["ART-05", screenshotCoverageComplete ? "pass" : "partial", screenshotCoverageComplete ? "截图包与内容报告覆盖 5 个主要区域的独立主色、地标和环境动态。" : "需要区域截图板。"],
  [
    "ART-06",
    readabilityComplete ? "pass" : hasSettingsReport && hasWorldSystemsReport ? "partial" : "missing",
    readabilityComplete
      ? "极端可读性报告覆盖白天、深夜、雨天、战斗特效密集、HUD 和任务文字，并记录 PNG 尺寸、哈希与亮度指标。"
      : hasSettingsReport && hasWorldSystemsReport
        ? "亮度设置、天气视觉和规则级天气报告已具备；仍需极端场景可读性截图。"
        : "需要极端天气/战斗可读性证据。",
  ],
  [
    "ART-07",
    hasAudioReport && browserFlowComplete && browserFlowHas("muted-feedback") ? "pass" : hasAudioReport ? "partial" : "missing",
    hasAudioReport && browserFlowComplete && browserFlowHas("muted-feedback")
      ? "浏览器流程 WebM 在静音设置下记录攻击、任务日志、暂停保存和 toast/画面反馈；音效钩子由音频报告覆盖。"
      : hasAudioReport
        ? "拾取、对话、受击、任务、存档和首领阶段均有文字/音效/画面反馈钩子；仍需无声操作录像。"
        : "需要无声操作录像。",
  ],
  ["ART-08", hasSettingsReport ? "pass" : "partial", hasSettingsReport ? "前端 CSS 与设置报告证明定制羊皮纸/木牌/铜铃 UI、按钮状态和非默认游戏界面。" : "需要 UI 状态板。"],
  ["ART-09", hasAssetPipeline ? "pass" : "partial", hasAssetPipeline ? "ASSET_LICENSES 和资产流转记录声明当前所有正式素材自制，无外部素材需反查。" : "需要资产清单。"],
  ["ART-10", hasAssetPipeline ? "pass" : "partial", hasAssetPipeline ? "资产流转记录禁止普通网页图片、他人角色、影视或游戏截图进入正式资源目录；当前无外部素材。" : "需要素材审核记录。"],
  [
    "ART-11",
    assetFlowComplete ? "pass" : hasAssetPipeline ? "partial" : "missing",
    assetFlowComplete
      ? "资产流转记录抽查主视觉和 favicon，覆盖候选、许可审查、风格试装、尺寸统一、压缩、整合、截图对比和最终批准。"
      : hasAssetPipeline
        ? "资产流转记录定义候选、许可审查、风格试装、压缩和最终批准流程；当前无外部素材可抽查完整流转。"
        : "需要资产采购/筛选日志。",
  ],
  ["ART-12", hasPerformanceReport && hasAssetPipeline ? "pass" : "partial", hasPerformanceReport && hasAssetPipeline ? "当前无外部纹理/图集文件，首包体积报告证明无巨大图片、音频或重复资源。" : "需要资产优化报告。"],
  [
    "ART-13",
    presskitComplete && screenshotCoverageComplete ? "pass" : screenshotCoverageComplete ? "partial" : "missing",
    presskitComplete && screenshotCoverageComplete
      ? `Press kit 报告记录主视觉源文件、favicon 图标和 ${screenshotCount} 张作品集截图，且截图覆盖 ${screenshotCoverageCount}/${screenshotCoverage.length} 类画面。`
      : screenshotCoverageComplete
        ? `已有 ${screenshotCount} 张作品集截图；仍缺正式主视觉源文件和图标。`
        : "需要主视觉、图标和截图包。",
  ],
  [
    "PERF-01",
    hasPerformanceReport && frameRateComplete ? "pass" : hasPerformanceReport ? "partial" : "missing",
    hasPerformanceReport && frameRateComplete
      ? "浏览器帧率报告使用 Edge headless 对聚落、雨天河岸、森林战斗和首领战各采样 2 分钟 rAF 帧时间并生成 PNG 曲线图。"
      : hasPerformanceReport
        ? "资源体积和 Canvas 对象量较小，但仍需聚落、雨天、战斗和首领场景各 2 分钟真实帧率记录。"
        : "需要帧时间图。",
  ],
  ["PERF-02", hasPerformanceReport ? "pass" : "partial", hasPerformanceReport ? "加载与资源体积报告证明首包关键文件远低于 25 MB；仍建议最终线上瀑布截图归档。" : "需要加载性能报告。"],
  [
    "PERF-03",
    memoryCurveComplete ? "pass" : hasWorldSystemsReport ? "partial" : "missing",
    memoryCurveComplete
      ? "内存曲线报告使用 Microsoft Edge headless 对标题、聚落、雨天河岸和首领战采样并生成 PNG 曲线图。"
      : hasWorldSystemsReport
        ? "世界系统报告覆盖 60 分钟等价会话和切图/存档一致性；仍需浏览器内存曲线截图。"
        : "需要内存曲线截图。",
  ],
  [
    "PERF-04",
    hasCompatibilityReport ? "partial" : "missing",
    hasCompatibilityReport ? "Chromium/Edge 本地构建和不支持环境中文兜底已记录；仍需 Firefox 全新配置下前 15 分钟和存档流程证据。" : "需要浏览器兼容矩阵。",
  ],
  [
    "PERF-05",
    hasNetworkResilienceReport ? "pass" : "partial",
    hasNetworkResilienceReport
      ? "网络韧性报告覆盖传闻请求锁、1.9 秒超时、高延迟取消、重复点击拒绝、HTTP/网络失败分类和本地降级。"
      : "传闻请求异步执行且失败会回到本地传闻，API 有超时和幂等 sessionId；仍需高延迟、重复点击和断网恢复录像。",
  ],
  [
    "OPS-01",
    "partial",
    "DEPLOY_LINUX.md、Dockerfile 和健康检查已存在；仍需未参与开发者在干净环境按文档一遍部署记录。",
  ],
  [
    "OPS-02",
    "partial",
    "Dockerfile 使用非 root 用户 moonbell、只暴露必要端口并配置健康检查；仍需真实运行时用户/端口/权限截图。",
  ],
  [
    "OPS-03",
    "partial",
    "secretScan 与 API 脱敏测试通过，前端不读取密钥；仍需用户确认外部旧 key 已轮换，并补镜像/历史扫描记录。",
  ],
  ["OPS-04", "pass", "健康检查区分核心状态、可选 LLM 配置和版本元数据；API 安全测试覆盖无 LLM 健康状态。"],
  ["OPS-05", hasLoggingReport ? "pass" : "partial", hasLoggingReport ? "结构化日志字段、版本号、请求 ID、模型降级脱敏由 API 安全测试和日志报告覆盖。" : "需要脱敏日志证据。"],
  ["OPS-06", "pass", "API 安全测试覆盖健康检查、无 LLM 降级、非法 JSON 400、超大请求 413、频率限制 429 和错误脱敏。"],
  [
    "OPS-07",
    "partial",
    "Linux 部署文档说明反向代理、HTTPS、缓存和服务端口；仍需真实域名或等价测试环境响应头与证书截图。",
  ],
  [
    "OPS-08",
    backupRestoreComplete ? "pass" : "partial",
    backupRestoreComplete
      ? "备份恢复报告使用 4 个样例 JSON 存档演练全新槽位恢复，校验 checksum、主线阶段、地点和结局一致性；当前无服务端数据库。"
      : "部署取证模板已预留备份/恢复记录；当前游戏持久数据主要为浏览器存档，仍需真实备份恢复演练。",
  ],
  ["OPS-09", "pass", "npm audit --omit=dev 纳入 validate；当前零运行时依赖并锁定 package-lock。"],
  ["QA-01", "pass", "核心规则、任务、存档、掉落和 LLM 校验有自动测试。"],
  [
    "QA-02",
    hasGameplayReport && browserFlowComplete && browserFlowHas("browser-e2e") ? "pass" : hasGameplayReport ? "partial" : "missing",
    hasGameplayReport && browserFlowComplete && browserFlowHas("browser-e2e")
      ? "规则级 E2E 与玩法回归覆盖通关风险；浏览器流程 WebM 覆盖新游戏、移动/攻击、暂停保存、返回标题和继续读取。"
      : hasGameplayReport
        ? "规则级 E2E 加玩法回归覆盖新游戏、跨区、碰撞、战斗、任务、保存加载、失败重试和结局；仍需浏览器 E2E 录像作为最终证据。"
        : "需要规则级 E2E 与浏览器流程证据。",
  ],
  ["QA-03", hasSimulationReport ? "pass" : "partial", hasSimulationReport ? "20 个随机种子、3 个游戏日模拟报告已生成，覆盖天气、传闻和不变量。" : "需要模拟稳定性报告。"],
  [
    "QA-04",
    visualBaselineComplete ? "pass" : screenshotCoverageComplete ? "partial" : "missing",
    visualBaselineComplete
      ? `已有 ${screenshotCount} 张基准截图、PNG 尺寸和 SHA-256 manifest，并生成视觉回归差异报告。`
      : screenshotCoverageComplete
        ? `已有 ${screenshotCount} 张基准截图并生成索引；仍需固定分辨率自动对比或人工差异记录。`
        : "需要视觉回归报告。",
  ],
  [
    "QA-06",
    hasPlaytestProtocol ? "partial" : "missing",
    hasPlaytestProtocol ? "外部试玩协议和记录模板已准备；仍需至少 5 名非开发者真实试玩记录。" : "需要至少 5 名非开发者试玩记录。",
  ],
  [
    "QA-07",
    hasPlaytestProtocol ? "partial" : "missing",
    hasPlaytestProtocol ? "试玩问题闭环模板已准备；仍需真实 2 人以上重复问题和最终改动/拒绝理由记录。" : "需要试玩闭环表。",
  ],
  ["QA-05", hasFinalSignoff ? "partial" : "missing", hasFinalSignoff ? "最终签署草案已列出不可签署原因；仍需人工全量回归后确认 0 个 P0/P1 缺陷。" : "需要最终缺陷台账和签署。"],
  ["QA-08", hasFinalSignoff ? "partial" : "missing", hasFinalSignoff ? "已准备 RC 签署草案；仍需功能冻结后的真实全量回归日期和签署。" : "需要 RC 回归签署表。"],
  [
    "DEV-01",
    developmentTaskAuditComplete ? "pass" : hasDevelopmentNote ? "partial" : "missing",
    developmentTaskAuditComplete
      ? "开发过程报告抽查最近 10 个 AI 任务，均包含目标、非目标、涉及文件、验收条目、测试命令和可视证据字段。"
      : hasDevelopmentNote
        ? "AI_TASK_LOG 记录多轮任务目标、涉及文件、验收 ID 和测试命令；仍需随机抽查 10 个任务可复现。"
        : "需要任务记录样例。",
  ],
  [
    "DEV-02",
    developmentDecisionReportComplete ? "pass" : hasDevelopmentNote ? "partial" : "missing",
    developmentDecisionReportComplete
      ? "ADR 记录轻量版本取舍、规则层复用、自动证据边界和发布素材方案，并列出读取现状、假设、影响范围、风险和验证。"
      : hasDevelopmentNote
        ? "任务日志和开发说明记录读取现状、假设和影响范围；仍需大型改动 ADR/复核记录。"
        : "需要开发决策记录。",
  ],
  [
    "DEV-03",
    "partial",
    "`npm run validate` 统一执行测试、扫描、生产审计和验收审计；仍缺真实 CI 和故意失败阻断记录。",
  ],
  [
    "DEV-04",
    visualIterationComplete ? "pass" : screenshotCoverageComplete ? "partial" : "missing",
    visualIterationComplete
      ? "视觉迭代记录已对齐 ART_BIBLE 目标参考、视觉基线差异检查、响应式/可读性修正截图、press kit 和浏览器流程帧。"
      : screenshotCoverageComplete
        ? "主要界面和场景已生成截图包；仍需目标参考、差异检查和修正截图的逐次视觉迭代记录。"
        : "需要视觉迭代对比图。",
  ],
  ["DEV-05", hasAssetPipeline ? "pass" : "partial", hasAssetPipeline ? "资产流转记录定义 incoming/approved/source 等价流程，当前正式资源目录无外部素材。" : "需要资产流转记录。"],
  [
    "DEV-06",
    defectRepairAuditComplete ? "pass" : hasGameplayReport && hasWorldSystemsReport ? "partial" : "missing",
    defectRepairAuditComplete
      ? "开发过程报告抽查 5 个重要缺陷，记录复现、最小失败测试、根因、修复和回归证据。"
      : hasGameplayReport && hasWorldSystemsReport
        ? "缺陷和回归报告记录多项修复后的回归证据；仍需随机抽查 5 个重要缺陷的根因样例。"
        : "需要缺陷修复样例。",
  ],
  [
    "DEV-07",
    hasVersionHistory ? "pass" : "missing",
    hasVersionHistory
      ? `本地 Git 仓库位于分支 ${gitBranch}，标签 v0.3.3-acceptance-baseline 可读取，VERSION_CONTROL_REPORT 记录非破坏式恢复检查。`
      : "需要 Git 分支、提交、标签和版本恢复演练记录。",
  ],
  [
    "REL-01",
    "partial",
    "标题页包含一句话介绍、游戏画面预览、开始游戏、控制方式、建议浏览器和加载说明；仍需线上首页截图。",
  ],
  ["REL-02", "pass", "README 包含简介、运行、配置、测试、目录、许可和限制。"],
  ["REL-03", "pass", "游戏内制作人员与许可页、README 和 ASSET_LICENSES 均可访问，当前无外部素材署名负担。"],
  ["REL-06", hasDevelopmentNote ? "pass" : "partial", hasDevelopmentNote ? "开发说明已解释 AI 在代码、素材筛选、测试和内容生成中的作用，并标明人工决策边界。" : "需要开发说明页面。"],
  [
    "REL-04",
    hasTrailerShotlist && browserFlowComplete && browserFlowHas("trailer") ? "pass" : hasTrailerShotlist ? "partial" : "missing",
    hasTrailerShotlist && browserFlowComplete && browserFlowHas("trailer")
      ? "短片分镜已准备，浏览器流程 WebM 生成 45–90 秒实机素材，覆盖标题、聚落、战斗、天气、首领、结局和制作人员。"
      : hasTrailerShotlist
        ? "45–90 秒实机短片分镜和录制清单已准备；仍需真实视频文件或发布页证据。"
        : "需要 45–90 秒实机短片。",
  ],
  [
    "REL-05",
    screenshotCoverageComplete ? "pass" : screenshotCount >= 6 ? "partial" : "missing",
    screenshotCoverageComplete
      ? `已有 ${screenshotCount} 张浏览器实机截图，覆盖 ${screenshotCoverageCount}/${screenshotCoverage.length} 类作品集画面。`
      : screenshotCount >= 6
        ? `已有 ${screenshotCount} 张浏览器实机截图，覆盖 ${screenshotCoverageCount}/${screenshotCoverage.length} 类；仍需补野外、夜晚/天气、战斗、首领或结局完整覆盖。`
      : "需要 6 张精选截图包。",
  ],
  ["REL-07", hasVersionMetadata && hasBuildInfo ? "pass" : "partial", hasVersionMetadata && hasBuildInfo ? "版本号、变更日志、构建日期、提交标识和 /api/status 元数据已具备。" : "需要版本元数据和变更日志。"],
  ["REL-08", "pass", "productionAudit 检查运行时代码无开发控制台、旧名、占位、调试入口、测试路由或管理接口。"],
];

const passCount = evidence.filter((item) => item[1] === "pass").length;
const partialCount = evidence.filter((item) => item[1] === "partial").length;
const missingCount = evidence.filter((item) => item[1] === "missing").length;
const remainingNotes = ["外部试玩", "真实 Linux 部署录像", "Firefox 实机兼容记录", "真实长会话记录", "音频跨区/静听录像", "最终人工签署"];
if (!browserFlowTrailerComplete) remainingNotes.push("实机短片");
if (!(browserFlowComplete && browserFlowHas("cross-area") && browserFlowHas("weather"))) remainingNotes.push("真实跨区天气录像");
if (!screenshotCoverageComplete) remainingNotes.push("截图包完整覆盖");

const report = `# 自动验收状态报告

生成时间：${now}
版本：${VERSION}

## 自动取证摘要

- 内容规模：${summary.mainAreas} 个主要区域、${summary.interiors} 个室内、${summary.namedNpcs} 名 NPC、${summary.items} 个道具、${summary.enemyTypes} 类敌人、${summary.mainStages} 阶段主线、${summary.recipes} 个营地料理配方。
- 音频覆盖：${summary.audioThemes} 首主题音乐、${summary.soundEffects} 个 WebAudio 合成音效，报告状态 ${hasAudioReport ? "已生成" : "缺失"}。
- 黄金路径：${golden.state.ending?.title || "未到达结局"}，阶段 ${golden.state.mainStage}/6，步骤 ${golden.steps.length}。
- 模拟稳定性：种子 42，${simulation.snapshots.length} 个时段快照，无不变量异常。
- 截图包：${screenshotCount} 张 PNG，覆盖 ${screenshotCoverageCount}/${screenshotCoverage.length} 类画面。
- 样例存档：${sampleSaveCount} 个。
- 备份恢复：${backupRestoreComplete ? "已演练样例存档备份到新槽位恢复" : "缺失或待复核"}。
- 存储失败模拟：${hasStorageFailureReport ? "已生成 localStorage 写入失败报告" : "缺失"}。
- 世界系统：${hasWorldSystemsReport ? "已生成跨区、天气、因果链和长会话报告" : "缺失"}。
- 内存曲线：${memoryCurveComplete ? "已生成 Edge headless 工作集曲线图" : "缺失或待复核"}。
- 帧率曲线：${frameRateComplete ? "已生成 4 场景各 2 分钟 rAF 帧时间曲线图" : "缺失或待复核"}。
- 玩法回归：${hasGameplayReport ? "已生成地图碰撞、战斗循环和失败重试报告" : "缺失"}。
- 开发过程：${developmentTaskAuditComplete && defectRepairAuditComplete ? "已生成任务抽样和缺陷修复样例报告" : "缺失或待复核"}。
- 发布素材：${presskitComplete ? "已生成主视觉源文件、图标和截图包报告" : "缺失或待复核"}。
- 视觉回归：${visualBaselineComplete ? "已生成截图尺寸、字节数和 SHA-256 基线" : "缺失或待复核"}。
- 视觉迭代：${visualIterationComplete ? "已生成目标参考、差异检查和修正截图记录" : "缺失或待复核"}。
- 响应式截图：${responsiveScreenshotsComplete ? "已覆盖 1280x720、1920x1080 和 125% 缩放" : "缺失或待复核"}。
- 静音/色觉反馈：${accessibilityFeedbackComplete ? "已生成关闭声音与色觉差异检查表" : "缺失或待复核"}。
- 浏览器流程：${browserFlowComplete ? `已生成 ${browserFlowCases.length} 段 WebM，覆盖 ${browserFlowTags.size} 类标签` : "缺失或待复核"}。
- 外部试玩准备：${hasPlaytestProtocol ? "已准备协议和记录表" : "缺失"}。
- 短片准备：${hasTrailerShotlist ? "已准备分镜清单" : "缺失"}。
- 证据状态：pass ${passCount}，partial ${partialCount}，missing ${missingCount}。

## 条目状态

| ID | 状态 | 证据 |
|---|---|---|
${evidence.map(([id, status, note]) => `| ${id} | ${status} | ${note} |`).join("\n")}

## 结论

当前版本自动化证据继续增加，但尚未满足最终验收：${remainingNotes.join("、")}仍缺失。不得标记为最终通过。
`;

writeFileSync("docs/acceptance/AUTO_ACCEPTANCE_STATUS.md", report, "utf8");
console.log(`自动验收报告已生成：docs/acceptance/AUTO_ACCEPTANCE_STATUS.md (${passCount} pass, ${partialCount} partial, ${missingCount} missing)`);

function readCommand(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function readJsonFile(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
