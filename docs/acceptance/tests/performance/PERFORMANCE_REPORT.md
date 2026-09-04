# 加载与资源体积报告

生成时间：2026-09-02T20:43:15.841Z

## 结论

- 首次可交互关键文件估算：191.3 KiB，低于 25 MB 首包建议。
- 当前无外部图片、字体、音乐或音效文件，Canvas 美术与 WebAudio 音效由运行时代码生成。
- 运行时 JS/CSS/HTML 总量：321.7 KiB。
- 本报告覆盖 PERF-02 的静态体积预算；真实网络瀑布和长时间 FPS 仍需浏览器/服务器实测截图补充。

## 首次加载关键文件

| 文件 | 大小 | 说明 |
|---|---:|---|
| `public/index.html` | 9.4 KiB | 首次进入会加载 |
| `public/styles.css` | 7.7 KiB | 首次进入会加载 |
| `public/app.js` | 70.7 KiB | 首次进入会加载 |
| `src/gameData.js` | 30.4 KiB | 首次进入会加载 |
| `src/gameRules.js` | 73.1 KiB | 首次进入会加载 |

## 最大运行时文件

| 文件 | 大小 |
|---|---:|
| `src\gameRules.js` | 73.1 KiB |
| `public\app.js` | 70.7 KiB |
| `public\civilization.js` | 51.7 KiB |
| `src\civilizationEngine.js` | 34.2 KiB |
| `src\gameData.js` | 30.4 KiB |
| `public\civilization.css` | 25.7 KiB |
| `src\civilizationData.js` | 10.7 KiB |
| `public\index.html` | 9.4 KiB |
