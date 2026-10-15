import type { EActionType } from '@frontend-monitor/types';
import { getLocationHref, getTimestamp } from './helpers';

export interface VitalMetric {
  name: string;
  value: number;
  rating: string;
  page?: string;
}

export interface VitalCollectorReport {
  trackId: string;
  actionType: EActionType;
  trackTime: number;
  page: string;
  isVital: true;
  vital: VitalMetric;
}

function ratingOf(name: string, value: number): string {
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    inp: [200, 500],
    cls: [0.1, 0.25],
    fcp: [1800, 3000],
    ttfb: [800, 1800],
  };
  const [good, poor] = thresholds[name] || [0, Infinity];
  if (value <= good) return 'good';
  if (value < poor) return 'needs-improvement';
  return 'poor';
}

export function initWebVitals(onReport: (report: VitalCollectorReport) => void): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  const metrics: Record<string, number> = {};
  let reported = false;

  const report = () => {
    if (reported) return;
    reported = true;
    const page = getLocationHref();
    const time = getTimestamp();
    Object.keys(metrics).forEach((name) => {
      onReport({
        trackId: `vital_${name}`,
        actionType: 'DURATION' as EActionType,
        trackTime: time,
        page,
        isVital: true,
        vital: { name, value: metrics[name], rating: ratingOf(name, metrics[name]), page },
      });
    });
  };

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry;
      if (last) metrics.lcp = last.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_e) { /* 浏览器不支持则跳过 */ }

  try {
    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
      metrics.cls = cls;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (_e) { /* ignore */ }

  try {
    let worstInp = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any) {
        if (entry.interactionId && entry.duration > worstInp) worstInp = entry.duration;
      }
      metrics.inp = worstInp;
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any);
  } catch (_e) { /* ignore */ }

  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') metrics.fcp = entry.startTime;
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (_e) { /* ignore */ }

  const nav = performance.getEntriesByType('navigation')[0] as any;
  if (nav && nav.responseStart > 0) metrics.ttfb = nav.responseStart;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') report();
  });
  window.addEventListener('pagehide', report, { once: true });
  window.addEventListener('beforeunload', report, { once: true });
}
