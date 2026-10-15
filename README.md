# frontend-monitor

前端监控系统：Web / uni-app 埋点 SDK + Node 数据清洗服务 + 可视化 Dashboard。

错误采集、主动埋点、性能指标（LCP / INP / CLS / FCP / TTFB）一路打通：SDK 上报 → 服务端脱敏标准化 → SourceMap 还原 → 指纹去重聚合 Issue → Dashboard 可视化分析。

## 特性

- **双端 SDK**：Web（错误 / 请求 / 路由 / 性能 / 主动埋点）与 uni-app（App / Page / 网络 / 路由 / 性能），共享同一内核
- **Vue 集成**：`MonitorVue(app)` 一行接入 Vue 2 / Vue 3，`vueRouterPlugin(router)` 可选把路由跳转纳入行为栈
- **用户行为栈**：面包屑记录错误发生前的操作路径，配合调用栈定位问题
- **数据清洗**：服务端统一脱敏、标准化、SourceMap 还原、指纹去重与 Issue 聚合
- **性能采集**：Web 与 uni-app H5 采集 Core Web Vitals；mp-weixin 采集导航/资源耗时与内存告警
- **零依赖体验**：默认内存存储 + 内存限流，一条命令跑通；生产启用 MySQL + Redis
- **查询 API 与鉴权**：REST API 供 Dashboard 使用，`ADMIN_TOKEN` 开启 Bearer 鉴权

## 目录结构

```
packages/
  core        SDK 内核（配置、面包屑、上报队列、数据整形）
  shared      SDK 共享工具
  types       SDK 类型定义
  utils       SDK 通用函数
  web         Web SDK
  uni-app     uni-app SDK
server/       Node 采集与清洗服务（详情见 server/README.md）
dashboard/    可视化前端，React + Vite + Chart.js（详情见 dashboard/README.md）
examples/
  web         Web 接入 demo
  uni-app     uni-app 接入 demo
```

## 快速开始

要求 Node.js >= 22、pnpm。

```bash
pnpm install
pnpm build
pnpm seed          # 写入演示数据
pnpm dev:server    # http://localhost:8788
pnpm dev:dashboard # http://localhost:5173（独立 dev server，代理到 8788）
```

打开 `http://localhost:8788`（server 静态托管 dashboard 构建产物），Web demo 在 `http://localhost:8788/demo/`。

默认使用内存存储，零外部依赖即可体验。生产部署启用 MySQL + Redis：

```bash
docker compose up -d
# Windows PowerShell
$env:STORAGE="mysql"; $env:MYSQL_DATABASE="frontend_monitor"; $env:MYSQL_USER="monitor"; $env:MYSQL_PASSWORD="monitor123"; $env:REDIS_URL="redis://localhost:6379"
# Linux / macOS
STORAGE=mysql MYSQL_DATABASE=frontend_monitor MYSQL_USER=monitor MYSQL_PASSWORD=monitor123 REDIS_URL=redis://localhost:6379 pnpm dev:server
```

全部环境变量见 `server/.env.example`。

## SDK 接入

### Web（Vue 示例）

```ts
import { init, track, MonitorVue, vueRouterPlugin } from '@frontend-monitor/web';

init({
  dsn: '/errors/upload',      // 错误上报地址
  trackDsn: '/tracks/upload', // 埋点上报地址
  apikey: 'fm_xxx',           // 在 dashboard「项目与密钥」页创建
});

MonitorVue(app);              // Vue 3 传 createApp 返回值，Vue 2 传 Vue 构造器
vueRouterPlugin(router);      // 可选：路由跳转进入行为栈

// 主动埋点
track({ actionType: 'click', elementType: 'button', targetName: 'submit' });
```

`init` 支持细粒度开关（`silentXhr` / `silentFetch` / `silentConsole` / `silentDom` / `silentHistory` 等）、面包屑钩子（`beforePushBreadcrumb`）、上报拦截（`beforeDataReport` / `configReportUrl`）与用户标识（`backTrackerId`），完整选项见 `packages/types/src/options.ts`。

### uni-app

```js
import { init } from '@frontend-monitor/uni-app';

init({ dsn: '...', trackDsn: '...', apikey: 'fm_xxx' });
```

性能采集默认开启（`enablePerformance: false` 可关闭）：H5 端复用 web 采集器上报 LCP / INP / CLS / FCP / TTFB；mp-weixin 端通过 `wx.getPerformance()` 采集导航/资源耗时，并监听 `wx.onMemoryWarning`。数据统一走 `/tracks/upload` 的 `isVital` 分支，落到 `vitals` 表后在 dashboard「性能指标」页展示。

接入示例见 `examples/web` 与 `examples/uni-app`。

## 服务端接口

采集（SDK 使用）：

- `POST /errors/upload` — 错误上报
- `POST /tracks/upload` — 埋点与性能指标上报

查询（Dashboard 使用，前缀 `/api`，设置 `ADMIN_TOKEN` 后需 `Authorization: Bearer <token>`）：

- `GET/POST /api/projects` — 项目与密钥
- `GET /api/stats/overview`、`GET /api/stats/trend` — 总览统计
- `GET /api/errors`、`GET /api/errors/:id`、`PATCH /api/errors/:id` — 错误明细
- `GET /api/issues`、`GET /api/issues/:id`、`PATCH /api/issues/:id` — Issue 聚合（解决 / 忽略）
- `GET /api/tracks`、`GET /api/tracks/summary`、`GET /api/tracks/trend` — 埋点分析
- `GET /api/vitals/summary`、`GET /api/vitals/trend` — 性能指标
- `GET/POST/DELETE /api/sourcemaps` — SourceMap 管理

## Dashboard 页面

- **总览**：KPI、趋势、Issue 排行、埋点 Top、性能概览
- **错误**：明细与详情（调用栈、SourceMap 还原标记、用户行为栈、环境信息）
- **Issue**：按指纹聚合，支持标记解决 / 忽略
- **埋点**：事件汇总、趋势、明细
- **性能**：LCP / INP / CLS / FCP / TTFB
- **SourceMap**：上传与管理
- **项目**：创建项目、复制 apikey / trackKey

## 常用命令

```bash
pnpm build       # 构建全部包
pnpm test        # 运行测试
pnpm typecheck   # 类型检查
pnpm seed        # 生成演示数据
```

## License

MIT
