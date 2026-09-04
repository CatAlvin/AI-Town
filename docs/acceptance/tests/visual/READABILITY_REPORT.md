# 极端场景可读性报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 状态：通过
- 来源命令：`npm run capture:readability`
- 浏览器：Microsoft Edge headless
- 覆盖目标：白天、深夜、雨天、战斗特效密集、HUD 和任务文字。
- 像素门槛：亮度跨度不低于 42，暗部比例不高于 0.82，亮部比例不低于 0.006。

## 要求矩阵

| 要求 | 状态 |
|---|---|
| 白天场景 | 通过 |
| 深夜/低亮度 | 通过 |
| 雨天天气 | 通过 |
| 战斗特效密集 | 通过 |
| HUD 与文字 | 通过 |
| PNG 尺寸与像素可读性 | 通过 |
| 截图互不重复 | 通过 |

## 截图清单

| 文件 | PNG 尺寸 | 覆盖 | 亮度跨度 | 暗部比例 | 亮部比例 | 校验 |
|---|---:|---|---:|---:|---:|---|
| `docs/acceptance/tests/visual/readability-screenshots/art06-daylight-hud.png` | 1366x768 | daylight、hud、interaction、combat | 120.38 | 0.0002 | 0.3774 | 通过 |
| `docs/acceptance/tests/visual/readability-screenshots/art06-night-fog-boss.png` | 1366x768 | night、fog、boss、hud | 148.1 | 0.0002 | 0.3735 | 通过 |
| `docs/acceptance/tests/visual/readability-screenshots/art06-rain-quest-text.png` | 1366x768 | rain、quest、text、hud | 129.21 | 0.0012 | 0.5051 | 通过 |
| `docs/acceptance/tests/visual/readability-screenshots/art06-dense-combat-warning.png` | 1366x768 | combat、warning、enemy、hud | 148.63 | 0.0002 | 0.3756 | 通过 |
