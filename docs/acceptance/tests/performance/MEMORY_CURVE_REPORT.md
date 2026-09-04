# 浏览器内存曲线报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 状态：通过
- 来源命令：`npm run capture:memory`
- 浏览器：Microsoft Edge headless
- 采样点：32
- 峰值工作集：1089.05 MiB
- 曲线截图：`docs/acceptance/tests/performance/memory-curve/perf03-memory-curve.png`

## 场景采样

| 场景 | 采样点 | 最低工作集 | 最高工作集 | 状态 |
|---|---:|---:|---:|---|
| 标题页 | 8 | 886.79 MiB | 1035.10 MiB | 通过 |
| 聚落 HUD | 8 | 937.99 MiB | 1089.05 MiB | 通过 |
| 雨天河岸 | 8 | 933.53 MiB | 1040.07 MiB | 通过 |
| 首领战 | 8 | 836.27 MiB | 1038.48 MiB | 通过 |

## 曲线截图校验

| 文件 | 尺寸 | 大小 | SHA-256 | 状态 |
|---|---:|---:|---|---|
| `docs/acceptance/tests/performance/memory-curve/perf03-memory-curve.png` | 1280x720 | 352.1 KiB | `d31f3166b6c7...` | 通过 |
