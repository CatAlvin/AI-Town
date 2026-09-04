# 存档兼容与导入故障报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- schema 版本：2
- 导入限制：256 KiB，JSON 存档文件。
- 正确、损坏、超大、错误类型和篡改校验路径均已覆盖。
- 已生成 4 组可复核样例存档。

## 导入故障矩阵

| 场景 | 结果 | 说明 |
|---|---|---|
| 有效 JSON 导入 | 通过 | 校验通过 |
| 损坏 JSON 拒绝 | 通过 | 已拒绝：存档 JSON 无效 |
| 超大文件拒绝 | 通过 | 已拒绝：存档文件过大 |
| 错误类型拒绝 | 通过 | 已拒绝：存档文件类型不支持 |
| 篡改校验拒绝 | 通过 | 已拒绝：区域不存在 |

## 样例存档

| 样例 | 文件 | 主线 | 地点 | 结局 |
|---|---|---:|---|---|
| 新游戏 | `docs/acceptance/saves/slot-1-new-game.json` | 0/6 | 月铃聚落 | 未触发 |
| 河岸中段 | `docs/acceptance/saves/slot-2-midgame-river.json` | 2/6 | 月露河岸 | 未触发 |
| 终局首领前 | `docs/acceptance/saves/slot-3-boss-ready.json` | 5/6 | 月铃塔顶 | 未触发 |
| 暖月结局后 | `docs/acceptance/saves/slot-4-warm-ending.json` | 6/6 | 月铃塔顶 | 暖月齐鸣 |
