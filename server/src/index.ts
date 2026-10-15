import { createApp } from './app';
import { config } from './config';
import { IngestService } from './clean/pipeline';
import { SourcemapResolver } from './clean/sourcemap';
import { MemoryStore } from './db/memory';
import { MysqlStore } from './db/mysql';
import { Store } from './db/types';
import { createRateLimiter, RateLimiter } from './rateLimit';

async function bootstrap(): Promise<void> {
  const store: Store = config.storage === 'mysql' ? new MysqlStore() : new MemoryStore(config.memoryFile);
  if (store instanceof MysqlStore) {
    await store.init();
  }
  const limiter: RateLimiter = createRateLimiter();
  if ('init' in limiter && typeof (limiter as any).init === 'function') {
    await (limiter as any).init();
  }

  const projects = await store.listProjects();
  if (projects.length === 0) {
    const project = await store.createProject('tds-manageui', {
      apikey: 'fm_tds_manageui_local',
      trackKey: 'track_tds_manageui_local',
    });
    console.log(`[server] 已创建 tds-manageui 项目，apikey=${project.apikey}`);
  }

  const ingest = new IngestService(store, new SourcemapResolver(store));
  const app = createApp({ store, limiter, ingest });
  const server = app.listen(config.port, () => {
    console.log(`[server] frontend-monitor 已启动: http://localhost:${config.port} (storage=${config.storage})`);
  });

  const shutdown = async () => {
    server.close();
    await store.close();
    await limiter.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[server] 启动失败:', err);
  process.exit(1);
});
