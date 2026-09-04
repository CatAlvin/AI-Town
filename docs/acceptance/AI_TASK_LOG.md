# AI 开发任务记录

## TASK-2026-06-26-01

- 目标：把旧 AI 小镇观赏 demo 重构为《绒火与月铃》的可通关冒险游戏骨架。
- 非目标：不声称已经完成 5 人外部试玩、真实 Linux 部署录像或最终人工签署。
- 涉及文件：`src/gameData.js`、`src/gameRules.js`、`public/*`、`server.js`、`test/*`、`docs/*`。
- 对应验收：GATE-01、GATE-07、WORLD-01、NPC-01、NAR-02、SYS-01、AI-02、QA-01、DEV-03。
- 测试命令：`npm run validate`。
- 可视证据：浏览器打开 `http://localhost:5173`，标题页点击开始游戏后进入月铃聚落，任务/背包/暂停菜单可用。

## TASK-2026-06-26-02

- 目标：建立密钥扫描、健康检查、请求限制和 LLM 本地兜底。
- 非目标：不轮换用户已有的外部 API key。
- 涉及文件：`server.js`、`scripts/secretScan.js`、`docs/operations/DEPLOY_LINUX.md`。
- 对应验收：GATE-03、OPS-03、OPS-04、OPS-06、AI-05、AI-07。
- 测试命令：`npm run scan:secrets`，访问 `/api/health`。
- 可视证据：健康接口返回 core ok，optionalLLM 可为 not-configured。

## TASK-2026-06-26-03

- 目标：把本地可复核的验收缺口转化为自动证据，补齐截图包覆盖。
- 非目标：不声称已经完成 5 人外部试玩、真实 Linux 服务器部署、45–90 秒实机短片或最终人工签署。
- 涉及文件：`src/gameRules.js`、`public/app.js`、`server.js`、`test/*`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：GATE-06、DATA-04、SYS-01、PERF-02、OPS-05、QA-03、DEV-05、REL-05、REL-07。
- 测试命令：`npm run validate`。
- 可视证据：`docs/acceptance/screenshots/` 下 12 张当前浏览器构建 PNG；应用内浏览器复核标题页、开始游戏、进入月铃聚落、当前目标显示且 console error 为 0。

## TASK-2026-06-26-04

- 目标：补发布包装与浏览器兼容证据，避免不支持环境白屏。
- 非目标：不把 Firefox 实机流程、真人试玩、真实部署或最终签署伪装成已完成。
- 涉及文件：`public/index.html`、`public/styles.css`、`public/app.js`、`test/frontendMarkup.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：PERF-04、REL-06、QA-05、QA-08、GATE-08。
- 测试命令：`npm run validate`。
- 可视证据：无脚本、不支持模块和关键 API 缺失时显示中文兼容提示；生成 `COMPATIBILITY_REPORT.md`、`DEVELOPMENT_NOTE.md`、`01-scope-and-score.md` 和 `final-signoff.md`。

## TASK-2026-06-26-05

- 目标：补玩法回归证据，并修正自动检查暴露的入口、敌人和拾取物碰撞坐标问题。
- 非目标：不把规则级回归报告伪装成真实输入压力视频或浏览器 E2E 录像。
- 涉及文件：`src/gameData.js`、`src/gameRules.js`、`test/gameRules.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：GAME-01、GAME-03、QA-02。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/gameplay/GAMEPLAY_REGRESSION_REPORT.md` 覆盖 8 个场景、15 个出口、95 个碰撞采样点、6 类敌人各 10 次规则级战斗循环和失败重试。

## TASK-2026-06-26-06

- 目标：补齐音乐、环境声、音效和音频设置的本地实现与证据。
- 非目标：不把程序化音频报告伪装成最终真实聆听录像或外部试玩反馈。
- 涉及文件：`src/gameData.js`、`src/gameRules.js`、`public/app.js`、`public/index.html`、`test/*`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`、`docs/ASSET_LICENSES.md`。
- 对应验收：AUD-01、AUD-02、AUD-03、AUD-04、UX-07、GATE-04。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/audio/AUDIO_COVERAGE_REPORT.md` 覆盖 6 首程序化主题音乐、39 个 WebAudio 合成音效、环境层、主音量、音乐、音效和一键静音设置。

## TASK-2026-06-26-07

- 目标：补世界系统、跨区、天气、因果链和长会话一致性的自动证据。
- 非目标：不把规则级长会话报告伪装成真实浏览器 60 分钟录像或玩家试玩反馈。
- 涉及文件：`src/gameRules.js`、`test/gameRules.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：WORLD-03、WORLD-05、WORLD-07、WORLD-08、DATA-05、QA-03。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/simulation/WORLD_SYSTEMS_REPORT.md` 覆盖 30 次跨区、3 种天气、5 条因果链、60 分钟等价长会话和 120 次存档往返。

## TASK-2026-06-26-08

- 目标：补内容完整性自动证据，并修复主线集结阶段初始信任门槛过松的问题。
- 非目标：不把规则级报告伪装成真实玩家理解测试、真实视频、CI、版本标签或最终签署。
- 涉及文件：`src/gameRules.js`、`test/gameRules.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：PROD-02、PROD-04、GAME-04、GAME-05、GAME-06、GAME-07、WORLD-02、WORLD-09、NPC-03、NPC-04、NPC-07、NPC-08、NAR-03、NAR-06、NAR-07、SYS-02、SYS-03、SYS-04、DATA-02、DATA-03。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/content/CONTENT_INTEGRITY_REPORT.md` 覆盖区域玩法目的、敌人差异、成长节点、NPC 状态、关系影响、支线后果、文本长度、任务恢复、道具用途、自动保存、存档迁移和规则一致性；`AUTO_ACCEPTANCE_STATUS.md` 已覆盖检查书 128/128 个 ID。

## TASK-2026-06-26-09

- 目标：补 `SYS-05` 营地料理系统和 `DEV-07` 本地版本历史/回退证据。
- 非目标：不把本地 Git 标签伪装成远端发布标签；不把规则级料理测试伪装成真人试玩反馈。
- 涉及文件：`src/gameData.js`、`src/gameRules.js`、`public/app.js`、`test/*`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`、`.gitignore`、本地 `.git/`。
- 对应验收：SYS-05、DEV-07、QA-01、DEV-03。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/content/CONTENT_INTEGRITY_REPORT.md` 列出 5 个营地料理配方；`docs/acceptance/VERSION_CONTROL_REPORT.md` 记录 `main` 分支、提交 `52354f8`、标签 `v0.3.3-acceptance-baseline` 和非破坏式恢复检查。

## TASK-2026-06-26-10

- 目标：补 `QA-04` 视觉回归基线，让截图证据可自动比对。
- 非目标：不把本地截图基线伪装成最终人工视觉评审、移动端全量截图或外部设备兼容报告。
- 涉及文件：`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/screenshots/*`、`docs/acceptance/tests/visual/*`、`docs/acceptance/*`。
- 对应验收：QA-04、REL-05、DEV-04。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/visual/VISUAL_BASELINE_MANIFEST.json` 记录 12 张有效 PNG 的尺寸、字节数和 SHA-256；`VISUAL_REGRESSION_REPORT.md` 输出差异记录。旧的 1–6 号截图原为 JPEG/JFIF 文件头，已转换为真实 PNG。

## TASK-2026-06-26-11

- 目标：补 `UX-03` 多分辨率与 125% 缩放截图证据。
- 非目标：不把本地 Edge headless 截图伪装成移动端、Firefox 或真人无障碍审查。
- 涉及文件：`public/app.js`、`test/frontendMarkup.test.js`、`scripts/captureResponsiveScreenshots.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/ui/*`、`docs/acceptance/*`。
- 对应验收：UX-03、QA-01、REL-05。
- 测试命令：`npm run capture:responsive`、`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/ui/responsive-screenshots/` 下 3 张有效 PNG；`RESPONSIVE_SCREENSHOT_REPORT.md` 校验 1280x720、1920x1080、125% 缩放，以及 HUD、任务日志、背包和战斗覆盖。

## TASK-2026-06-26-12

- 目标：补 `DATA-02` 保存写入失败模拟，避免浏览器存储异常中断游戏。
- 非目标：不把本地模拟伪装成所有浏览器/设备的真实存储压力测试。
- 涉及文件：`src/storageSafety.js`、`public/app.js`、`test/storageSafety.test.js`、`test/frontendMarkup.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/data/*`、`docs/acceptance/*`。
- 对应验收：DATA-02、DATA-04、QA-01。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md` 模拟正常写入、配额异常和存储不可用；前端保存失败时显示中文恢复建议并返回失败状态。

## TASK-2026-06-26-13

- 目标：补 `AI-04` 传闻连续交谈重复率统计和最近记录裁剪证据。
- 非目标：不把本地规则抽样伪装成 100 条人工动态对白抽检、真实断网录像或外部玩家盲测。
- 涉及文件：`src/gameRules.js`、`test/gameRules.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/ai/*`、`docs/acceptance/*`。
- 对应验收：AI-04、NPC-06、QA-01。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/ai/RUMOR_REPETITION_REPORT.md` 记录 20 次连续传闻交谈、唯一句、主题、NPC 组合、重复率、来源/目标/日期/时段和最近 12 条记录裁剪。

## TASK-2026-06-26-14

- 目标：补 `SYS-03` 通关经济收入/支出曲线，证明基础补给价格和敌人收入闭环可持续。
- 非目标：不把规则级经济曲线伪装成真实玩家市场行为、长线数值平衡测试或外部经济评审。
- 涉及文件：`src/gameData.js`、`src/gameRules.js`、`public/app.js`、`test/gameRules.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/systems/*`、`docs/acceptance/*`。
- 对应验收：SYS-03、QA-01、DEV-03。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/systems/ECONOMY_CURVE_REPORT.md` 记录标准通关路线的敌人铜星收入、商店支出、米露支线折扣、最低余额和终局余额。

## TASK-2026-06-26-15

- 目标：补 `SYS-04` 成长升级购买、取消、重载和条件不足流程证据。
- 非目标：不把规则级流程报告伪装成真实玩家 UI 录像、手柄测试或长线成长平衡评审。
- 涉及文件：`src/gameRules.js`、`public/app.js`、`test/gameRules.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/systems/*`、`docs/acceptance/*`。
- 对应验收：SYS-04、QA-01、DEV-03。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/systems/UPGRADE_FLOW_REPORT.md` 记录取消、条件不足、购买成功、重复点击、保存重载和非法节点拒绝，前端工坊复用 `upgradeAbility` 规则。

## TASK-2026-06-26-16

- 目标：补 `ART-06` 白天、深夜、雨天和战斗密集场景的可读性截图与指标。
- 非目标：不把本地 Edge 截图伪装成外部美术评审、移动端全量测试或真人无障碍审查。
- 涉及文件：`public/app.js`、`test/frontendMarkup.test.js`、`scripts/captureReadabilityScreenshots.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/visual/*`、`docs/acceptance/*`、`package.json`。
- 对应验收：ART-06、QA-01、REL-05。
- 测试命令：`npm run capture:readability`、`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/visual/READABILITY_REPORT.md` 与 `readability-screenshots/` 记录白天、深夜、雨天、战斗密集、HUD 和任务文字覆盖，并校验 PNG 尺寸、哈希、亮度跨度、暗部比例和亮部比例。

## TASK-2026-06-26-17

- 目标：补 `PERF-05` 模型/服务端慢响应、重复点击和网络失败时的前端韧性。
- 非目标：不把本地故障注入测试伪装成最终真人断网录像或线上弱网监控。
- 涉及文件：`src/networkSafety.js`、`public/app.js`、`test/networkSafety.test.js`、`test/frontendMarkup.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/performance/*`、`docs/acceptance/*`。
- 对应验收：PERF-05、AI-05、QA-01。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/performance/NETWORK_RESILIENCE_REPORT.md` 记录传闻请求锁、1.9 秒超时、高延迟取消、重复点击拒绝、HTTP/网络失败分类和本地降级。

## TASK-2026-06-26-18

- 目标：补 `NPC-04` 关系分支回放证据，让高低信任在对白、价格、帮助、主线门槛和结局上都有可复核差异。
- 非目标：不把规则级回放伪装成真人多周目分支录像或最终人工剧情评审。
- 涉及文件：`src/gameRules.js`、`public/app.js`、`test/gameRules.test.js`、`test/frontendMarkup.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/tests/content/*`、`docs/acceptance/*`。
- 对应验收：NPC-04、NAR-04、QA-01。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md` 记录低/高信任存档下的对白、价格、支线帮助、主线集结和结局条件差异。

## TASK-2026-06-26-19

- 目标：补 `DEV-01` 与 `DEV-06` 开发过程抽查证据，证明任务记录和缺陷修复样例可复核。
- 非目标：不把本地抽查报告伪装成外部审计、CI 失败阻断或人工签署。
- 涉及文件：`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/developmentProcess.test.js`、`docs/acceptance/tests/process/*`、`docs/acceptance/*`。
- 对应验收：DEV-01、DEV-06、QA-01。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/process/DEVELOPMENT_PROCESS_REPORT.md` 抽查最近 10 个任务记录和 5 个缺陷修复样例。

## TASK-2026-06-26-20

- 目标：补 `ART-13` 发布素材证据，提供正式主视觉源文件、favicon 图标和 press kit 报告。
- 非目标：不把 SVG 源文件伪装成外部美术评审或最终商店页素材审核。
- 涉及文件：`docs/acceptance/presskit/*`、`public/favicon.svg`、`public/index.html`、`test/presskit.test.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：ART-13、REL-05、QA-01。
- 测试命令：`npm test`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/presskit/PRESSKIT_REPORT.md` 记录主视觉源文件、favicon 图标和截图包。

## TASK-2026-06-26-21

- 目标：补 `DEV-02` 开发决策记录，说明大型改动前读取现状、假设、影响范围、风险和验证。
- 非目标：不把 ADR 伪装成外部架构评审或最终发布批准。
- 涉及文件：`docs/acceptance/adr/*`、`test/developmentProcess.test.js`、`scripts/acceptanceAudit.js`、`docs/acceptance/*`。
- 对应验收：DEV-02、QA-01。
- 测试命令：`npm test`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/adr/ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md` 记录轻量版本取舍、规则层复用、自动证据边界和发布素材方案。

## TASK-2026-06-26-22

- 目标：补 `ART-11` 资产流转闭环样例，让主视觉和 favicon 可从候选、许可、试装、压缩到最终批准被抽查。
- 非目标：不把本地自制素材流转记录伪装成第三方采购凭证或外部法务审查。
- 涉及文件：`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/presskit.test.js`、`docs/acceptance/ASSET_PIPELINE.md`、`docs/acceptance/*`。
- 对应验收：ART-11、DEV-05、QA-01。
- 测试命令：`npm run audit:evidence`、`npm test`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/ASSET_PIPELINE.md` 记录主视觉和 favicon 的完整流转样例。

## TASK-2026-06-26-23

- 目标：补 `OPS-08` 备份恢复演练证据，用样例 JSON 存档验证全新槽位恢复。
- 非目标：不把浏览器存档演练伪装成服务端数据库、真实云备份或生产环境灾备演练。
- 涉及文件：`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/opsEvidence.test.js`、`docs/acceptance/tests/ops/*`、`docs/acceptance/*`。
- 对应验收：OPS-08、DATA-04、QA-01。
- 测试命令：`npm run audit:evidence`、`npm test`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md` 记录 4 组样例存档恢复到全新槽位的校验结果。

## TASK-2026-06-27-01

- 目标：补 `PERF-03` 浏览器内存曲线证据，用 Edge headless 采样标题、聚落、雨天河岸和首领战的工作集内存。
- 非目标：不把本地 headless 采样伪装成线上真实用户监控、独显压力测试或 Firefox 长会话证据。
- 涉及文件：`scripts/captureMemoryCurve.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/performanceEvidence.test.js`、`package.json`、`docs/acceptance/tests/performance/*`、`docs/acceptance/*`。
- 对应验收：PERF-03、QA-01。
- 测试命令：`npm run capture:memory`、`npm run audit:evidence`、`npm test`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/performance/MEMORY_CURVE_REPORT.md` 和 `docs/acceptance/tests/performance/memory-curve/perf03-memory-curve.png`。

## TASK-2026-06-27-02

- 目标：补浏览器流程 WebM 取证，用 Edge headless 覆盖标题菜单、暂停、键盘、跨区、天气、主角动作、NPC/敌人观察、无声反馈、浏览器 E2E 和 45-90 秒短片素材。
- 非目标：不把本地自动化视频伪装成真人外部试玩、Linux 部署录像、Firefox 兼容证据或最终人工签署。
- 涉及文件：`public/app.js`、`scripts/captureBrowserFlowEvidence.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/frontendMarkup.test.js`、`test/performanceEvidence.test.js`、`package.json`、`docs/acceptance/tests/browser/*`、`docs/acceptance/*`。
- 对应验收：PROD-01、WORLD-03、WORLD-05、UX-04、UX-08、ART-03、ART-04、ART-07、QA-02、REL-04、QA-01。
- 测试命令：`npm run capture:browser-flow`、`npm run capture:memory`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/browser/BROWSER_FLOW_REPORT.md`、`docs/acceptance/tests/browser/BROWSER_FLOW_MANIFEST.json`、`docs/acceptance/tests/browser/browser-flow-videos/*.webm` 和 `docs/acceptance/tests/browser/browser-flow-frames/*.jpg`。

## TASK-2026-06-27-03

- 目标：补 `PERF-01` 真实浏览器帧率证据，对聚落、雨天河岸、森林战斗和首领战各采样 2 分钟 rAF 帧时间。
- 非目标：不把本地 Edge headless 帧率采样伪装成线上用户监控、低端机兼容、Firefox 帧率或人工性能签署。
- 涉及文件：`scripts/captureFrameRate.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/performanceEvidence.test.js`、`package.json`、`docs/acceptance/tests/performance/*`、`docs/acceptance/*`。
- 对应验收：PERF-01、QA-01。
- 测试命令：`npm run capture:fps`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/performance/FRAME_RATE_REPORT.md`、`docs/acceptance/tests/performance/FRAME_RATE_MANIFEST.json` 和 `docs/acceptance/tests/performance/frame-rate/perf01-frame-rate.png`。

## TASK-2026-06-27-04

- 目标：补 `UX-09` 静音与色觉差异反馈检查表，证明任务、受击、错误、关系和保存不只依赖声音或颜色。
- 非目标：不把本地检查表伪装成外部无障碍专家审查、真实色弱玩家访谈或平台级可访问性认证。
- 涉及文件：`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/frontendMarkup.test.js`、`docs/acceptance/tests/ui/*`、`docs/acceptance/*`。
- 对应验收：UX-09、ART-07、QA-01。
- 测试命令：`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/ui/ACCESSIBILITY_FEEDBACK_REPORT.md` 逐项记录关闭声音、任务、受击、错误、关系、保存和色觉差异反馈通道。

## TASK-2026-06-27-05

- 目标：补 `DEV-04` 视觉迭代记录，将目标参考、差异检查和修正截图串成可复核链路。
- 非目标：不把本地视觉迭代记录伪装成外部美术总监评审、商店素材审核或付费用户审美测试。
- 涉及文件：`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/developmentProcess.test.js`、`docs/acceptance/tests/visual/*`、`docs/acceptance/*`。
- 对应验收：DEV-04、ART-01、ART-06、QA-04。
- 测试命令：`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/visual/VISUAL_ITERATION_REPORT.md` 记录 ART_BIBLE 目标、视觉基线差异、响应式/可读性修正截图、press kit 和浏览器流程帧。

## TASK-2026-06-27-06

- 目标：补 `GAME-01`、`GAME-02`、`GAME-03` 与 `NPC-07` 的真实浏览器输入录像证据，覆盖地图边缘压力、20 次交互、战斗输入和 NPC 打断恢复。
- 非目标：不把本地 Edge headless 自动化录像伪装成真人试玩、逐敌人完整人工战斗录像、Firefox 长会话或最终签署。
- 涉及文件：`scripts/captureBrowserFlowEvidence.js`、`scripts/evidenceAudit.js`、`scripts/acceptanceAudit.js`、`test/performanceEvidence.test.js`、`docs/acceptance/tests/browser/*`、`docs/acceptance/*`。
- 对应验收：GAME-01、GAME-02、GAME-03、NPC-07、QA-01。
- 测试命令：`npm run capture:browser-flow`、`npm run audit:evidence`、`npm run audit:acceptance`、`npm run validate`。
- 可视证据：`docs/acceptance/tests/browser/BROWSER_FLOW_REPORT.md`、`docs/acceptance/tests/browser/BROWSER_FLOW_MANIFEST.json` 和对应 `game01`、`game02`、`game03`、`npc07` WebM/帧截图。
