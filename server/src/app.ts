import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from './config';
import { IngestService } from './clean/pipeline';
import { SourcemapResolver } from './clean/sourcemap';
import { Store } from './db/types';
import { RateLimiter } from './rateLimit';
import { createApiRouter } from './routes/api';

export interface AppDeps {
  store: Store;
  limiter: RateLimiter;
  ingest: IngestService;
}

export function createApp({ store, limiter, ingest }: AppDeps): express.Express {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ code: 0, message: 'ok', storage: config.storage });
  });

  app.post(['/errors/upload', '/api/v1/errors/upload'], async (req, res, next) => {
    try {
      const apikey = String(req.body?.authInfo?.apikey || '');
      const check = await limiter.check(`ingest:${apikey}`);
      if (!check.allowed) {
        res.setHeader('Retry-After', String(Math.ceil(check.retryAfterMs / 1000)));
        return res.status(429).json({ code: 429, message: `限流中（${check.reason}）` });
      }
      const result = await ingest.processError(req.body, { ip: clientIp(req), ua: req.headers['user-agent'] || '' });
      res.status(result.code).json({ code: 0, message: result.message });
    } catch (e) {
      next(e);
    }
  });

  app.post(['/tracks/upload', '/api/v1/tracks/upload'], async (req, res, next) => {
    try {
      const key = String(req.body?.authInfo?.apikey || req.body?.authInfo?.trackKey || '');
      const check = await limiter.check(`ingest:${key}`);
      if (!check.allowed) {
        res.setHeader('Retry-After', String(Math.ceil(check.retryAfterMs / 1000)));
        return res.status(429).json({ code: 429, message: `限流中（${check.reason}）` });
      }
      const result = await ingest.processTrack(req.body, { ip: clientIp(req), ua: req.headers['user-agent'] || '' });
      res.status(result.code).json({ code: 0, message: result.message });
    } catch (e) {
      next(e);
    }
  });

  app.use('/api', adminAuth, createApiRouter(store));

  app.get('/api/public/demo-config', async (_req, res, next) => {
    try {
      const projects = await store.listProjects();
      const project =
        projects.find((p) => p.name === 'tds-manageui') ||
        projects.find((p) => p.name === 'demo-web') ||
        projects.find((p) => p.name === 'demo') ||
        projects[0];
      if (!project) return res.json({ code: 0, data: null });
      res.json({ code: 0, data: { name: project.name, apikey: project.apikey, trackKey: project.trackKey } });
    } catch (e) {
      next(e);
    }
  });

  const demoDir = resolve(__dirname, '../../examples/web');
  if (existsSync(demoDir)) {
    app.use('/packages', express.static(resolve(__dirname, '../../packages')));
    app.use('/demo', express.static(demoDir));
  }

  const dashboardDir = resolve(config.dashboardDist);
  if (existsSync(dashboardDir)) {
    app.use(express.static(dashboardDir));
    app.get(/^(?!\/api|\/errors\/upload|\/tracks\/upload|\/demo|\/health).*/, (_req, res) => {
      res.sendFile(resolve(dashboardDir, 'index.html'));
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] request error:', err);
    res.status(err?.status || 500).json({ code: 500, message: err?.message || '服务器内部错误' });
  });

  return app;
}

function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.adminToken) return next();
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token !== config.adminToken) {
    res.status(401).json({ code: 401, message: '未授权' });
    return;
  }
  next();
}

function clientIp(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || '';
}
