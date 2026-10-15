# uni-app 接入示例

这是一个最小可用的 uni-app 工程结构，直接在 HBuilderX 或 `@dcloudio/vite-plugin-uni` 中打开即可运行。

接入步骤：

1. 安装 SDK：`pnpm add @frontend-monitor/uni-app`
2. 在 `main.js` 中调用 `init`，传入 dsn / trackDsn / apikey / trackKey
3. `init` 需要先于 `App()` 调用，SDK 会包装 App / Page / uni.request 与路由方法

SDK 自动采集：

- App `onError`、`onUnhandledRejection`、`onPageNotFound`
- 页面生命周期、tap/touchmove 行为栈
- `uni.request` / `uploadFile` / `downloadFile` 失败
- 路由跳转失败

主动埋点：

```js
import { track } from '@frontend-monitor/uni-app';
track({ actionType: 'EVENT', trackId: 'pay_click', custom: { amount: 99.9 } });
```

当前示例工程里需要把 `main.js` 中的 dsn / apikey 替换为你部署的服务地址与项目密钥。
