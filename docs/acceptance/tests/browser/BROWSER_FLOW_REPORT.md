# 浏览器流程取证报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 状态：通过
- 来源命令：`npm run capture:browser-flow`
- 浏览器：Microsoft Edge headless + DevTools Protocol
- 视频段数：14
- 覆盖标签：14/14
- 短片时长：0:47

## 要求矩阵

| 要求 | 状态 |
|---|---|
| 标题/菜单/结局返回 | 通过 |
| 暂停与恢复 | 通过 |
| 纯键盘菜单/存档 | 通过 |
| 跨区浏览器加载 | 通过 |
| 天气/时段视觉 | 通过 |
| 主角动作 | 通过 |
| NPC/敌人观察 | 通过 |
| 无声反馈 | 通过 |
| 浏览器 E2E | 通过 |
| 地图边缘/窄门压力 | 通过 |
| 交互堆叠 20 次 | 通过 |
| 战斗真实输入 | 通过 |
| NPC 打断与切图恢复 | 通过 |
| 45-90 秒短片 | 通过 |
| WebM 文件、帧截图与哈希 | 通过 |

## 视频清单

| 场景 | WebM | 时长 | 帧数 | 输入事件 | 覆盖标签 | 校验 |
|---|---|---:|---:|---:|---|---|
| PROD-01 标题菜单与结局返回标题 | `docs/acceptance/tests/browser/browser-flow-videos/prod01-title-menu-ending.webm` | 0:12 | 14 | 0 | title-menu-ending、title、settings、credits、ending | 通过 |
| UX-04 战斗中暂停与恢复 | `docs/acceptance/tests/browser/browser-flow-videos/ux04-pause-combat.webm` | 0:06 | 7 | 3 | pause、combat、resume | 通过 |
| UX-08 纯键盘移动、菜单与存档 | `docs/acceptance/tests/browser/browser-flow-videos/ux08-keyboard-menu-save.webm` | 0:09 | 10 | 9 | keyboard、save、menu | 通过 |
| WORLD-03 浏览器跨区加载时间轴 | `docs/acceptance/tests/browser/browser-flow-videos/world03-cross-area-browser.webm` | 0:04 | 5 | 0 | cross-area、loading、world | 通过 |
| WORLD-05 天气与时段视觉/玩法证据 | `docs/acceptance/tests/browser/browser-flow-videos/world05-weather-browser.webm` | 0:03 | 4 | 0 | weather、rain、fog、night | 通过 |
| ART-03 主角移动、攻击、闪避动作 | `docs/acceptance/tests/browser/browser-flow-videos/art03-player-actions.webm` | 0:04 | 5 | 3 | player-animation、move、attack、dodge | 通过 |
| ART-04 NPC 与敌人 30 秒观察摘要 | `docs/acceptance/tests/browser/browser-flow-videos/art04-npc-enemy-observation.webm` | 0:30 | 4 | 0 | npc-enemy、npc、enemy、observation | 通过 |
| ART-07 无声操作文字/画面反馈 | `docs/acceptance/tests/browser/browser-flow-videos/art07-muted-feedback.webm` | 0:05 | 6 | 2 | muted-feedback、feedback、combat、save | 通过 |
| QA-02 浏览器端新游戏/保存/继续流程 | `docs/acceptance/tests/browser/browser-flow-videos/qa02-browser-e2e.webm` | 0:07 | 8 | 2 | browser-e2e、new-game、save-load | 通过 |
| REL-04 45-90 秒实机短片素材 | `docs/acceptance/tests/browser/browser-flow-videos/rel04-trailer-60s.webm` | 0:47 | 10 | 0 | trailer、release-video、portfolio | 通过 |
| GAME-01 地图边缘、窄门与碰撞压力 | `docs/acceptance/tests/browser/browser-flow-videos/game01-map-edge-pressure.webm` | 0:05 | 6 | 6 | map-edge-pressure、movement、collision、real-input | 通过 |
| GAME-02 交互目标堆叠与 20 次真实交互 | `docs/acceptance/tests/browser/browser-flow-videos/game02-interaction-stack-20.webm` | 0:08 | 9 | 21 | interaction-stack、interact、repeat-20、real-input | 通过 |
| GAME-03 战斗真实输入压力 | `docs/acceptance/tests/browser/browser-flow-videos/game03-combat-input.webm` | 0:05 | 6 | 33 | combat-input、combat、enemy-input、real-input | 通过 |
| NPC-07 对话打断、切图与恢复 | `docs/acceptance/tests/browser/browser-flow-videos/npc07-interrupt-recovery.webm` | 0:05 | 6 | 6 | npc-recovery、npc、interrupt、real-input | 通过 |
