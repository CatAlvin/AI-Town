# 日志与脱敏报告

生成时间：2026-09-02T20:43:15.841Z

## 结构化字段

服务端日志通过 JSON 行输出，字段包含：

- `time`
- `level`
- `event`
- `version`
- `data.requestId`
- `data.category`
- `data.ms`

## 覆盖

- `test/apiSecurity.test.js` 会触发模型失败降级，断言 `llm_rumor_fallback` 日志为结构化 JSON。
- 测试确认日志行不包含模拟密钥片段。
- `server.js` 的错误响应只返回脱敏错误、请求 ID 和 HTTP 状态，不返回堆栈、环境变量或完整输入。
