# 响应式与缩放截图报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 状态：通过
- 来源命令：`npm run capture:responsive`
- 浏览器：Microsoft Edge headless
- 覆盖目标：1280x720、1920x1080、125% 缩放，以及 HUD、任务日志、背包和战斗画面。

## 要求矩阵

| 要求 | 状态 |
|---|---|
| 1280x720 | 通过 |
| 1920x1080 | 通过 |
| 125% 缩放 | 通过 |
| HUD/任务/背包/战斗覆盖 | 通过 |
| 文件尺寸与 PNG 校验 | 通过 |

## 截图清单

| 文件 | CSS 视口 | 设备缩放 | PNG 尺寸 | 覆盖界面 | 校验 |
|---|---:|---:|---:|---|---|
| `docs/acceptance/tests/ui/responsive-screenshots/ux03-1280x720-hud-combat.png` | 1280x720 | 1 | 1280x720 | hud、combat | 通过 |
| `docs/acceptance/tests/ui/responsive-screenshots/ux03-1920x1080-quest.png` | 1920x1080 | 1 | 1920x1080 | hud、quest | 通过 |
| `docs/acceptance/tests/ui/responsive-screenshots/ux03-1280x720-scale125-inventory.png` | 1280x720 | 1.25 | 1600x900 | hud、inventory、combat | 通过 |
