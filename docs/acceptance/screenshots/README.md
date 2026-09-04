# 截图包

生成日期：2026-06-26

这些 PNG 来自当前本地浏览器构建 `http://localhost:5174`，用于推进 `REL-05` 的作品集截图证据。新增的取景 URL 由当前游戏规则生成合法场景状态，并使用真实浏览器渲染 Canvas 后截图。

| 文件 | 内容 |
|---|---|
| `01-title.png` | 作品首页和开始游戏入口 |
| `02-settings.png` | 设置菜单 |
| `03-village.png` | 月铃聚落实机画面 |
| `04-quest-log.png` | 任务日志 |
| `05-inventory.png` | 背包界面 |
| `06-save-slots.png` | 三槽位存档管理 |
| `07-forest-combat.png` | 绒火森林战斗画面 |
| `08-river-weather.png` | 月露河岸细雨天气 |
| `09-ruins-boss.png` | 星骨遗迹小头目画面 |
| `10-moonspire-boss.png` | 月铃塔顶终局首领画面 |
| `11-ending.png` | 结局弹窗与返回标题入口 |

当前截图包覆盖标题、聚落、野外、天气、对话/日志、战斗、首领和结局，满足 `REL-05` 的截图覆盖要求。

`UX-03` 的多分辨率与缩放证据位于 `docs/acceptance/tests/ui/responsive-screenshots/`，由 `npm run capture:responsive` 生成，覆盖 1280x720、1920x1080 和 125% 缩放。
