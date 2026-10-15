import App from './App';
import { init } from '@frontend-monitor/uni-app';

// 部署后替换为真实服务地址与项目密钥
init({
  dsn: 'https://monitor.example.com/errors/upload',
  trackDsn: 'https://monitor.example.com/tracks/upload',
  apikey: 'fm_your_apikey',
  trackKey: 'track_your_track_key',
  debug: true,
});

export function createApp() {
  const app = createSSRApp(App);
  return { app };
}
