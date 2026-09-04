# 浏览器兼容与降级报告

生成时间：2026-09-02T20:43:15.841Z

## 当前支持声明

- 推荐浏览器：桌面 Chromium 或 Firefox。
- 移动端：可浏览作品页；完整操作以键盘为准。

## 已落实的降级路径

| 场景 | 状态 | 证据 |
|---|---|---|
| JavaScript 关闭 | 通过 | `<noscript>` 中文提示 |
| 不支持 ES Modules | 缺失 | `nomodule` 中文提示 |
| Canvas/localStorage/Fetch 缺失 | 通过 | `isSupportedEnvironment` 运行时探针 |
| 当前 Chromium/Edge 本地构建 | 通过 | 截图包和浏览器冒烟报告 |
| Firefox 全流程 | 待补 | 需要真实 Firefox 全新配置下前 15 分钟与存档流程 |

本报告推进 PERF-04 的“不白屏”与 Chromium 验证部分；最终签署仍需要 Firefox 实机记录。
