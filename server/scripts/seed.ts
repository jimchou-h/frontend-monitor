import { existsSync, unlinkSync } from 'fs';
import { config } from '../src/config';
import { MemoryStore } from '../src/db/memory';
import { MysqlStore } from '../src/db/mysql';
import { Store } from '../src/db/types';

export const TDS_PROJECT = {
  name: 'tds-manageui',
  apikey: 'fm_tds_manageui_local',
  trackKey: 'track_tds_manageui_local',
};

async function main(): Promise<void> {
  if (config.storage !== 'mysql' && existsSync(config.memoryFile)) {
    unlinkSync(config.memoryFile);
    console.log(`已删除 mock 数据文件: ${config.memoryFile}`);
  }

  const store: Store = config.storage === 'mysql' ? new MysqlStore() : new MemoryStore(config.memoryFile);
  if (store instanceof MysqlStore) await store.init();

  const projects = await store.listProjects();
  let project = projects.find((item) => item.name === TDS_PROJECT.name);
  if (!project) {
    project = await store.createProject(TDS_PROJECT.name, {
      apikey: TDS_PROJECT.apikey,
      trackKey: TDS_PROJECT.trackKey,
    });
  }

  console.log('seed 完成：只保留真实项目，不再写入 mock 错误/埋点');
  console.log(
    JSON.stringify(
      {
        name: project.name,
        id: project.id,
        apikey: project.apikey,
        trackKey: project.trackKey,
      },
      null,
      2,
    ),
  );
  await store.close();
}

main().catch((err) => {
  console.error('seed 失败:', err);
  process.exit(1);
});
