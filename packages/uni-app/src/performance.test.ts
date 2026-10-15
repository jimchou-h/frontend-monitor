import { describe, expect, it } from 'vitest';
import { initWxPerformance, UniVital } from './performance';

describe('wx performance', () => {
  it('reports navigation, resource and memory warning metrics', () => {
    const reports: UniVital[] = [];
    const memoryListener: Array<(res: { level: number }) => void> = [];
    const fakeWx: any = {
      canIUse: () => true,
      getPerformance: () => ({
        getEntriesByType: (type: string) => (type === 'navigation' ? [{ duration: 1200 }] : []),
        createObserver: (callback: any) => ({
          observe: () => {
            callback({
              getEntries: () => [{ duration: 800 }, { duration: 3200 }],
            });
          },
        }),
      }),
      onMemoryWarning: (cb: (res: { level: number }) => void) => memoryListener.push(cb),
    };
    (globalThis as any).wx = fakeWx;

    initWxPerformance((vital) => reports.push(vital));
    memoryListener.forEach((cb) => cb({ level: 12 }));

    const names = reports.map((r) => r.vital.name);
    expect(names).toContain('navigation');
    expect(names).toContain('resource');
    expect(names).toContain('memory_warning');
    expect(reports.find((r) => r.vital.name === 'navigation')!.vital.rating).toBe('good');
    expect(reports.find((r) => r.vital.name === 'memory_warning')!.vital.rating).toBe('needs-improvement');

    delete (globalThis as any).wx;
  });

  it('skips silently when wx performance api is missing', () => {
    (globalThis as any).wx = { canIUse: () => false };
    let calls = 0;
    initWxPerformance(() => calls++);
    expect(calls).toBe(0);
    delete (globalThis as any).wx;
  });
});
