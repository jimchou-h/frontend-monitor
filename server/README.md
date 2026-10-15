# server

Node 采集与清洗服务，负责：

- 接收 web / uni-app SDK 的错误与埋点上报
- 脱敏、标准化、源映射还原、指纹去重与 Issue 聚合
- MySQL 持久化（默认内存存储，便于本地体验）
- Redis 限流（默认内存限流）
- 查询 API 与 dashboard 静态托管

## 接口

采集（SDK 使用）：

- `POST /errors/upload`：错误上报
- `POST /tracks/upload`：埋点与性能指标上报

查询（dashboard 使用，前缀 `/api`）：

- `GET /api/projects`、`POST /api/projects`
- `GET /api/stats/overview`、`GET /api/stats/trend`
- `GET /api/errors`、`GET /api/errors/:id`、`PATCH /api/errors/:id`
- `GET /api/issues`、`GET /api/issues/:id`、`PATCH /api/issues/:id`
- `GET /api/tracks`、`GET /api/tracks/summary`、`GET /api/tracks/trend`
- `GET /api/vitals/summary`、`GET /api/vitals/trend`
- `GET/POST/DELETE /api/sourcemaps`

## 环境变量

见 `.env.example`。设置 `ADMIN_TOKEN` 后，`/api/*` 需要携带 `Authorization: Bearer <token>`。

## 启动

```bash
pnpm dev:server
pnpm seed
```

生产模式启用 MySQL + Redis：

```bash
docker compose up -d
$env:STORAGE="mysql"
$env:REDIS_URL="redis://localhost:6379"
pnpm dev:server
```
