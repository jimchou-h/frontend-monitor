import type { IAnyObject } from '@frontend-monitor/types';

export const _global: IAnyObject = (() => {
  if (typeof window !== 'undefined') return window;
  if (typeof globalThis !== 'undefined') return globalThis;
  return {};
})();

export interface MonitorSupport {
  logger?: any;
  transportData?: any;
  breadcrumb?: any;
  options?: any;
  record?: any[];
  deviceInfo?: any;
  flags?: Record<string, boolean>;
  [key: string]: any;
}

export const _support: MonitorSupport =
  _global.__FRONTEND_MONITOR__ || (_global.__FRONTEND_MONITOR__ = {});

const flags: Record<string, boolean> = _support.flags || (_support.flags = {});

export function setFlag(key: string, value: boolean): void {
  flags[key] = value;
}

export function getFlag(key: string): boolean {
  return !!flags[key];
}
