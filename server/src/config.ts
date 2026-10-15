import 'dotenv/config';
import { resolve } from 'path';

function numberOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: numberOrDefault(process.env.PORT, 8788),
  storage: process.env.STORAGE || 'memory',
  adminToken: process.env.ADMIN_TOKEN || '',
  dataDir: resolve(process.env.DATA_DIR || 'data'),
  memoryFile: resolve(process.env.DATA_DIR || 'data', 'memory.json'),
  rateLimit: {
    windowMs: numberOrDefault(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    maxPerWindow: numberOrDefault(process.env.RATE_LIMIT_MAX, 1000),
    dayMs: 86_400_000,
    maxPerDay: numberOrDefault(process.env.RATE_LIMIT_DAY_MAX, 100_000),
  },
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: numberOrDefault(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'monitor',
    password: process.env.MYSQL_PASSWORD || 'monitor123',
    database: process.env.MYSQL_DATABASE || 'frontend_monitor',
  },
  redisUrl: process.env.REDIS_URL || '',
  dashboardDist: resolve(process.env.DASHBOARD_DIST || '../dashboard/dist'),
};
