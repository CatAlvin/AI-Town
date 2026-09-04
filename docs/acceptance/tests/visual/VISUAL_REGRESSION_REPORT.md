# 视觉回归基线报告

生成时间：2026-09-02T20:43:15.841Z

| 项目 | 状态 |
|---|---|
| 结论 | 通过 |
| 基线模式 | 对比既有基线 |
| 截图数量 | 13 |
| 覆盖面 | 7/7 |
| 最小尺寸门槛 | 320x180 |
| 比对字段 | 文件名、尺寸、字节数、SHA-256 |

## 当前截图

| 文件 | 尺寸 | 大小 | SHA-256 | 状态 |
|---|---:|---:|---|---|
| `docs/acceptance/screenshots/01-title.png` | 1264x720 | 276.5 KiB | `879d2b363487...` | 一致 |
| `docs/acceptance/screenshots/02-settings.png` | 1264x720 | 262.3 KiB | `0e9dbe9ef3b2...` | 一致 |
| `docs/acceptance/screenshots/03-village.png` | 1264x720 | 302.0 KiB | `00d9dac74f02...` | 一致 |
| `docs/acceptance/screenshots/04-quest-log.png` | 1264x720 | 328.8 KiB | `f7fa7a512680...` | 一致 |
| `docs/acceptance/screenshots/05-inventory.png` | 1264x720 | 258.8 KiB | `b31fe93fb9d7...` | 一致 |
| `docs/acceptance/screenshots/06-save-slots.png` | 1264x720 | 300.5 KiB | `370051fd0a32...` | 一致 |
| `docs/acceptance/screenshots/07-forest-combat.png` | 1280x720 | 111.3 KiB | `a992aece7b20...` | 一致 |
| `docs/acceptance/screenshots/08-river-weather.png` | 1280x720 | 121.3 KiB | `acc3eac0b03e...` | 一致 |
| `docs/acceptance/screenshots/09-ruins-boss.png` | 1280x720 | 106.9 KiB | `682c91ed18a1...` | 一致 |
| `docs/acceptance/screenshots/10-moonspire-boss.png` | 1280x720 | 107.1 KiB | `4443f97ba4f7...` | 一致 |
| `docs/acceptance/screenshots/11-ending.png` | 1280x720 | 114.7 KiB | `b84d0325bd23...` | 一致 |
| `docs/acceptance/screenshots/12-title-audio-v033.png` | 1280x720 | 109.3 KiB | `5ff060b07cb3...` | 一致 |
| `docs/acceptance/screenshots/ai-town-autonomous.png` | 1280x900 | 156.5 KiB | `c371f267b012...` | 一致 |

## 差异记录

| 类型 | 文件 | 说明 |
|---|---|---|
| 无 | 全部截图 | 与基线一致或正在首次写入基线 |

## 使用方式

- 常规验证：运行 `npm run audit:evidence`，脚本会对比当前截图与已提交的视觉基线。
- 接受新的截图基线：确认差异合理后运行 `node scripts/evidenceAudit.js --update-visual-baseline`，再提交更新后的 manifest 与报告。
