import { transportData } from '@frontend-monitor/core';
import { options } from '@frontend-monitor/core';
import { getCurrentRoute, getTimestamp, initWebVitals, VitalCollectorReport } from '@frontend-monitor/utils';

export interface UniVital {
  isVital: true;
  trackTime: number;
  page: string;
  vital: { name: string; value: number; rating: string; page?: string };
}

export type PerfCallback = (vital: UniVital) => void;

function sendVitalReport(vital: UniVital): void {
  const { beforeSend, sampleRate } = options;
  if (typeof sampleRate === 'number' && sampleRate < 1 && Math.random() > sampleRate) return;
  if (typeof beforeSend === 'function' && !beforeSend(vital)) return;
  transportData.send(vital as any);
}

function wxRating(name: string, value: number): string {
  const thresholds: Record<string, [number, number]> = {
    navigation: [1500, 3000],
    resource: [1000, 3000],
    memory_warning: [10, 20],
  };
  const [good, poor] = thresholds[name] || [0, Infinity];
  if (value <= good) return 'good';
  if (value < poor) return 'needs-improvement';
  return 'poor';
}

export function initPerformance(): void {
  const g = globalThis as any;
  if (typeof window !== 'undefined' && typeof window.PerformanceObserver !== 'undefined') {
    initWebVitals((report: VitalCollectorReport) => {
      sendVitalReport({
        isVital: true,
        trackTime: report.trackTime,
        page: report.page,
        vital: report.vital,
      });
    });
    return;
  }
  if (g.wx) initWxPerformance();
}

export function initWxPerformance(onReport?: PerfCallback): void {
  const g = globalThis as any;
  const wx = g.wx;
  if (!wx) return;
  const page = getCurrentRoute();
  const report = (name: string, value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const vital: UniVital = {
      isVital: true,
      trackTime: getTimestamp(),
      page,
      vital: { name, value: Math.round(value), rating: wxRating(name, value), page },
    };
    if (onReport) onReport(vital);
    else sendVitalReport(vital);
  };

  try {
    if ((!wx.canIUse || wx.canIUse('getPerformance')) && typeof wx.getPerformance === 'function') {
      const perf = wx.getPerformance();
      if (perf && typeof perf.getEntriesByType === 'function') {
        const nav = perf.getEntriesByType('navigation')[0];
        if (nav && nav.duration) report('navigation', nav.duration);
      }
      if (perf && typeof perf.createObserver === 'function') {
        const observer = perf.createObserver((list: any) => {
          list.getEntries().forEach((entry: any) => {
            if (entry && entry.duration) report('resource', entry.duration);
          });
        });
        if (observer && typeof observer.observe === 'function') {
          observer.observe({ type: 'resource' });
        }
      }
    }
  } catch (_e) { /* 基础库不支持时静默跳过 */ }

  try {
    if (typeof wx.onMemoryWarning === 'function') {
      wx.onMemoryWarning((res: any) => {
        if (res && res.level != null) report('memory_warning', Number(res.level));
      });
    }
  } catch (_e) { /* ignore */ }
}
