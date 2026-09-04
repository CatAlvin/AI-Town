# QA 冒烟报告

日期：2026-06-26

## 自动化

命令：

```bash
npm run validate
```

结果：

- `node --test`：49 项通过
- `scan:secrets`：通过
- `audit:deps`：0 vulnerabilities
- `audit:production`：通过
- `capture:readability`：用 Microsoft Edge headless 生成白天、深夜、雨天和战斗密集可读性截图
- `capture:responsive`：用 Microsoft Edge headless 生成 1280x720、1920x1080 和 125% 缩放截图
- `audit:evidence`：生成构建、性能、内存曲线、网络韧性、音频覆盖、玩法回归、世界系统、内容完整性、关系分支、开发过程、发布素材、备份恢复、传闻重复率、经济曲线、成长升级流程、存档、存储失败模拟、模拟、日志、截图、视觉基线、极端可读性、响应式截图和资产流转证据
- `audit:acceptance`：生成自动验收状态报告，覆盖检查书 128/128 个 ID，当前 83 pass / 45 partial / 0 missing

覆盖：

- 规则级 E2E：新游戏、教学任务、跨区、战斗、任务更新、保存、加载、结局
- API 安全：健康检查、无 LLM 降级、非法 JSON 400、超大请求 413、频率限制 429 和错误脱敏
- 网络韧性：传闻请求锁、1.9 秒超时、高延迟取消、重复点击拒绝、HTTP/网络失败分类和本地降级
- 内容规模最低线
- 黄金路径无 LLM 通关
- 双结局条件
- 存档迁移与校验
- 存档导入故障：正确、损坏、超大、错误类型、篡改校验
- 存储写入故障：正常写入、配额异常、存储不可用和前端中文失败提示
- 备份恢复演练：4 组样例 JSON 存档恢复到全新槽位并校验 checksum、主线、地点和结局
- 经济曲线：敌人铜星收入、商店支出、支线折扣、最低余额和终局余额
- 成长升级流程：取消、条件不足、购买成功、重复点击、保存重载和非法节点拒绝
- 背包使用、满包反馈、失败重试
- LLM 传闻 schema 校验与本地兜底
- 传闻连续交谈：20 次生成、来源/目标/日期/时段、唯一句、NPC 组合、重复率和最近 12 条记录裁剪
- 20 个随机种子、3 个游戏日世界模拟
- 世界系统回归：30 次跨区、3 种天气、5 条因果链、60 分钟等价长会话、120 次存档往返
- 浏览器内存曲线：Edge headless 对标题、聚落、雨天河岸和首领战采样 32 个工作集点，并生成 PNG 曲线图
- 内容完整性回归：区域玩法目的、敌人差异、成长节点、NPC 状态、关系影响、支线后果、文本长度、任务恢复、道具用途、营地料理、自动保存、存档迁移和规则一致性
- 关系分支回放：低/高信任存档分别验证对白、价格、支线帮助、主线集结和结局条件
- 开发过程抽查：最近 10 个任务记录的六字段完整性和 5 个缺陷修复样例的复现、测试、根因、修复、回归
- 开发决策记录：ADR 记录读取现状、假设、影响范围、风险和验证边界
- 发布素材：主视觉源文件、favicon 图标和 12 张作品集截图包
- 资产流转闭环：主视觉和 favicon 覆盖候选、许可审查、风格试装、尺寸统一、压缩、整合、截图对比和最终批准
- 玩法回归：8 个场景、15 个出口、95 个碰撞采样点、6 类敌人各 10 次规则级战斗循环和失败重试
- 音频覆盖：6 首程序化主题音乐、39 个 WebAudio 合成音效、5 类音效覆盖、主音量/音乐/音效/静音设置
- 结构化脱敏日志和版本元数据
- 首包关键文件体积估算
- 无脚本、不支持模块和关键浏览器 API 缺失时的中文兼容提示标记
- 设置项与可访问性：主音量、音乐、音效、静音、文字速度、亮度、屏幕震动、降低动态效果、难度、字号、全屏入口和独立持久化
- 视觉回归：12 张截图均为有效 PNG，记录尺寸、字节数和 SHA-256，后续审计会对比既有基线并输出差异
- 极端可读性：白天、深夜、雨天、战斗密集截图，记录亮度跨度、暗部比例和亮部比例
- 响应式截图：1280x720、1920x1080、125% 缩放，覆盖 HUD、任务日志、背包和战斗画面

## 浏览器冒烟

地址：`http://localhost:5174`

已检查：

- 标题页加载，无长时间空白。
- `开始游戏` 进入月铃聚落。
- Canvas 场景、主角、NPC、地标、HUD 渲染正常。
- 任务日志、背包、暂停菜单均可打开。
- 存档管理显示 3 个槽位；已保存槽位显示主线进度、地点、游玩时长和保存时间。
- console error：0。
- `/api/health` 返回核心服务 OK，可选 LLM 未配置但不影响运行。
- `/api/status` 返回版本 `0.3.3`、构建日期和提交标识字段。
- 已生成 12 张浏览器实机 PNG 截图到 `docs/acceptance/screenshots/`，覆盖标题、聚落、野外、天气、对话/日志、战斗、首领和结局。
- 已生成视觉回归基线 `docs/acceptance/tests/visual/VISUAL_BASELINE_MANIFEST.json` 和差异报告 `docs/acceptance/tests/visual/VISUAL_REGRESSION_REPORT.md`。
- 已生成极端可读性截图到 `docs/acceptance/tests/visual/readability-screenshots/`，并由 `READABILITY_REPORT.md` 校验白天、深夜、雨天、战斗密集、HUD 与文字覆盖。
- 已生成 `docs/acceptance/tests/performance/NETWORK_RESILIENCE_REPORT.md`，覆盖传闻请求慢响应、重复点击和失败降级。
- 已生成 `docs/acceptance/tests/performance/MEMORY_CURVE_REPORT.md` 和 `memory-curve/perf03-memory-curve.png`，覆盖浏览器内存曲线截图。
- 已生成 3 张响应式 PNG 截图到 `docs/acceptance/tests/ui/responsive-screenshots/`，并由 `RESPONSIVE_SCREENSHOT_REPORT.md` 校验尺寸和覆盖界面。
- 已生成 `docs/acceptance/tests/data/STORAGE_FAILURE_REPORT.md`，覆盖 localStorage 配额异常和存储不可用时的保存失败提示。
- 已生成 `docs/acceptance/tests/ops/BACKUP_RESTORE_REPORT.md`，覆盖样例存档备份与全新槽位恢复。
- 已生成 `docs/acceptance/tests/ai/RUMOR_REPETITION_REPORT.md`，覆盖连续 20 次传闻交谈的重复率和最近记录裁剪。
- 已生成 `docs/acceptance/tests/content/RELATIONSHIP_BRANCH_REPORT.md`，覆盖低/高信任存档下的对白、价格、支线帮助、主线集结和结局条件。
- 已生成 `docs/acceptance/tests/process/DEVELOPMENT_PROCESS_REPORT.md`，覆盖任务记录抽样和缺陷修复样例。
- 已生成 `docs/acceptance/adr/ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md`，记录大型改动的现状、假设、影响范围、风险和验证。
- 已生成 `docs/acceptance/presskit/PRESSKIT_REPORT.md`，覆盖主视觉源文件、favicon 图标和作品集截图包。
- `docs/acceptance/ASSET_PIPELINE.md` 已记录主视觉和 favicon 的完整流转样例。
- 已生成 `docs/acceptance/tests/systems/ECONOMY_CURVE_REPORT.md`，覆盖标准通关路线收入、支出、折扣和余额。
- 已生成 `docs/acceptance/tests/systems/UPGRADE_FLOW_REPORT.md`，覆盖成长升级购买、取消、重复点击、条件不足和重载保持。
- 已准备外部试玩协议、试玩记录表、问题闭环模板和 60 秒短片分镜。
- 应用内浏览器复核正常入口：标题页、开始游戏、进入月铃聚落、当前目标显示，console error 为 0。
- 版本 `0.3.3` 增加程序化主题音乐、音效覆盖和音频设置；Firefox 实机流程仍待最终验收补证。

## 本轮发现并修复

| 问题 | 根因 | 修复 |
|---|---|---|
| 标题按钮无法点击 | `.modal-layer` 的 `display: grid` 覆盖 `hidden`，透明模态层拦截点击。 | CSS 末尾增加 `[hidden]` 强覆盖，并给资源链接加版本参数。 |
| 密钥扫描误报 | 扫描器大小写不敏感，误把 `apiKey` 变量当作环境密钥。 | 只匹配全大写 KEY/TOKEN/SECRET 环境变量。 |
| 服务端兜底传闻空状态报错风险 | `createLocalRumor` 假定 state.time 存在。 | 空状态自动使用新游戏默认状态。 |
| 存档导入故障缺少规则层复用 | 前端直接解析文件，自动测试无法覆盖 UI 错误路径。 | 新增 `parseImportedSave` 并在前端导入、单元测试和证据报告中复用。 |
| 版本和日志证据不够可复核 | `/api/status` 未暴露构建日期/提交标识，日志字段缺少自动断言。 | 服务端补版本元数据；API 测试断言结构化日志字段和脱敏。 |
| 不支持环境可能停留在加载态 | 旧浏览器、禁用脚本或缺少关键 API 时没有统一中文兜底提示。 | 新增 `noscript`、`nomodule` 与运行时能力探针，并用前端标记测试锁住。 |
| 部分入口、敌人和拾取物压到碰撞区 | 新增玩法回归检查发现工坊/月铃塔入口、森林敌人、遗迹拾取物和工坊返回落点过于贴近建筑碰撞体。 | 调整坐标并新增 `runGameplayRegression`，每次测试覆盖出口交互站位、碰撞采样、敌人出生点、战斗循环和失败重试。 |
| 音频覆盖不足 | 清单要求 4 首以上音乐与 25 个以上音效，旧版本只有少量单音调反馈。 | 新增 6 首 WebAudio 程序化主题、39 个音效、环境层和主音量/音乐/音效/静音设置，并生成 `AUDIO_COVERAGE_REPORT.md`。 |
| 世界系统长会话证据偏弱 | 跨区、天气、因果链和 60 分钟一致性此前主要依赖分散测试与人工说明。 | 新增 `runWorldSystemsRegression` 和 `WORLD_SYSTEMS_REPORT.md`，覆盖 30 次跨区、3 种天气、5 条因果链、60 分钟等价会话和 120 次存档往返。 |
| 主线集结门槛过松 | 新游戏初始总信任已超过阶段 5 的 18 点门槛，可能让“完成居民委托或建立关系”失去意义。 | 初始 NPC 信任从 3/4/5 调整为 1/2，并新增 `runContentIntegrityRegression` 验证无支线时阶段 5 会阻挡、完成 2 条支线后可恢复推进。 |
| 大量已实现清单项未进入自动状态报告 | 128 个验收 ID 中此前只有 54 个进入自动报告，未覆盖项容易被遗漏。 | `AUTO_ACCEPTANCE_STATUS.md` 现在覆盖 128/128 个 ID，并新增 `CONTENT_INTEGRITY_REPORT.md` 支撑产品、玩法、NPC、叙事、系统和数据项。 |
| 缺少配方/营地系统 | `SYS-05` 要求不超过 6 个简单配方或等价营地系统，旧版本未实现。 | 新增 5 个按章节开放的营地料理配方，旅店壁炉可休息和制作；规则测试覆盖未解锁、材料不足、制作成功和自动保存。 |
| 缺少版本历史与回退证据 | `DEV-07` 要求分支、提交、标签可回退，旧目录不是 Git 仓库。 | 初始化本地 Git 仓库，创建 `main` 分支基线提交 `52354f8` 与标签 `v0.3.3-acceptance-baseline`，并生成 `VERSION_CONTROL_REPORT.md`。 |
| 前 6 张截图扩展名与真实格式不一致 | 文件名为 `.png`，但文件头是 JPEG/JFIF，导致视觉回归不能读取 PNG 尺寸。 | 将 1–6 号截图转换为真实 PNG，并新增尺寸、字节数和 SHA-256 基线审计。 |
| 多分辨率与 125% 缩放缺少实机截图 | `UX-03` 已有基础截图，但没有固定分辨率和缩放证据。 | 新增作品集取景 `panel` 参数与 `capture:responsive` 脚本，生成 1280x720、1920x1080 和 125% 缩放截图。 |
| 保存写入失败会抛出浏览器异常 | `saveActive` 直接写 `localStorage`，未模拟配额或隐私模式写入失败。 | 新增 `writeSaveToStorage` 共享函数、失败测试和 `STORAGE_FAILURE_REPORT.md`，保存失败时显示中文恢复建议且不中断。 |
| 备份恢复缺少演练记录 | 部署取证模板预留了备份章节，但没有当前浏览器存档数据的实际恢复样例。 | 新增 `BACKUP_RESTORE_REPORT.md` 和 `opsEvidence.test.js`，将 4 组样例存档恢复到全新槽位并校验状态。 |
| 浏览器内存曲线缺少截图 | `PERF-03` 只有规则级 60 分钟等价会话，没有真实浏览器进程内存曲线。 | 新增 `capture:memory`、`MEMORY_CURVE_REPORT.md` 和 PNG 曲线图，采样 Edge headless 工作集内存。 |
| 传闻连续交谈缺少重复率统计 | `AI-04` 只验证了单次 schema 和本地兜底，缺少连续 20 次对话的量化证据。 | 本地传闻模板加入区域、时段、天气和 NPC 组合变化，`applyRumor` 裁剪最近 12 条，并新增 `RUMOR_REPETITION_REPORT.md`。 |
| 通关经济曲线缺少收入/支出闭环 | 商店价格只在前端计算，击败敌人没有铜星收入，无法自动证明补给支出可持续。 | 敌人增加铜星奖励，商店购买进入规则层，并新增 `ECONOMY_CURVE_REPORT.md` 验证收入、支出、折扣和终局余额。 |
| 成长升级缺少规则级流程证据 | 工坊升级购买逻辑只在前端，条件不足、取消、重复点击和重载保持无法统一验证。 | 新增 `upgradeAbility` 共享规则和 `UPGRADE_FLOW_REPORT.md`，前端工坊按钮复用同一套判定。 |
| 极端场景可读性缺少截图证据 | `ART-06` 只有亮度设置和天气规则，没有白天、深夜、雨天、战斗密集截图与指标。 | 新增 `capture:readability`、作品集取证参数和 `READABILITY_REPORT.md`，校验 PNG 尺寸、哈希和亮度分布。 |
| 模型/服务端慢请求缺少前端请求锁 | 传闻请求依赖后端超时，但前端没有重复点击锁和本地超时分类。 | 新增 `networkSafety` 共享模块、传闻请求锁、1.9 秒超时、本地降级提示和 `NETWORK_RESILIENCE_REPORT.md`。 |
| 关系分支缺少不同存档回放证据 | NPC 对话和主线关系门槛缺少统一规则层回放，难以证明高低信任会产生可见差异。 | 新增 `getNpcDialogueLine` 共享规则和 `RELATIONSHIP_BRANCH_REPORT.md`，回放对白、价格、支线帮助、主线集结和结局条件。 |
| 开发过程缺少可抽查样例 | 任务记录和缺陷修复分散在日志与 QA 报告中，不能直接证明 DEV-01/DEV-06 抽样要求。 | 新增 `DEVELOPMENT_PROCESS_REPORT.md` 和 `developmentProcess.test.js`，抽查 10 个任务字段和 5 个缺陷修复样例。 |
| 发布素材缺少正式源文件 | 截图包已存在，但 ART-13 仍缺主视觉源文件和图标。 | 新增 `key-art-source.svg`、`favicon.svg`、HTML favicon 引用和 `PRESSKIT_REPORT.md`。 |
| 大型改动缺少 ADR 复核 | 开发说明和任务日志记录了边界，但缺少集中说明现状、假设和影响范围的决策记录。 | 新增 `ADR-2026-06-26-ACCEPTANCE-EVIDENCE.md`，覆盖轻量版本取舍、规则层复用、自动证据边界和发布素材方案。 |
| 资产流转缺少可抽查完整样例 | 旧版只有未来流程说明，缺少任一最终素材从候选到批准的闭环记录。 | `ASSET_PIPELINE.md` 新增主视觉和 favicon 的完整流转样例，`presskit.test.js` 锁定关键字段。 |
