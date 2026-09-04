# 验收覆盖矩阵

更新时间：2026-06-26

## 已有自动化证据

| 验收 ID | 当前证据 |
|---|---|
| GATE-01 / GATE-07 / AI-01 | `test/gameRules.test.js` 的 golden path 在无 LLM 下达到结局。 |
| WORLD-01 | `test/gameData.test.js` 验证 5 个主要区域、3 个室内场景与有效出口。 |
| WORLD-04 / NPC-02 | `runWorldSimulation` 覆盖 4 个时段、天气变化和 NPC 日程有效区域。 |
| NPC-01 | `src/gameData.js` 定义主角与 8 名有姓名 NPC 的物种、轮廓、服装、身份和特征。 |
| NPC-04 | `runRelationshipBranchRegression` 与 `docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md` 用低/高信任存档回放对白、价格、支线帮助、主线集结和结局条件 5 类结果。 |
| NPC-05 | `src/gameData.js` 定义 5 类记忆，`src/gameRules.js` 按存档状态写入 NPC 记忆。 |
| NAR-01 | `docs/design/WORLD_BIBLE.md`。 |
| NAR-02 / NAR-07 | `mainQuestStages` 定义 6 阶段目标/阻力/奖励/线索，测试验证可推进。 |
| SYS-01 | 背包、容量、使用、满包反馈和存档由 `test/gameRules.test.js` 覆盖。 |
| AI-02 / AI-05 / AI-07 | `validateRumorResponse` 白名单、长度、数值边界和本地兜底测试。 |
| AI-04 / NPC-06 | `runRumorRepetitionRegression` 与 `docs/acceptance/tests/ai/RUMOR_REPETITION_REPORT.md` 覆盖 20 次连续传闻交谈、来源/目标/日期/时段、唯一句、NPC 组合、重复率和最近 12 条记录裁剪。 |
| ART-01 | `docs/design/ART_BIBLE.md`。 |
| GATE-04 / REL-03 | `docs/ASSET_LICENSES.md`，当前无外部素材。 |
| OPS-01 / OPS-02 | `Dockerfile` 与 `docs/operations/DEPLOY_LINUX.md`。 |
| OPS-06 | `test/apiSecurity.test.js` 覆盖请求体大小、非法 JSON、频率限制、LLM 降级和错误脱敏。 |
| OPS-09 | `npm audit --omit=dev` 纳入 `npm run validate`，当前结果为 0 vulnerabilities。 |
| OPS-03 / GATE-03 | `npm run scan:secrets` 扫描最终代码、文档和前端资源。 |
| QA-01 | `npm test` 覆盖规则、任务、存档、掉落和 LLM 校验。 |
| GAME-01 / GAME-03 / QA-02 | `docs/acceptance/tests/gameplay/GAMEPLAY_REGRESSION_REPORT.md` 覆盖 8 个场景、15 个出口、95 个碰撞采样点、6 类敌人各 10 次规则级战斗循环和失败重试。 |
| PROD-02 / PROD-04 / GAME-04 / GAME-05 / GAME-06 / GAME-07 / WORLD-02 / WORLD-09 / NPC-03 / NPC-04 / NPC-07 / NPC-08 / NAR-03 / NAR-06 / NAR-07 / SYS-02 / SYS-03 / SYS-04 / SYS-05 / DATA-02 / DATA-03 | `docs/acceptance/tests/content/CONTENT_INTEGRITY_REPORT.md` 覆盖区域玩法目的、敌人差异、成长节点、NPC 状态、关系影响、支线后果、文本长度、任务恢复、道具用途、营地料理、自动保存、存档迁移和规则一致性。 |
| SYS-03 | `runEconomyCurveRegression` 与 `docs/acceptance/tests/systems/ECONOMY_CURVE_REPORT.md` 覆盖标准通关路线的敌人铜星收入、商店支出、支线折扣、最低余额和终局余额。 |
| SYS-04 | `runUpgradeFlowRegression` 与 `docs/acceptance/tests/systems/UPGRADE_FLOW_REPORT.md` 覆盖成长升级的取消、条件不足、购买成功、重复点击、保存重载和非法节点拒绝。 |
| AUD-01 / AUD-02 / AUD-03 / AUD-04 | `docs/acceptance/tests/audio/AUDIO_COVERAGE_REPORT.md` 覆盖 6 首程序化主题音乐、39 个 WebAudio 合成音效、环境层、主音量、音乐、音效和一键静音；`docs/ASSET_LICENSES.md` 记录无外部音频文件。 |
| QA-03 | `docs/acceptance/tests/simulation/SIMULATION_REPORT.md` 汇总 20 个随机种子、3 个游戏日的模拟稳定性。 |
| WORLD-03 / WORLD-05 / WORLD-07 / WORLD-08 / DATA-05 | `docs/acceptance/tests/simulation/WORLD_SYSTEMS_REPORT.md` 覆盖 30 次跨区、3 种天气、5 条因果链、60 分钟等价长会话和 120 次存档往返。 |
| DEV-03 | `npm run validate` 作为统一本地验证命令。 |
| DEV-05 | `docs/acceptance/ASSET_PIPELINE.md` 记录资产采集、许可复核和正式资源目录准入流程。 |
| REL-06 | `docs/acceptance/DEVELOPMENT_NOTE.md` 说明 AI 在代码、素材筛选、测试和内容生成中的作用，以及人工决策边界。 |
| PERF-04 | `docs/acceptance/tests/browser/COMPATIBILITY_REPORT.md` 记录 Chromium/Edge 构建、无脚本、不支持模块和关键 API 缺失时的中文兜底；Firefox 实机仍待补。 |
| QA-05 / QA-08 | `docs/acceptance/final-signoff.md` 已准备最终签署草案并列出不可签署原因；仍需人工全量回归。 |
| REL-01 / PROD-01 | 标题页、开始、继续、设置、制作人员、暂停、结局返回标题已在浏览器冒烟验收。 |
| DATA-01 | 浏览器冒烟确认 3 个槽位显示章节、地点、时长和保存时间；删除有二次确认。 |
| DATA-04 | `parseImportedSave` 和 `DATA_COMPATIBILITY_REPORT.md` 覆盖正确、损坏、超大、错误类型和篡改存档导入。 |
| DATA-02 | `docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md` 模拟正常写入、配额异常和存储不可用，前端显示中文失败提示且不中断。 |
| UX-07 | `docs/acceptance/tests/ui/SETTINGS_ACCESSIBILITY_REPORT.md` 覆盖主音量、音乐、音效、静音、文字速度、亮度、屏幕震动、降低动态效果、难度、字号、全屏入口和独立持久化。 |
| UX-03 | `docs/acceptance/tests/ui/RESPONSIVE_SCREENSHOT_REPORT.md` 覆盖 1280x720、1920x1080 和 125% 缩放，并包含 HUD、任务日志、背包和战斗画面。 |
| PERF-02 | `PERFORMANCE_REPORT.md` 记录首包关键文件约 160.3 KiB，低于 25 MB 建议线。 |
| PERF-03 | `docs/acceptance/tests/performance/MEMORY_CURVE_REPORT.md` 与 `memory-curve/perf03-memory-curve.png` 记录 Edge headless 在标题、聚落、雨天河岸和首领战的 32 个工作集内存采样点。 |
| PERF-05 | `src/networkSafety.js`、`test/networkSafety.test.js` 和 `docs/acceptance/tests/performance/NETWORK_RESILIENCE_REPORT.md` 覆盖传闻请求锁、1.9 秒超时、高延迟取消、重复点击拒绝、HTTP/网络失败分类和本地降级。 |
| OPS-05 | API 安全测试触发 LLM 失败降级，断言结构化日志包含时间、级别、请求 ID、版本号且脱敏。 |
| OPS-08 | `docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md` 使用 4 组样例 JSON 存档演练恢复到全新槽位，并校验 checksum、主线阶段、地点和结局一致性。 |
| REL-05 | `docs/acceptance/screenshots/` 已包含 12 张当前浏览器构建 PNG，覆盖标题、聚落、野外、天气、对话/日志、战斗、首领和结局。 |
| QA-04 | `docs/acceptance/tests/visual/VISUAL_BASELINE_MANIFEST.json` 与 `VISUAL_REGRESSION_REPORT.md` 记录 12 张截图的 PNG 尺寸、字节数和 SHA-256；`audit:evidence` 会对比既有基线并输出差异。 |
| ART-06 | `docs/acceptance/tests/visual/READABILITY_REPORT.md` 与 `READABILITY_SCREENSHOT_MANIFEST.json` 覆盖白天、深夜、雨天、战斗特效密集、HUD 和任务文字，记录 PNG 尺寸、哈希和亮度指标。 |
| ART-11 | `docs/acceptance/ASSET_PIPELINE.md` 抽查主视觉和 favicon 的完整流转，覆盖候选、许可审查、风格试装、尺寸统一、压缩、整合、截图对比和最终批准。 |
| ART-13 | `docs/acceptance/presskit/PRESSKIT_REPORT.md` 记录主视觉源文件 `key-art-source.svg`、发布图标 `public/favicon.svg` 和 12 张作品集截图包。 |
| DEV-02 | `docs/acceptance/adr/ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md` 记录大型改动前读取的现状、假设、影响范围、风险和验证方式。 |
| DEV-01 / DEV-06 | `docs/acceptance/tests/process/DEVELOPMENT_PROCESS_REPORT.md` 抽查最近 10 个任务记录的六字段完整性，并列出 5 个缺陷修复样例的复现、最小失败测试、根因、修复和回归证据。 |
| REL-07 | `VERSION_METADATA.md`、`CHANGELOG.md`、`/api/status` 和游戏内制作人员页提供版本、构建日期和提交标识。 |
| QA-06 / QA-07 | `docs/acceptance/playtest/` 已包含外部试玩协议、结果表和问题闭环模板；仍需真实填写。 |
| REL-04 | `docs/acceptance/trailer/TRAILER_SHOTLIST.md` 已包含 60 秒实机短片分镜；仍需录制视频。 |
| GATE-05 | `docs/operations/DEPLOYMENT_EVIDENCE_TEMPLATE.md` 已包含 Linux 部署取证模板；仍需真实服务器执行记录。 |
| DEV-07 | `docs/acceptance/VERSION_CONTROL_REPORT.md` 记录本地 `main` 分支、提交 `52354f8`、标签 `v0.3.3-acceptance-baseline` 和非破坏式恢复检查。 |
| 全量清单索引 | `docs/acceptance/AUTO_ACCEPTANCE_STATUS.md` 已覆盖检查书 128/128 个 ID，当前为 83 pass / 45 partial / 0 missing。 |

## 仍需外部或后续补证

| 验收 ID | 缺口 |
|---|---|
| QA-06 | 已有协议和表格，仍需要至少 5 名非开发者真实试玩记录。 |
| GATE-05 | 已有部署说明和取证模板；本机无 Docker，仍需要在干净 Linux 服务器真实部署、重启和截图。 |
| GATE-03 / OPS-03 | 本地明文 key 文件已删除，扫描通过；仍需要用户在密钥提供方轮换并失效旧凭据后才能最终签署。 |
| PROD-03 | 当前是可通关垂直成品骨架，尚未证明 90–150 分钟内容体量。 |
| GAME-01 / GAME-03 / QA-02 | 已有规则级玩法回归报告；仍需要真实输入压力视频和浏览器 E2E 录像作为最终证据。 |
| AUD-01 / AUD-02 | 已有程序化音乐和环境层报告；仍建议补跨区切换、暂停恢复和每区 60 秒静听录像。 |
| WORLD-03 / WORLD-05 / DATA-05 | 已有规则级跨区、天气和长会话报告；仍需要真实浏览器跨区、天气和 60 分钟长会话录像。 |
| REL-04 | 需要最终实机短片或发布页视频证据。 |
| PERF-04 | 仍需要 Firefox 全新配置下前 15 分钟和存档流程记录。 |
| QA-05 / GATE-08 | 需要完整人工缺陷回归和签署记录。 |
