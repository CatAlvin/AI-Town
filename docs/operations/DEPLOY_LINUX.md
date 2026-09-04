# Linux 部署说明

目标：从全新仓库副本到可访问服务不超过 15 步。

## Docker 部署

1. 安装 Docker。
2. 克隆或上传项目目录。
3. 进入项目目录。
4. 确认没有把 `.env` 或本地 key 文件放入镜像上下文。
5. 构建镜像：

```bash
docker build -t moonbell-furfire:0.3.0 .
```

6. 启动容器：

```bash
docker run -d --name moonbell-furfire \
  --restart unless-stopped \
  -p 5173:5173 \
  -e PORT=5173 \
  moonbell-furfire:0.3.0
```

7. 检查健康状态：

```bash
curl http://127.0.0.1:5173/api/health
```

8. 打开 `http://服务器地址:5173`。

## 可选 LLM

只通过服务端环境变量注入：

```bash
docker run -d --name moonbell-furfire \
  --restart unless-stopped \
  -p 5173:5173 \
  -e PORT=5173 \
  -e DEEPSEEK_API_KEY=example_key_from_secret_store \
  moonbell-furfire:0.3.0
```

不要把密钥写进仓库、镜像、前端资源、日志或错误响应。

## 反向代理

Nginx/HTTPS 部署时只暴露代理端口到公网，容器端口仅本机访问。HTML 和 API 建议短缓存或 no-store，静态资源可在正式构建加哈希后长缓存。

## 安全说明

- Dockerfile 使用非 root 用户 `moonbell`。
- `.dockerignore` 排除本地 key、日志、node_modules 和环境文件。
- `/api/health` 区分核心服务与可选 LLM 状态。
- `/api/rumor` 有请求体大小限制、频率限制、会话配额和超时。
