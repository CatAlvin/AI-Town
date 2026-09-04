# 部署信息

- 部署日期：2026-09-04
- 服务器：`ChengLanServer`（`47.121.189.62`）
- 访问地址：`https://ai-town.chenglan.tech`
- 当前版本：`0.4.0`，部署提交以 `git -C /home/projects/AI-Town/current rev-parse HEAD` 为准
- 项目目录：`/home/projects/AI-Town`
- 当前发布：以服务器 `current` 链接和本文记录的 Git 提交为准
- 稳定入口：`/home/projects/AI-Town/current`
- 运行方式：`ai-town.service` 运行在 `127.0.0.1:8050`，由 Nginx 反向代理

## 当前能力

全部 63 项测试和端到端网页检查均已通过。服务器已通过 OpenAI 兼容接口接入 Kimi K3，并于 2026-09-04 通过真实传闻生成验证；模型不可用时继续使用本地确定性内容。部署副本增加了通用 LLM 配置与 `HOST` 参数，使应用仅监听本机；本地源码与 GitHub 仓库未因此改动。

Kimi 配置保存在权限为 `600` 的 `/home/projects/AI-Town/shared/.env`。更换配置后执行：

```bash
systemctl restart ai-town
```

## 运维命令

```bash
systemctl status ai-town
journalctl -u ai-town -n 100 --no-pager
nginx -t
curl http://127.0.0.1:8050/api/health
```

HTTPS 已启用，HTTP 会自动跳转至 HTTPS。证书到期日为 2026-12-03，由 `certbot.timer` 自动续期；续期演练已通过。

```bash
systemctl status certbot.timer
certbot renew --dry-run
```
