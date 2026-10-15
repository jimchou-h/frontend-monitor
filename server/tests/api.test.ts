import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { IngestService } from '../src/clean/pipeline';
import { SourcemapResolver } from '../src/clean/sourcemap';
import { MemoryStore } from '../src/db/memory';
import { MemoryRateLimiter } from '../src/rateLimit';

async function makeApp() {
  const store = new MemoryStore();
  const project = await store.createProject('test');
  const ingest = new IngestService(store, new SourcemapResolver(store));
  const app = createApp({ store, limiter: new MemoryRateLimiter(), ingest });
  return { app, store, project };
}

describe('ingest api', () => {
  it('accepts error report and aggregates issue', async () => {
    const { app, store, project } = await makeApp();
    const payload = {
      authInfo: { apikey: project.apikey, trackerId: 'u1', sdkName: 'test', sdkVersion: '0.1.0' },
      breadcrumb: [{ type: 'Click', data: { target: '#btn' } }],
      data: {
        type: 'JAVASCRIPT_ERROR',
        name: 'TypeError',
        message: 'Cannot read properties of undefined (reading "length")',
        url: 'https://app.example.com/a.js',
        time: Date.now(),
        stack: [{ url: 'https://app.example.com/a.js', func: 'f', line: 1, column: 2 }],
      },
      deviceInfo: {},
    };

    const res = await request(app).post('/errors/upload').send(payload).expect(202);
    expect(res.body.code).toBe(0);

    const errors = await store.listErrors({ page: 1, size: 20 });
    expect(errors.total).toBe(1);
    expect(errors.items[0].fingerprint).toHaveLength(24);

    const issues = await store.listIssues({ page: 1, size: 20 });
    expect(issues.total).toBe(1);
    expect(issues.items[0].count).toBe(1);

    const dedupe = await request(app).post('/errors/upload').send(payload).expect(200);
    expect(dedupe.body.message).toContain('重复');
    expect((await store.listErrors({ page: 1, size: 20 })).total).toBe(1);
  });

  it('rejects invalid apikey and stores tracks', async () => {
    const { app, store, project } = await makeApp();
    await request(app)
      .post('/errors/upload')
      .send({ authInfo: { apikey: 'bad' }, data: { type: 'X', message: 'm', url: 'u', level: 'error' } })
      .expect(401);

    const trackPayload = {
      authInfo: { trackKey: project.trackKey, trackerId: 'u1', sdkName: 'test', sdkVersion: '0.1.0' },
      data: { trackId: 'pay_click', actionType: 'EVENT', trackTime: Date.now() },
      deviceInfo: {},
    };
    await request(app).post('/tracks/upload').send(trackPayload).expect(202);
    expect((await store.listTracks({ page: 1, size: 20 })).total).toBe(1);
  });

  it('stores vital metrics separately', async () => {
    const { app, store, project } = await makeApp();
    await request(app)
      .post('/tracks/upload')
      .send({
        authInfo: { apikey: project.apikey, trackerId: 'u1', sdkName: 'test', sdkVersion: '0.1.0' },
        data: {
          isVital: true,
          trackTime: Date.now(),
          page: 'https://app.example.com',
          vital: { name: 'lcp', value: 2100, rating: 'good', page: 'https://app.example.com' },
        },
      })
      .expect(202);
    const summary = await store.vitalSummary(7);
    expect(summary).toHaveLength(1);
    expect(summary[0].name).toBe('lcp');
  });

  it('returns vital p75 trend and page breakdown', async () => {
    const { app, store, project } = await makeApp();
    const now = new Date();
    await store.insertVital(
      { projectId: project.id, eventId: 'v1', trackerId: 'u1', name: 'lcp', value: 1200, rating: 'good', page: '/home', device: {} },
      now,
    );
    await store.insertVital(
      { projectId: project.id, eventId: 'v2', trackerId: 'u2', name: 'lcp', value: 4100, rating: 'poor', page: '/cart', device: {} },
      now,
    );

    const trend = await request(app).get('/api/vitals/trend?name=lcp&days=7').expect(200);
    const today = trend.body.data.find((point: { count: number }) => point.count > 0);
    expect(today).toBeTruthy();
    expect(today.p75).toBe(4100);
    expect(today.avg).toBe(2650);

    const pages = await request(app).get('/api/vitals/pages?name=lcp&days=7').expect(200);
    expect(pages.body.data).toHaveLength(2);
    expect(pages.body.data[0].page).toBe('/cart');
    expect(pages.body.data[0].p75).toBe(4100);
  });
});
