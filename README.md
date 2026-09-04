# 月铃文明

《月铃文明》是一款中文 AI 社会观赏模拟器。30 名不同种族的兽人居民会自主工作、交友、借债、争执、犯罪、调查和参选；玩家也可以施加世界事件，观察社会指标与历史走向。

*A Chinese AI society simulation where 30 autonomous furry residents work, form relationships, commit crimes, investigate events, and shape local politics.*

## 版本与进度

- 当前版本：**0.4.0**
- 状态：首个可运行纵向切片，30 名居民、35 日因果故事链、关系图和存档系统已完成
- 经典版：旧版《绒火与月铃》保留在 `/legacy.html`

## 核心功能

- 小镇自动运行，支持暂停、单步和多档速度。
- 居民拥有职业、财富、关系、目标、记忆和可解释的行动原因。
- 经济、犯罪、关系与政治系统共同推动事件发展。
- 六类世界事件会改变人口、财富、治安、社会信任和政治稳定。
- 支持自动存档、导入、导出和不同种子重开。

## 使用方式

需要 Node.js 20+。

```powershell
npm start
```

打开 <http://localhost:5173>。如端口被占用：

```powershell
$env:PORT="5174"
npm start
```

核心模拟可完全离线运行。若要让 DeepSeek 解释自由输入的世界事件，可在启动前设置：

```powershell
$env:DEEPSEEK_API_KEY="你的 API Key"
npm start
```

## AI 辅助

运行时 AI 只把自由文本映射为受控的世界事件，居民行为、社会演化和存档由本地规则驱动。开发过程使用 AI 辅助内容设计、实现与测试，最终规则和体验由作者确认。

## 验证

```powershell
npm test
npm run validate
```

版本变化见 [CHANGELOG.md](CHANGELOG.md)。当前版本仍待外部试玩与部署验证，不标记为最终发行版。
