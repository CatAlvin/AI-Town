# 视觉迭代记录

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 状态：通过
- 目标参考：`docs/design/ART_BIBLE.md`
- 差异检查：视觉基线、响应式截图、极端可读性截图、浏览器流程帧。
- 修正证据：panel 取景、天气/亮度覆盖、press kit 主视觉、视觉基线 manifest 和 WebM 帧截图。

## 目标参考矩阵

| 目标 | 状态 | 证据 |
|---|---|---|
| 镜头与比例 | 通过 | ART_BIBLE 规定 2D 俯视角、角色和地标比例。 |
| 色板与 UI 材质 | 通过 | ART_BIBLE 规定主色、辅色、羊皮纸/木牌/铜铃 UI。 |
| 禁用风格 | 通过 | ART_BIBLE 明确禁止占位图、默认灰按钮和未经授权素材。 |
| 基准截图 | 通过 | 13 张截图覆盖 7/7 类画面。 |
| 极端可读性 | 通过 | 白天、深夜、雨天、战斗密集、HUD 与文字截图均通过亮度指标。 |
| 响应式截图 | 通过 | 1280x720、1920x1080 和 125% 缩放截图通过。 |
| 发布素材 | 通过 | Press kit 报告记录主视觉源文件、favicon 和截图包。 |
| 浏览器流程帧 | 通过 | 浏览器流程报告提供 WebM 与逐步帧截图哈希。 |

## 逐次迭代记录

| 迭代 | 目标 | 差异/风险 | 修正动作 | 证据 |
|---|---|---|---|---|
| VIS-01 | 建立非默认游戏 UI 和 Furry 中世纪视觉目标。 | 早期只有运行态截图，缺少可引用的目标风格说明。 | 将镜头、色板、角色、UI 材质和禁用风格写入 ART_BIBLE。 | `docs/design/ART_BIBLE.md`、`docs/acceptance/screenshots/01-title.png`。 |
| VIS-02 | 让主界面、任务、背包和战斗在多分辨率下可扫读。 | 基础截图包不能证明 1920x1080 或 125% 缩放下无裁切。 | 新增固定 panel 取景和响应式截图取证。 | `RESPONSIVE_SCREENSHOT_REPORT.md`、`responsive-screenshots/*.png`。 |
| VIS-03 | 雨天、深夜和战斗特效密集时 HUD 与任务文字仍可读。 | 普通截图无法覆盖暗部、雨天和高亮特效叠加。 | 新增天气、时段和亮度覆盖参数，生成极端可读性截图。 | `READABILITY_REPORT.md`、`readability-screenshots/*.png`。 |
| VIS-04 | 发布素材可从源文件、图标到截图包追溯。 | 截图包足以看画面，但缺少正式主视觉源文件和图标流转记录。 | 补 press kit 主视觉 SVG、favicon 链接和素材流转样例。 | `PRESSKIT_REPORT.md`、`presskit/key-art-source.svg`。 |
| VIS-05 | 截图变化可自动对比，避免视觉修正回退。 | 人工肉眼查看截图无法稳定发现文件尺寸或哈希变化。 | 生成视觉基线 manifest，记录文件名、尺寸、字节数和 SHA-256。 | `VISUAL_REGRESSION_REPORT.md`、`VISUAL_BASELINE_MANIFEST.json`。 |
| VIS-06 | 真实浏览器流程里的菜单、暂停、天气、动作和结局画面可回放。 | 静态截图不能证明状态切换过程中的视觉连贯性。 | 新增浏览器流程 WebM 与逐步帧截图哈希。 | `BROWSER_FLOW_REPORT.md`、`browser-flow-frames/*.jpg`。 |

## 边界

本报告证明当前本地构建已有可复核的目标参考、差异检查和修正截图链路；它不替代外部美术总监评审或商店素材审核。
