# 备份恢复演练报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 状态：通过
- 备份集：4 个样例存档
- 恢复目标：模拟全新实例的 4 个新槽位
- 校验方式：JSON 导入限制、schema 迁移、checksum、主线阶段、地点和结局一致性

当前版本没有服务端数据库；持久进度主要保存在浏览器 localStorage 的 JSON 存档中。本演练使用已提交的样例存档作为备份集，删除原槽位状态后按导入流程恢复到新槽位，并验证恢复后的状态可被规则层读取。

## 恢复矩阵

| 恢复槽位 | 样例 | 备份文件 | 主线 | 地点 | 结局 | 备份 SHA-256 | 状态 |
|---|---|---|---:|---|---|---|---|
| restored-slot-1 | 新游戏 | `docs/acceptance/saves/slot-1-new-game.json` | 0/6 | 月铃聚落 | 未触发 | `24d61723537a...` | 通过 |
| restored-slot-2 | 河岸中段 | `docs/acceptance/saves/slot-2-midgame-river.json` | 2/6 | 月露河岸 | 未触发 | `0522facaca54...` | 通过 |
| restored-slot-3 | 终局首领前 | `docs/acceptance/saves/slot-3-boss-ready.json` | 5/6 | 月铃塔顶 | 未触发 | `f0c5bac9f60d...` | 通过 |
| restored-slot-4 | 暖月结局后 | `docs/acceptance/saves/slot-4-warm-ending.json` | 6/6 | 月铃塔顶 | 暖月齐鸣 | `5d38c809a2b0...` | 通过 |

## 恢复步骤

1. 导出或复制 JSON 存档文件作为备份。
2. 在全新实例中清空原 localStorage 槽位。
3. 使用导入流程读取备份 JSON，执行 schema 迁移与 checksum 校验。
4. 写入新的槽位并加载，确认章节、地点、结局和关键状态一致。
