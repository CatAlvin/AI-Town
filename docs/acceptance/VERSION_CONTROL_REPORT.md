# 版本历史与回退演练报告

生成时间：2026-06-26

## 结论

- 本地 Git 仓库已初始化。
- 当前工作分支：`main`。
- 验收基线提交：`52354f8`。
- 里程碑标签：`v0.3.3-acceptance-baseline`。
- 提交说明包含验收 ID：`DEV-07`、`SYS-05`、`QA-01`、`REL-07`。
- 日志、环境文件和密钥类文件由 `.gitignore` 排除。

## 非破坏式恢复检查

已执行：

```bash
git show v0.3.3-acceptance-baseline:package.json
```

标签中的 `package.json` 可读取，且包含：

- `name`: `moonbell-furfire`
- `version`: `0.3.3`
- `scripts.validate`: `npm test && npm run scan:secrets && npm run audit:deps && npm run audit:production && npm run audit:evidence && npm run audit:acceptance`

这证明里程碑标签可解析到完整项目文件。完整人工回退演练可使用：

```bash
git switch --detach v0.3.3-acceptance-baseline
npm run validate
git switch main
```

## 仍需补强

- 当前为本地仓库，尚未推送到远端托管服务。
- 当前只建立了本地验收基线标签；正式发布前仍建议按 M4/M5 分别打 `rc` 与正式发布标签。
