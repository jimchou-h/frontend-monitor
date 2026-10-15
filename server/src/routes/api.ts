import { Router } from 'express';
import multer from 'multer';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { config } from '../config';
import { Store, PageQuery, ErrorQuery, IssueQuery, TrackQuery } from '../db/types';

export function createApiRouter(store: Store): Router {
  const router = Router();

  router.get('/projects', async (_req, res, next) => {
    try {
      const projects = await store.listProjects();
      res.json({ code: 0, data: projects });
    } catch (e) {
      next(e);
    }
  });

  router.post('/projects', async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim().slice(0, 100);
      if (!name) return res.status(400).json({ code: 1, message: 'name 必填' });
      const project = await store.createProject(name);
      res.status(201).json({ code: 0, data: project });
    } catch (e) {
      next(e);
    }
  });

  router.get('/stats/overview', async (req, res, next) => {
    try {
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      res.json({ code: 0, data: await store.overview(days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/stats/trend', async (req, res, next) => {
    try {
      const metric = String(req.query.metric || 'errors');
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      if (!['errors', 'tracks', 'vitals'].includes(metric)) {
        return res.status(400).json({ code: 1, message: 'metric 无效' });
      }
      res.json({ code: 0, data: await store.trend(metric as any, days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/errors', async (req, res, next) => {
    try {
      const query: ErrorQuery = {
        page: page(req.query.page),
        size: size(req.query.size),
        projectId: numberOrUndefined(req.query.projectId),
        type: stringOrUndefined(req.query.type),
        status: numberOrUndefined(req.query.status),
        q: stringOrUndefined(req.query.q),
        from: stringOrUndefined(req.query.from),
        to: stringOrUndefined(req.query.to),
      };
      res.json({ code: 0, data: await store.listErrors(query) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/errors/:id', async (req, res, next) => {
    try {
      const error = await store.getError(Number(req.params.id));
      if (!error) return res.status(404).json({ code: 1, message: '记录不存在' });
      res.json({ code: 0, data: error });
    } catch (e) {
      next(e);
    }
  });

  router.patch('/errors/:id', async (req, res, next) => {
    try {
      const status = Number(req.body?.status);
      if (![0, 1, 2].includes(status)) return res.status(400).json({ code: 1, message: 'status 无效' });
      await store.updateErrorStatus(Number(req.params.id), status);
      res.json({ code: 0 });
    } catch (e) {
      next(e);
    }
  });

  router.get('/issues', async (req, res, next) => {
    try {
      const query: IssueQuery = {
        page: page(req.query.page),
        size: size(req.query.size),
        projectId: numberOrUndefined(req.query.projectId),
        status: numberOrUndefined(req.query.status),
        q: stringOrUndefined(req.query.q),
      };
      res.json({ code: 0, data: await store.listIssues(query) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/issues/:id', async (req, res, next) => {
    try {
      const issue = await store.getIssue(Number(req.params.id));
      if (!issue) return res.status(404).json({ code: 1, message: 'Issue 不存在' });
      const pageQuery: PageQuery = { page: page(req.query.page), size: size(req.query.size) };
      const errors = await store.listErrorsByFingerprint(issue.projectId, issue.fingerprint, pageQuery);
      res.json({ code: 0, data: { issue, errors } });
    } catch (e) {
      next(e);
    }
  });

  router.patch('/issues/:id', async (req, res, next) => {
    try {
      const status = Number(req.body?.status);
      if (![0, 1, 2].includes(status)) return res.status(400).json({ code: 1, message: 'status 无效' });
      await store.updateIssueStatus(Number(req.params.id), status);
      res.json({ code: 0 });
    } catch (e) {
      next(e);
    }
  });

  router.get('/tracks/summary', async (req, res, next) => {
    try {
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      res.json({ code: 0, data: await store.trackSummary(days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/tracks/trend', async (req, res, next) => {
    try {
      const trackId = String(req.query.trackId || '');
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      if (!trackId) return res.status(400).json({ code: 1, message: 'trackId 必填' });
      res.json({ code: 0, data: await store.trackTrend(trackId, days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/tracks', async (req, res, next) => {
    try {
      const query: TrackQuery = {
        page: page(req.query.page),
        size: size(req.query.size),
        projectId: numberOrUndefined(req.query.projectId),
        trackId: stringOrUndefined(req.query.trackId),
        from: stringOrUndefined(req.query.from),
        to: stringOrUndefined(req.query.to),
      };
      res.json({ code: 0, data: await store.listTracks(query) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/vitals/summary', async (req, res, next) => {
    try {
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      res.json({ code: 0, data: await store.vitalSummary(days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/vitals/trend', async (req, res, next) => {
    try {
      const name = String(req.query.name || 'lcp');
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      res.json({ code: 0, data: await store.vitalTrend(name, days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/vitals/pages', async (req, res, next) => {
    try {
      const name = String(req.query.name || 'lcp');
      const days = clampDays(req.query.days);
      const projectId = numberOrUndefined(req.query.projectId);
      res.json({ code: 0, data: await store.vitalPages(name, days, projectId) });
    } catch (e) {
      next(e);
    }
  });

  router.get('/sourcemaps', async (req, res, next) => {
    try {
      res.json({ code: 0, data: await store.listSourceMaps(numberOrUndefined(req.query.projectId)) });
    } catch (e) {
      next(e);
    }
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = resolve(config.dataDir, 'sourcemaps');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, '_')}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  router.post('/sourcemaps', upload.single('file'), async (req, res, next) => {
    try {
      const projectId = Number(req.body?.projectId);
      const release = String(req.body?.release || '').slice(0, 128);
      const file = req.file;
      if (!projectId || !file) return res.status(400).json({ code: 1, message: 'projectId 和 file 必填' });
      const record = await store.saveSourceMap({
        projectId,
        release,
        fileName: file.originalname,
        filePath: `sourcemaps/${file.filename}`,
        size: file.size,
      });
      res.status(201).json({ code: 0, data: record });
    } catch (e) {
      next(e);
    }
  });

  router.delete('/sourcemaps/:id', async (req, res, next) => {
    try {
      await store.deleteSourceMap(Number(req.params.id));
      res.json({ code: 0 });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

function page(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function size(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 20;
}

function numberOrUndefined(value: any): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringOrUndefined(value: any): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

function clampDays(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 90) : 7;
}
