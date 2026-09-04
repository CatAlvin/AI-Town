# Linux 部署取证模板

目标验收：`GATE-05`、`OPS-01`、`OPS-02`、`OPS-04`、`OPS-07`、`OPS-08`

> 当前文件是部署取证模板，不是实际服务器部署证据。

## 环境

- 服务器提供方：
- Linux 发行版：
- Docker 版本：
- 域名/访问地址：
- 验收日期：

## 命令记录

```bash
docker build -t moonbell-furfire:0.3.0 .
docker run -d --name moonbell-furfire --restart unless-stopped -p 5173:5173 -e PORT=5173 moonbell-furfire:0.3.0
curl http://127.0.0.1:5173/api/health
docker restart moonbell-furfire
curl http://127.0.0.1:5173/api/health
```

## 必须截图/录像

- 构建成功。
- 容器以非 root 用户运行。
- `/api/health` 首次成功。
- 主机重启或容器重启后服务恢复。
- 浏览器访问标题页和开始游戏。
- 若使用 HTTPS，记录证书和响应头。

## 备份恢复演练

当前版本主要存档在浏览器本地；如后续引入服务端持久数据，需要记录备份目录、校验和、恢复步骤和恢复后的存档载入结果。
