# dashboard

可视化前端（React + Vite + Chart.js），通过 Node 服务的 `/api` 接口对接。

```bash
pnpm dev:dashboard
```

默认代理到 `http://localhost:8788`。生产构建后由 server 直接托管：

```bash
pnpm --filter @frontend-monitor/dashboard build
pnpm dev:server
```

访问 `http://localhost:8788`。

页面：

- 总览：KPI、趋势、Issue 排行、埋点 Top、性能概览
- 错误明细与详情：调用栈、SourceMap 还原标记、用户行为栈、环境信息
- Issue 聚合：按指纹聚合，支持标记解决 / 忽略
- 埋点分析：事件汇总、趋势、明细
- 性能指标：LCP / INP / CLS / FCP / TTFB
- SourceMap：上传与管理
- 项目与密钥：创建项目、复制 apikey / trackKey
