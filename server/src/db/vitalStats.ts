import { TrendPoint, VitalPageRow, VitalSummaryRow } from './types';

export function formatVitalNumber(name: string, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return name === 'cls' ? Math.round(value * 1000) / 1000 : Math.round(value);
}

export function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[idx];
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rate(values: number[], test: (value: number) => boolean): number {
  if (!values.length) return 0;
  return Math.round((values.filter(test).length / values.length) * 1000) / 10;
}

export function goodThreshold(name: string): number {
  const map: Record<string, number> = {
    lcp: 2500,
    inp: 200,
    cls: 0.1,
    fcp: 1800,
    ttfb: 800,
    navigation: 1500,
    resource: 1000,
    memory_warning: 10,
  };
  return map[name] ?? 0;
}

export function poorThreshold(name: string): number {
  const map: Record<string, number> = {
    lcp: 4000,
    inp: 500,
    cls: 0.25,
    fcp: 3000,
    ttfb: 1800,
    navigation: 3000,
    resource: 3000,
    memory_warning: 20,
  };
  return map[name] ?? Infinity;
}

export function summarizeVital(name: string, values: number[]): VitalSummaryRow {
  return {
    name,
    count: values.length,
    avg: formatVitalNumber(name, average(values)),
    p75: formatVitalNumber(name, percentile(values, 0.75)),
    goodRate: rate(values, (value) => value < goodThreshold(name)),
    needsImprovementRate: rate(values, (value) => value >= goodThreshold(name) && value < poorThreshold(name)),
    poorRate: rate(values, (value) => value >= poorThreshold(name)),
  };
}

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fillVitalTrend(days: number, groups: Map<string, number[]>, name: string): TrendPoint[] {
  const result: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dateKey(new Date(Date.now() - i * 86_400_000));
    const values = groups.get(key) || [];
    result.push({
      date: key,
      count: values.length,
      p75: values.length ? formatVitalNumber(name, percentile(values, 0.75)) : 0,
      avg: values.length ? formatVitalNumber(name, average(values)) : 0,
    });
  }
  return result;
}

export function summarizePages(name: string, groups: Map<string, number[]>): VitalPageRow[] {
  const result: VitalPageRow[] = [];
  groups.forEach((values, page) => {
    result.push({
      page: page || '(未知页面)',
      count: values.length,
      avg: formatVitalNumber(name, average(values)),
      p75: formatVitalNumber(name, percentile(values, 0.75)),
      goodRate: rate(values, (value) => value < goodThreshold(name)),
      poorRate: rate(values, (value) => value >= poorThreshold(name)),
    });
  });
  return result.sort((a, b) => b.p75 - a.p75 || b.count - a.count);
}
